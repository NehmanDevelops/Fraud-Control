"""
Unit and integration tests for FraudGuard backend.
Tests cover models, API endpoints, and utility functions.
"""

import pytest
import json
import numpy as np
from datetime import datetime
from typing import Dict, Any


# ===== Dataset Tests =====
class TestDataset:
    """Test dataset loading and preprocessing."""
    
    def test_dataset_loader_initialization(self):
        """Test DatasetLoader can be initialized."""
        from backend.dataset import DatasetLoader
        loader = DatasetLoader()
        assert loader is not None
    
    def test_dataset_load_data(self):
        """Test dataset loading."""
        from backend.dataset import DatasetLoader
        loader = DatasetLoader()
        data, labels = loader.load_data()
        assert data is not None
        assert labels is not None
        assert len(data) == len(labels)
    
    def test_dataset_feature_count(self):
        """Test dataset has correct number of features."""
        from backend.dataset import DatasetLoader
        from backend.config import MODEL_CONFIG
        loader = DatasetLoader()
        data, _ = loader.load_data()
        assert data.shape[1] == MODEL_CONFIG["n_features"]
    
    def test_dataset_stratified_split(self):
        """Test train/test split maintains class distribution."""
        from backend.dataset import DatasetLoader
        loader = DatasetLoader()
        X_train, X_test, y_train, y_test = loader.prepare_training_data()
        
        train_fraud_ratio = np.sum(y_train) / len(y_train)
        test_fraud_ratio = np.sum(y_test) / len(y_test)
        
        # Should be similar (within 1%)
        assert abs(train_fraud_ratio - test_fraud_ratio) < 0.01


# ===== Model Tests =====
class TestFraudDetectionModels:
    """Test ML models for fraud detection."""
    
    @pytest.fixture
    def sample_features(self):
        """Provide sample feature data."""
        return np.random.randn(1, 30).astype(np.float32)
    
    def test_xgboost_prediction(self, sample_features):
        """Test XGBoost model can make predictions."""
        from backend.models_ml import FraudDetectionModels
        models = FraudDetectionModels()
        models.train_xgboost()
        
        score = models.predict_xgboost(sample_features)
        assert 0 <= score <= 1
    
    def test_isolation_forest_prediction(self, sample_features):
        """Test Isolation Forest model can make predictions."""
        from backend.models_ml import FraudDetectionModels
        models = FraudDetectionModels()
        models.train_isolation_forest()
        
        score = models.predict_isolation_forest(sample_features)
        assert 0 <= score <= 1
    
    def test_ensemble_prediction(self, sample_features):
        """Test ensemble model produces valid scores."""
        from backend.models_ml import FraudDetectionModels
        from backend.utils import get_ensemble_score
        
        models = FraudDetectionModels()
        models.train_xgboost()
        models.train_isolation_forest()
        
        xgb_score = models.predict_xgboost(sample_features)
        if_score = models.predict_isolation_forest(sample_features)
        rule_score = 0.5
        
        ensemble_score = get_ensemble_score(xgb_score, if_score, rule_score)
        assert 0 <= ensemble_score <= 1
    
    def test_feature_importance(self):
        """Test feature importance can be extracted."""
        from backend.models_ml import FraudDetectionModels
        models = FraudDetectionModels()
        models.train_xgboost()
        
        importance = models.get_feature_importance()
        assert importance is not None
        assert len(importance) > 0


