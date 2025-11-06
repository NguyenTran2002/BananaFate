# Banana Fate - Data Management Portal

A comprehensive web application for managing, viewing, and analyzing banana freshness data collected through the data ingestion system.

## 🎯 Overview

The Data Management Portal provides:
- **Authentication**: Password-protected access with JWT tokens
- **Batch Management**: View and manage image collections by batch
- **Banana Timeline**: Track ripeness progression for individual bananas
- **Image Operations**: View, edit metadata, and delete images
- **Analytics**: Interactive charts and statistics
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

### Backend (Extended)
- **Framework**: FastAPI 2.0 (extended from data-ingestion-backend)
- **Authentication**: JWT with bcrypt password hashing
- **New Endpoints**: 13 additional endpoints for management and analytics
- **Database**: MongoDB Atlas (shared with data-ingestion)
- **Storage**: Google Cloud Storage (shared bucket)

### Frontend
- **Framework**: React 19 + TypeScript 5.8
- **Build Tool**: Vite 6.2
- **Styling**: Tailwind CSS v3.4 (production-optimized)
- **Charts**: Recharts 2.15
- **Routing**: React Router DOM 7.0
- **Deployment**: Cloud Run with Nginx

## 📁 Directory Structure

```
data-management/
├── data-management-frontend/       # React frontend application
│   ├── src/
│   │   ├── components/             # UI components
│   │   │   ├── LoginScreen.tsx     # Authentication UI
│   │   │   ├── Dashboard.tsx       # Overview page
│   │   │   ├── NavigationSidebar.tsx
│   │   │   ├── BatchView.tsx       # Batch management
│   │   │   ├── BananaView.tsx      # Banana timeline view
│   │   │   ├── ImageGrid.tsx       # Thumbnail grid
│   │   │   ├── ImageModal.tsx      # Full-size viewer
│   │   │   ├── EditMetadataModal.tsx
│   │   │   ├── DeleteConfirmationModal.tsx
│   │   │   └── Analytics.tsx       # Charts & stats
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx     # Auth state management
│   │   ├── utils/
│   │   │   ├── apiClient.ts        # API communication
│   │   │   └── authUtils.ts        # Token management
│   │   ├── types.ts                # TypeScript interfaces
│   │   └── App.tsx                 # Main app component
│   ├── index.tsx                   # Entry point
│   ├── index.css                   # Global styles
│   ├── Dockerfile.prod             # Production build
│   ├── nginx.conf                  # Nginx configuration
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
└── deployment/                     # Deployment scripts
    ├── deploy-backend.sh           # Redeploy backend
    ├── deploy-frontend.sh          # Deploy frontend
    └── deploy-all.sh               # Deploy both

Backend extensions in: ../data-ingestion/data-ingestion-backend/
├── helper_auth.py                  # NEW: Authentication utilities
├── helper_gcs_read.py             # NEW: GCS read URL generation
└── app.py                          # EXTENDED: +13 new endpoints
```

## 🔐 Authentication

### Default Credentials
- **Password**: `admin123`
- **Token Expiration**: 8 hours

### Changing the Password

1. Generate a new password hash:
```python
import bcrypt
password = "your-new-password"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
print(hashed.decode('utf-8'))
```

2. Update the backend environment variable:
```bash
export MANAGEMENT_PASSWORD_HASH="$2b$12$..."
```

3. Or set it in the Dockerfile/Cloud Run environment variables.

### JWT Secret
The JWT secret is stored in the `JWT_SECRET` environment variable. Change it in production:
```bash
export JWT_SECRET="your-secure-random-string"
```

## 🚀 Local Development

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

### Quick Start with Docker Compose

1. **Create `docker-compose.yml`** in the `data-management/` directory:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ../data-ingestion/data-ingestion-backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    env_file:
      - ../data-ingestion/data-ingestion-backend/.env
    environment:
      - JWT_SECRET=dev-secret-change-in-production
      - MANAGEMENT_PASSWORD_HASH=$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5OMGtQB3CuRjO
    networks:
      - bananafate-network

  frontend:
    build:
      context: ./data-management-frontend
      dockerfile: Dockerfile.prod
      args:
        - VITE_BACKEND_URL=http://localhost:8080
    ports:
      - "3001:8080"
    depends_on:
      - backend
    networks:
      - bananafate-network

