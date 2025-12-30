# Security Guidelines for FraudGuard

Comprehensive security best practices and hardening guide for production deployment.

## 1. Authentication & Authorization

### API Key Management
```python
# Generate strong API keys
from backend.auth import get_api_key_manager

manager = get_api_key_manager()
key = manager.create_key(
    name="production_key",
    permissions=["predict", "explain", "metrics"],
    rate_limit=10000
)
# Store key securely - don't commit to git
```

### JWT Tokens
```python
# Generate JWT for user sessions
from backend.auth import get_jwt_manager

jwt_manager = get_jwt_manager(secret_key=os.environ['JWT_SECRET'])
token = jwt_manager.create_token(
    user_id="user123",
    permissions=["predict", "explain"],
    custom_claims={"role": "analyst"}
)
```

---

## 2. Rate Limiting

### Token Bucket Algorithm (Recommended)
```python
from backend.auth import RateLimiter, RateLimitStrategy

limiter = RateLimiter(
    requests_per_minute=1000,
    burst_size=100,
    strategy=RateLimitStrategy.TOKEN_BUCKET
)

# Check if request is allowed
allowed, retry_after = limiter.is_allowed(client_ip)
if not allowed:
    return HTTPException(
        status_code=429,
        detail={"retry_after": retry_after}
    )
```

### Per-Endpoint Limits
```
/predict: 1000 req/min per IP
/explain: 500 req/min per IP
/metrics: 100 req/min per IP
Admin endpoints: 50 req/min per IP
```

---

## 3. Data Security

### Feature Protection
✅ All features are PCA-transformed - no raw customer data exposed
✅ No personally identifiable information in logs
✅ Transaction amounts sanitized in audit logs

### Database Security
```python
# Use parameterized queries to prevent SQL injection
from backend.models_db import DatabaseSchema

# ✓ Safe
cursor.execute(
    "SELECT * FROM transactions WHERE id = ?",
    (transaction_id,)
)

# ✗ Unsafe - never do this
cursor.execute(f"SELECT * FROM transactions WHERE id = '{transaction_id}'")
```

### Sensitive Configuration
```bash
# Store secrets in environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET="$(openssl rand -hex 32)"
export API_KEY_SECRET="$(openssl rand -hex 32)"

# Never commit secrets to git
echo ".env" >> .gitignore
echo "*.key" >> .gitignore
```

---

## 4. HTTPS & TLS

### Production Requirements
```nginx
# Nginx configuration example
server {
    listen 443 ssl http2;
    server_name api.fraudguard.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # TLS 1.2+ only
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Strong ciphers
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Enable HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    location / {
        proxy_pass http://localhost:8000;
    }
}
```

### Let's Encrypt (Free SSL)
```bash
# Obtain certificate
certbot certonly --standalone -d api.fraudguard.example.com

# Auto-renewal
certbot renew --quiet  # Run as cron job daily
```

---

## 5. CORS Configuration

### Allow Only Trusted Domains
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://fraudguard.example.com",
        "https://admin.fraudguard.example.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)
```

---

## 6. Logging & Monitoring

### Secure Logging
```python
from backend.logger import api_logger

# ✓ Safe - sensitive data excluded
api_logger.log_request(
    method="POST",
    path="/predict",
    query_params=None,  # No secrets logged
    body={k: v for k, v in body.items() if k not in ["password", "token"]}
)

# ✗ Never log
api_logger.log_request(body=full_user_data)  # Exposes credentials!
```

### Error Handling
```python
# Don't expose stack traces in production
if not DEBUG:
    # Return generic error message
    return {"error": "Internal server error"}
else:
    # Return detailed stack trace for debugging
    return {"error": traceback.format_exc()}
```

### Intrusion Detection
```bash
# Monitor for suspicious patterns
- Repeated failed authentication attempts
- Unusual request patterns (spike in errors)
- Rate limit violations
- Anomalous IP addresses

# Alert on:
- More than 10 failed auth in 1 minute
- 429 (Too Many Requests) responses
- Error rate > 5%
```

---

## 7. Input Validation

### Feature Validation
```python
from backend.exceptions import validate_features, ValidationError
import numpy as np

