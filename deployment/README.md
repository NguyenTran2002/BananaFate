# Banana Fate - Deployment Guide

**Quick Start Guide** for deploying all Banana Fate services to Google Cloud Platform.

---

## 🚀 Quick Start: Deploy Everything

The fastest way to get all services running in production:

```bash
cd BananaFate/deployment
./deploy.sh
```

Select option `[1] Deploy Everything` and confirm. The script will:
1. ✅ Deploy data-ingestion-backend (API with authentication)
2. ✅ Deploy data-ingestion-frontend (public image capture app)
3. ✅ Deploy data-management-frontend (admin portal)

**Deployment time:** ~10-15 minutes total

---

## 📋 Prerequisites

Before deploying, ensure you have:

### Required Tools
- [x] **Google Cloud SDK** (`gcloud`) - [Install](https://cloud.google.com/sdk/docs/install)
- [x] **Docker** - [Install](https://docs.docker.com/get-docker/)
- [x] **Python 3** - For password hash generation

### GCP Setup
- [x] GCP Project created (`banana-fate`)
- [x] Billing enabled
- [x] Artifact Registry API enabled
- [x] Cloud Run API enabled
- [x] Authenticated with `gcloud auth login`

### External Services
- [x] MongoDB Atlas cluster (free tier works)
- [x] Google Cloud Storage bucket created

### Verification
```bash
# Check tools are installed
gcloud --version
docker --version
python3 --version

# Check you're authenticated
gcloud auth list

# Check current project
gcloud config get-value project
```

---

## ⚙️ Configuration

All configuration is in `.env` file in this directory.

### Initial Setup

1. **Review `.env` file:**
   ```bash
   cat .env
   ```

2. **Update credentials** (if needed):
   ```bash
   nano .env
   ```

### Key Configuration Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_PASSWORD` | Password for management portal | `REDACTED` |
| `GCP_PROJECT_ID` | Your GCP project ID | `banana-fate` |
| `GCP_REGION` | Deployment region | `us-central1` |
| `MONGODB_USERNAME` | MongoDB Atlas username | `literal:<your-username>` |
| `MONGODB_PASSWORD` | MongoDB Atlas password | `literal:<your-password>` |
| `MONGODB_CLUSTER` | MongoDB cluster address | `literal:<your-cluster>.mongodb.net` |
| `GCS_BUCKET_NAME` | GCS bucket for images | `bananafate-images` |

**Security Note:** The `.env` file contains sensitive credentials. Never commit it to git.

---

## 🎯 Deployment Options

### Option 1: Interactive Deployment

Run the interactive deployment manager:

```bash
./deploy.sh
```

**Menu Options:**
- **[1] Deploy Everything** - One-click deployment of all services
- **[2] Select Individual Services** - Choose specific services to deploy
- **[3] Exit** - Cancel deployment

### Option 2: Individual Service Deployment

Deploy services one at a time:

```bash
# Backend only (includes API + authentication)
./deploy-data-ingestion-backend.sh

# Data ingestion frontend only
./deploy-data-ingestion-frontend.sh

# Data management portal only
./deploy-data-management-frontend.sh
```

**Note:** Frontends require the backend to be deployed first.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Banana Fate System                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌──────────────────────┐
│ Data Ingestion      │         │ Data Management      │
│ Module (Public)     │         │ Module (Admin)       │
├─────────────────────┤         ├──────────────────────┤
│                     │         │                      │
│  Frontend (React)   │         │  Frontend (React)    │
│  • Camera capture   │         │  • Protected login   │
│  • Image upload     │         │  • View/edit data    │
│  • Metadata form    │         │  • Analytics         │
│                     │         │  • Delete entries    │
└─────────┬───────────┘         └──────────┬───────────┘
          │                                │
          │         ┌──────────────────────┘
          │         │
          └─────────▼─────────┐
                    │         │
          Backend (FastAPI)   │
          • Upload API        │
          • Auth (JWT)        │
          • CRUD operations   │
          • Analytics         │
                    │         │
          ┌─────────┴─────────┴───────────┐
          │                               │
   ┌──────▼──────┐              ┌────────▼──────┐
   │  MongoDB    │              │  Google Cloud │
   │  Atlas      │              │  Storage      │
   │  (metadata) │              │  (images)     │
   └─────────────┘              └───────────────┘
```

### Service Breakdown

| Service | Type | Public | Purpose |
|---------|------|--------|---------|
| **data-ingestion-backend** | FastAPI | Yes | API for uploads, authentication, CRUD |
| **data-ingestion-frontend** | React + Nginx | Yes | Public image capture interface |
| **data-management-frontend** | React + Nginx | Yes* | Admin portal (*password protected) |

---

## 📦 What Gets Deployed

### 1. Data Ingestion Backend
- **Cloud Run Service:** `data-ingestion-backend`
- **URL:** `https://data-ingestion-backend-281433271767.us-central1.run.app`
- **Features:**
  - Generate GCS signed URLs for uploads
  - Save image metadata to MongoDB
  - JWT authentication for management features
  - CRUD operations for admin portal
  - Analytics endpoints

### 2. Data Ingestion Frontend
- **Cloud Run Service:** `data-ingestion-frontend`
- **URL:** `https://data-ingestion-frontend-281433271767.us-central1.run.app`
- **Features:**
  - Browser camera access
  - Client-side image resizing
  - Direct-to-GCS upload
  - Metadata form

### 3. Data Management Frontend
- **Cloud Run Service:** `data-management-frontend`
- **URL:** `https://data-management-frontend-281433271767.us-central1.run.app`
- **Features:**
  - Password authentication (uses `ADMIN_PASSWORD` from .env)
  - View batches and bananas
  - Edit metadata
  - Delete images, bananas, batches
  - Analytics dashboard

---

## ✅ Post-Deployment Verification

After deployment completes, verify all services are working:

### 1. Check Service Status
```bash
# List all deployed services
gcloud run services list --region=us-central1

# Check specific service details
gcloud run services describe data-ingestion-backend --region=us-central1
```

### 2. Test Backend Health
```bash
# Health check endpoint
curl https://data-ingestion-backend-281433271767.us-central1.run.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "environment": "production",
  "mongodb_connected": true
}
```

### 3. Test Frontend Access
```bash
# Data ingestion frontend
curl -I https://data-ingestion-frontend-281433271767.us-central1.run.app

# Data management frontend
curl -I https://data-management-frontend-281433271767.us-central1.run.app
```

Both should return `HTTP/2 200`.

### 4. Test Authentication
```bash
# Login to management portal
TOKEN=$(curl -X POST https://data-ingestion-backend-281433271767.us-central1.run.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"REDACTED"}' | jq -r '.token')

# Use token to access protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://data-ingestion-backend-281433271767.us-central1.run.app/batches
```

---

## 🔒 Security Checklist

After deploying to production:

- [ ] **Change default admin password** in `.env` and redeploy backend
- [ ] **Rotate JWT secret** (uncomment `JWT_SECRET` in `.env` and set a random value)
- [ ] **Review GCS bucket permissions** (should be private with signed URLs only)
- [ ] **Enable Cloud Run audit logging**
- [ ] **Set up monitoring alerts**
- [ ] **Review MongoDB Atlas IP whitelist** (allow `0.0.0.0/0` for Cloud Run)

---

## 🆘 Troubleshooting

### Deployment Fails with "Permission Denied"
```bash
# Ensure you're authenticated
gcloud auth login

# Set correct project
gcloud config set project banana-fate

# Grant necessary permissions
gcloud projects add-iam-policy-binding banana-fate \
  --member="user:your-email@gmail.com" \
  --role="roles/run.admin"
```

### Docker Build Fails
```bash
# Check Docker is running
docker ps

# Authenticate with Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### MongoDB Connection Errors
- Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Verify credentials in `.env` are correct
- Test connection string manually

### Frontend Shows "502 Bad Gateway"
- Wait 2-3 minutes for service to fully initialize
- Check backend is deployed first
- View Cloud Run logs: `gcloud run logs tail data-management-frontend --region=us-central1`

**For more detailed troubleshooting, see:** `TROUBLESHOOTING.md`

---

## 📊 Monitoring & Logs

### View Live Logs
```bash
# Backend logs
gcloud run logs tail data-ingestion-backend --region=us-central1 --follow

# Frontend logs
gcloud run logs tail data-management-frontend --region=us-central1 --follow
```

### Check Resource Usage
```bash
# View service metrics in Cloud Console
gcloud run services describe data-ingestion-backend \
  --region=us-central1 \
  --format=yaml
```

---

## 💰 Cost Estimates

**Development/Testing Usage:**
- Cloud Run (all 3 services): ~$0-5/month (scale-to-zero)
- MongoDB Atlas: Free tier (512 MB)
- Google Cloud Storage: Free tier (5 GB)
- Artifact Registry: Free tier (0.5 GB)

**Total:** ~$0-5/month for light usage

**Production Usage:**
- Depends on request volume
- Cloud Run bills per request + compute time
- Recommended: Set budget alerts in GCP

---

## 📚 Additional Documentation

- **Data Ingestion Guide:** `DATA_INGESTION_GUIDE.md` - Detailed guide for the image capture system
- **Data Management Guide:** `DATA_MANAGEMENT_GUIDE.md` - Admin portal features and usage
- **Troubleshooting:** `TROUBLESHOOTING.md` - Common issues and solutions

---

## 🔄 Redeployment

To redeploy after making changes:

```bash
# Quick redeploy everything
./deploy.sh

# Or redeploy specific service
./deploy-data-ingestion-backend.sh
```

**Note:** Cloud Run deployments are zero-downtime. New revisions gradually replace old ones.

---

## 📞 Support

For issues or questions:
1. Check `TROUBLESHOOTING.md`
2. Review Cloud Run logs
3. Check deployment script output
4. Review project documentation in `../docs/`

---

**Last Updated:** 2025-11-05
**Version:** 1.0.0