networks:
  bananafate-network:
    driver: bridge
```

2. **Start the services**:
```bash
cd data-management
docker-compose up --build
```

3. **Access the application**:
- Frontend: http://localhost:3001
- Backend API: http://localhost:8080
- Login with password: `admin123`

### Frontend Development (Hot Reload)

```bash
cd data-management-frontend
npm install
npm run dev
```

Access at http://localhost:3001

### Backend Development

The backend is shared with data-ingestion. To run locally:

```bash
cd ../data-ingestion/data-ingestion-backend
pip install -r requirements.txt
python app.py
```

## ☁️ Cloud Deployment

### Prerequisites
- Google Cloud SDK installed and authenticated
- Docker installed
- GCP Project: `banana-fate`
- Existing data-ingestion-backend service deployed

### Deploy Everything

```bash
cd data-management/deployment
./deploy-all.sh
```

This will:
1. Redeploy the backend with new management endpoints
2. Deploy the frontend to Cloud Run
3. Output service URLs

### Deploy Individual Services

**Backend only:**
```bash
cd data-management/deployment
./deploy-backend.sh
```

**Frontend only:**
```bash
cd data-management/deployment
./deploy-frontend.sh
```

### Expected Service URLs
- **Backend**: `https://data-ingestion-backend-281433271767.us-central1.run.app`
- **Frontend**: `https://data-management-frontend-281433271767.us-central1.run.app`

## 📊 Features

### 1. Dashboard
- Total image, batch, and banana counts
- Stage distribution visualization
- Quick action buttons
- Real-time data refresh

### 2. Batch View
- List all batches with metadata
- View all images in a batch
- Delete individual images
- Delete entire batches with confirmation

### 3. Banana View
- List all unique bananas
- View complete timeline for each banana
- Track ripeness progression
- Delete all images of a banana

### 4. Image Management
- Thumbnail grid with hover preview
- Full-size image modal viewer
- Keyboard navigation (← → arrows, Esc to close)
- Edit metadata with before/after confirmation
- Three-level deletion:
  - Single image
  - All images of a banana
  - Entire batch

### 5. Analytics
- **Stats Cards**: Total counts
- **Pie Chart**: Stage distribution with percentages
- **Line Chart**: Capture activity timeline
- **Bar Chart**: Images per batch comparison
- **Statistics Table**: Detailed breakdown by stage

### 6. Security Features
- JWT-based authentication
- 8-hour token expiration
- Secure password hashing (bcrypt)
- Authorization checks on all endpoints
- Signed URLs for GCS access (1-hour expiration)

## 🔌 API Endpoints

### Authentication
- `POST /auth/login` - Authenticate and receive JWT token

### Data Retrieval
- `GET /batches` - List all batches
- `GET /batches/{batchId}` - Get images in a batch
- `GET /bananas` - List all unique bananas
- `GET /bananas/{batchId}/{bananaId}` - Get banana timeline

### Data Management
- `PUT /metadata/{documentId}` - Update image metadata
- `DELETE /image/{documentId}` - Delete single image
- `DELETE /banana/{batchId}/{bananaId}` - Delete all banana images
- `DELETE /batch/{batchId}` - Delete entire batch

### Analytics
- `GET /analytics/counts` - Image counts by dimensions
- `GET /analytics/timeline` - Timeline data
- `GET /analytics/stage-distribution` - Stage distribution

### Storage
- `GET /gcs-signed-read-url?object_path=...` - Generate signed read URL

## 🧪 Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Login with correct password succeeds
- [ ] Login with incorrect password fails
- [ ] Token persists across page refreshes
- [ ] Token expires after 8 hours
- [ ] Logout clears token

**Batch View:**
- [ ] Batches load and display correctly
- [ ] Click batch shows images
- [ ] Delete batch prompts for confirmation
- [ ] Confirmation requires typing phrase
- [ ] Batch deletion removes from both MongoDB and GCS

**Banana View:**
- [ ] Bananas load with correct metadata
- [ ] Timeline shows images in chronological order
- [ ] Stage progression displays correctly
- [ ] Delete banana confirmation works

