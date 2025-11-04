# Data Ingestion

Web application for guided banana image capture and upload to Google Cloud Storage.

## Components

### Frontend (`frontend/`)
- Web interface with camera overlay for guided capture
- Stem-left orientation guide
- Client-side image preprocessing (resize ≤1024px)
- Progress tracking and session management

### Backend (`backend/`)
- REST API for generating GCS signed URLs
- Metadata validation and storage
- Integration with MongoDB Atlas/Cloud SQL

## Features

- **Guided Capture**: Visual overlay ensures consistent stem-left orientation
- **Quality Control**: Client-side validation before upload
- **Efficient Upload**: Direct-to-GCS using signed URLs
- **Metadata Tracking**: Session info, timestamps, banana IDs for CV splits

## Technology Stack

- **Frontend**: React/Vue + Web Camera API
- **Backend**: Flask/FastAPI
- **Storage**: Google Cloud Storage
- **Database**: MongoDB Atlas (free tier) or Cloud SQL

## Setup

Coming soon...

## API Endpoints

Coming soon...
