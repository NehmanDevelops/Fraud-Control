"""
Configuration and constants for FraudGuard Simulator.
Centralized settings for models, detection thresholds, and UI.
"""

# Model Configuration
MODEL_CONFIG = {
    'xgboost': {
        'n_estimators': 100,
        'max_depth': 6,
        'learning_rate': 0.1,
        'subsample': 0.9,
        'colsample_bytree': 0.8,
        'random_state': 42
    },
    'isolation_forest': {
        'n_estimators': 100,
        'contamination': 0.01,
        'random_state': 42
    }
}

# Detection Thresholds
DETECTION_THRESHOLDS = {
    'high_risk': 0.7,
    'medium_risk': 0.4,
    'low_risk': 0.0
}

# Risk Labels
RISK_LEVELS = {
    'high': 'high',
    'medium': 'medium',
    'low': 'low'
}

# Ensemble Weights
ENSEMBLE_WEIGHTS = {
    'xgboost': 0.5,
    'isolation_forest': 0.3,
    'rule_based': 0.2
}

# Rule-Based Detection Thresholds
RULE_BASED_CONFIG = {
    'high_amount_threshold': 500.0,  # USD
    'unusual_time_hours': [2, 3, 4, 5],  # 2-5 AM
    'high_amount_score': 0.3,
    'unusual_time_score': 0.2
}

# Dataset Configuration
DATASET_CONFIG = {
    'test_size': 0.2,
    'random_state': 42,
    'stratify': True
}

# API Configuration
API_CONFIG = {
    'host': '0.0.0.0',
    'port': 8000,
    'reload': True,
    'log_level': 'info'
}

# WebSocket Configuration
WEBSOCKET_CONFIG = {
    'reconnect_delay': 3,  # seconds
    'max_reconnect_attempts': 5
}

# Frontend Configuration
FRONTEND_CONFIG = {
    'api_base': 'http://localhost:8000',
    'ws_base': 'ws://localhost:8000/ws/stream',
    'default_dark_mode': True,
    'default_transaction_interval': 1.0
}

# Feature Names (30 PCA features + Amount)
FEATURE_COUNT = 30

# Performance Targets (for recruiter demos)
PERFORMANCE_TARGETS = {
    'recall': 0.95,
    'precision': 0.94,
    'f1_score': 0.945,
    'roc_auc': 0.98
}
