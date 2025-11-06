# Data Ingestion Module - Deployment & Usage Guide

Comprehensive guide for the Banana Fate data ingestion system - the public-facing web application for capturing banana images.

---

## 📋 Module Overview

The Data Ingestion Module consists of two services:

| Service | Type | Purpose | URL |
|---------|------|---------|-----|
| **Backend** | FastAPI API | Generate signed URLs, save metadata | `https://data-ingestion-backend-*.run.app` |
| **Frontend** | React + Nginx | Camera capture, image upload | `https://data-ingestion-frontend-*.run.app` |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│        Data Ingestion Workflow              │
└─────────────────────────────────────────────┘

User's Browser
     │
     ▼
┌────────────────────┐
│  Frontend (React)  │
│  Port: 8080       │
│                    │
│  • Camera access   │
│  • Image capture   │
│  • Client resize   │
│  • Metadata form   │
└─────────┬──────────┘
          │
          │ 1. Request signed URL
          ▼
┌────────────────────┐
│  Backend (FastAPI) │
│  Port: 8080       │
│                    │
│  • Generate URL    │
│  • Save metadata   │
└─────────┬──────────┘
          │
          ├─── 2. Return signed URL
          │
          ├─── 3. Upload directly to GCS ───┐
          │                                  │
          ├─── 4. Save metadata             │
          │                                  │
          ▼                                  ▼
┌──────────────┐                  ┌────────────────┐
│   MongoDB    │                  │ Google Cloud   │
│   Atlas      │                  │ Storage        │
│              │                  │                │
│ • batchId    │                  │ Images stored  │
│ • bananaId   │                  │ in bucket      │
│ • metadata   │                  │                │
└──────────────┘                  └────────────────┘
```

---

## 🚀 Deployment

### Option 1: Deploy via Main Script (Recommended)

From the centralized deployment directory:

```bash
cd BananaFate/deployment
./deploy.sh
```

Select:
- **[2] Select Individual Services**
- Then select services **1** and **2** (backend + ingestion frontend)

### Option 2: Direct Deployment

```bash
cd BananaFate/deployment

# Deploy backend
./deploy-data-ingestion-backend.sh

# Deploy frontend (requires backend first)
./deploy-data-ingestion-frontend.sh
```

### Deployment Time
- **Backend:** ~3-5 minutes
- **Frontend:** ~3-5 minutes
- **Total:** ~6-10 minutes

---

## 📦 What Gets Deployed

### Backend Service

**Docker Image:**
- Base: `python:3.11-slim`
- Framework: FastAPI 0.115.0
- Dependencies: pymongo, google-cloud-storage, bcrypt, pyjwt

**Environment Variables (injected during build):**
```
MONGODB_USERNAME
MONGODB_PASSWORD
MONGODB_SERVER_ADDRESS
GCS_PROJECT_ID
GCS_BUCKET_NAME
GCS_SERVICE_ACCOUNT_EMAIL
MANAGEMENT_PASSWORD_HASH (bcrypt hash from ADMIN_PASSWORD)
JWT_SECRET (auto-generated if not provided)
```

**Cloud Run Configuration:**
- Memory: 512 Mi
- CPU: 1
- Min instances: 0 (scale-to-zero)
- Max instances: 10
- Port: 8080
- Authentication: Allow unauthenticated (public API)

**Endpoints:**
```
GET  /                          - Service info
GET  /health                    - Health check (MongoDB connectivity)
POST /generate-signed-url       - Generate GCS upload URL (15-min expiration)
POST /save-metadata             - Save image metadata to MongoDB
```

### Frontend Service

**Docker Image:**
- Build stage: `node:20-alpine` (Vite build)
- Runtime stage: `nginx:alpine`
- Static assets served by Nginx

**Build Arguments:**
```
VITE_BACKEND_URL=<backend-url>
```

**Cloud Run Configuration:**
- Memory: 512 Mi
- CPU: 1
- Min instances: 0
- Max instances: 10
- Port: 8080
- Authentication: Allow unauthenticated

**Features:**
- Camera access via MediaDevices API
- Client-side image resizing (max 1024x1024)
- Direct browser-to-GCS upload
- Metadata form with validation

---

## ✅ Post-Deployment Verification

### 1. Check Services are Running

```bash
# List Cloud Run services
gcloud run services list --region=us-central1 | grep data-ingestion

# Expected output:
✔  data-ingestion-backend   us-central1  https://...  yes
✔  data-ingestion-frontend  us-central1  https://...  yes
```

### 2. Test Backend Endpoints

```bash
# Get backend URL
BACKEND_URL=$(gcloud run services describe data-ingestion-backend \
  --region=us-central1 \
  --format='value(status.url)')

# Test health endpoint
curl -s "$BACKEND_URL/health" | jq '.'
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "banana-fate-data-ingestion-backend",
  "environment": "production",
  "mongodb_connected": true,
  "timestamp": "2025-11-05T..."
}
```

### 3. Test Frontend Access

```bash
# Get frontend URL
FRONTEND_URL=$(gcloud run services describe data-ingestion-frontend \
  --region=us-central1 \
  --format='value(status.url)')

# Test frontend loads
curl -I "$FRONTEND_URL"

# Expected: HTTP/2 200
```

### 4. End-to-End Test

1. Open frontend URL in browser
2. Grant camera permissions
3. Capture test image
4. Fill metadata form
5. Submit upload
6. Verify upload succeeded
7. Check MongoDB for new document
8. Check GCS for uploaded image

---

## 🔧 Local Development

For local testing before deploying:

### Backend Development

```bash
cd BananaFate/data-ingestion/data-ingestion-backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export username="${MONGODB_USERNAME}"
export password="${MONGODB_PASSWORD}"
export server_address="@${MONGODB_CLUSTER}/"
export GCS_PROJECT_ID="banana-fate"
export GCS_BUCKET_NAME="bananafate-images"

