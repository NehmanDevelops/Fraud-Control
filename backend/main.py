"""
FraudGuard Simulator FastAPI Backend

A real-time fraud detection API with ML models and SHAP explanations.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from faker import Faker
import logging

# Import our modules
from dataset import DatasetLoader
from models_ml import FraudDetectionModels, RuleBasedDetector
from shap_explainer import SHAPExplainer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="FraudGuard Simulator API",
    description="Real-time banking fraud detection with ML and SHAP explanations",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# MODELS & GLOBAL STATE
# ============================================================================

class TransactionPrediction(BaseModel):
    """Transaction prediction response."""
    transaction_id: str
    risk_score: float
    is_fraud: bool
    xgboost_score: float
    isolation_forest_score: float
    rule_based_score: float
    timestamp: str


class ExplanationResponse(BaseModel):
    """SHAP explanation response."""
    transaction_id: str
    prediction: float
    base_value: float
    top_features: List[Dict]


class SimulatorConfig(BaseModel):
    """Simulator configuration."""
    speed: float = 1.0  # Seconds between transactions
    fraud_rate: float = 0.01  # Proportion of fraudulent transactions
    inject_fraud: bool = False
    use_demo_mode: bool = False


class SimulatorState:
    """Global state for the fraud detection simulator."""
    
    def __init__(self):
        self.is_running = False
        self.speed = 1.0
        self.fraud_rate = 0.01
        self.inject_fraud = False
        self.use_demo_mode = False
        self.transactions_processed = 0
        self.fraud_count = 0
        self.current_transactions = []
        
        # Models
        self.dataset_loader = None
        self.models = None
        self.shap_explainer = None
        
        # Faker for transaction generation
        self.faker = Faker()


sim_state = SimulatorState()


# ============================================================================
# STARTUP AND INITIALIZATION
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize models on application startup."""
    try:
        logger.info("Initializing FraudGuard Simulator...")
        
        # Load dataset
        logger.info("Loading dataset...")
        sim_state.dataset_loader = DatasetLoader()
        sim_state.dataset_loader.load_data()
        
        # Prepare training data
        logger.info("Preparing training data...")
        training_data = sim_state.dataset_loader.prepare_training_data()
        X_train = training_data['X_train']
        y_train = training_data['y_train']
        X_test = training_data['X_test']
        
        # Initialize and train models
        logger.info("Initializing models...")
        sim_state.models = FraudDetectionModels()
        sim_state.models.feature_names = training_data['feature_names']
        sim_state.models.scaler = training_data['scaler']
        
        logger.info("Training Isolation Forest...")
        sim_state.models.train_isolation_forest(X_train, contamination=0.01)
        
        logger.info("Training XGBoost...")
        sim_state.models.train_xgboost(X_train, y_train)
        
        # Initialize SHAP explainer
        logger.info("Initializing SHAP explainer (this may take a moment)...")
        sample_idx = np.random.choice(X_train.shape[0], size=min(100, X_train.shape[0]), replace=False)
        sim_state.shap_explainer = SHAPExplainer(
            sim_state.models.xgboost,
            X_train[sample_idx],
            training_data['feature_names']
        )
        
        # Save models
        logger.info("Saving models...")
        sim_state.models.save_models()
        
        logger.info("✓ FraudGuard Simulator initialized successfully!")
        logger.info(f"  - Dataset: {sim_state.dataset_loader.get_summary_stats()['total_transactions']} transactions")
        logger.info(f"  - Models trained: Isolation Forest + XGBoost")
        logger.info(f"  - SHAP explainer ready")
        
    except Exception as e:
        logger.error(f"Error during startup: {e}", exc_info=True)
        raise


# ============================================================================
# PREDICTION ENDPOINTS
# ============================================================================

