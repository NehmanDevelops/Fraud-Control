"""
Advanced error handling and custom exceptions for FraudGuard API.
Provides structured error responses with detailed context.
"""

from typing import Optional, Any, Dict
from fastapi import HTTPException, status
import traceback


class FraudGuardException(Exception):
    """Base exception for all FraudGuard errors."""
    
    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to JSON-serializable dict."""
        return {
            "error": self.error_code,
            "message": self.message,
            "status_code": self.status_code,
            "details": self.details,
        }
    
    def to_http_exception(self) -> HTTPException:
        """Convert to FastAPI HTTPException."""
        return HTTPException(
            status_code=self.status_code,
            detail=self.to_dict(),
        )


class DatasetNotLoadedError(FraudGuardException):
    """Raised when dataset is not loaded."""
    
    def __init__(self):
        super().__init__(
            message="Dataset not loaded or not available",
            error_code="DATASET_NOT_LOADED",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class ModelNotTrainedError(FraudGuardException):
    """Raised when model is requested but not trained."""
    
    def __init__(self, model_name: str):
        super().__init__(
            message=f"Model '{model_name}' is not trained",
            error_code="MODEL_NOT_TRAINED",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"model": model_name},
        )


class InvalidFeaturesError(FraudGuardException):
    """Raised when features are invalid or mismatched."""
    
    def __init__(self, expected: int, received: int):
        super().__init__(
            message=f"Invalid feature count: expected {expected}, got {received}",
            error_code="INVALID_FEATURES",
            status_code=status.HTTP_400_BAD_REQUEST,
            details={"expected": expected, "received": received},
        )


class PredictionError(FraudGuardException):
    """Raised when prediction fails."""
    
    def __init__(self, reason: str, model: Optional[str] = None):
        details = {}
        if model:
            details["model"] = model
        
        super().__init__(
            message=f"Prediction failed: {reason}",
            error_code="PREDICTION_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )


class ExplanationError(FraudGuardException):
    """Raised when explanation generation fails."""
    
    def __init__(self, reason: str):
        super().__init__(
            message=f"Explanation generation failed: {reason}",
            error_code="EXPLANATION_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class ConfigurationError(FraudGuardException):
    """Raised when configuration is invalid."""
    
    def __init__(self, message: str, config_key: Optional[str] = None):
        details = {}
        if config_key:
            details["config_key"] = config_key
        
        super().__init__(
            message=f"Configuration error: {message}",
            error_code="CONFIG_ERROR",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )


class RateLimitError(FraudGuardException):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, retry_after: int):
        super().__init__(
            message=f"Rate limit exceeded. Retry after {retry_after} seconds.",
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details={"retry_after": retry_after},
        )


class AuthenticationError(FraudGuardException):
    """Raised when authentication fails."""
    
    def __init__(self, reason: str = "Invalid credentials"):
        super().__init__(
            message=reason,
            error_code="AUTHENTICATION_FAILED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class PermissionError(FraudGuardException):
    """Raised when user lacks required permissions."""
    
    def __init__(self, required_permission: str):
        super().__init__(
            message=f"Permission denied. Required: {required_permission}",
            error_code="PERMISSION_DENIED",
            status_code=status.HTTP_403_FORBIDDEN,
            details={"required_permission": required_permission},
        )


class ValidationError(FraudGuardException):
    """Raised when input validation fails."""
    
    def __init__(self, field: str, reason: str):
        super().__init__(
            message=f"Validation error in '{field}': {reason}",
            error_code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={"field": field, "reason": reason},
        )


class ErrorHandler:
    """
    Centralized error handling utility.
    Converts exceptions to structured responses with logging.
    """
    
    @staticmethod
    def format_error(
        exception: Exception,
        include_traceback: bool = False,
    ) -> Dict[str, Any]:
        """
        Format an exception into a structured error response.
        
        Args:
            exception: The exception to format
            include_traceback: Whether to include full traceback (for debugging)
        
        Returns:
            Formatted error dictionary
        """
        if isinstance(exception, FraudGuardException):
            error_dict = exception.to_dict()
        else:
            error_dict = {
                "error": "INTERNAL_SERVER_ERROR",
                "message": str(exception),
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "details": {},
            }
        
        if include_traceback:
            error_dict["traceback"] = traceback.format_exc()
        
        return error_dict
    
    @staticmethod
    def get_http_exception(exception: Exception) -> HTTPException:
        """
        Convert any exception to HTTPException.
        
        Args:
            exception: The exception to convert
        
        Returns:
            HTTPException suitable for FastAPI
        """
        if isinstance(exception, FraudGuardException):
            return exception.to_http_exception()
        
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "INTERNAL_SERVER_ERROR",
                "message": str(exception),
            },
        )


# Exception shortcuts for common patterns
def require_dataset_loaded():
    """Raise error if dataset not loaded."""
    raise DatasetNotLoadedError()


def require_model_trained(model_name: str):
    """Raise error if model not trained."""
    raise ModelNotTrainedError(model_name)


def validate_features(expected: int, received: int):
    """Raise error if features don't match."""
    if expected != received:
        raise InvalidFeaturesError(expected, received)
