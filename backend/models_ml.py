"""
Machine learning models for fraud detection.
Implements Isolation Forest (unsupervised) and XGBoost (supervised).
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler
from typing import Dict, Tuple, Optional
import joblib
from pathlib import Path


class FraudDetectionModels:
    """Container for fraud detection models."""
    
    def __init__(self):
        """Initialize models container."""
        self.isolation_forest = None
        self.xgboost = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.models_dir = Path(__file__).parent / "models"
        self.models_dir.mkdir(exist_ok=True)
        
    def train_isolation_forest(self, X_train: np.ndarray, contamination: float = 0.01) -> None:
        """
        Train Isolation Forest for anomaly detection.
        
        Args:
            X_train: Training features (assumed pre-scaled)
            contamination: Expected proportion of outliers
        """
        print("Training Isolation Forest...")
        self.isolation_forest = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        self.isolation_forest.fit(X_train)
        print("Isolation Forest trained.")
        
    def train_xgboost(self, X_train: np.ndarray, y_train: np.ndarray) -> None:
        """
        Train XGBoost classifier for supervised fraud detection.
        
        Args:
            X_train: Training features
            y_train: Training labels
        """
        print("Training XGBoost...")
        self.xgboost = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.9,
            colsample_bytree=0.8,
            random_state=42,
            scale_pos_weight=(y_train == 0).sum() / (y_train == 1).sum(),  # Handle class imbalance
            eval_metric='logloss'
        )
        self.xgboost.fit(X_train, y_train)
        print("XGBoost trained.")
        
    def predict_isolation_forest(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Get predictions from Isolation Forest.
        
        Args:
            X: Features to predict
            
        Returns:
            Tuple of (predictions, anomaly_scores)
            Predictions: -1 (anomaly) or 1 (normal)
            Scores: Raw anomaly scores
        """
        if self.isolation_forest is None:
            raise ValueError("Isolation Forest not trained")
        
        predictions = self.isolation_forest.predict(X)  # -1 or 1
        scores = self.isolation_forest.score_samples(X)  # Lower = more anomalous
        
        # Convert to 0-1 probability scale (invert so higher = more anomalous)
        anomaly_probs = 1 - (scores - scores.min()) / (scores.max() - scores.min())
        
        return predictions, anomaly_probs
    
    def predict_xgboost(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Get predictions from XGBoost.
        
        Args:
            X: Features to predict
            
        Returns:
            Tuple of (class_predictions, fraud_probabilities)
        """
        if self.xgboost is None:
            raise ValueError("XGBoost not trained")
        
        predictions = self.xgboost.predict(X)
        probabilities = self.xgboost.predict_proba(X)[:, 1]  # Probability of fraud
        
        return predictions, probabilities
    
    def get_feature_importance(self) -> Dict[str, float]:
        """
        Get feature importance from XGBoost.
        
        Returns:
            Dictionary of feature names to importance scores
        """
        if self.xgboost is None:
            raise ValueError("XGBoost not trained")
        
        importances = self.xgboost.feature_importances_
        feature_importance_dict = {}
        
        if self.feature_names:
            for name, importance in zip(self.feature_names, importances):
                feature_importance_dict[name] = float(importance)
        else:
            for i, importance in enumerate(importances):
                feature_importance_dict[f"Feature_{i}"] = float(importance)
        
        return dict(sorted(feature_importance_dict.items(), key=lambda x: x[1], reverse=True))
    
    def save_models(self, prefix: str = "fraud_detection") -> None:
        """
        Save trained models to disk.
        
        Args:
            prefix: Prefix for model file names
        """
        if self.isolation_forest:
            joblib.dump(self.isolation_forest, self.models_dir / f"{prefix}_isolation_forest.pkl")
        if self.xgboost:
            joblib.dump(self.xgboost, self.models_dir / f"{prefix}_xgboost.pkl")
        if self.scaler:
            joblib.dump(self.scaler, self.models_dir / f"{prefix}_scaler.pkl")
        print(f"Models saved to {self.models_dir}")
        
    def load_models(self, prefix: str = "fraud_detection") -> None:
        """
        Load trained models from disk.
        
        Args:
            prefix: Prefix of model file names
        """
        try:
            self.isolation_forest = joblib.load(self.models_dir / f"{prefix}_isolation_forest.pkl")
            self.xgboost = joblib.load(self.models_dir / f"{prefix}_xgboost.pkl")
            self.scaler = joblib.load(self.models_dir / f"{prefix}_scaler.pkl")
            print(f"Models loaded from {self.models_dir}")
        except FileNotFoundError:
            print("Model files not found. Please train models first.")


class RuleBasedDetector:
    """Rule-based fraud detection using transaction heuristics."""
    
    # These thresholds should be calibrated based on dataset analysis
    HIGH_AMOUNT_THRESHOLD = 500.0  # USD
    UNUSUAL_TIME_HOURS = [2, 3, 4, 5]  # 2-5 AM typically suspicious
    
    @staticmethod
    def check_high_amount(amount: float) -> bool:
        """Check if transaction amount is unusually high."""
        return amount > RuleBasedDetector.HIGH_AMOUNT_THRESHOLD
    
    @staticmethod
    def check_unusual_time(hour: int) -> bool:
        """Check if transaction time is unusual."""
        return hour in RuleBasedDetector.UNUSUAL_TIME_HOURS
    
    @staticmethod
    def compute_rule_score(amount: float, hour: int) -> float:
        """
        Compute rule-based fraud score (0-1).
        
        Args:
            amount: Transaction amount
            hour: Transaction hour (0-23)
            
        Returns:
            Rule-based risk score
        """
        score = 0.0
        
        if RuleBasedDetector.check_high_amount(amount):
            score += 0.3
        
        if RuleBasedDetector.check_unusual_time(hour):
            score += 0.2
        
        return min(score, 1.0)