# ===== Utility Tests =====
class TestUtils:
    """Test utility functions."""
    
    def test_normalize_features(self):
        """Test feature normalization."""
        from backend.utils import normalize_features
        
        features = np.array([[1, 2, 3], [4, 5, 6]], dtype=np.float32)
        normalized = normalize_features(features)
        
        assert normalized.shape == features.shape
        assert not np.any(np.isnan(normalized))
    
    def test_get_ensemble_score(self):
        """Test ensemble scoring."""
        from backend.utils import get_ensemble_score
        
        xgb = 0.8
        isolation_forest = 0.6
        rule_based = 0.5
        
        score = get_ensemble_score(xgb, isolation_forest, rule_based)
        
        # Check weights: 50% XGB, 30% IF, 20% Rule
        expected = 0.5 * xgb + 0.3 * isolation_forest + 0.2 * rule_based
        assert abs(score - expected) < 0.001
    
    def test_calculate_metrics(self):
        """Test metrics calculation."""
        from backend.utils import calculate_metrics
        
        y_true = np.array([0, 1, 1, 0, 1])
        y_pred = np.array([0, 1, 0, 0, 1])
        
        metrics = calculate_metrics(y_true, y_pred)
        
        assert "accuracy" in metrics
        assert "precision" in metrics
        assert "recall" in metrics
        assert "f1_score" in metrics
        assert all(0 <= v <= 1 for v in metrics.values())


# ===== Exception Tests =====
class TestExceptions:
    """Test custom exception handling."""
    
    def test_invalid_features_error(self):
        """Test InvalidFeaturesError."""
        from backend.exceptions import InvalidFeaturesError
        
        with pytest.raises(InvalidFeaturesError):
            raise InvalidFeaturesError(30, 25)
    
    def test_model_not_trained_error(self):
        """Test ModelNotTrainedError."""
        from backend.exceptions import ModelNotTrainedError
        
        with pytest.raises(ModelNotTrainedError):
            raise ModelNotTrainedError("xgboost")
    
    def test_exception_to_dict(self):
        """Test exception serialization."""
        from backend.exceptions import PredictionError
        
        exc = PredictionError("Test error", model="xgboost")
        exc_dict = exc.to_dict()
        
        assert "error" in exc_dict
        assert "message" in exc_dict
        assert exc_dict["error"] == "PREDICTION_FAILED"


# ===== Database Model Tests =====
class TestDatabaseModels:
    """Test database models."""
    
    def test_transaction_model(self):
        """Test Transaction model."""
        from backend.models_db import Transaction, RiskLevel
        
        tx = Transaction(
            id="test-001",
            timestamp="2025-12-30T12:00:00",
            amount=150.50,
            risk_score=0.75,
            risk_level=RiskLevel.HIGH,
            is_fraud=True,
            ground_truth=True,
            xgboost_score=0.8,
            isolation_forest_score=0.7,
            rule_based_score=0.6,
            features_count=30,
        )
        
        assert tx.id == "test-001"
        assert tx.risk_level == RiskLevel.HIGH
        assert tx.is_fraud is True
        
        tx_dict = tx.to_dict()
        assert "id" in tx_dict
        assert "amount" in tx_dict
    
    def test_prediction_log_model(self):
        """Test PredictionLog model."""
        from backend.models_db import PredictionLog
        
        log = PredictionLog(
            id="log-001",
            transaction_id="tx-001",
            timestamp="2025-12-30T12:00:00",
            prediction_score=0.75,
            is_fraud_predicted=True,
            models_used=["xgboost", "isolation_forest"],
            processing_time_ms=45.5,
            api_endpoint="/predict",
        )
        
        assert log.transaction_id == "tx-001"
        assert log.is_fraud_predicted is True
        assert log.processing_time_ms == 45.5
    
    def test_model_metrics_model(self):
        """Test ModelMetrics model."""
        from backend.models_db import ModelMetrics, ModelType
        
        metrics = ModelMetrics(
            id="metrics-001",
            model_name="xgboost-v1.0",
            model_type=ModelType.XGBOOST,
            evaluation_date="2025-12-30",
            accuracy=0.96,
            precision=0.945,
            recall=0.958,
            f1_score=0.951,
            roc_auc=0.987,
            confusion_matrix={"tp": 100, "fp": 5, "tn": 1000, "fn": 5},
            test_samples=1110,
            training_samples=4890,
        )
        
        assert metrics.accuracy == 0.96
        assert metrics.roc_auc == 0.987
        assert metrics.model_type == ModelType.XGBOOST


