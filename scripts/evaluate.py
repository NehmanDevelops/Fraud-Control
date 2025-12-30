import pandas as pd
import numpy as np
from sklearn.metrics import recall_score, precision_score, f1_score, confusion_matrix
import sys
import os

# Internal import would be hard without install, so we re-implement logic or use saved model
# For the script, we'll just run a quick evaluation using the same logic as backend/model.py

def run_evaluation():
    data_path = "backend/data/creditcard.csv"
    if not os.path.exists(data_path):
        print("Data not found. Run generate_data.py first.")
        return

    df = pd.read_csv(data_path)
    # Mocking the model training process for a quick report
    # In production, we'd load the pickle
    from sklearn.model_selection import train_test_split
    import xgboost as xgb

    feature_cols = [f'V{i}' for i in range(1, 29)] + ['Amount']
    X = df[feature_cols]
    y = df['Class']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    ratio = float(len(y_train[y_train == 0])) / len(y_train[y_train == 1])
    model = xgb.XGBClassifier(scale_pos_weight=ratio, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    
    recall = recall_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()

    print("="*40)
    print("FRAUDGUARD SIMULATOR - ML EVALUATION")
    print("="*40)
    print(f"Dataset Size: {len(df)}")
    print(f"Test Samples: {len(y_test)}")
    print("-" * 20)
    print(f"Recall:    {recall:.4f} (Goal: 0.95+)")
    print(f"Precision: {precision:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print("-" * 20)
    print(f"True Positives (Detected):  {tp}")
    print(f"False Positives (Alerts):   {fp}")
    print(f"False Negatives (Missed):   {fn}")
    print("-" * 20)
    if recall >= 0.95:
        print("RESULT: SUCCESS - Target metrics met.")
    else:
        print("RESULT: CAUTION - Metrics below target.")
    print("="*40)

if __name__ == "__main__":
    run_evaluation()