**Image Operations:**
- [ ] Thumbnails load successfully
- [ ] Click thumbnail opens modal
- [ ] Arrow keys navigate between images
- [ ] Edit metadata form pre-fills correctly
- [ ] Before/after comparison shows changes
- [ ] Delete image confirmation works

**Analytics:**
- [ ] All charts render without errors
- [ ] Data matches expected counts
- [ ] Charts are interactive (hover, tooltips)
- [ ] Refresh updates data

### API Testing

```bash
# Health check
curl https://data-ingestion-backend-281433271767.us-central1.run.app/health

# Login
TOKEN=$(curl -X POST https://data-ingestion-backend-281433271767.us-central1.run.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}' | jq -r '.token')

# List batches
curl -H "Authorization: Bearer $TOKEN" \
  https://data-ingestion-backend-281433271767.us-central1.run.app/batches

# Analytics counts
curl -H "Authorization: Bearer $TOKEN" \
  https://data-ingestion-backend-281433271767.us-central1.run.app/analytics/counts
```

## 🐛 Troubleshooting

### Frontend Issues

**"Unauthorized" errors:**
- Check that JWT token is valid (not expired)
- Verify BACKEND_URL environment variable is correct
- Check browser console for auth errors

**Images not loading:**
- Verify GCS bucket permissions
- Check that signed URL generation is working
- Ensure objectPath is correct in MongoDB

**Charts not rendering:**
- Check that recharts is installed
- Verify data format matches expected structure
- Check browser console for errors

### Backend Issues

**MongoDB connection errors:**
- Verify credentials in environment variables
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for Cloud Run)
- Test connection with `mongosh`

**GCS permission errors:**
- Verify service account has `roles/storage.admin`
- Check that credentials are refreshed properly
- Test with `gsutil ls gs://bananafate-images/`

**Authentication failures:**
- Verify password hash is correct
- Check JWT_SECRET environment variable
- Ensure bcrypt and pyjwt are installed

### Deployment Issues

**Docker build failures:**
- Ensure all dependencies are in package.json/requirements.txt
- Check that .dockerignore excludes node_modules
- Verify build args are passed correctly

**Cloud Run errors:**
- Check service logs: `gcloud run logs tail data-management-frontend`
- Verify environment variables are set
- Ensure port 8080 is exposed

## 📈 Performance

### Optimization Strategies

**Frontend:**
- Tailwind CSS v3 production build (8 KB gzipped)
- Code splitting with React lazy loading
- Image lazy loading in grids
- Nginx gzip compression

**Backend:**
- MongoDB connection pooling
- Signed URL caching (1 hour)
- MongoDB aggregation pipelines for analytics
- Efficient indexing

**Cloud Run:**
- Scale-to-zero for cost efficiency
- Min instances: 0, Max instances: 10
- 512 MB memory per service
- Automatic scaling based on requests

### Cost Estimates

**Monthly Cost (Development):**
- Cloud Run Frontend: ~$0-2 (minimal traffic)
- Cloud Run Backend: ~$0-2 (shared with data-ingestion)
- MongoDB Atlas: Free tier (512 MB)
- GCS: Free tier (5 GB/month)
- **Total: ~$0-5/month**

## 🔒 Security Best Practices

1. **Change default password immediately in production**
2. **Use strong JWT secret (32+ random characters)**
3. **Rotate JWT secret periodically**
4. **Enable HTTPS only (Cloud Run default)**
5. **Review GCS bucket permissions**
6. **Monitor authentication logs**
7. **Set up alerts for failed login attempts**
8. **Regular security updates for dependencies**

## 🚧 Future Enhancements

- [ ] User accounts with role-based permissions
- [ ] Bulk metadata editing
- [ ] CSV/JSON export functionality
- [ ] Image ZIP download
- [ ] Search and advanced filtering
- [ ] Audit log for all operations
- [ ] Email notifications for deletions
- [ ] Backup and restore functionality
- [ ] Dark mode toggle
- [ ] Mobile app with React Native

## 📝 License

Private - Nguyen Tran 2025

## 🤝 Contributing

This is a personal project. For suggestions or issues, contact the repository owner.

---

**Last Updated**: 2025-11-05
**Version**: 1.0.0