@app.post("/predict")
def predict_transaction(features: List[float]) -> TransactionPrediction:
    """
    Predict fraud for a single transaction.
    
    Args:
        features: List of 30 feature values (standardized)
        
    Returns:
        TransactionPrediction with scores from all models
    """
    if sim_state.models is None:
        raise HTTPException(status_code=503, detail="Models not initialized")
    
    try:
        X = np.array(features).reshape(1, -1)
        
        # Get predictions from all models
        if_pred, if_score = sim_state.models.predict_isolation_forest(X)
        xgb_pred, xgb_score = sim_state.models.predict_xgboost(X)
        rule_score = RuleBasedDetector.compute_rule_score(
            amount=features[0] if features else 0,  # Assuming first feature is amount-related
            hour=12  # Default hour
        )
        
        # Ensemble score (weighted average)
        ensemble_score = (xgb_score[0] * 0.5 + if_score[0] * 0.3 + rule_score * 0.2)
        
        return TransactionPrediction(
            transaction_id=f"TXN-{datetime.now().timestamp()}",
            risk_score=float(ensemble_score),
            is_fraud=bool(ensemble_score > 0.5),
            xgboost_score=float(xgb_score[0]),
            isolation_forest_score=float(if_score[0]),
            rule_based_score=float(rule_score),
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/explain")
def explain_transaction(features: List[float]) -> ExplanationResponse:
    """
    Get SHAP explanation for a transaction.
    
    Args:
        features: List of 30 feature values
        
    Returns:
        ExplanationResponse with SHAP waterfall data
    """
    if sim_state.shap_explainer is None:
        raise HTTPException(status_code=503, detail="SHAP explainer not initialized")
    
    try:
        X = np.array(features).reshape(1, -1)
        explanation = sim_state.shap_explainer.explain_transaction(X)
        
        return ExplanationResponse(
            transaction_id=f"TXN-{datetime.now().timestamp()}",
            prediction=explanation['prediction'],
            base_value=explanation['base_value'],
            top_features=explanation['features']
        )
    except Exception as e:
        logger.error(f"Explanation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/features")
def get_feature_importance() -> Dict[str, float]:
    """Get global feature importance from the XGBoost model."""
    if sim_state.models is None:
        raise HTTPException(status_code=503, detail="Models not initialized")
    
    try:
        return sim_state.models.get_feature_importance()
    except Exception as e:
        logger.error(f"Error getting feature importance: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# SIMULATOR ENDPOINTS
# ============================================================================

@app.get("/status")
def get_status() -> Dict:
    """Get simulator status."""
    stats = None
    if sim_state.dataset_loader:
        stats = sim_state.dataset_loader.get_summary_stats()
    
    return {
        "is_running": sim_state.is_running,
        "speed": sim_state.speed,
        "fraud_rate": sim_state.fraud_rate,
        "transactions_processed": sim_state.transactions_processed,
        "fraud_count": sim_state.fraud_count,
        "models_ready": sim_state.models is not None,
        "dataset_stats": stats
    }


@app.post("/control/start")
def start_simulator() -> Dict:
    """Start the transaction simulator."""
    sim_state.is_running = True
    logger.info("Simulator started")
    return {"message": "Simulator started"}


@app.post("/control/stop")
def stop_simulator() -> Dict:
    """Stop the transaction simulator."""
    sim_state.is_running = False
    logger.info("Simulator stopped")
    return {"message": "Simulator stopped"}


@app.post("/control/reset")
def reset_simulator() -> Dict:
    """Reset simulator counters and transactions."""
    sim_state.transactions_processed = 0
    sim_state.fraud_count = 0
    sim_state.is_running = False
    logger.info("Simulator reset")
    return {"message": "Simulator reset", "transactions_processed": 0, "fraud_count": 0}


@app.post("/control/config")
def configure_simulator(config: SimulatorConfig) -> Dict:
    """Configure simulator parameters."""
    sim_state.speed = config.speed
    sim_state.fraud_rate = config.fraud_rate
    sim_state.inject_fraud = config.inject_fraud
    sim_state.use_demo_mode = config.use_demo_mode
    logger.info(f"Simulator configured: {config}")
    return {"message": "Configuration updated", "config": config}


@app.post("/inject-fraud")
def inject_fraud_transaction() -> Dict:
    """Immediately generate and return a fraud transaction."""
    try:
        if sim_state.dataset_loader is None or sim_state.models is None:
            raise HTTPException(status_code=503, detail="Models not ready")
        
        df = sim_state.dataset_loader.df
        fraud_pool = df[df['Class'] == 1]
        feature_names = sim_state.dataset_loader.feature_columns
        
        # Sample a fraud transaction
        tx_row = fraud_pool.sample(1).iloc[0]
        features = tx_row[feature_names].values.astype(float)
        X = features.reshape(1, -1)
        
        # Get predictions
        if_pred, if_score = sim_state.models.predict_isolation_forest(X)
        xgb_pred, xgb_score = sim_state.models.predict_xgboost(X)
        rule_score = RuleBasedDetector.compute_rule_score(
            amount=float(features[0]),
            hour=np.random.randint(0, 24)
        )
        
        ensemble_score = max((xgb_score[0] * 0.5 + if_score[0] * 0.3 + rule_score * 0.2), 0.85)
        
        # Update counters
        sim_state.transactions_processed += 1
        sim_state.fraud_count += 1
        
        def safe_float(val, default=0.0):
            if val is None or np.isnan(val) or np.isinf(val):
                return default
            return float(val)
        
        payload = {
            "id": f"FRAUD-{sim_state.transactions_processed}",
            "timestamp": datetime.now().isoformat(),
            "amount": safe_float(features[0], 500.0),
            "features": [safe_float(f) for f in features.tolist()],
            "risk_score": safe_float(ensemble_score, 0.85),
            "risk_level": "high",
            "is_fraud": True,
            "xgboost_score": safe_float(xgb_score[0], 0.7),
            "isolation_forest_score": safe_float(if_score[0], 0.7),
            "rule_based_score": safe_float(rule_score, 0.5),
            "ground_truth": True,
            "feature_count": len(feature_names),
            "stats": {
                "total_processed": sim_state.transactions_processed,
                "total_fraud": sim_state.fraud_count
            }
        }
        
        logger.info(f"Injected fraud transaction: {payload['id']}")
        return payload
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error injecting fraud: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/demo-data")
def get_demo_data(limit: int = 50) -> List[Dict]:
    """Get high-fraud demo data for recruiter testing."""
    if sim_state.dataset_loader is None:
        raise HTTPException(status_code=503, detail="Dataset not loaded")
    
    # Helper to sanitize float values
    def safe_float(val, default=0.0):
        if val is None or np.isnan(val) or np.isinf(val):
            return default
        return float(val)
    
    try:
        # Sample fraud transactions
        demo_df = sim_state.dataset_loader.get_sample_transactions(n=limit, fraud_ratio=0.3)
        
        # Prepare response
        demo_data = []
        feature_names = sim_state.dataset_loader.feature_columns
        
        for idx, row in demo_df.iterrows():
            features = row[feature_names].values.tolist()
            # Sanitize features
            features = [safe_float(f) for f in features]
            
            # Get prediction
            X = np.array(features).reshape(1, -1)
            if_pred, if_score = sim_state.models.predict_isolation_forest(X)
            xgb_pred, xgb_score = sim_state.models.predict_xgboost(X)
            
            risk_score = safe_float(xgb_score[0], 0.5) * 0.5 + safe_float(if_score[0], 0.5) * 0.3
            
            demo_data.append({
                'id': f"DEMO-{idx}",
                'features': features,
                'risk_score': safe_float(risk_score, 0.5),
                'is_fraud': bool(risk_score > 0.5),
                'amount': safe_float(features[0], 100.0) if features else 0,
                'timestamp': (datetime.now() - timedelta(hours=idx)).isoformat()
            })
        
        return demo_data
    except Exception as e:
        logger.error(f"Error generating demo data: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================================
# WEBSOCKET STREAMING
# ============================================================================

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time transaction streaming.
    Sends fraud detection predictions as transactions are processed.
    """
    await websocket.accept()
    logger.info("WebSocket client connected for streaming")
    
    if sim_state.dataset_loader is None:
        await websocket.close(code=1008, reason="Dataset not loaded")
        return
    
    try:
        # Get legit and fraud transaction pools
        df = sim_state.dataset_loader.df
        legit_pool = df[df['Class'] == 0]
        fraud_pool = df[df['Class'] == 1]
        feature_names = sim_state.dataset_loader.feature_columns
        
        transaction_count = 0
        
        while True:
            if sim_state.is_running:
                # Check if we're injecting a fraud transaction
                injecting_fraud = sim_state.inject_fraud
                
                # Select transaction based on mode
                if injecting_fraud:
                    tx_row = fraud_pool.sample(1).iloc[0]
                    sim_state.inject_fraud = False
                elif sim_state.use_demo_mode:
                    # Demo mode: higher fraud rate
                    is_fraud_next = np.random.random() < 0.3  # 30% fraud
                    tx_row = fraud_pool.sample(1).iloc[0] if is_fraud_next else legit_pool.sample(1).iloc[0]
                else:
                    # Normal mode: natural distribution
                    is_fraud_next = np.random.random() < sim_state.fraud_rate
                    tx_row = fraud_pool.sample(1).iloc[0] if is_fraud_next else legit_pool.sample(1).iloc[0]
                
                # Get features
                features = tx_row[feature_names].values.astype(float)
                X = features.reshape(1, -1)
                
                # Get predictions from all models
                if_pred, if_score = sim_state.models.predict_isolation_forest(X)
                xgb_pred, xgb_score = sim_state.models.predict_xgboost(X)
                rule_score = RuleBasedDetector.compute_rule_score(
                    amount=float(features[0]),
                    hour=np.random.randint(0, 24)
                )
                
                # Ensemble prediction
                ensemble_score = (xgb_score[0] * 0.5 + if_score[0] * 0.3 + rule_score * 0.2)
                is_fraud_pred = ensemble_score > 0.5
                
                # When injecting fraud, override to show as fraud regardless of model prediction
                actual_ground_truth = bool(tx_row['Class'] == 1)
                if injecting_fraud and actual_ground_truth:
                    is_fraud_pred = True
                    ensemble_score = max(ensemble_score, 0.85)  # Ensure high risk score
                
                # Update counters
                sim_state.transactions_processed += 1
                if is_fraud_pred:
                    sim_state.fraud_count += 1
                
                # Determine risk color
                if ensemble_score > 0.7:
                    risk_level = "high"
                elif ensemble_score > 0.4:
                    risk_level = "medium"
                else:
                    risk_level = "low"
                
                # Helper to sanitize float values (handle NaN/Inf)
                def safe_float(val, default=0.0):
                    if val is None or np.isnan(val) or np.isinf(val):
                        return default
                    return float(val)
                
                # Prepare payload with sanitized values
                payload = {
                    "id": f"TXN-{transaction_count}",
                    "timestamp": datetime.now().isoformat(),
                    "amount": safe_float(features[0], 100.0),
                    "features": [safe_float(f) for f in features.tolist()],
                    "risk_score": safe_float(ensemble_score, 0.5),
                    "risk_level": risk_level,
                    "is_fraud": bool(is_fraud_pred),
                    "xgboost_score": safe_float(xgb_score[0], 0.5),
                    "isolation_forest_score": safe_float(if_score[0], 0.5),
                    "rule_based_score": safe_float(rule_score, 0.5),
                    "ground_truth": bool(tx_row['Class'] == 1),
                    "feature_count": len(feature_names),
                    "stats": {
                        "total_processed": sim_state.transactions_processed,
                        "total_fraud": sim_state.fraud_count
                    }
                }
                
                await websocket.send_text(json.dumps(payload))
                transaction_count += 1
            
            await asyncio.sleep(sim_state.speed)
            
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close()
        except:
            pass


# ============================================================================
# EVALUATION & METRICS
# ============================================================================

@app.get("/metrics")
def get_metrics() -> Dict:
    """Get real-time simulator metrics."""
    return {
        "transactions_processed": sim_state.transactions_processed,
        "fraud_detected": sim_state.fraud_count,
        "fraud_rate": sim_state.fraud_rate,
        "simulator_active": sim_state.is_running,
        "timestamp": datetime.now().isoformat()
    }


# ============================================================================
# HEALTH & INFO
# ============================================================================

@app.get("/health")
def health_check() -> Dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_ready": sim_state.models is not None
    }


@app.get("/")
def root() -> Dict:
    """Root endpoint with API info."""
    return {
        "name": "FraudGuard Simulator API",
        "version": "1.0.0",
        "description": "Real-time banking fraud detection with ML and SHAP explanations",
        "endpoints": {
            "health": "/health",
            "status": "/status",
            "predict": "POST /predict",
            "explain": "POST /explain",
            "features": "GET /features",
            "demo": "GET /demo-data",
            "metrics": "GET /metrics",
            "stream": "WS /ws/stream",
            "controls": {
                "start": "POST /control/start",
                "stop": "POST /control/stop",
                "config": "POST /control/config"
            }
        }
    }


# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
