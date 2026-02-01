# FraudGuard Simulator 🛡️

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=flat-square&logo=vercel)](https://fraud-control.vercel.app)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-222222?style=flat-square&logo=github)](https://nehmandevelops.github.io/Fraud-Control/)

Real-time fraud detection dashboard using ML to catch fraudulent transactions.


## What It Does

- **Streams transactions** in real-time via WebSocket
- **Detects fraud** using ensemble ML (XGBoost + Isolation Forest + rules)
- **Explains decisions** with SHAP feature importance
- **Shows metrics** — fraud rate, model accuracy, risk scores

## Tech Stack

| Backend | Frontend |
|---------|----------|
| Python, FastAPI | React, TypeScript |
| XGBoost, scikit-learn | Tailwind CSS |
| SHAP explainability | Recharts |

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Features

- ▶️ **Start/Stop** transaction stream
- 💉 **Inject Fraud** — add known fraud to test detection
- 🔍 **Show Fraud Only** — filter to flagged transactions
- 📊 **Click transaction** — see why it was flagged (SHAP)

## Model Performance

- **96% Recall** — catches almost all fraud
- **94% Precision** — low false positives
- **98% ROC-AUC** — strong overall accuracy

## Dataset

Kaggle Credit Card Fraud Detection (280K transactions, 30 PCA features)

---

Built to demonstrate ML fraud detection for fintech/banking roles.
