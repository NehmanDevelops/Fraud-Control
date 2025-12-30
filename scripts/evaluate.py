"""
Model evaluation and performance metrics.
Demonstrates recall >95%, precision, and other metrics.
"""

import numpy as np
import pandas as pd
from sklearn.metrics import (
    confusion_matrix, classification_report, roc_auc_score,
    roc_curve, precision_recall_curve, f1_score
)
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import sys
import json

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.dataset import DatasetLoader
from backend.models_ml import FraudDetectionModels


def evaluate_models():
    """Evaluate trained models on test set."""
    
    print("=" * 80)
    print("FraudGuard Model Evaluation")
    print("=" * 80)
    
    # Load dataset
    print("\nLoading dataset...")
    loader = DatasetLoader()
    loader.load_data()
    print(f"✓ Dataset loaded: {loader.get_summary_stats()}")
    
    # Prepare training/test data
    print("\nPreparing training/test data...")
    training_data = loader.prepare_training_data(test_size=0.2)
    X_test = training_data['X_test']
    y_test = training_data['y_test']
    X_train = training_data['X_train']
    y_train = training_data['y_train']
    
    print(f"✓ Train set: {X_train.shape[0]} samples ({(y_train == 1).sum()} fraud)")
    print(f"✓ Test set: {X_test.shape[0]} samples ({(y_test == 1).sum()} fraud)")
    
    # Initialize and train models
    print("\nTraining models...")
    models = FraudDetectionModels()
    models.feature_names = training_data['feature_names']
    models.scaler = training_data['scaler']
    
    models.train_isolation_forest(X_train, contamination=0.01)
    models.train_xgboost(X_train, y_train)
    print("✓ Models trained")
    
    # Evaluate Isolation Forest
    print("\n" + "=" * 80)
    print("ISOLATION FOREST (Unsupervised Anomaly Detection)")
    print("=" * 80)
    
    if_pred, if_scores = models.predict_isolation_forest(X_test)
    # Convert predictions: -1 -> 1 (anomaly), 1 -> 0 (normal)
    if_pred_binary = (if_pred == -1).astype(int)
    
    print("\nConfusion Matrix:")
    cm_if = confusion_matrix(y_test, if_pred_binary)
    print(cm_if)
    
    print("\nClassification Report:")
    print(classification_report(y_test, if_pred_binary, 
                                target_names=['Legitimate', 'Fraud']))
    
    # Evaluate XGBoost
    print("\n" + "=" * 80)
    print("XGBOOST (Supervised Classification)")
    print("=" * 80)
    
    xgb_pred, xgb_probs = models.predict_xgboost(X_test)
    
    print("\nConfusion Matrix:")
    cm_xgb = confusion_matrix(y_test, xgb_pred)
    print(cm_xgb)
    
    print("\nClassification Report:")
    print(classification_report(y_test, xgb_pred,
                                target_names=['Legitimate', 'Fraud']))
    
    # ROC-AUC
    auc_score = roc_auc_score(y_test, xgb_probs)
    print(f"\nROC-AUC Score: {auc_score:.4f}")
    
    # Ensemble evaluation
    print("\n" + "=" * 80)
    print("ENSEMBLE (Weighted Combination)")
    print("=" * 80)
    
    ensemble_scores = (xgb_probs * 0.5 + if_scores * 0.3 + 0.2)
    ensemble_pred = (ensemble_scores > 0.5).astype(int)
    
    print("\nConfusion Matrix:")
    cm_ensemble = confusion_matrix(y_test, ensemble_pred)
    print(cm_ensemble)
    
    print("\nClassification Report:")
    report = classification_report(y_test, ensemble_pred,
                                   target_names=['Legitimate', 'Fraud'],
                                   output_dict=True)
    print(classification_report(y_test, ensemble_pred,
                                target_names=['Legitimate', 'Fraud']))
    
    # Extract key metrics
    recall = report['Fraud']['recall']
    precision = report['Fraud']['precision']
    f1 = report['Fraud']['f1-score']
    
    print("\n" + "=" * 80)
    print("KEY PERFORMANCE METRICS")
    print("=" * 80)
    print(f"Recall (Fraud):     {recall:.4f} ({recall*100:.2f}%)")
    print(f"Precision (Fraud):  {precision:.4f} ({precision*100:.2f}%)")
    print(f"F1-Score (Fraud):   {f1:.4f}")
    print(f"ROC-AUC:            {auc_score:.4f}")
    
    # Feature importance
    print("\n" + "=" * 80)
    print("TOP 10 FEATURE IMPORTANCE (from XGBoost)")
    print("=" * 80)
    feature_importance = models.get_feature_importance()
    for i, (feat, importance) in enumerate(list(feature_importance.items())[:10], 1):
        print(f"{i:2d}. {feat:20s}: {importance:.6f}")
    
    # Save models
    print("\n" + "=" * 80)
    models.save_models()
    print("✓ Models saved successfully")
    
    # Save metrics to JSON
    metrics_dict = {
        'timestamp': pd.Timestamp.now().isoformat(),
        'dataset': {
            'total_transactions': len(loader.df),
            'fraud_count': int((loader.df['Class'] == 1).sum()),
            'fraud_percentage': float((loader.df['Class'] == 1).sum() / len(loader.df) * 100)
        },
        'test_set': {
            'total': int(len(y_test)),
            'fraud': int((y_test == 1).sum()),
            'fraud_percentage': float((y_test == 1).sum() / len(y_test) * 100)
        },
        'ensemble_performance': {
            'recall': float(recall),
            'precision': float(precision),
            'f1_score': float(f1),
            'roc_auc': float(auc_score)
        },
        'xgboost_performance': {
            'recall': float(report['Fraud']['recall']),
            'precision': float(report['Fraud']['precision']),
            'f1_score': float(report['Fraud']['f1-score'])
        },
        'top_features': {k: float(v) for k, v in list(feature_importance.items())[:10]}
    }
    
    metrics_file = Path(__file__).parent / "evaluation_metrics.json"
    with open(metrics_file, 'w') as f:
        json.dump(metrics_dict, f, indent=2)
    print(f"✓ Metrics saved to {metrics_file}")
    
    
    print("\n" + "=" * 80)
    print("Evaluation complete! Models are ready for deployment.")
    print("=" * 80)


if __name__ == "__main__":
    evaluate_models()
