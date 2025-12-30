"""
SHAP explainability module for fraud detection models.
Provides per-transaction and global feature importance explanations.
"""

import numpy as np
import shap
from typing import Dict, List, Optional
from xgboost import XGBClassifier
import json


class SHAPExplainer:
    """Handles SHAP explanations for fraud detection."""
    
    def __init__(self, model: XGBClassifier, X_background: np.ndarray, feature_names: List[str]):
        """
        Initialize SHAP explainer.
        
        Args:
            model: Trained XGBoost model
            X_background: Background data for SHAP (usually a sample of training data)
            feature_names: List of feature names
        """
        self.model = model
        self.X_background = X_background
        self.feature_names = feature_names
        
        # Create TreeExplainer for XGBoost
        print("Initializing SHAP TreeExplainer...")
        self.explainer = shap.TreeExplainer(model)
        print("SHAP explainer initialized.")
        
    def get_global_feature_importance(self, X: np.ndarray, top_k: int = 10) -> Dict[str, float]:
        """
        Get global feature importance using SHAP values.
        
        Args:
            X: Features to explain (usually test set)
            top_k: Number of top features to return
            
        Returns:
            Dictionary of top feature names to mean absolute SHAP values
        """
        print("Computing SHAP values for global importance...")
        shap_values = self.explainer.shap_values(X)
        
        # For binary classification, take the positive class
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
        
        # Mean absolute SHAP values
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        
        feature_importance = {}
        for name, importance in zip(self.feature_names, mean_abs_shap):
            feature_importance[name] = float(importance)
        
        # Sort and get top-k
        sorted_importance = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
        return dict(sorted_importance[:top_k])
    
    def explain_transaction(self, transaction: np.ndarray, top_k: int = 5) -> Dict:
        """
        Explain a single transaction prediction using SHAP waterfall.
        
        Args:
            transaction: Single transaction features (1D array)
            top_k: Number of top contributing features to include
            
        Returns:
            Dictionary with explanation data
        """
        if transaction.ndim == 1:
            transaction = transaction.reshape(1, -1)
        
        # Get SHAP values for this transaction
        shap_values = self.explainer.shap_values(transaction)
        
        # For binary classification
        if isinstance(shap_values, list):
            shap_values_fraud = shap_values[1][0]
        else:
            shap_values_fraud = shap_values[0]
        
        # Base value and prediction
        base_value = float(self.explainer.expected_value)
        if isinstance(self.explainer.expected_value, list):
            base_value = float(self.explainer.expected_value[1])
        
        prediction_value = float(self.model.predict_proba(transaction)[0][1])
        
        # Get feature contributions
        feature_contributions = []
        for i, (feature_name, shap_val) in enumerate(zip(self.feature_names, shap_values_fraud)):
            feature_contributions.append({
                'feature': feature_name,
                'value': float(transaction[0][i]),
                'shap': float(shap_val),
                'abs_shap': float(abs(shap_val))
            })
        
        # Sort by absolute SHAP value and get top-k
        feature_contributions.sort(key=lambda x: x['abs_shap'], reverse=True)
        top_features = feature_contributions[:top_k]
        
        return {
            'base_value': base_value,
            'prediction': prediction_value,
            'features': top_features,
            'feature_count': len(self.feature_names)
        }
    
    def get_waterfall_data(self, transaction: np.ndarray) -> List[Dict]:
        """
        Get data formatted for waterfall chart visualization.
        
        Args:
            transaction: Single transaction features
            
        Returns:
            List of values for waterfall visualization
        """
        explanation = self.explain_transaction(transaction, top_k=8)
        
        waterfall_data = []
        
        # Base value
        waterfall_data.append({
            'name': 'Base Value',
            'value': explanation['base_value'],
            'type': 'base'
        })
        
        # Feature contributions
        cumulative = explanation['base_value']
        for feature in explanation['features']:
            waterfall_data.append({
                'name': feature['feature'],
                'value': feature['shap'],
                'cumulative': cumulative + feature['shap'],
                'type': 'positive' if feature['shap'] > 0 else 'negative'
            })
            cumulative += feature['shap']
        
        # Final prediction
        waterfall_data.append({
            'name': 'Prediction',
            'value': explanation['prediction'],
            'type': 'total'
        })
        
        return waterfall_data
