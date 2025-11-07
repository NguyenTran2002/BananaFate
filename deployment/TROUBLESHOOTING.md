# Troubleshooting Guide

Common issues and solutions for deploying and running Banana Fate services.

---

## 🚨 Deployment Issues

### Docker Build Failures

#### Issue: "Cannot connect to Docker daemon"

**Error:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution:**
```bash
# Check if Docker is running
docker ps

# If not, start Docker Desktop or Docker daemon
# macOS: Open Docker Desktop application
# Linux: sudo systemctl start docker
```

#### Issue: "no matches found" when running scripts

**Error:**
```
no matches found: /Users/nnt/Documents/Developer/[BananaFate]/...
```

**Solution:**
The brackets `[BananaFate]` need to be quoted in shell commands.

**All deployment scripts already handle this correctly.** If running manual commands:
```bash
# Wrong
cd /Users/nnt/Documents/Developer/[BananaFate]/...

# Correct
cd "/Users/nnt/Documents/Developer/[BananaFate]/..."
```

#### Issue: "platform mismatch" warnings

**Error:**
```
WARNING: The requested image's platform (linux/amd64) does not match the detected host platform
```

**Solution:**
This is normal and expected. Cloud Run requires `linux/amd64` images. The warning can be safely ignored. If it causes issues:
```bash
# Enable Docker BuildKit (better multi-platform support)
export DOCKER_BUILDKIT=1
```

---

### Google Cloud Issues

#### Issue: "Permission denied" errors during deployment

**Error:**
```
ERROR: (gcloud.run.deploy) PERMISSION_DENIED: Permission denied on resource project banana-fate
```

**Solution:**
```bash
# Check you're authenticated
gcloud auth list

# Re-authenticate if needed
gcloud auth login

# Set correct project
gcloud config set project banana-fate

# Check you have necessary roles
gcloud projects get-iam-policy banana-fate \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:YOUR_EMAIL"

# Required roles:
# - roles/run.admin
# - roles/iam.serviceAccountUser
# - roles/artifactregistry.writer
```

#### Issue: Artifact Registry authentication fails

**Error:**
```
unauthorized: You don't have the needed permissions to perform this operation
```

**Solution:**
```bash
# Configure Docker authentication for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet

# If still fails, try logging in again
gcloud auth login
gcloud auth application-default login
```

#### Issue: Cloud Run service won't deploy

**Error:**
```
ERROR: (gcloud.run.deploy) Revision 'xxx' is not ready and cannot serve traffic
```

**Solution:**
```bash
# Check Cloud Run service logs for errors
gcloud run logs tail SERVICE_NAME --region=us-central1

# Common causes:
# 1. Container fails to start
# 2. Port mismatch (should be 8080)
# 3. Missing environment variables
# 4. Crash on startup

# View detailed revision information
gcloud run revisions describe REVISION_NAME --region=us-central1
```

---

## 🔧 Configuration Issues

### Environment Variable Problems

#### Issue: ".env file not found"

**Error:**
```
❌ Error: .env file not found in deployment directory
```

**Solution:**
```bash
# Check if .env exists
ls -la BananaFate/deployment/.env

# If missing, create from template
cd BananaFate/deployment
cp .env.example .env  # if example exists

# Or create new one with required variables (see README.md)
nano .env
```

#### Issue: "Missing required environment variables"

**Error:**
```
❌ Error: Missing required environment variables in .env:
  - MONGODB_USERNAME
  - GCS_BUCKET_NAME
```

**Solution:**
Edit `.env` and add missing variables:
```bash
nano BananaFate/deployment/.env

# Add all required variables (see README.md for full list)
```

#### Issue: Password hash generation fails

**Error:**
```
ERROR: bcrypt module not found
```

**Solution:**
```bash
# Install bcrypt
pip3 install bcrypt

# If using system Python on macOS, you might need:
python3 -m pip install --user bcrypt
```

---

## 🌐 Runtime Issues

### Backend Problems

#### Issue: MongoDB connection fails

**Error in logs:**
```
ERROR: Failed to connect to MongoDB
pymongo.errors.ServerSelectionTimeoutError
```

**Solution:**

1. **Check MongoDB Atlas IP whitelist:**
   - Go to MongoDB Atlas dashboard
   - Network Access → IP Whitelist
   - Add `0.0.0.0/0` to allow Cloud Run (dynamic IPs)

2. **Verify credentials:**
   ```bash
   # Test connection string manually
   mongosh "mongodb+srv://USERNAME:PASSWORD@CLUSTER/DATABASE"
   ```

3. **Check network access:**
   ```bash
   # From Cloud Run logs, check if DNS resolves
   gcloud run logs tail data-ingestion-backend --region=us-central1
   ```

