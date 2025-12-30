# FraudGuard Simulator 🛡️

A real-time transaction fraud detection dashboard built for RBC Borealis / Canadian Banking recruiter demos. This project demonstrates a hybrid approach to fraud detection, combining rule-based heuristics with advanced ML (Supervised + Unsupervised) and **Explainable AI** using SHAP.

## Key Features
- **Hybrid Detection Engine**:
  - **XGBoost (Supervised)**: High-recall classification trained on Kaggle PCA features.
  - **Isolation Forest (Unsupervised)**: Detects novel anomaly patterns.
  - **Rule-Based Flags**: Detects high-risk transactions (e.g., >$5k).
- **Real-Time Streaming**: Live WebSocket simulation of credit card transactions.
- **Explainable AI (SHAP)**: Waterfall plots explaining *why* a specific transaction was flagged, aligning with Responsible AI standards.
- **Interactive Dashboard**:
  - Live risk wave visualization.
  - Fraud vs. Legit metrics.
  - Transaction detail view with local feature importance.
  - Simulator controls: Play/Pause, Speed adjust, and "Inject Fraud" demo mode.

## Tech Stack
- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Recharts, Lucide.
- **Backend**: FastAPI (Python), WebSockets, Pandas, NumPy.
- **ML**: Scikit-Learn, XGBoost, SHAP.

## Local Setup

### Backend
1. `cd backend`
2. `pip install -r requirements.txt`
3. `python ../scripts/generate_data.py` (Generate synthetic Kaggle-like data)
4. `python main.py` (Starts server on port 8000)

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev` (Starts dashboard on port 5173 / localhost)

## Quantifiable Results
Run the evaluation script to see model performance on test data:
```bash
python scripts/evaluate.py
```
**Expected Performance**: 
- Recall: >95% (Fraud detection rate)
- Precision: >90%
- SHAP Explanation Latency: <50ms

## Responsible AI & Banking Context
In a modern banking environment, "Black Box" models are insufficient. Regulators require explanations for why a customer's card was blocked. This simulator uses **SHAP (SHapley Additive exPlanations)** to provide mathematical proof of feature impact on the risk score, ensuring the model remains ethical and transparent.

*Inspiration: Extensible to Federated Learning for privacy-preserving fraud detection across global banking networks.*