# Run locally
python app.py
```

Access at: `http://localhost:8080`

### Frontend Development

```bash
cd BananaFate/data-ingestion/data-ingestion-frontend

# Install dependencies
npm install

# Set backend URL for local dev
echo "VITE_BACKEND_URL=http://localhost:8080" > .env.local

# Run dev server
npm run dev
```

Access at: `http://localhost:3000`

### Docker Compose (Full Local Stack)

```bash
cd BananaFate/data-ingestion

# Start both services
docker-compose up --build

# Access:
# - Backend:  http://localhost:8080
# - Frontend: http://localhost:3000
```

---

## 📊 Monitoring

### View Logs

```bash
# Backend logs (live)
gcloud run logs tail data-ingestion-backend \
  --region=us-central1 \
  --follow

# Frontend logs (live)
gcloud run logs tail data-ingestion-frontend \
  --region=us-central1 \
  --follow

# Filter for errors only
gcloud run logs tail data-ingestion-backend \
  --region=us-central1 \
  --log-filter="severity>=ERROR"
```

### Check Resource Usage

```bash
# Get service details
gcloud run services describe data-ingestion-backend \
  --region=us-central1 \
  --format=yaml
```

### Monitor Uploads

```bash
# Check recent documents in MongoDB
mongosh "mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/BananaFate_database"

# In mongo shell:
db.banana_images.find().sort({uploadedAt: -1}).limit(5).pretty()
```

---

## 🛠️ Troubleshooting

### Upload Fails with "Load failed" Error

**Symptom:** Upload fails on mobile devices with "Load failed" error.

**Cause:** Mobile browsers have issues with `fetch()` on large data URLs.

**Fix:** Already implemented in current version - uses direct base64-to-Blob conversion.

**Verify fix is applied:**
```bash
# Check App.tsx contains direct Blob conversion
grep -A 5 "base64ToBlob" BananaFate/data-ingestion/data-ingestion-frontend/src/App.tsx
```

### CORS Error When Uploading to GCS

**Symptom:** Browser console shows CORS policy error when uploading to GCS.

**Cause:** GCS bucket missing CORS configuration.

**Fix:**
```bash
# Apply CORS configuration
gsutil cors set BananaFate/deployment/cors.json gs://bananafate-images

# Verify
gsutil cors get gs://bananafate-images
```

### MongoDB Connection Timeout

**Symptom:** Backend health check shows `mongodb_connected: false`.

**Cause:** MongoDB Atlas IP whitelist doesn't include Cloud Run IPs.

**Fix:**
1. Go to MongoDB Atlas dashboard
2. Navigate to Network Access
3. Add IP address: `0.0.0.0/0` (allow from anywhere)
4. Note: Cloud Run uses dynamic IPs, so must allow all

### Images Not Displaying

**Symptom:** Thumbnails show broken image icons.

**Cause:** Signed URLs expired or GCS permissions incorrect.

**Fix:**
```bash
# Check service account has correct permissions
gsutil iam ch serviceAccount:281433271767-compute@developer.gserviceaccount.com:roles/storage.admin \
  gs://bananafate-images
```

---

## 🔐 Security Considerations

### Public Access
- Both frontend and backend allow unauthenticated access
- This is intentional for data collection purposes
- Management features require JWT authentication

### Signed URLs
- Upload URLs expire after 15 minutes
- Prevents unauthorized uploads to GCS
- URLs are single-use and time-limited

### Data Validation
- All inputs validated by Pydantic models
- Client-side validation in frontend
- Server-side validation in backend

### Credentials
- MongoDB credentials baked into Docker image during build
- Never exposed in frontend code
- Service account credentials managed by GCP

---

## 📈 Usage Statistics

After deployment, monitor usage via:

### Cloud Run Metrics
```bash
# View request count
gcloud run services describe data-ingestion-frontend \
  --region=us-central1 \
  --format='get(status.traffic)'
```

### MongoDB Queries
```javascript
// Total uploads
db.banana_images.countDocuments()

// Uploads by date
db.banana_images.aggregate([
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$captureTime" } } },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: -1 } },
  { $limit: 7 }
])

// Uploads by stage
db.banana_images.aggregate([
  { $group: { _id: "$stage", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

---

## 🔄 Redeployment

### When to Redeploy

Redeploy when you make changes to:
- Application code (app.py, frontend components)
- Dependencies (requirements.txt, package.json)
- Environment variables (credentials, configuration)
- Docker configuration

### How to Redeploy

```bash
cd BananaFate/deployment

# Redeploy both services
./deploy-data-ingestion-backend.sh
./deploy-data-ingestion-frontend.sh

# Or use interactive script
./deploy.sh
```

**Note:** Cloud Run performs rolling updates with zero downtime.

---

## 📚 Additional Resources

- **Quick Start Guide:** `README.md` - Deploy all services
- **Data Management Guide:** `DATA_MANAGEMENT_GUIDE.md` - Admin portal
- **Troubleshooting:** `TROUBLESHOOTING.md` - Common issues
- **Main Documentation:** `../CLAUDE.md` - Complete project context

---

## 💡 Best Practices

1. **Always deploy backend first** before frontend
2. **Test locally** with Docker Compose before cloud deployment
3. **Monitor logs** after deployment for errors
4. **Verify health checks** pass before using the app
5. **Keep .env file secure** - never commit to git
6. **Use environment variables** for all credentials
7. **Set up budget alerts** in GCP to avoid unexpected costs

---

**Last Updated:** 2025-11-05
**Module Version:** 2.0 (includes management features in backend)
