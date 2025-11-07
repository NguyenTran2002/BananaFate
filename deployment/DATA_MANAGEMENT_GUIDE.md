# Data Management Module - Deployment & Usage Guide

Comprehensive guide for the Banana Fate data management portal - the password-protected admin interface for managing collected banana data.

---

## 📋 Module Overview

The Data Management Module provides a complete admin portal for viewing, editing, and deleting banana image data.

| Component | Type | Purpose | URL |
|-----------|------|---------|-----|
| **Backend (Extended)** | FastAPI | Auth, CRUD, Analytics | `https://data-ingestion-backend-*.run.app` |
| **Frontend** | React + Nginx | Admin UI | `https://data-management-frontend-*.run.app` |

**Note:** The backend is **shared** with the Data Ingestion module but extended with 13 additional management endpoints.

---

## ✨ Features

### 1. Authentication & Security
- ✅ Password-based login
- ✅ JWT token authentication (8-hour expiration)
- ✅ Bcrypt password hashing
- ✅ Secure token storage
- ✅ Protected routes

### 2. Batch Management
- ✅ List all batches with metadata
- ✅ View all images in a batch
- ✅ Delete entire batches
- ✅ Batch statistics (image count, banana count, date range)

### 3. Banana Timeline
- ✅ List all unique bananas
- ✅ Chronological timeline view
- ✅ Ripeness progression display
- ✅ Delete all images of a banana
- ✅ Stage tracking

### 4. Image Operations
- ✅ Thumbnail grid with lazy loading
- ✅ Full-size image modal viewer
- ✅ Keyboard navigation (← → Esc)
- ✅ Edit metadata with before/after confirmation
- ✅ Delete single images

### 5. Delete Operations
- ✅ Three deletion levels:
  - Single image deletion
  - All images of a banana
  - Entire batch deletion
- ✅ Typed confirmation requirement
- ✅ Warning levels (medium, high, critical)
- ✅ MongoDB + GCS cleanup

### 6. Analytics & Visualization
- ✅ Summary statistics cards
- ✅ Pie chart - Stage distribution
- ✅ Line chart - Capture timeline
- ✅ Bar chart - Batch comparison
- ✅ Interactive tooltips

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│          Data Management Portal Architecture              │
└──────────────────────────────────────────────────────────┘

  User's Browser
       │
       │ 1. Enter password
       ▼
┌────────────────────────┐
│  Frontend (React)      │
│  Port: 8080           │
│                        │
│  Components:           │
│  • LoginScreen         │
│  • Dashboard           │
│  • BatchView           │
│  • BananaView          │
│  • ImageModal          │
│  • EditMetadataModal   │
│  • DeleteConfirmModal  │
│  • Analytics           │
└────────┬───────────────┘
         │
         │ 2. POST /auth/login
         ▼
┌────────────────────────┐
│  Backend (FastAPI)     │
│  Extended v2.0        │
│                        │
│  New Features:         │
│  • JWT auth            │
│  • CRUD endpoints      │
│  • Analytics queries   │
│  • GCS deletion        │
└────────┬───────────────┘
         │
         │ 3. Query/modify data
         ▼
┌─────────────────┐    ┌──────────────────┐
│  MongoDB Atlas  │    │ Google Cloud     │
│                 │    │ Storage          │
│  • Read         │    │                  │
│  • Update       │    │  • Read (signed) │
│  • Delete       │    │  • Delete        │
└─────────────────┘    └──────────────────┘
```

---

## 🚀 Deployment

### Prerequisites

1. **Backend must be deployed first** with management features:
   ```bash
   cd BananaFate/deployment
   ./deploy-data-ingestion-backend.sh
   ```

2. **Admin password configured** in `.env`:
   ```
   ADMIN_PASSWORD=your-secure-password
   ```

### Deployment Methods

#### Option 1: Interactive Deployment

```bash
cd BananaFate/deployment
./deploy.sh
```

Select:
- **[2] Select Individual Services**
- Choose service **4** (data-management-frontend)
- Script will warn if backend not deployed and offer to deploy it

#### Option 2: Direct Deployment

```bash
cd BananaFate/deployment

