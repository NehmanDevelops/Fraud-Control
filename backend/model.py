import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import recall_score, precision_score
import shap
import pickle
import os

class FraudModel:
    def __init__(self, data_path="backend/data/creditcard.csv"):
        self.data_path = data_path
        self.model = None
        self.iso_forest = None
        self.explainer = None
        self.feature_cols = [f'V{i}' for i in range(1, 29)] + ['Amount']
        
    def train(self):
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Data file not found at {self.data_path}")
            
        df = pd.read_csv(self.data_path)
        X = df[self.feature_cols]
        y = df['Class']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        # 1. Supervised: XGBoost
        # Calculate scale_pos_weight for imbalanced data
        ratio = float(len(y_train[y_train == 0])) / len(y_train[y_train == 1])
        self.model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            scale_pos_weight=ratio,
            random_state=42
        )
        self.model.fit(X_train, y_train)
        
        # 2. Unsupervised: Isolation Forest (Anomaly Detection)
        self.iso_forest = IsolationForest(contamination=0.02, random_state=42)
        self.iso_forest.fit(X_train)
        
        # 3. SHAP Explainer
        self.explainer = shap.TreeExplainer(self.model)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        metrics = {
            "recall": recall_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred),
            "fraud_detected": int(sum((y_pred == 1) & (y_test == 1))),
            "total_fraud": int(sum(y_test == 1))
        }
        print(f"Model trained. Recall: {metrics['recall']:.2f}, Precision: {metrics['precision']:.2f}")
        return metrics

    def predict(self, transaction_data):
        """
        transaction_data: dict with V1-V28 and Amount
        Returns: risk_score (0-100), is_fraud (bool), explanation (shap values)
        """
        df = pd.DataFrame([transaction_data])[self.feature_cols]
        
        # ML Probabilities
        prob = self.model.predict_proba(df)[0][1]
        
        # Anomaly score (-1 is anomaly, 1 is normal)
        anomaly_score = self.iso_forest.decision_function(df)[0]
        # Normalize anomaly score to 0-1 (lower is more anomalous)
        normalized_anomaly = (anomaly_score - (-0.5)) / (0.5 - (-0.5))
        normalized_anomaly = np.clip(1 - normalized_anomaly, 0, 1) # 1 is highly anomalous
        
        # Rule-based: High amount
        rule_flag = 1.0 if transaction_data['Amount'] > 5000 else 0.0
        
        # Hybrid Risk Score (Weighted average)
        # ML: 60%, Anomaly: 30%, Rules: 10%
        risk_score = (prob * 0.6) + (normalized_anomaly * 0.3) + (rule_flag * 0.1)
        risk_percentage = int(risk_score * 100)
        
        # SHAP Explanation
        shap_values = self.explainer.shap_values(df)[0]
        
        return {
            "risk_score": risk_percentage,
            "is_fraud": risk_percentage > 70, # Threshold for demo
            "is_suspicious": 40 < risk_percentage <= 70,
            "shap_values": shap_values.tolist(),
            "feature_names": self.feature_cols
        }

    def get_global_importance(self):
        importances = self.model.feature_importances_
        return dict(zip(self.feature_cols, importances.tolist()))

# Singleton instance
fraud_model = FraudModel()