def validate_input(features: list) -> None:
    """Validate prediction input."""
    # Check count
    validate_features(expected=30, received=len(features))
    
    # Check type
    if not all(isinstance(f, (int, float)) for f in features):
        raise ValidationError("features", "Must be numeric values")
    
    # Check range (PCA features typically -3 to +3)
    for i, f in enumerate(features):
        if abs(f) > 10:  # Suspicious if > 10 std devs
            raise ValidationError(f"features[{i}]", "Value out of expected range")
```

### API Input Validation
```python
from pydantic import BaseModel, Field, validator

class PredictionRequest(BaseModel):
    features: list = Field(..., min_items=30, max_items=30)
    amount: float = Field(..., gt=0, le=1000000)
    
    @validator("features")
    def validate_features(cls, v):
        if not all(isinstance(x, (int, float)) for x in v):
            raise ValueError("Features must be numeric")
        return v
```

---

## 8. Dependency Security

### Regular Updates
```bash
# Check for vulnerable dependencies
pip install safety
safety check

# Update safely
pip install --upgrade pip
pip install -U -r requirements.txt

# Pin versions for reproducibility
pip freeze > requirements.lock
```

### Dependency Review
```python
# Requirements.txt best practices
# Pin major.minor version, not just major
scikit-learn==1.3.2  # ✓ Good
scikit-learn==1.3    # ⚠ Risky
scikit-learn         # ✗ Very risky
```

---

## 9. Database Security

### Connection Pooling
```python
# Limit connection pool size to prevent resource exhaustion
pool = ConnectionPool(
    max_connections=10,
    min_connections=2,
    max_idle_time=300,
)
```

### Query Timeouts
```python
# Prevent long-running queries from blocking
cursor.execute(
    "SELECT * FROM transactions LIMIT 1000",
    timeout=30  # 30 second timeout
)
```

### Backup & Recovery
```bash
# Regular backups
pg_dump fraudguard_db > backup-$(date +%Y%m%d).sql

# Test recovery periodically
pg_restore < backup.sql  # Verify backup works

# Encrypt backups
gpg --encrypt backup.sql
```

---

## 10. Compliance

### GDPR Compliance
- ✅ PCA features (no raw data)
- ✅ User data encrypted at rest
- ✅ Data deletion supported
- ✅ Audit trail maintained
- ✅ Privacy policy visible

### PCI DSS (Payment Card Industry)
- ✅ No credit card data stored
- ✅ All features are computed from transactions (not raw)
- ✅ Encrypted communications (HTTPS)
- ✅ Access logging enabled

### Financial Regulations
- ✅ Model explainability (SHAP)
- ✅ Performance tracking
- ✅ Bias monitoring
- ✅ Audit trail

---

## 11. Deployment Checklist

Before going to production:

- [ ] All secrets moved to environment variables
- [ ] HTTPS/TLS enabled
- [ ] CORS restricted to trusted domains
- [ ] Rate limiting configured
- [ ] Authentication/authorization enabled
- [ ] Logging configured with no sensitive data
- [ ] Database encrypted and backed up
- [ ] Dependencies audited and updated
- [ ] Input validation implemented
- [ ] Error handling sanitized
- [ ] Security headers configured
- [ ] Monitoring and alerting set up
- [ ] Incident response plan documented
- [ ] Security audit completed
- [ ] Compliance review passed

---

## 12. Incident Response

### Breach Detection
```bash
# Check logs for unauthorized access
grep "401\|403\|429" /var/log/fraudguard/api.log | tail -1000

# Monitor for anomalies
grep "ERROR\|CRITICAL" /var/log/fraudguard/api.log
```

### Quick Response
```bash
# 1. Identify and isolate affected systems
systemctl stop fraudguard-api

# 2. Rotate compromised keys
python -c "from backend.auth import get_api_key_manager; mgr = get_api_key_manager(); mgr.revoke_key('compromised_key_id')"

# 3. Generate new secrets
export JWT_SECRET=$(openssl rand -hex 32)
export API_KEY_SECRET=$(openssl rand -hex 32)

# 4. Restart with new secrets
systemctl start fraudguard-api

# 5. Notify users
# Send security alert emails
```

---

## References

- OWASP Top 10: https://owasp.org/Top10/
- CWE Top 25: https://cwe.mitre.org/top25/
- GDPR Compliance: https://gdpr-info.eu/
- PCI DSS: https://www.pcisecuritystandards.org/