# Ensure backend is deployed with management features
./deploy-data-ingestion-backend.sh

# Deploy management frontend
./deploy-data-management-frontend.sh
```

### Deployment Time
- **Backend:** ~3-5 minutes
- **Frontend:** ~3-5 minutes
- **Total:** ~6-10 minutes

---

## 📦 Backend Extensions (v2.0)

The backend has been extended with 13 new management endpoints:

### New Files Created

**`helper_auth.py`** (101 lines)
- Password verification with bcrypt
- JWT token generation and verification
- Token expiration (8 hours)

**`helper_gcs_read.py`** (63 lines)
- Signed URL generation for image viewing
- 1-hour expiration for read URLs

### Extended `app.py`

Original: 206 lines → Extended: 1006 lines (+800 lines)

**New Endpoints (13 total):**

#### Authentication (1)
```
POST /auth/login
  Request: { "password": "your-secure-password" }
  Response: { "token": "eyJ...", "expiresIn": 28800 }
```

#### Data Retrieval (4)
```
GET /batches
  Returns: List of batches with aggregated metadata

GET /batches/{batchId}
  Returns: All images in specified batch

GET /bananas
  Returns: List of unique bananas across all batches

GET /bananas/{batchId}/{bananaId}
  Returns: Complete timeline for specific banana
```

#### Data Management (4)
```
PUT /metadata/{documentId}
  Request: Updated metadata fields
  Response: Before and after states

DELETE /image/{documentId}
  Deletes: Single image from MongoDB + GCS

DELETE /banana/{batchId}/{bananaId}
  Deletes: All images of banana from MongoDB + GCS

DELETE /batch/{batchId}
  Deletes: Entire batch from MongoDB + GCS
```

#### Analytics (3)
```
GET /analytics/counts
  Returns: Total counts by dimensions

GET /analytics/timeline
  Returns: Daily capture activity

GET /analytics/stage-distribution
  Returns: Ripeness distribution with percentages
```

#### Storage (1)
```
GET /gcs-signed-read-url?object_path=...
  Returns: Signed URL for viewing image (1-hour expiration)
```

---

## 🎨 Frontend Components

### Core Components (11 files)

1. **LoginScreen.tsx** (107 lines)
   - Password input with show/hide toggle
   - Error handling
   - JWT token storage

2. **Dashboard.tsx** (152 lines)
   - Summary statistics cards
   - Stage distribution grid
   - Quick action buttons

3. **BatchView.tsx** (225 lines)
   - Two-level view (list → detail)
   - Batch cards with metadata
   - Image grid for selected batch
   - Delete batch functionality

4. **BananaView.tsx** (277 lines)
   - Two-level view (list → timeline)
   - Banana cards with progression
   - Chronological timeline
   - Delete all banana images

5. **ImageGrid.tsx** (93 lines)
   - Responsive grid (2-6 columns)
   - Lazy loading thumbnails
   - Hover overlays with metadata

6. **ImageModal.tsx** (183 lines)
   - Full-size image viewer
   - Metadata sidebar
   - Keyboard navigation (← → Esc)
   - Edit and delete actions

7. **EditMetadataModal.tsx** (262 lines)
   - Pre-filled form
   - All fields editable
   - Before/after confirmation view
   - Success message with change summary

8. **DeleteConfirmationModal.tsx** (194 lines)
   - Three deletion types (image, banana, batch)
   - Warning levels (medium, high, critical)
   - Typed confirmation requirement ("DELETE IMAGE", etc.)
   - Success feedback

9. **Analytics.tsx** (232 lines)
   - Summary stats cards
   - Recharts visualizations:
     - Pie chart (stage distribution)
     - Line chart (timeline)
     - Bar chart (batch comparison)
   - Statistics table

10. **NavigationSidebar.tsx** (71 lines)
    - 4 navigation items
    - Active route highlighting
    - Logout button

11. **App.tsx** (61 lines)
    - Main routing
    - Authentication-aware layout
    - Modal state management

---

## ✅ Post-Deployment Verification

### 1. Check Service is Running

```bash
gcloud run services describe data-management-frontend \
  --region=us-central1 \
  --format='value(status.url)'
