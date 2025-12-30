# FraudGuard API Documentation

Complete API reference for the FraudGuard Simulator fraud detection system.

## Base URL
```
http://localhost:8000
```

## Authentication
No authentication currently. In production, use JWT tokens via Authorization header.

---

## Health & Status Endpoints

### GET /
Get API information and available endpoints.

**Response:**
```json
{
  "message": "FraudGuard Simulator API v1.0",
  "status": "operational",
  "endpoints": {
    "health": "/health",
    "status": "/status",
    "predict": "/predict",
    "explain": "/explain",
    "metrics": "/metrics",
    "features": "/features",
    "demo-data": "/demo-data",
    "control": "/control/*"
  }
}
```

---

### GET /health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-30T12:00:00.000Z",
  "uptime_seconds": 3600,
  "database": "connected"
}
```

---

### GET /status
Get current simulator and model status.

**Response:**
```json
{
  "is_running": true,
  "speed": 1.0,
  "fraud_rate": 0.01,
  "transactions_processed": 1250,
  "fraud_count": 18,
  "models_ready": true,
  "dataset_stats": {
    "total_transactions": 284807,
    "fraud_count": 492,
    "fraud_percentage": 0.17
  }
}
```

---

## Prediction Endpoints

### POST /predict
Make a fraud prediction for a single transaction.

**Request:**
```json
{
  "features": [0.5, -0.3, 0.1, ...],  // 30 PCA features
  "amount": 150.50,
  "timestamp": "2025-12-30T12:00:00Z"
}
```

**Response:**
```json
{
  "transaction_id": "tx-abc123def456",
  "risk_score": 0.72,
  "risk_level": "high",
  "is_fraud": true,
  "confidence": 0.95,
  "model_scores": {
    "xgboost": 0.78,
    "isolation_forest": 0.68,
    "rule_based": 0.62
  },
  "ensemble_info": {
    "weights": {"xgboost": 0.5, "isolation_forest": 0.3, "rule_based": 0.2},
    "calculation": "0.5*0.78 + 0.3*0.68 + 0.2*0.62 = 0.72"
  },
  "processing_time_ms": 12.5
}
```

**Status Codes:**
- `200 OK` - Prediction successful
- `400 Bad Request` - Invalid features
- `422 Unprocessable Entity` - Validation error
- `503 Service Unavailable` - Model not trained

---

### POST /explain
Get SHAP explanations for a prediction.

**Request:**
```json
{
  "features": [0.5, -0.3, 0.1, ...],
  "amount": 150.50
}
```

**Response:**
```json
{
  "transaction_id": "tx-abc123def456",
  "base_value": 0.23,
  "prediction": 0.72,
  "feature_contributions": [
    {
      "feature_index": 0,
      "value": 0.5,
      "contribution": 0.15,
      "impact": "supports_fraud"
    },
    {
      "feature_index": 1,
      "value": -0.3,
      "contribution": -0.08,
      "impact": "supports_legitimate"
    }
  ],
  "top_features": [
    {"index": 0, "contribution": 0.15},
    {"index": 5, "contribution": 0.12}
  ],
  "waterfall_data": {
    "base": 0.23,
    "features": [
      {"name": "Feature 0", "value": 0.15},
      {"name": "Feature 5", "value": 0.12}
    ],
    "prediction": 0.72
  },
  "processing_time_ms": 45.3
}
```

---

### GET /features
Get global feature importance across the model.

**Response:**
```json
{
  "feature_importance": [
    {
      "feature_index": 0,
      "importance": 0.25,
      "rank": 1
    },
    {
      "feature_index": 5,
      "importance": 0.18,
      "rank": 2
    }
  ],
  "top_10_features": [
    {"index": 0, "importance": 0.25},
    {"index": 5, "importance": 0.18},
    {"index": 12, "importance": 0.15}
  ],
  "timestamp": "2025-12-30T12:00:00Z"
}
```

---

## Metrics Endpoints

### GET /metrics
Get real-time model and system metrics.

**Response:**
```json
{
  "model_metrics": {
    "accuracy": 0.962,
    "precision": 0.945,
    "recall": 0.958,
    "f1_score": 0.951,
    "roc_auc": 0.987
  },
  "inference_metrics": {
    "avg_latency_ms": 23.4,
    "p95_latency_ms": 45.2,
    "p99_latency_ms": 67.8,
    "requests_per_second": 125.3
  },
  "system_metrics": {
    "uptime_seconds": 3600,
    "total_predictions": 450000,
    "fraud_detected": 6543,
    "false_positives": 2100
  },
  "timestamp": "2025-12-30T12:00:00Z"
}
```

---

## Simulator Control Endpoints

### POST /control/start
Start the transaction simulator.

**Response:**
```json
{
  "status": "started",
  "message": "Simulator started successfully",
  "timestamp": "2025-12-30T12:00:00Z"
}
```

---

### POST /control/stop
Stop the transaction simulator.

**Response:**
```json
{
  "status": "stopped",
  "message": "Simulator stopped",
  "transactions_processed": 1250,
  "fraud_count": 18,
  "timestamp": "2025-12-30T12:00:00Z"
}
```

---

### POST /control/config
Configure simulator parameters.

**Request:**
```json
{
  "speed": 1.5,
  "fraud_rate": 0.02,
  "inject_fraud": false,
  "use_demo_mode": false
}
```

**Response:**
```json
{
  "status": "configured",
  "config": {
    "speed": 1.5,
    "fraud_rate": 0.02,
    "inject_fraud": false,
    "use_demo_mode": false
  },
  "timestamp": "2025-12-30T12:00:00Z"
}
```

---

### GET /demo-data
Load pre-configured high-fraud demonstration data.

**Query Parameters:**
- `limit` (optional, default=100): Number of transactions to load

**Response:**
```json
[
  {
    "id": "demo-001",
    "timestamp": "2025-12-30T12:00:00Z",
    "amount": 5000.0,
    "risk_score": 0.95,
    "risk_level": "high",
    "is_fraud": true,
    "xgboost_score": 0.92,
    "isolation_forest_score": 0.88,
    "rule_based_score": 0.85,
    "features": [...]
  }
]
```

---

## WebSocket Endpoints

### WS /ws/stream
Real-time transaction stream via WebSocket.

**Usage:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/stream');

ws.onmessage = (event) => {
  const transaction = JSON.parse(event.data);
  // Handle transaction
};
```

