"""
Deployment configurations for different environments.
Supports local development, staging, and production.
"""

import os
from typing import Dict, Any

ENV = os.getenv('ENVIRONMENT', 'development')


class Config:
    """Base configuration."""
    DEBUG = False
    TESTING = False
    
    # Database
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///fraudguard.db')
    
    # Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-prod')
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:5173').split(',')
    
    # Model
    MODEL_PATH = os.getenv('MODEL_PATH', './models')
    DATA_PATH = os.getenv('DATA_PATH', './data')
    
    # API
    API_TITLE = 'FraudGuard Simulator API'
    API_VERSION = '1.0.0'
    API_DESCRIPTION = 'Real-time fraud detection with SHAP explanations'


class DevelopmentConfig(Config):
    """Development environment configuration."""
    DEBUG = True
    TESTING = False
    
    # Looser CORS in development
    CORS_ORIGINS = ['*']
    
    # Logging
    LOG_LEVEL = 'DEBUG'


class StagingConfig(Config):
    """Staging environment configuration."""
    DEBUG = False
    TESTING = False
    
    # Staging CORS
    CORS_ORIGINS = [
        'https://staging-frontend.example.com',
        'https://localhost:3000'
    ]
    
    # Logging
    LOG_LEVEL = 'INFO'


class ProductionConfig(Config):
    """Production environment configuration."""
    DEBUG = False
    TESTING = False
    
    # Strict CORS in production
    CORS_ORIGINS = [
        'https://fraudguard.example.com',
        'https://www.fraudguard.example.com'
    ]
    
    # Logging
    LOG_LEVEL = 'WARNING'
    
    # Require secure settings
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable must be set in production")


class TestingConfig(Config):
    """Testing environment configuration."""
    DEBUG = True
    TESTING = True
    
    # Use in-memory database for testing
    DATABASE_URL = 'sqlite:///:memory:'
    
    # Open CORS for testing
    CORS_ORIGINS = ['*']
    
    # Logging
    LOG_LEVEL = 'DEBUG'


# Configuration selector
CONFIG_MAP: Dict[str, type] = {
    'development': DevelopmentConfig,
    'staging': StagingConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}


def get_config() -> Config:
    """Get configuration object based on environment."""
    config_class = CONFIG_MAP.get(ENV, DevelopmentConfig)
    return config_class()


# Export current config
config = get_config()
