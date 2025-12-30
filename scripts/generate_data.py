import pandas as pd
import numpy as np
from faker import Faker
import os

fake = Faker()

def generate_synthetic_data(n_samples=1000, fraud_ratio=0.05):
    """
    Generates synthetic data mimicking the Kaggle Credit Card Fraud dataset structure.
    Features: Time, V1-V28 (PCA), Amount, Class.
    """
    n_fraud = int(n_samples * fraud_ratio)
    n_legit = n_samples - n_fraud
    
    # Generate Normal (Legit) transactions
    data_legit = {
        'Time': np.sort(np.random.uniform(0, 172792, n_legit)),
        'Amount': np.random.exponential(scale=50, size=n_legit)
    }
    for i in range(1, 29):
        data_legit[f'V{i}'] = np.random.normal(0, 1, n_legit)
    data_legit['Class'] = 0
    
    # Generate Fraudulent transactions (different distributions for some V features)
    data_fraud = {
        'Time': np.sort(np.random.uniform(0, 172792, n_fraud)),
        'Amount': np.random.uniform(1, 2000, n_fraud) # Fraud can be high or low
    }
    # Induce signals in specific features for ML to pick up
    for i in range(1, 29):
        if i in [1, 3, 4, 10, 11, 12, 14, 17]: # Known high importance features in real dataset
            data_fraud[f'V{i}'] = np.random.normal(loc=-2 if i % 2 == 0 else 2, scale=1.5, size=n_fraud)
        else:
            data_fraud[f'V{i}'] = np.random.normal(0, 1.2, n_fraud)
    data_fraud['Class'] = 1
    
    df_legit = pd.DataFrame(data_legit)
    df_fraud = pd.DataFrame(data_fraud)
    
    df = pd.concat([df_legit, df_fraud]).sample(frac=1).reset_index(drop=True)
    return df

if __name__ == "__main__":
    output_path = os.path.join("backend", "data", "creditcard.csv")
    print(f"Generating synthetic data at {output_path}...")
    df = generate_synthetic_data(5000, 0.02) # 5000 samples, 2% fraud
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print("Generation complete.")
