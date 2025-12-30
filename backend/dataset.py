"""
Dataset loading and preprocessing utilities.
Handles Kaggle Credit Card Fraud Detection dataset operations.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from typing import Tuple, Optional
import os

class DatasetLoader:
    """Loads and preprocesses the Credit Card Fraud Detection dataset."""
    
    def __init__(self, data_path: Optional[str] = None):
        """
        Initialize the dataset loader.
        
        Args:
            data_path: Path to creditcard.csv. If None, searches in data/ directory.
        """
        if data_path is None:
            # Search for creditcard.csv in data directory
            data_dir = Path(__file__).parent / "data"
            data_path = data_dir / "creditcard.csv"
        
        self.data_path = Path(data_path)
        self.df = None
        self.scaler = StandardScaler()
        self.feature_columns = None
        
    def load_data(self) -> pd.DataFrame:
        """
        Load the dataset from CSV.
        
        Returns:
            DataFrame with transaction data
        """
        if not self.data_path.exists():
            raise FileNotFoundError(f"Dataset not found at {self.data_path}")
        
        print(f"Loading dataset from {self.data_path}...")
        self.df = pd.read_csv(self.data_path)
        print(f"Dataset loaded: {self.df.shape[0]} transactions, {self.df.shape[1]} features")
        
        # Identify feature columns (all except Time and Class)
        self.feature_columns = [col for col in self.df.columns if col not in ['Time', 'Class']]
        
        return self.df
    
    def get_summary_stats(self) -> dict:
        """Get summary statistics about the dataset."""
        if self.df is None:
            self.load_data()
        
        fraud_count = (self.df['Class'] == 1).sum()
        legit_count = (self.df['Class'] == 0).sum()
        
        return {
            'total_transactions': len(self.df),
            'fraud_count': int(fraud_count),
            'legit_count': int(legit_count),
            'fraud_percentage': float(fraud_count / len(self.df) * 100),
            'features': len(self.feature_columns),
            'feature_names': self.feature_columns
        }
    
    def get_features_and_labels(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Get feature matrix and labels.
        
        Returns:
            Tuple of (features, labels)
        """
        if self.df is None:
            self.load_data()
        
        X = self.df[self.feature_columns].values
        y = self.df['Class'].values
        
        return X, y
    
    def prepare_training_data(self, test_size: float = 0.2) -> dict:
        """
        Prepare data for model training with stratified split.
        
        Args:
            test_size: Fraction of data to use for testing
            
        Returns:
            Dictionary with train/test data
        """
        from sklearn.model_selection import train_test_split
        
        X, y = self.get_features_and_labels()
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        # Fit scaler on training data
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        return {
            'X_train': X_train_scaled,
            'X_test': X_test_scaled,
            'y_train': y_train,
            'y_test': y_test,
            'scaler': self.scaler,
            'feature_names': self.feature_columns
        }
    
    def get_sample_transactions(self, n: int = 100, fraud_ratio: float = 0.1) -> pd.DataFrame:
        """
        Get a sample of transactions with specified fraud ratio.
        
        Args:
            n: Number of transactions
            fraud_ratio: Desired ratio of fraud to legit transactions
            
        Returns:
            DataFrame with sampled transactions
        """
        if self.df is None:
            self.load_data()
        
        n_fraud = int(n * fraud_ratio)
        n_legit = n - n_fraud
        
        fraud_df = self.df[self.df['Class'] == 1].sample(n=min(n_fraud, len(self.df[self.df['Class'] == 1])), random_state=None)
        legit_df = self.df[self.df['Class'] == 0].sample(n=min(n_legit, len(self.df[self.df['Class'] == 0])), random_state=None)
        
        return pd.concat([fraud_df, legit_df], ignore_index=True).sample(frac=1, random_state=None)


def get_dataset_loader(data_path: Optional[str] = None) -> DatasetLoader:
    """Factory function to get a DatasetLoader instance."""
    return DatasetLoader(data_path)
