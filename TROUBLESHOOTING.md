# Troubleshooting Guide

Common issues and solutions for FraudGuard deployment and development.

## Backend Issues

### Model Loading Failures

**Problem:** `ModelNotTrainedError: Model 'xgboost' is not trained`

**Solutions:**
1. Ensure dataset is available:
   ```bash
   ls backend/data/creditcard.csv
   ```

2. Train models explicitly:
   ```bash
   cd backend
   python -c "from models_ml import FraudDetectionModels; m = FraudDetectionModels(); m.train_xgboost(); m.train_isolation_forest()"
   ```

3. Check dataset path in `config.py`:
   ```python
   DATASET_PATH = "backend/data/creditcard.csv"
   ```

---

### WebSocket Connection Failures

**Problem:** `WebSocket connection failed: 1006`

**Causes & Solutions:**
1. Backend not running:
   ```bash
   ps aux | grep uvicorn
   # If not running, restart:
   python -m uvicorn backend.main:app --reload
   ```

2. Port already in use:
   ```bash
   # Find process using port 8000
   lsof -i :8000
   # Kill the process
   kill -9 <PID>
   ```

3. CORS issues:
   ```python
   # Check CORS settings in main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173"],
   )
   ```

---

### Memory Issues

**Problem:** `MemoryError` when loading dataset

**Solutions:**
1. Check available memory:
   ```bash
   free -h  # Linux/Mac
   Get-ComputerInfo -Property TotalPhysicalMemory  # Windows
   ```

2. Use data sampling:
   ```python
   # In dataset.py, reduce dataset size
   data = data.sample(n=100000)  # Use 100k samples instead of 280k
   ```

3. Stream data instead:
   ```python
   # Process in batches instead of loading all at once
   for batch in dataset.iter_batches(batch_size=1000):
       predictions = model.predict(batch)
   ```

---

### Database Connection Errors

**Problem:** `psycopg2.OperationalError: connection refused`

**Solutions:**
1. Check if database is running:
   ```bash
   psql -U postgres -d fraudguard -c "SELECT 1"
   ```