#### Issue: GCS upload/read fails

**Error:**
```
google.auth.exceptions.DefaultCredentialsError: Could not automatically determine credentials
```

**Solution:**

1. **Check service account permissions:**
   ```bash
   # View current permissions
   gsutil iam get gs://bananafate-images

   # Grant necessary permissions
   gsutil iam ch serviceAccount:281433271767-compute@developer.gserviceaccount.com:roles/storage.admin \
     gs://bananafate-images
   ```

2. **Verify bucket exists:**
   ```bash
   gsutil ls gs://bananafate-images
   ```

#### Issue: Signed URL generation fails

**Error:**
```
google.auth.exceptions.RefreshError: The credentials do not contain the required fields
```

**Solution:**

This happens when using default credentials without proper configuration.

**Fix in code:**
The current `helper_gcs_read.py` refreshes credentials before generating signed URLs. If it still fails:

```bash
# Check service account key
gcloud iam service-accounts keys list \
  --iam-account=281433271767-compute@developer.gserviceaccount.com
```

---

### Frontend Problems

#### Issue: Blank page / "Failed to fetch"

**Symptoms:**
- Frontend loads but shows blank page
- Browser console shows "Failed to fetch" errors

**Solution:**

1. **Check backend URL is correct:**
   ```bash
   # Get actual backend URL
   gcloud run services describe data-ingestion-backend \
     --region=us-central1 \
     --format='value(status.url)'

   # Compare with what's in frontend build
   # Frontend must be rebuilt if backend URL changed
   ```

2. **Redeploy frontend:**
   ```bash
   cd BananaFate/deployment
   ./deploy-data-ingestion-frontend.sh
   # or
   ./deploy-data-management-frontend.sh
   ```

#### Issue: CORS errors

**Error in browser console:**
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

**Solution:**

1. **For GCS uploads:**
   ```bash
   # Apply CORS configuration to bucket
   gsutil cors set BananaFate/deployment/cors.json gs://bananafate-images

   # Verify
   gsutil cors get gs://bananafate-images
   ```

2. **For API calls:**
   Backend already has CORS enabled in `app.py`. If still failing:
   - Check browser console for exact origin
   - Verify backend is allowing the origin
   - Try clearing browser cache

#### Issue: Images not displaying

**Symptoms:**
- Thumbnails show broken image icons
- Image modal shows no image

**Solutions:**

1. **Signed URLs expired:**
   - URLs expire after 1 hour
   - Solution: Close and reopen modal (generates new URL)

2. **GCS file missing:**
   ```bash
   # Check if file exists
   gsutil ls gs://bananafate-images/BATCH_ID/
   ```

3. **Browser caching:**
   - Hard refresh: Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear browser cache

---

## 🔐 Authentication Issues

### Management Portal Login Fails

#### Issue: "Invalid password"

**Symptoms:**
```json
{
  "detail": "Invalid password"
}
```

**Solutions:**

1. **Check password in .env:**
   ```bash
   cat BananaFate/deployment/.env | grep ADMIN_PASSWORD
   ```

2. **Verify password hash was generated:**
   ```bash
   # Check backend logs for hash generation
   gcloud run logs tail data-ingestion-backend \
     --region=us-central1 \
     --limit=50 | grep -i password
   ```

3. **Redeploy backend with correct password:**
   ```bash
   cd BananaFate/deployment
   # Edit .env to fix password
   nano .env
   # Redeploy
   ./deploy-data-ingestion-backend.sh
   ```

#### Issue: Token expired

**Error:**
```json
{
  "detail": "Token has expired"
}
```

**Solution:**
This is expected after 8 hours. Simply log out and log in again.

```bash
# In browser: Click "Logout" button, then log in again
```

#### Issue: "Authorization header missing"

**Error:**
```json
{
  "detail": "Authorization header missing"
}
```

**Causes:**
1. Token not saved in localStorage
2. Frontend not sending Authorization header
3. Token cleared by browser

**Solution:**
```bash
# Clear browser localStorage and log in again
# In browser console:
localStorage.clear()
# Then refresh and log in
```

---

## 📱 Upload Issues

### Mobile Upload Failures

#### Issue: "Load failed" error on mobile

**Error:**
```
TypeError: Load failed
```

**Status:** ✅ **FIXED in current version**

The issue was caused by using `fetch()` on data URLs. Current version uses direct base64-to-Blob conversion.

**Verify fix:**
```bash
grep -A 5 "base64ToBlob" BananaFate/data-ingestion/data-ingestion-frontend/src/App.tsx
```

If not present, update to latest code.

#### Issue: Camera not accessible

