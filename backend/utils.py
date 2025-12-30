"""
Utility functions for FraudGuard Simulator.
Includes data preprocessing, metrics calculation, and common helpers.
"""

import numpy as np
from typing import Dict, Tuple, List
from sklearn.metrics import confusion_matrix, roc_auc_score
import logging

logger = logging.getLogger(__name__)


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_proba: np.ndarray = None) -> Dict[str, float]:
    """
    Calculate comprehensive evaluation metrics.
    
    Args:
        y_true: Ground truth labels
        y_pred: Predicted labels (binary)
        y_proba: Prediction probabilities (optional, for AUC)
        
    Returns:
        Dictionary of metrics
    """
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    
    # Basic metrics
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
    accuracy = (tp + tn) / (tp + tn + fp + fn)
    
    metrics = {
        'recall': recall,
        'precision': precision,
        'f1_score': f1,
        'specificity': specificity,
        'accuracy': accuracy,
        'tp': int(tp),
        'tn': int(tn),
        'fp': int(fp),
        'fn': int(fn)
    }
    
    # AUC if probabilities provided
    if y_proba is not None:
        try:
            auc = roc_auc_score(y_true, y_proba)
            metrics['roc_auc'] = auc
        except Exception as e:
            logger.warning(f"Could not calculate AUC: {e}")
    
    return metrics


def normalize_scores(scores: np.ndarray) -> np.ndarray:
    """
    Normalize scores to [0, 1] range using min-max scaling.
    
    Args:
        scores: Raw scores
        
    Returns:
        Normalized scores in [0, 1]
    """
    min_score = scores.min()
    max_score = scores.max()
    
    if max_score == min_score:
        return np.ones_like(scores) * 0.5
    
    return (scores - min_score) / (max_score - min_score)


def ensemble_prediction(xgb_score: float, if_score: float, rule_score: float,
                       weights: Dict[str, float] = None) -> float:
    """
    Combine predictions from multiple models using weighted average.
    
    Args:
        xgb_score: XGBoost fraud probability [0, 1]
        if_score: Isolation Forest anomaly score [0, 1]
        rule_score: Rule-based score [0, 1]
        weights: Weight dictionary {model_name: weight}
        
    Returns:
        Ensemble score [0, 1]
    """
    if weights is None:
        weights = {'xgboost': 0.5, 'isolation_forest': 0.3, 'rule_based': 0.2}
    
    ensemble = (
        weights.get('xgboost', 0.5) * xgb_score +
        weights.get('isolation_forest', 0.3) * if_score +
        weights.get('rule_based', 0.2) * rule_score
    )
    
    return min(ensemble, 1.0)


def categorize_risk_level(score: float) -> str:
    """
    Categorize fraud risk score into risk levels.
    
    Args:
        score: Risk score [0, 1]
        
    Returns:
        Risk level: 'low', 'medium', or 'high'
    """
    if score > 0.7:
        return 'high'
    elif score > 0.4:
        return 'medium'
    else:
        return 'low'


def format_currency(amount: float) -> str:
    """Format amount as USD currency string."""
    return f"${amount:,.2f}"


def format_percentage(value: float, decimals: int = 2) -> str:
    """Format value as percentage string."""
    return f"{value * 100:.{decimals}f}%"


def get_transaction_description(risk_score: float, is_fraud: bool, risk_level: str) -> str:
    """
    Get human-readable description of transaction risk.
    
    Args:
        risk_score: Risk score [0, 1]
        is_fraud: Whether flagged as fraud
        risk_level: Risk level category
        
    Returns:
        Description string
    """
    if is_fraud:
        return f"🚨 FRAUD ALERT - {format_percentage(risk_score)} confidence"
    elif risk_level == 'high':
        return f"⚠️ SUSPICIOUS - {format_percentage(risk_score)} risk"
    elif risk_level == 'medium':
        return f"⏱️ MONITOR - {format_percentage(risk_score)} risk"
    else:
        return f"✅ CLEAN - {format_percentage(risk_score)} risk"


def batch_predict_ensemble(features_list: List[np.ndarray],
                          xgb_scores: List[float],
                          if_scores: List[float],
                          rule_scores: List[float]) -> Tuple[List[float], List[str], List[bool]]:
    """
    Batch process multiple transactions through ensemble model.
    
    Args:
        features_list: List of feature arrays
        xgb_scores: List of XGBoost scores
        if_scores: List of Isolation Forest scores
        rule_scores: List of rule-based scores
        
    Returns:
        Tuple of (ensemble_scores, risk_levels, fraud_predictions)
    """
    ensemble_scores = []
    risk_levels = []
    fraud_preds = []
    
    for xgb, if_score, rule in zip(xgb_scores, if_scores, rule_scores):
        ensemble = ensemble_prediction(xgb, if_score, rule)
        ensemble_scores.append(ensemble)
        
        risk_level = categorize_risk_level(ensemble)
        risk_levels.append(risk_level)
        
        fraud_pred = ensemble > 0.5
        fraud_preds.append(fraud_pred)
    
    return ensemble_scores, risk_levels, fraud_preds


def log_prediction(transaction_id: str, risk_score: float, is_fraud: bool, source: str = "api"):
    """Log a prediction for audit trail."""
    logger.info(
        f"[{source}] Transaction {transaction_id}: "
        f"risk={risk_score:.4f}, fraud={is_fraud}"
    )