```

### 2. Access the Portal

```bash
# Get the URL
PORTAL_URL=$(gcloud run services describe data-management-frontend \
  --region=us-central1 \
  --format='value(status.url)')

echo "Portal URL: $PORTAL_URL"
echo "Password: your-secure-password"
```

### 3. Test Authentication

```bash
# Get backend URL
BACKEND_URL=$(gcloud run services describe data-ingestion-backend \
  --region=us-central1 \
  --format='value(status.url)')

# Login
curl -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"your-secure-password"}' | jq '.'
```

**Expected response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 28800,
  "message": "Login successful"
}
```

### 4. Test Protected Endpoint

```bash
# Get token
TOKEN=$(curl -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"your-secure-password"}' | jq -r '.token')

# List batches
curl -H "Authorization: Bearer $TOKEN" \
  "$BACKEND_URL/batches" | jq '.'
```

---

## 🔐 Security Configuration

### Changing the Admin Password

**Method 1: Update .env and Redeploy**

```bash
# Edit .env
nano BananaFate/deployment/.env

# Change ADMIN_PASSWORD value
ADMIN_PASSWORD=your-new-secure-password

# Redeploy backend to apply new password hash
cd BananaFate/deployment
./deploy-data-ingestion-backend.sh
```

**Method 2: Manual Hash Generation**

```bash
# Generate hash manually
python3 BananaFate/deployment/generate-password-hash.py "your-new-password"

# Copy the output hash and set as environment variable in Cloud Run console
```

### JWT Secret Rotation

```bash
# Edit .env
nano BananaFate/deployment/.env

# Uncomment and set JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)

# Redeploy backend
./deploy-data-ingestion-backend.sh
```

**Note:** Rotating JWT secret will invalidate all existing tokens. Users will need to log in again.

---

## 📱 Usage Guide

### Logging In

1. Navigate to portal URL
2. Enter password (set in deployment/.env)
3. Click "Login"
4. Token is stored in localStorage (8-hour expiration)

### Dashboard View

- **Total counts:** Images, batches, bananas
- **Stage distribution:** Visual grid showing ripeness stages
- **Quick actions:** Navigate to Batches, Bananas, or Analytics

### Batch View

**List View:**
- See all batches with metadata
- Shows: image count, banana count, date range
- Click batch card to view images

**Detail View:**
- Image grid for selected batch
- Click image to open modal
- Delete individual images
- Delete entire batch

### Banana View

**List View:**
- See all unique bananas
- Shows: total images, first/last capture, ripeness progression

**Timeline View:**
- Chronological list of all images for selected banana
- Shows ripeness progression over time
- Delete all images of banana

### Image Modal

**Features:**
- Full-size image display
- Metadata sidebar
- Navigation: ← (previous) → (next) Esc (close)
- Actions: Edit metadata, Delete image

### Editing Metadata

1. Click "Edit" in image modal
2. Modify any fields (batch ID, banana ID, stage, notes, etc.)
3. Click "Save Changes"
4. Review before/after comparison
5. Confirm changes

**All changes affect both MongoDB and display immediately.**

### Deleting Data

**Single Image:**
1. Open image modal
2. Click "Delete"
3. Type "DELETE IMAGE" to confirm
4. Image removed from MongoDB + GCS

**All Banana Images:**
1. In Banana View, select banana
2. Click "Delete All Images"
3. Type "DELETE BANANA" to confirm
4. All images of that banana removed

**Entire Batch:**
1. In Batch View, select batch
2. Click "Delete Batch"
3. Type "DELETE BATCH" to confirm
4. All images in batch removed