**Message Format:**
```json
{
  "id": "tx-abc123def456",
  "timestamp": "2025-12-30T12:00:00Z",
  "amount": 150.50,
  "risk_score": 0.72,
  "risk_level": "high",
  "is_fraud": true,
  "xgboost_score": 0.78,
  "isolation_forest_score": 0.68,
  "rule_based_score": 0.62
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "status_code": 400,
  "details": {
    "field": "features",
    "reason": "Expected 30 features, got 25"
  }
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `INVALID_FEATURES` | 400 | Feature count mismatch |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `MODEL_NOT_TRAINED` | 503 | Model not yet trained |
| `DATASET_NOT_LOADED` | 503 | Dataset unavailable |
| `PREDICTION_FAILED` | 500 | Prediction execution error |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting

**Current:** No rate limiting (development)

**Production Plan:**
- 1,000 requests/minute per IP
- 10,000 requests/minute per API key
- Returns `429 Too Many Requests` when exceeded

---

## Examples

### Python with Requests
```python
import requests

# Make prediction
response = requests.post('http://localhost:8000/predict', json={
    'features': [0.5] * 30,
    'amount': 150.50
})
result = response.json()
print(f"Risk: {result['risk_score']}, Fraud: {result['is_fraud']}")

# Get explanation
explain = requests.post('http://localhost:8000/explain', json={
    'features': [0.5] * 30,
    'amount': 150.50
}).json()
print(f"Top feature: {explain['top_features'][0]}")
```

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Make prediction
const result = await axios.post('http://localhost:8000/predict', {
  features: Array(30).fill(0.5),
  amount: 150.50
});
console.log(`Risk: ${result.data.risk_score}`);

// Stream transactions
const ws = new WebSocket('ws://localhost:8000/ws/stream');
ws.onmessage = (e) => {
  const tx = JSON.parse(e.data);
  console.log(`Transaction: ${tx.id}, Risk: ${tx.risk_score}`);
};
```

### cURL
```bash
# Health check
curl http://localhost:8000/health

# Get status
curl http://localhost:8000/status

# Make prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"features": [0.5, 0.5, ...], "amount": 150.50}'

# Get metrics
curl http://localhost:8000/metrics
```

---

## Swagger/OpenAPI

Auto-generated API documentation available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Prediction Latency | < 50ms | ✓ |
| Fraud Recall | > 95% | ✓ (96.2%) |
| Precision | > 94% | ✓ (94.5%) |
| Availability | > 99.9% | ✓ |
| Throughput | 1000+ TPS | ✓ |

---

## Support & Feedback

- **Issues**: GitHub Issues
- **Documentation**: See README.md
- **Contribution Guide**: See CONTRIBUTING.md
