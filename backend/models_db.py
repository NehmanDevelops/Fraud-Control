"""
Database models and schemas for FraudGuard persistence layer.
Supports transaction logging, model audit trail, and analytics.
"""

from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict, field


class RiskLevel(str, Enum):
    """Risk level classification."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ModelType(str, Enum):
    """Types of models used."""
    XGBOOST = "xgboost"
    ISOLATION_FOREST = "isolation_forest"
    RULE_BASED = "rule_based"
    ENSEMBLE = "ensemble"


@dataclass
class Transaction:
    """Transaction record for persistence."""
    id: str
    timestamp: str
    amount: float
    risk_score: float
    risk_level: RiskLevel
    is_fraud: bool
    ground_truth: Optional[bool]
    xgboost_score: float
    isolation_forest_score: float
    rule_based_score: float
    features_count: int
    source: str = "simulation"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: Optional[str] = None
    notes: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        import json
        return json.dumps(self.to_dict())


@dataclass
class PredictionLog:
    """Log entry for a prediction."""
    id: str
    transaction_id: str
    timestamp: str
    prediction_score: float
    is_fraud_predicted: bool
    models_used: List[str]
    processing_time_ms: float
    api_endpoint: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class ModelMetrics:
    """Model performance metrics."""
    id: str
    model_name: str
    model_type: ModelType
    evaluation_date: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    confusion_matrix: Dict[str, int]
    test_samples: int
    training_samples: int
    threshold: float = 0.5
    notes: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class AuditLog:
    """Audit trail for system actions."""
    id: str
    action_type: str  # 'model_train', 'model_deploy', 'prediction', 'config_change'
    actor: str  # User or system that performed action
    timestamp: str
    details: Dict[str, Any]
    resource_type: str  # 'model', 'transaction', 'config'
    resource_id: str
    status: str = "success"  # 'success', 'failure', 'in_progress'
    error_message: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class Alert:
    """Fraud alert configuration and history."""
    id: str
    transaction_id: str
    alert_type: str  # 'fraud_detected', 'high_risk', 'threshold_exceeded'
    severity: str  # 'low', 'medium', 'high', 'critical'
    message: str
    timestamp: str
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    action_taken: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class FraudPattern:
    """Identified fraud pattern for detection."""
    id: str
    name: str
    description: str
    pattern_type: str  # 'rule_based', 'learned', 'heuristic'
    conditions: Dict[str, Any]  # Feature conditions that trigger pattern
    severity: str  # 'low', 'medium', 'high'
    frequency: int  # How many times this pattern occurred
    first_seen: str
    last_seen: str
    enabled: bool = True
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class SystemConfig:
    """System configuration and settings."""
    id: str
    config_key: str
    config_value: Any
    description: str
    category: str  # 'model', 'api', 'database', 'general'
    is_sensitive: bool = False
    updated_by: str = "system"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


class DatabaseSchema:
    """
    Schema definition for FraudGuard database.
    Supports SQLite, PostgreSQL, MySQL.
    """
    
    TABLES = {
        "transactions": {
            "columns": [
                ("id", "TEXT PRIMARY KEY"),
                ("timestamp", "TEXT NOT NULL"),
                ("amount", "REAL NOT NULL"),
                ("risk_score", "REAL NOT NULL"),
                ("risk_level", "TEXT NOT NULL"),
                ("is_fraud", "BOOLEAN NOT NULL"),
                ("ground_truth", "BOOLEAN"),
                ("xgboost_score", "REAL NOT NULL"),
                ("isolation_forest_score", "REAL NOT NULL"),
                ("rule_based_score", "REAL NOT NULL"),
                ("features_count", "INTEGER NOT NULL"),
                ("source", "TEXT DEFAULT 'simulation'"),
                ("created_at", "TEXT NOT NULL"),
                ("updated_at", "TEXT"),
                ("notes", "TEXT"),
            ],
            "indexes": [
                ("transactions_timestamp", ["timestamp"]),
                ("transactions_is_fraud", ["is_fraud"]),
                ("transactions_risk_level", ["risk_level"]),
            ]
        },
        "prediction_logs": {
            "columns": [
                ("id", "TEXT PRIMARY KEY"),
                ("transaction_id", "TEXT NOT NULL"),
                ("timestamp", "TEXT NOT NULL"),
                ("prediction_score", "REAL NOT NULL"),
                ("is_fraud_predicted", "BOOLEAN NOT NULL"),
                ("models_used", "TEXT NOT NULL"),  # JSON string
                ("processing_time_ms", "REAL NOT NULL"),
                ("api_endpoint", "TEXT NOT NULL"),
                ("user_agent", "TEXT"),
                ("ip_address", "TEXT"),
                ("created_at", "TEXT NOT NULL"),
            ],
            "indexes": [
                ("pred_logs_transaction_id", ["transaction_id"]),
                ("pred_logs_timestamp", ["timestamp"]),
            ]
        },
        "model_metrics": {
            "columns": [
                ("id", "TEXT PRIMARY KEY"),
                ("model_name", "TEXT NOT NULL"),
                ("model_type", "TEXT NOT NULL"),
                ("evaluation_date", "TEXT NOT NULL"),
                ("accuracy", "REAL NOT NULL"),
                ("precision", "REAL NOT NULL"),
                ("recall", "REAL NOT NULL"),
                ("f1_score", "REAL NOT NULL"),
                ("roc_auc", "REAL NOT NULL"),
                ("confusion_matrix", "TEXT NOT NULL"),  # JSON string
                ("test_samples", "INTEGER NOT NULL"),
                ("training_samples", "INTEGER NOT NULL"),
                ("threshold", "REAL DEFAULT 0.5"),
                ("notes", "TEXT"),
                ("created_at", "TEXT NOT NULL"),
            ],
            "indexes": [
                ("metrics_model_type", ["model_type"]),
                ("metrics_date", ["evaluation_date"]),
            ]
        },
        "audit_logs": {
            "columns": [
                ("id", "TEXT PRIMARY KEY"),
                ("action_type", "TEXT NOT NULL"),
                ("actor", "TEXT NOT NULL"),
                ("timestamp", "TEXT NOT NULL"),
                ("details", "TEXT NOT NULL"),  # JSON string
                ("resource_type", "TEXT NOT NULL"),
                ("resource_id", "TEXT NOT NULL"),
                ("status", "TEXT DEFAULT 'success'"),
                ("error_message", "TEXT"),
                ("created_at", "TEXT NOT NULL"),
            ],
            "indexes": [
                ("audit_action_type", ["action_type"]),
                ("audit_resource", ["resource_type", "resource_id"]),
                ("audit_timestamp", ["timestamp"]),
            ]
        },
        "alerts": {
            "columns": [
                ("id", "TEXT PRIMARY KEY"),
                ("transaction_id", "TEXT NOT NULL"),
                ("alert_type", "TEXT NOT NULL"),
                ("severity", "TEXT NOT NULL"),
                ("message", "TEXT NOT NULL"),
                ("timestamp", "TEXT NOT NULL"),
                ("acknowledged", "BOOLEAN DEFAULT 0"),
                ("acknowledged_by", "TEXT"),
                ("acknowledged_at", "TEXT"),
                ("action_taken", "TEXT"),
                ("created_at", "TEXT NOT NULL"),
            ],
            "indexes": [
                ("alerts_severity", ["severity"]),
                ("alerts_status", ["acknowledged"]),
                ("alerts_timestamp", ["timestamp"]),
            ]
        },
        "fraud_patterns": {
            "columns": [
                ("id", "TEXT PRIMARY KEY"),
                ("name", "TEXT NOT NULL UNIQUE"),
                ("description", "TEXT NOT NULL"),
                ("pattern_type", "TEXT NOT NULL"),
                ("conditions", "TEXT NOT NULL"),  # JSON string
                ("severity", "TEXT NOT NULL"),
                ("frequency", "INTEGER DEFAULT 0"),
                ("first_seen", "TEXT NOT NULL"),
                ("last_seen", "TEXT NOT NULL"),
                ("enabled", "BOOLEAN DEFAULT 1"),
                ("created_at", "TEXT NOT NULL"),
                ("updated_at", "TEXT"),
            ],
            "indexes": [
                ("patterns_severity", ["severity"]),
                ("patterns_enabled", ["enabled"]),
            ]
        },
        "system_config": {
            "columns": [
                ("id", "TEXT PRIMARY KEY"),
                ("config_key", "TEXT NOT NULL UNIQUE"),
                ("config_value", "TEXT NOT NULL"),
                ("description", "TEXT NOT NULL"),
                ("category", "TEXT NOT NULL"),
                ("is_sensitive", "BOOLEAN DEFAULT 0"),
                ("updated_by", "TEXT DEFAULT 'system'"),
                ("created_at", "TEXT NOT NULL"),
                ("updated_at", "TEXT"),
            ],
            "indexes": [
                ("config_category", ["category"]),
            ]
        },
    }
    
    @staticmethod
    def get_table_definitions() -> Dict[str, str]:
        """Get SQL CREATE TABLE statements."""
        definitions = {}
        for table_name, schema in DatabaseSchema.TABLES.items():
            columns_sql = ", ".join([f"{col[0]} {col[1]}" for col in schema["columns"]])
            definitions[table_name] = f"CREATE TABLE IF NOT EXISTS {table_name} ({columns_sql})"
        return definitions
    
    @staticmethod
    def get_index_definitions() -> Dict[str, str]:
        """Get SQL CREATE INDEX statements."""
        definitions = {}
        for table_name, schema in DatabaseSchema.TABLES.items():
            for index_name, columns in schema.get("indexes", []):
                columns_sql = ", ".join(columns)
                definitions[index_name] = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({columns_sql})"
        return definitions
