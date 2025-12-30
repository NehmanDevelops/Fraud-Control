"""
Rate limiting and authentication middleware for FraudGuard API.
Provides IP-based rate limiting, API key authentication, and JWT support.
"""

from typing import Optional, Dict, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import hashlib
import secrets
import jwt
from functools import wraps
from enum import Enum


class RateLimitStrategy(str, Enum):
    """Rate limiting strategies."""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"


class RateLimiter:
    """
    Token bucket rate limiter for API endpoints.
    Allows burst traffic while maintaining average rate limits.
    """
    
    def __init__(
        self,
        requests_per_minute: int = 1000,
        burst_size: int = 100,
        strategy: RateLimitStrategy = RateLimitStrategy.TOKEN_BUCKET,
    ):
        """
        Initialize rate limiter.
        
        Args:
            requests_per_minute: Average rate limit
            burst_size: Maximum burst size
            strategy: Rate limiting algorithm
        """
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.strategy = strategy
        
        # Per-IP tracking
        self.buckets: Dict[str, Tuple[float, float]] = {}  # (tokens, timestamp)
        self.request_times: Dict[str, list] = defaultdict(list)
    
    def _get_tokens_per_second(self) -> float:
        """Calculate tokens per second."""
        return self.requests_per_minute / 60.0
    
    def is_allowed(self, client_id: str) -> Tuple[bool, Optional[int]]:
        """
        Check if request is allowed for client.
        
        Args:
            client_id: IP address or API key
        
        Returns:
            (allowed, retry_after_seconds)
        """
        if self.strategy == RateLimitStrategy.TOKEN_BUCKET:
            return self._check_token_bucket(client_id)
        elif self.strategy == RateLimitStrategy.SLIDING_WINDOW:
            return self._check_sliding_window(client_id)
        else:
            return self._check_fixed_window(client_id)
    
    def _check_token_bucket(self, client_id: str) -> Tuple[bool, Optional[int]]:
        """Check using token bucket algorithm."""
        now = datetime.utcnow().timestamp()
        tokens_per_sec = self._get_tokens_per_second()
        
        if client_id not in self.buckets:
            self.buckets[client_id] = (float(self.burst_size), now)
        
        tokens, last_update = self.buckets[client_id]
        
        # Add new tokens based on elapsed time
        elapsed = now - last_update
        tokens = min(self.burst_size, tokens + elapsed * tokens_per_sec)
        
        if tokens >= 1.0:
            # Allow request
            tokens -= 1.0
            self.buckets[client_id] = (tokens, now)
            return True, None
        else:
            # Deny request
            retry_after = int((1.0 - tokens) / tokens_per_sec) + 1
            return False, retry_after
    
    def _check_sliding_window(self, client_id: str) -> Tuple[bool, Optional[int]]:
        """Check using sliding window algorithm."""
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=1)
        
        # Remove old requests outside window
        if client_id in self.request_times:
            self.request_times[client_id] = [
                t for t in self.request_times[client_id]
                if t > window_start
            ]
        
        request_count = len(self.request_times[client_id])
        
        if request_count < self.requests_per_minute:
            self.request_times[client_id].append(now)
            return True, None
        else:
            oldest = self.request_times[client_id][0]
            retry_after = int((oldest - window_start).total_seconds()) + 1
            return False, retry_after
    
    def _check_fixed_window(self, client_id: str) -> Tuple[bool, Optional[int]]:
        """Check using fixed window algorithm."""
        now = datetime.utcnow()
        
        if client_id not in self.request_times:
            self.request_times[client_id] = [(now, 0)]
            return True, None
        
        window_start, count = self.request_times[client_id][0]
        
        if (now - window_start).total_seconds() < 60:
            # Still in same window
            if count < self.requests_per_minute:
                self.request_times[client_id][0] = (window_start, count + 1)
                return True, None
            else:
                retry_after = 60 - int((now - window_start).total_seconds())
                return False, retry_after
        else:
            # New window
            self.request_times[client_id] = [(now, 1)]
            return True, None
    
    def reset(self, client_id: str) -> None:
        """Reset rate limit for a client."""
        self.buckets.pop(client_id, None)
        self.request_times.pop(client_id, None)


