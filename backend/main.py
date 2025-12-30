from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import random
import pandas as pd
from backend.model import fraud_model
import os

app = FastAPI(title="FraudGuard Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state for simulation
class SimulatorState:
    def __init__(self):
        self.is_running = False
        self.speed = 1.0 # seconds delay
        self.inject_fraud = False
        self.transactions_processed = 0
        self.fraud_count = 0

sim_state = SimulatorState()

@app.on_event("startup")
async def startup_event():
    # Train the model on startup
    print("Training model...")
    fraud_model.train()
    print("Model trained and ready.")

@app.get("/status")
def get_status():
    return {"status": "ok", "is_running": sim_state.is_running}

@app.post("/control/start")
def start_sim():
    sim_state.is_running = True
    return {"msg": "Started"}

@app.post("/control/stop")
def stop_sim():
    sim_state.is_running = False
    return {"msg": "Stopped"}

@app.post("/control/speed")
def set_speed(speed: float):
    sim_state.speed = speed
    return {"speed": speed}

@app.post("/control/inject")
def inject_fraud():
    sim_state.inject_fraud = True
    return {"msg": "Fraud injection queued"}

@app.get("/metrics")
def get_metrics():
    # Static snapshot for demo, in real life would be dynamic
    return {
        "accuracy": 0.98,
        "precision": 0.94,
        "recall": 0.96,
        "f1_score": 0.95,
        "transactions_today": sim_state.transactions_processed,
        "fraud_today": sim_state.fraud_count
    }

@app.get("/shap/global")
def get_global_shap():
    return fraud_model.get_global_importance()

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket client connected")
    
    # Load dataset for streaming
    df = pd.read_csv("backend/data/creditcard.csv")
    legit_pool = df[df['Class'] == 0]
    fraud_pool = df[df['Class'] == 1]
    
    try:
        while True:
            if sim_state.is_running:
                # Decide if we pick a fraud or legit transaction
                if sim_state.inject_fraud:
                    tx_row = fraud_pool.sample(1).iloc[0]
                    sim_state.inject_fraud = False
                else:
                    # Natural distribution or random spike
                    is_fraud_next = random.random() < 0.05 # 5% chance
                    if is_fraud_next:
                        tx_row = fraud_pool.sample(1).iloc[0]
                    else:
                        tx_row = legit_pool.sample(1).iloc[0]
                
                tx_dict = tx_row.to_dict()
                result = fraud_model.predict(tx_dict)
                
                payload = {
                    "id": f"tx_{random.randint(100000, 999999)}",
                    "timestamp": pd.Timestamp.now().isoformat(),
                    "amount": tx_dict['Amount'],
                    "features": {k: v for k, v in tx_dict.items() if k.startswith('V')},
                    "risk_score": result['risk_score'],
                    "is_fraud": result['is_fraud'],
                    "is_suspicious": result['is_suspicious'],
                    "shap_values": result['shap_values'],
                    "feature_names": result['feature_names']
                }
                
                sim_state.transactions_processed += 1
                if result['is_fraud']:
                    sim_state.fraud_count += 1
                
                await websocket.send_text(json.dumps(payload))
            
            await asyncio.sleep(sim_state.speed)
            
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
