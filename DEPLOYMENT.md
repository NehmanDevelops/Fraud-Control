# FraudGuard Deployment Guide

## Quick Deployment Options

### Option 1: Render + Vercel (Recommended - Free Tier Available)

#### Step 1: Deploy Backend to Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Select `Fraud-Control` repository

3. **Configure Service**
   - **Name**: `fraudguard-api`
   - **Region**: Choose nearest to you
   - **Branch**: `master`
   - **Runtime**: `Python 3.11`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     ```
     ENVIRONMENT=production
     SECRET_KEY=your-secret-key-here
     CORS_ORIGINS=https://your-vercel-domain.vercel.app
     ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait ~3-5 minutes
   - Copy your API URL (e.g., `https://fraudguard-api.onrender.com`)

#### Step 2: Deploy Frontend to Vercel

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your GitHub repo
   - Select `Fraud-Control`

3. **Configure Project**
   - **Framework**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Environment Variables**
   - Click "Environment Variables"
   - Add:
     ```
     VITE_API_BASE=https://fraudguard-api.onrender.com
     ```

5. **Deploy**
   - Click "Deploy"
   - Wait ~1-2 minutes
   - Your dashboard is live!

**Cost**: Free tier covers ~1000 transactions/month. Upgrade if needed.

---

### Option 2: Docker + Docker Compose (Local)

#### Prerequisites
- Docker Desktop installed

#### Build & Run

```bash
# Clone repo
git clone https://github.com/NehmanDevelops/Fraud-Control.git
cd Fraud-Detection

# Create docker-compose.yml in root directory
cat > docker-compose.yml << 'EOF'
version: '3.9'

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - PYTHONUNBUFFERED=1
    volumes:
      - ./backend/models:/app/models
      - ./backend/data:/app/data

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_BASE=http://backend:8000
    depends_on:
      - backend

networks:
  default:
    name: fraudguard-network
EOF

# Build & run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Access**: 
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

### Option 3: Manual Cloud Deployment

#### AWS EC2

```bash
# SSH into instance
ssh -i key.pem ubuntu@your-instance-ip

# Install dependencies
sudo apt-get update
sudo apt-get install -y python3.11 python3-venv nodejs npm nginx

# Clone repo
git clone https://github.com/NehmanDevelops/Fraud-Control.git
cd Fraud-Detection

# Backend setup
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start with gunicorn
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app &

# Frontend setup (in another terminal)
cd frontend
npm install
npm run build
# Serve with nginx
```

#### Google Cloud Run

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Deploy backend
gcloud run deploy fraudguard-api \
  --source . \
  --runtime python311 \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production

# Deploy frontend to Firebase Hosting
firebase deploy
```

---

## Production Checklist

- [ ] Use strong `SECRET_KEY` (generate: `python -c "import secrets; print(secrets.token_hex(32))"`)
- [ ] Set `ENVIRONMENT=production`
- [ ] Restrict `CORS_ORIGINS` to your domain only
- [ ] Enable HTTPS (Render/Vercel/AWS provide)
- [ ] Set up monitoring/logging (CloudWatch, Sentry)
- [ ] Configure database backups
- [ ] Set up model versioning (save checkpoints)
- [ ] Enable rate limiting
- [ ] Set up health checks
- [ ] Configure auto-scaling
- [ ] Test disaster recovery

---

## Monitoring & Logging

### Application Monitoring

```python
# Add to backend/main.py
from prometheus_client import Counter, Histogram
import time

# Metrics
request_count = Counter('requests_total', 'Total requests')
prediction_time = Histogram('prediction_seconds', 'Prediction latency')
fraud_count = Counter('frauds_detected_total', 'Total fraud detections')

@app.middleware("http")
async def add_metrics(request, call_next):
    request_count.inc()
    start = time.time()
    response = await call_next(request)
    prediction_time.observe(time.time() - start)
    return response
```

### Log Aggregation

Use **Sentry** for error tracking:

```bash
pip install sentry-sdk

# In main.py
import sentry_sdk
sentry_sdk.init(
    dsn="your-sentry-dsn",
    traces_sample_rate=0.1,
    environment="production"
)
```

---

## Scaling Considerations

| Component | Bottleneck | Solution |
|-----------|-----------|----------|
| **Backend** | Model inference | Add caching, GPU acceleration |
| **Frontend** | Real-time updates | Use WebSocket compression, message batching |
| **Database** | Transaction volume | Use read replicas, caching layer |
| **Storage** | Model artifacts | Use cloud object storage (S3) |

---

## Troubleshooting

### "ModuleNotFoundError" on Render
```bash
# Ensure requirements.txt has all dependencies
pip freeze > backend/requirements.txt
git add backend/requirements.txt
git commit -m "fix: Update requirements"
git push
```

### CORS errors
```python
# Update CORS_ORIGINS in environment variables
CORS_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com
```

### WebSocket not connecting
```python
# Check WS URL matches deployment domain
VITE_WS_BASE=wss://your-backend-domain.com/ws/stream  # Note: wss (secure)
```

---

## Database Setup (Future)

For production with real data:

```bash
# Install PostgreSQL
pip install psycopg2-binary sqlalchemy

# Create database
createdb fraudguard

# Set environment
export DATABASE_URL=postgresql://user:password@localhost/fraudguard

# Run migrations
alembic upgrade head
```

---

## Security Best Practices

1. **API Keys**: Use environment variables, never commit keys
2. **HTTPS**: Enable in production (Render/Vercel auto-enable)
3. **Rate Limiting**: Add to FastAPI
4. **Input Validation**: Validate all inputs
5. **CORS**: Restrict to known domains
6. **Secrets**: Rotate regularly

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Docker Docs**: https://docs.docker.com/

---

**Last Updated: December 2025**