# ===== SHAP Explainer Tests =====
class TestSHAPExplainer:
    """Test SHAP explainability."""
    
    def test_shap_explainer_initialization(self):
        """Test SHAPExplainer can be initialized."""
        from backend.shap_explainer import SHAPExplainer
        explainer = SHAPExplainer()
        assert explainer is not None
    
    def test_shap_global_importance(self):
        """Test global feature importance."""
        from backend.shap_explainer import SHAPExplainer
        
        explainer = SHAPExplainer()
        importance = explainer.get_global_feature_importance()
        
        assert importance is not None
        assert len(importance) > 0


# ===== API Request/Response Tests =====
class TestAPILogging:
    """Test API logging."""
    
    def test_logger_initialization(self):
        """Test logger can be initialized."""
        from backend.logger import setup_logger
        logger = setup_logger("test")
        assert logger is not None
    
    def test_api_logger_request_logging(self):
        """Test API request logging."""
        from backend.logger import APILogger, setup_logger
        logger = setup_logger("test")
        api_logger = APILogger(logger)
        
        # Should not raise exception
        api_logger.log_request(
            method="POST",
            path="/predict",
            body={"features": [1, 2, 3]},
        )
    
    def test_api_logger_response_logging(self):
        """Test API response logging."""
        from backend.logger import APILogger, setup_logger
        logger = setup_logger("test")
        api_logger = APILogger(logger)
        
        # Should not raise exception
        api_logger.log_response(
            status_code=200,
            path="/predict",
            duration_ms=45.5,
            body_size=256,
        )


# ===== Model Versioning Tests =====
class TestModelVersioning:
    """Test model versioning system."""
    
    def test_version_manager_initialization(self):
        """Test ModelVersionManager initialization."""
        from backend.model_versioning import ModelVersionManager
        manager = ModelVersionManager()
        assert manager is not None
    
    def test_version_registration(self):
        """Test registering a model version."""
        from backend.model_versioning import ModelVersionManager
        manager = ModelVersionManager()
        
        version = manager.register_version(
            model_name="xgboost",
            model_file="models/xgboost.pkl",
            metrics={"accuracy": 0.96, "recall": 0.958},
            hyperparameters={"max_depth": 5},
            features_count=30,
            training_samples=1000,
            description="v1.0 baseline",
        )
        
        assert version.model_name == "xgboost"
        assert version.accuracy is None  # metrics stored separately
    
    def test_get_latest_version(self):
        """Test retrieving latest version."""
        from backend.model_versioning import ModelVersionManager
        manager = ModelVersionManager()
        
        # Register two versions
        v1 = manager.register_version(
            model_name="test_model",
            model_file="models/v1.pkl",
            metrics={"accuracy": 0.95},
            hyperparameters={},
            features_count=30,
            training_samples=1000,
        )
        
        v2 = manager.register_version(
            model_name="test_model",
            model_file="models/v2.pkl",
            metrics={"accuracy": 0.97},
            hyperparameters={},
            features_count=30,
            training_samples=1000,
        )
        
        latest = manager.get_latest_version("test_model")
        assert latest.version_id == v2.version_id


# ===== Configuration Tests =====
class TestConfiguration:
    """Test configuration loading."""
    
    def test_model_config(self):
        """Test model configuration."""
        from backend.config import MODEL_CONFIG
        
        assert "n_features" in MODEL_CONFIG
        assert MODEL_CONFIG["n_features"] == 30
        assert "ensemble_weights" in MODEL_CONFIG
    
    def test_detection_config(self):
        """Test detection configuration."""
        from backend.config import DETECTION_CONFIG
        
        assert "fraud_threshold" in DETECTION_CONFIG
        assert 0 <= DETECTION_CONFIG["fraud_threshold"] <= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