2. Fix connection string in `.env`:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/fraudguard"
   ```

3. Create database if not exists:
   ```bash
   createdb -U postgres fraudguard
   ```

---

### SHAP Explanation Timeouts

**Problem:** `Explanation generation failed` or very slow explanations

**Solutions:**
1. Reduce explanation sample size:
   ```python
   # In shap_explainer.py
   explainer = TreeExplainer(model, max_samples=100)  # Default is 1000
   ```

2. Use simpler explanation method:
   ```python
   # Use KernelExplainer only when necessary
   from shap import KernelExplainer
   explainer = KernelExplainer(model.predict, X_sample)
   ```

3. Cache explanations:
   ```python
   # Reuse explanations for similar features
   if features_hash in explanation_cache:
       return explanation_cache[features_hash]
   ```

---

## Frontend Issues

### API Connection Errors

**Problem:** `Failed to fetch` or network errors in browser

**Solutions:**
1. Verify backend is running:
   ```bash
   curl http://localhost:8000/health
   ```

2. Check API_BASE in App.tsx:
   ```typescript
   const API_BASE = "http://localhost:8000";  // Correct
   const API_BASE = "http://127.0.0.1:8000";  // May have CORS issues
   ```

3. Clear browser cache:
   ```bash
   # Chrome: Ctrl+Shift+Delete
   # Firefox: Ctrl+Shift+Delete
   # Safari: Develop > Empty Web Caches
   ```

---

### Chart Rendering Issues

**Problem:** Charts not displaying or blank

**Solutions:**
1. Check data is being received:
   ```typescript
   console.log('chartData:', chartData);
   console.log('transactions:', transactions);
   ```

2. Verify data format:
   ```typescript
   // Charts expect specific format
   const data = [{name: 'T0', risk: 45}, {name: 'T1', risk: 65}];
   ```

3. Check responsive container sizing:
   ```typescript
   <ResponsiveContainer width="100%" height="100%">
     {/* ResponsiveContainer needs parent with height */}
   </ResponsiveContainer>
   ```

---

### WebSocket Streaming Stops

**Problem:** Transactions stop appearing after a while

**Solutions:**
1. Check connection status:
   ```typescript
   ws.onclose = (event) => {
     console.error('WebSocket closed:', event);
     // Implement auto-reconnect
   };
   ```

2. Handle connection errors:
   ```typescript
   ws.onerror = (error) => {
     console.error('WebSocket error:', error);
     // Try to reconnect
     setTimeout(connectWS, 3000);
   };
   ```

3. Clear old transactions to free memory:
   ```typescript
   setTransactions(prev => [...prev].slice(0, 1000))  // Keep only last 1000
   ```

---

### Dark Mode Issues

**Problem:** Dark mode toggle not working

**Solutions:**
1. Verify state management:
   ```typescript
   const [darkMode, setDarkMode] = useState(true);
   // Ensure darkMode is being used in className
   ```

2. Check Tailwind configuration:
   ```javascript
   // tailwind.config.js
   module.exports = {
     darkMode: 'class',  // Should use 'class' strategy
   }
   ```

3. Clear compiled CSS:
   ```bash
   rm -rf node_modules/.vite
   npm run dev  # Rebuild
   ```

---

## Docker Issues

### Container Fails to Start

**Problem:** `docker-compose up` fails

**Solutions:**
1. Check logs:
   ```bash
   docker-compose logs fraudguard-backend
   docker-compose logs fraudguard-frontend
   ```

2. Verify ports aren't in use:
   ```bash
   lsof -i :8000  # Backend
   lsof -i :5173  # Frontend
   ```

3. Rebuild images:
   ```bash
   docker-compose build --no-cache
   docker-compose up -d
   ```

---

### Volume Permission Issues

**Problem:** `Permission denied` when accessing mounted volumes

**Solutions:**
1. Fix ownership:
   ```bash
   sudo chown -R $(id -u):$(id -g) .
   ```

2. Use volume in docker-compose:
   ```yaml
   volumes:
     - ./backend:/app/backend
   ```

3. Run with correct user:
   ```bash
   docker-compose -f docker-compose.yml up
   ```

---

## Deployment Issues

### Out of Memory on Render

**Problem:** Dyno crashes with memory error

**Solutions:**
1. Reduce dataset size:
   ```python
   # Load smaller dataset
   DATA_LIMIT = 50000  # Instead of 280k
   ```

2. Enable model compression:
   ```python
   # Use quantization to reduce model size
   import xgboost as xgb
   model = xgb.Booster(model_file='model.pkl')
   # Save with compression
   ```

3. Use managed database:
   ```bash
   # Don't store large files on Render, use external DB
   heroku addons:create heroku-postgresql:hobby-dev
   ```

---

### SSL Certificate Issues

**Problem:** `SSL: CERTIFICATE_VERIFY_FAILED`

**Solutions:**
1. Install cert bundle:
   ```bash
   pip install certifi
   ```

2. Use correct API base URL:
   ```typescript
   // Use HTTPS in production
   const API_BASE = "https://api.fraudguard.example.com";
   ```

3. Fix CORS headers:
   ```python
   # Ensure backend sends proper CORS headers
   ```

---

## Performance Issues

### High Latency

**Problem:** Predictions taking > 100ms

**Solutions:**
1. Profile the code:
   ```bash
   python -m cProfile -s cumtime backend/main.py
   ```

2. Check for bottlenecks:
   - Model inference time
   - Database queries
   - Feature normalization
   - SHAP explanation time

3. Enable caching:
   ```python
   from functools import lru_cache
   
   @lru_cache(maxsize=10000)
   def predict_cached(features_tuple):
       return predict(np.array(features_tuple))
   ```

---

### High CPU Usage

**Problem:** CPU at 100% constantly

**Solutions:**
1. Reduce concurrent connections:
   ```python
   # Limit WebSocket connections
   MAX_CONNECTIONS = 100
   ```

2. Use worker pooling:
   ```bash
   # Use multiple workers
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app
   ```

3. Optimize queries:
   ```bash
   # Check slow queries
   pg_stat_statements
   ```

---

## Debugging Tips

### Enable Debug Logging

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")
```

### Browser DevTools

**Network Tab:**
- Check API response times
- Verify request/response format
- Look for failed requests

**Console Tab:**
- Check JavaScript errors
- View console logs
- Test API calls manually

**Performance Tab:**
- Identify slow operations
- Profile rendering
- Memory leaks

---

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `CORS error` | Frontend/backend domain mismatch | Add frontend URL to CORS origins |
| `404 Not Found` | Endpoint doesn't exist | Check endpoint path |
| `422 Unprocessable Entity` | Invalid request data | Validate input format |
| `503 Service Unavailable` | Backend not ready | Wait for models to load |
| `429 Too Many Requests` | Rate limit exceeded | Wait or use API key |

---

## Getting Help

1. **Check logs:**
   ```bash
   # Backend
   tail -f logs/fraudguard.log
   
   # Frontend
   npm run dev  # Check console output
   
   # Docker
   docker-compose logs -f
   ```

2. **Test API endpoints:**
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8000/status
   curl -X POST http://localhost:8000/predict -d '...'
   ```

3. **Search issues:**
   - GitHub Issues: https://github.com/NehmanDevelops/Fraud-Control/issues
   - Check existing solutions
   - Create new issue with logs

4. **Community:**
   - Discussions: GitHub Discussions
   - Stack Overflow tag: `fraudguard`