class APIKeyManager:
    """
    Manages API keys for authentication.
    Supports key creation, revocation, and permission management.
    """
    
    def __init__(self):
        """Initialize API key manager."""
        self.keys: Dict[str, Dict] = {}  # key -> metadata
        self.key_hashes: Dict[str, str] = {}  # hash -> key_id
    
    def create_key(
        self,
        name: str,
        permissions: Optional[list] = None,
        rate_limit: Optional[int] = None,
    ) -> str:
        """
        Create a new API key.
        
        Args:
            name: Human-readable key name
            permissions: List of allowed endpoints
            rate_limit: Custom rate limit for this key
        
        Returns:
            Generated API key (plain text, show only once)
        """
        key = f"fraudguard_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        key_id = secrets.token_hex(8)
        
        self.keys[key_id] = {
            "name": name,
            "key_hash": key_hash,
            "permissions": permissions or ["*"],
            "rate_limit": rate_limit,
            "active": True,
            "created_at": datetime.utcnow().isoformat(),
            "last_used": None,
            "request_count": 0,
        }
        
        self.key_hashes[key_hash] = key_id
        
        return key
    
    def validate_key(self, key: str) -> Tuple[bool, Optional[Dict]]:
        """
        Validate an API key.
        
        Args:
            key: API key to validate
        
        Returns:
            (valid, key_metadata)
        """
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        
        if key_hash not in self.key_hashes:
            return False, None
        
        key_id = self.key_hashes[key_hash]
        key_data = self.keys[key_id]
        
        if not key_data["active"]:
            return False, None
        
        # Update usage stats
        key_data["last_used"] = datetime.utcnow().isoformat()
        key_data["request_count"] += 1
        
        return True, key_data
    
    def revoke_key(self, key_id: str) -> bool:
        """Revoke an API key."""
        if key_id not in self.keys:
            return False
        
        self.keys[key_id]["active"] = False
        return True
    
    def list_keys(self) -> list:
        """List all API keys (without revealing secrets)."""
        return [
            {
                "key_id": key_id,
                "name": data["name"],
                "active": data["active"],
                "created_at": data["created_at"],
                "last_used": data["last_used"],
                "request_count": data["request_count"],
            }
            for key_id, data in self.keys.items()
        ]


class JWTManager:
    """
    Manages JWT token generation and validation.
    For production authentication.
    """
    
    def __init__(
        self,
        secret_key: str,
        algorithm: str = "HS256",
        expiration_hours: int = 24,
    ):
        """
        Initialize JWT manager.
        
        Args:
            secret_key: Secret key for signing
            algorithm: JWT algorithm
            expiration_hours: Token expiration time
        """
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.expiration_hours = expiration_hours
    
    def create_token(
        self,
        user_id: str,
        permissions: Optional[list] = None,
        custom_claims: Optional[Dict] = None,
    ) -> str:
        """
        Create a JWT token.
        
        Args:
            user_id: User identifier
            permissions: Allowed scopes
            custom_claims: Additional claims
        
        Returns:
            JWT token string
        """
        now = datetime.utcnow()
        expiration = now + timedelta(hours=self.expiration_hours)
        
        payload = {
            "user_id": user_id,
            "iat": now,
            "exp": expiration,
            "permissions": permissions or ["*"],
        }
        
        if custom_claims:
            payload.update(custom_claims)
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Tuple[bool, Optional[Dict]]:
        """
        Verify a JWT token.
        
        Args:
            token: JWT token to verify
        
        Returns:
            (valid, payload)
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return True, payload
        except jwt.InvalidTokenError as e:
            return False, None
        except jwt.ExpiredSignatureError:
            return False, None


class PermissionChecker:
    """
    Checks user/API key permissions against endpoint requirements.
    """
    
    ENDPOINT_PERMISSIONS = {
        "/predict": ["predict", "*"],
        "/explain": ["explain", "*"],
        "/features": ["read", "features", "*"],
        "/metrics": ["read", "metrics", "*"],
        "/status": ["read", "*"],
        "/health": ["*"],
        "/control/start": ["admin", "control", "*"],
        "/control/stop": ["admin", "control", "*"],
        "/control/config": ["admin", "control", "*"],
        "/demo-data": ["read", "demo", "*"],
    }
    
    @staticmethod
    def has_permission(endpoint: str, permissions: list) -> bool:
        """
        Check if permissions allow accessing endpoint.
        
        Args:
            endpoint: API endpoint path
            permissions: User/key permissions
        
        Returns:
            Whether access is allowed
        """
        required = PermissionChecker.ENDPOINT_PERMISSIONS.get(endpoint, ["*"])
        
        # Check if any permission satisfies requirement
        for perm in permissions:
            if perm in required or perm == "*":
                return True
        
        return False


# Global instances
_rate_limiter: Optional[RateLimiter] = None
_api_key_manager: Optional[APIKeyManager] = None
_jwt_manager: Optional[JWTManager] = None


def get_rate_limiter() -> RateLimiter:
    """Get or create global rate limiter."""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter(
            requests_per_minute=1000,
            burst_size=100,
        )
    return _rate_limiter


def get_api_key_manager() -> APIKeyManager:
    """Get or create global API key manager."""
    global _api_key_manager
    if _api_key_manager is None:
        _api_key_manager = APIKeyManager()
    return _api_key_manager


def get_jwt_manager(secret_key: str = "dev-secret-change-in-prod") -> JWTManager:
    """Get or create global JWT manager."""
    global _jwt_manager
    if _jwt_manager is None:
        _jwt_manager = JWTManager(secret_key=secret_key)
    return _jwt_manager
