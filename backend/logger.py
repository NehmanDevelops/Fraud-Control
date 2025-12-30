"""
Logging configuration for FraudGuard Simulator API.
Handles request/response logging, error tracking, and audit trails.
"""

import logging
import logging.handlers
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import traceback


class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs logs in JSON format for easy parsing."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        if hasattr(record, "extra_data"):
            log_data.update(record.extra_data)
        
        return json.dumps(log_data)


def setup_logger(
    name: str,
    log_file: Optional[str] = None,
    level: int = logging.INFO,
) -> logging.Logger:
    """
    Set up a logger with console and file handlers.
    
    Args:
        name: Logger name
        log_file: Optional path to log file
        level: Logging level (default: INFO)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Remove existing handlers
    logger.handlers.clear()
    
    # Console handler (readable format)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    console_formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)-8s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler (JSON format) if specified
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(JSONFormatter())
        logger.addHandler(file_handler)
    
    return logger


class APILogger:
    """
    High-level API logging helper for request/response tracking.
    Logs all API interactions for audit and debugging.
    """
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    def log_request(
        self,
        method: str,
        path: str,
        query_params: Optional[Dict[str, Any]] = None,
        body: Optional[Dict[str, Any]] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Log incoming API request."""
        extra_data = {
            "type": "request",
            "method": method,
            "path": path,
        }
        
        if query_params:
            extra_data["query_params"] = query_params
        if body and method != "GET":
            # Don't log sensitive data
            safe_body = {k: v for k, v in body.items() if k not in ["password", "token", "secret"]}
            extra_data["body"] = safe_body
        if user_agent:
            extra_data["user_agent"] = user_agent
        if ip_address:
            extra_data["ip_address"] = ip_address
        
        record = logging.LogRecord(
            name=self.logger.name,
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="API Request",
            args=(),
            exc_info=None,
        )
        record.extra_data = extra_data
        self.logger.handle(record)
    
    def log_response(
        self,
        status_code: int,
        path: str,
        duration_ms: float,
        body_size: int,
    ) -> None:
        """Log outgoing API response."""
        extra_data = {
            "type": "response",
            "status_code": status_code,
            "path": path,
            "duration_ms": round(duration_ms, 2),
            "body_size_bytes": body_size,
        }
        
        record = logging.LogRecord(
            name=self.logger.name,
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="API Response",
            args=(),
            exc_info=None,
        )
        record.extra_data = extra_data
        self.logger.handle(record)
    
    def log_prediction(
        self,
        transaction_id: str,
        features_count: int,
        prediction_score: float,
        is_fraud: bool,
        models_used: list,
        duration_ms: float,
    ) -> None:
        """Log fraud prediction for audit trail."""
        extra_data = {
            "type": "prediction",
            "transaction_id": transaction_id,
            "features_count": features_count,
            "prediction_score": round(prediction_score, 4),
            "is_fraud": is_fraud,
            "models_used": models_used,
            "duration_ms": round(duration_ms, 2),
        }
        
        record = logging.LogRecord(
            name=self.logger.name,
            level=logging.INFO if is_fraud else logging.DEBUG,
            pathname="",
            lineno=0,
            msg=f"Fraud Prediction: {transaction_id}",
            args=(),
            exc_info=None,
        )
        record.extra_data = extra_data
        self.logger.handle(record)
    
    def log_error(
        self,
        error_type: str,
        message: str,
        path: str,
        stack_trace: Optional[str] = None,
    ) -> None:
        """Log API errors with full context."""
        extra_data = {
            "type": "error",
            "error_type": error_type,
            "message": message,
            "path": path,
        }
        
        if stack_trace:
            extra_data["stack_trace"] = stack_trace
        
        record = logging.LogRecord(
            name=self.logger.name,
            level=logging.ERROR,
            pathname="",
            lineno=0,
            msg=f"API Error: {error_type}",
            args=(),
            exc_info=None,
        )
        record.extra_data = extra_data
        self.logger.handle(record)
    
    def log_model_training(
        self,
        model_name: str,
        dataset_size: int,
        duration_ms: float,
        metrics: Dict[str, float],
    ) -> None:
        """Log model training event."""
        extra_data = {
            "type": "model_training",
            "model_name": model_name,
            "dataset_size": dataset_size,
            "duration_ms": round(duration_ms, 2),
            "metrics": {k: round(v, 4) if isinstance(v, float) else v for k, v in metrics.items()},
        }
        
        record = logging.LogRecord(
            name=self.logger.name,
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg=f"Model Training: {model_name}",
            args=(),
            exc_info=None,
        )
        record.extra_data = extra_data
        self.logger.handle(record)


# Create main logger instance
logger = setup_logger(
    "fraudguard",
    log_file="logs/fraudguard.log",
    level=logging.INFO,
)

# Create API logger
api_logger = APILogger(logger)
