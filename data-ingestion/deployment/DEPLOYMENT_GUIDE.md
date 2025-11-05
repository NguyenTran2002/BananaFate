# BananaFate Data Ingestion - Deployment Guide

Quick reference for deploying the BananaFate data ingestion application to Google Cloud Run.

## Prerequisites

- ✅ Google Cloud SDK (`gcloud` CLI) installed
- ✅ Docker installed and running
- ✅ Authentication: `gcloud auth login`
- ✅ Project access to `banana-fate`

## Initial Setup

1. **Navigate to deployment directory**:
   ```bash
   cd BananaFate/data-ingestion/deployment
   ```

2. **Verify .env configuration**:
   - The `.env` file should already be configured with MongoDB credentials
   - Verify settings:
     ```bash
     cat .env
     ```

3. **Ensure scripts are executable**:
   ```bash
   chmod +x deploy-*.sh
   ```

## Deployment

### Option 1: Full Deployment (Recommended)

Deploy both backend and frontend with a single command:

```bash
./deploy-all.sh
```

**What it does**:
1. ✅ Validates prerequisites (gcloud, docker, .env)
2. 🔧 Deploys backend to Cloud Run
3. 🧪 Performs backend health check
4. 📝 Captures backend URL
5. 🎨 Deploys frontend with backend URL
6. 🧪 Performs frontend health check
7. 📊 Outputs service URLs

**Duration**: ~5-10 minutes

**Expected output**:
```
════════════════════════════════════════════════
  BananaFate Data Ingestion - Full Deployment
════════════════════════════════════════════════

🔍 Checking prerequisites...
✅ Prerequisites check passed

════════════════════════════════════════════════
STEP 1: Deploying Backend Service
════════════════════════════════════════════════
🚀 Deploying Backend to Cloud Run...
📦 Building Docker image...
⬆️  Pushing image to Artifact Registry...
☁️  Deploying to Cloud Run...
✅ Backend deployed successfully!
🔗 Backend URL: https://data-ingestion-backend-xxx.run.app

════════════════════════════════════════════════
STEP 2: Deploying Frontend Service
════════════════════════════════════════════════
🚀 Deploying Frontend to Cloud Run...
📦 Building Docker image...
⬆️  Pushing image to Artifact Registry...
☁️  Deploying to Cloud Run...
✅ Frontend deployed successfully!
🔗 Frontend URL: https://data-ingestion-frontend-xxx.run.app

════════════════════════════════════════════════
  ✅ DEPLOYMENT COMPLETE!
════════════════════════════════════════════════

📦 Services Deployed:
  🔧 Backend:  https://data-ingestion-backend-xxx.run.app
  🎨 Frontend: https://data-ingestion-frontend-xxx.run.app

🧪 Test the application at: https://data-ingestion-frontend-xxx.run.app
```

### Option 2: Individual Services

**Backend only**:
```bash
./deploy-backend.sh
```

**Frontend only** (requires backend deployed first):
```bash
./deploy-frontend.sh
```

## Post-Deployment Testing

1. **Open the frontend URL** in your browser

2. **Test image capture workflow**:
   - Click "Start Capture"
   - Grant camera permissions
   - Capture a test image
   - Fill in metadata:
     - Capture Person: Your name
     - Batch ID: `test_batch_001`
     - Banana ID: `test_banana_001`
     - Stage: Select any stage
     - Notes: "Deployment test"
   - Submit and verify success

3. **Verify data in MongoDB**:
   ```bash
   # Use MongoDB Compass or mongosh
   # Connection: mongodb+srv://literal:<your-username>:literal:<your-password>@literal:<your-cluster>.mongodb.net/
   # Database: BananaFate_database
   # Collection: banana_images
   # Query: { batchId: "test_batch_001" }
   ```

4. **Verify image in GCS**:
   ```bash
   gsutil ls gs://bananafate-images/test_batch_001/
   ```

## Monitoring

### View Logs

**Backend logs**:
```bash
gcloud run logs tail data-ingestion-backend --region=us-central1
```

**Frontend logs**:
```bash
gcloud run logs tail data-ingestion-frontend --region=us-central1
```

### Check Service Status

```bash
# List all Cloud Run services
gcloud run services list --region=us-central1

# Get backend details
gcloud run services describe data-ingestion-backend --region=us-central1

# Get frontend details
gcloud run services describe data-ingestion-frontend --region=us-central1
```

## Troubleshooting

### Error: "permission denied" when running scripts
```bash
chmod +x deploy-*.sh
```

### Error: "BACKEND_URL not set"
Deploy backend first:
```bash
./deploy-backend.sh
```

Or manually set in `.env`:
```bash
echo "BACKEND_URL=https://data-ingestion-backend-xxx.run.app" >> .env
```

### Docker push fails with authentication error
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Health check fails
Check backend logs:
```bash
gcloud run logs tail data-ingestion-backend --region=us-central1
```

Common issues:
- MongoDB connection timeout (check Atlas IP whitelist)
- Missing environment variables
- GCS permissions issue

### Upload fails in frontend
1. Check browser console for errors
2. Verify backend URL is correct
3. Test backend endpoints:
   ```bash
   curl https://data-ingestion-backend-xxx.run.app/health
   ```

## Updating Deployment

To redeploy after code changes:

```bash
# Full redeployment
./deploy-all.sh

# Or individual services
./deploy-backend.sh  # for backend changes
./deploy-frontend.sh # for frontend changes
```

Cloud Run automatically routes traffic to new revisions once deployed.

## Rollback

If a deployment causes issues, rollback to a previous revision:

1. **Via Cloud Console**:
   - Navigate to Cloud Run → Service
   - Click "Revisions" tab
   - Select previous working revision
   - Click "Manage Traffic"
   - Route 100% traffic to that revision

2. **Via CLI**:
   ```bash
   # List revisions
   gcloud run revisions list \
     --service=data-ingestion-backend \
     --region=us-central1

   # Route traffic to specific revision
   gcloud run services update-traffic data-ingestion-backend \
     --to-revisions=REVISION_NAME=100 \
     --region=us-central1
   ```

## Cost Optimization

Current configuration optimizes for cost:
- **Scale to zero**: Services scale down to 0 instances when idle
- **Free tier**: MongoDB Atlas (512MB), GCS (5GB free/month)
- **Minimal resources**: 512Mi RAM, 1 CPU per service

**Estimated monthly cost**: < $5 for development use

## Local Development

Before deploying, test locally with docker-compose:

```bash
cd BananaFate/data-ingestion
docker-compose up --build
```

Access locally:
- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Health check: http://localhost:8080/health

## Next Steps

After successful deployment:

1. **Begin data collection**:
   - Create batch IDs for tracking
   - Capture banana images twice daily
   - Monitor data quality

2. **Monitor usage**:
   - Check Cloud Run metrics in console
   - Review MongoDB storage usage
   - Monitor GCS bucket size

3. **Plan for production**:
   - Consider custom domain
   - Set up monitoring alerts
   - Implement backup strategy

---

For detailed technical information, see [DEPLOYMENT_PLAN.md](../DEPLOYMENT_PLAN.md)