**⚠️ Warning:** Deletions are permanent and cannot be undone.

### Analytics View

**Charts:**
- **Pie Chart:** Stage distribution with percentages
- **Line Chart:** Upload activity over time
- **Bar Chart:** Images per batch comparison

**Statistics Table:**
- Detailed breakdown by stage
- Count and percentage for each stage
- Visual progress bars

---

## 🛠️ Troubleshooting

### "Unauthorized" Errors

**Symptom:** API calls return 401 Unauthorized

**Causes & Fixes:**
1. **Token expired (>8 hours old)**
   - Solution: Log out and log in again

2. **Wrong password**
   - Solution: Check `ADMIN_PASSWORD` in `.env`

3. **Backend not deployed with management features**
   - Solution: Redeploy backend with `./deploy-data-ingestion-backend.sh`

### Images Not Loading in Modal

**Symptom:** Modal shows broken image icon

**Causes & Fixes:**
1. **Signed URL expired (>1 hour old)**
   - Solution: Close and reopen modal (generates new signed URL)

2. **GCS permissions incorrect**
   - Solution: Verify service account has `roles/storage.admin`

3. **Image missing from GCS**
   - Solution: Check GCS bucket for file at `objectPath`

### Charts Not Rendering

**Symptom:** Analytics page shows empty charts

**Causes & Fixes:**
1. **No data in database**
   - Solution: Upload some images via data ingestion app first

2. **API request failed**
   - Solution: Check browser console for errors

3. **Recharts library issue**
   - Solution: Clear browser cache and reload

### Delete Operation Fails

**Symptom:** Delete appears successful but data still exists

**Causes & Fixes:**
1. **GCS deletion failed**
   - Check Cloud Run logs for GCS errors
   - Manually delete from GCS if needed

2. **MongoDB deletion failed**
   - Check backend logs for MongoDB errors

---

## 📊 Monitoring

### View Portal Logs

```bash
# Frontend logs
gcloud run logs tail data-management-frontend \
  --region=us-central1 \
  --follow

# Backend logs (including management endpoints)
gcloud run logs tail data-ingestion-backend \
  --region=us-central1 \
  --follow

# Filter for auth events
gcloud run logs tail data-ingestion-backend \
  --region=us-central1 \
  --log-filter="jsonPayload.message=~'login|auth'"
```

### Track Usage

```javascript
// MongoDB queries for usage statistics

// Login attempts (check backend logs)
// Failed logins indicate possible security issues

// Most active users (by capture person)
db.banana_images.aggregate([
  { $group: { _id: "$capturePerson", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

// Recent edits (documents with updatedAt)
db.banana_images.find({ updatedAt: { $exists: true } })
  .sort({ updatedAt: -1 })
  .limit(10)
```

---

## 🔄 Updating the Portal

### When to Update

- Adding new features
- Fixing bugs
- Updating dependencies
- Changing styling

### How to Update

```bash
# After making code changes

cd BananaFate/deployment

# Redeploy frontend
./deploy-data-management-frontend.sh

# If backend changes (new endpoints, auth logic):
./deploy-data-ingestion-backend.sh
```

---

## 💡 Best Practices

1. **Change default password** immediately after first deployment
2. **Rotate JWT secret** periodically (every 3-6 months)
3. **Monitor failed login attempts** for security
4. **Regular backups** of MongoDB data
5. **Test deletions** on dev environment first
6. **Use analytics** to understand data collection patterns
7. **Keep browser updated** for best compatibility

---

## 📚 Additional Resources

- **Quick Start Guide:** `README.md` - Deploy all services
- **Data Ingestion Guide:** `DATA_INGESTION_GUIDE.md` - Image capture system
- **Troubleshooting:** `TROUBLESHOOTING.md` - Common issues
- **Implementation Summary:** `../data-management/IMPLEMENTATION_SUMMARY.md` - Technical details

---

**Last Updated:** 2025-11-05
**Module Version:** 1.0
**Backend Version:** 2.0 (extended with management features)