**Error:**
```
NotAllowedError: Permission denied
```

**Solutions:**

1. **Grant camera permissions:**
   - Browser will prompt for camera access
   - Click "Allow"

2. **HTTPS required:**
   - Camera access requires HTTPS (already enforced by Cloud Run)

3. **Device camera unavailable:**
   - Check if camera is being used by another app
   - Try refreshing the page

---

## 📊 Data Issues

### MongoDB Data Problems

#### Issue: Documents not appearing in queries

**Symptoms:**
- Upload succeeds but data not visible
- Analytics shows 0 counts

**Solutions:**

1. **Check correct database/collection:**
   ```bash
   mongosh "mongodb+srv://USERNAME:PASSWORD@CLUSTER/"

   # In mongo shell:
   show dbs
   use BananaFate_database
   show collections
   db.banana_images.countDocuments()
   ```

2. **Check document format:**
   ```javascript
   db.banana_images.findOne()
   // Should have: batchId, bananaId, objectPath, etc.
   ```

3. **Indexing issues:**
   ```javascript
   // Check if documents are indexed
   db.banana_images.getIndexes()
   ```

#### Issue: Duplicate uploads

**Symptoms:**
- Same image uploaded multiple times
- Duplicate documents in MongoDB

**Cause:**
No unique constraint on (batchId, bananaId).

**Solution:**
```javascript
// Add unique index (recommended)
db.banana_images.createIndex(
  { batchId: 1, bananaId: 1, captureTime: 1 },
  { unique: true }
)
```

---

## 🔍 Debugging Tips

### Enable Verbose Logging

**Backend:**
Edit `app.py` to set `IS_PRODUCTION=False` for more verbose logs:
```python
# In app.py
IS_PRODUCTION = False  # Temporarily for debugging
```

Then redeploy.

**Frontend:**
Check browser console (F12) for detailed error messages.

### Check Service Health

```bash
# Quick health check all services
for service in data-ingestion-backend data-ingestion-frontend data-management-frontend; do
  echo "Checking $service..."
  gcloud run services describe $service \
    --region=us-central1 \
    --format='value(status.url)' 2>/dev/null || echo "Not deployed"
done
```

### View Real-time Logs

```bash
# Backend
gcloud run logs tail data-ingestion-backend --region=us-central1 --follow

# Frontend
gcloud run logs tail data-management-frontend --region=us-central1 --follow

# Filter for errors only
gcloud run logs tail data-ingestion-backend \
  --region=us-central1 \
  --log-filter="severity>=ERROR" \
  --follow
```

### Test API Endpoints Manually

```bash
# Get backend URL
BACKEND=$(gcloud run services describe data-ingestion-backend \
  --region=us-central1 --format='value(status.url)')

# Health check
curl -s "$BACKEND/health" | jq '.'

# Login
TOKEN=$(curl -s -X POST "$BACKEND/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"your-secure-password"}' | jq -r '.token')

# Protected endpoint
curl -s -H "Authorization: Bearer $TOKEN" "$BACKEND/batches" | jq '.'
```

---

## 💰 Cost Issues

### Unexpected Charges

**Check resource usage:**
```bash
# View all Cloud Run services and their configurations
gcloud run services list --region=us-central1

# Check if any service has min-instances > 0
gcloud run services describe SERVICE_NAME \
  --region=us-central1 \
  --format='value(spec.template.spec.containerConcurrency,spec.template.spec.containers[0].resources.limits)'
```

**Optimize costs:**
- Ensure min-instances = 0 (scale-to-zero)
- Set budget alerts in GCP Console
- Delete unused revisions

---

## 🆘 Getting Help

If you've tried the solutions above and still have issues:

1. **Check Cloud Run logs** for detailed error messages
2. **Review deployment script output** for any warnings
3. **Verify all prerequisites** are met (see README.md)
4. **Check GCP quotas** (some regions have limits)
5. **Try deploying to different region** if persistent issues

### Useful Commands

```bash
# Full system check
cd BananaFate/deployment

# Check prerequisites
which gcloud docker python3

# Check GCP authentication
gcloud auth list
gcloud config get-value project

# Check .env configuration
cat .env | grep -v '^#' | grep -v '^$'

# Check MongoDB connection
mongosh "mongodb+srv://$(grep MONGODB_USERNAME .env | cut -d '=' -f 2):$(grep MONGODB_PASSWORD .env | cut -d '=' -f 2)@$(grep MONGODB_CLUSTER .env | cut -d '=' -f 2)/"

# Check GCS bucket access
gsutil ls gs://$(grep GCS_BUCKET_NAME .env | cut -d '=' -f 2)/
```

---

**Last Updated:** 2025-11-05
