# BananaFate - Banana Freshness Detection System

A cloud-native machine learning application for classifying banana ripeness using computer vision.

## Overview

BananaFate uses transfer learning with MobileNetV2 to classify bananas into four ripeness categories:
- **Fresh** - Green, unripe
- **Ripe** - Yellow, ready to eat
- **Very Ripe** - Yellow with brown spots
- **Overripe** - Mostly brown, past prime

The system consists of a data collection web app, ML training pipeline, and GPU-accelerated inference service deployed on Google Cloud Platform.

## Architecture

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Web App        │─────>│ Google Cloud │─────>│ Training        │
│  (Data Capture) │      │ Storage      │      │ Pipeline        │
└─────────────────┘      └──────────────┘      └─────────────────┘
                                                          │
                                                          v
                                                  ┌─────────────────┐
                                                  │ Cloud Run       │
                                                  │ (Inference API) │
                                                  └─────────────────┘
```

## Project Structure

```
BananaFate/
├── data-ingestion/     # Web application for guided image capture and upload
│   ├── frontend/       # React/Vue web interface with camera overlay
│   └── backend/        # Flask/FastAPI server for signed URLs
├── training/           # Model training pipeline with cross-validation
├── inference/          # Cloud Run inference service with TensorRT
├── storage/            # Storage layer interfaces (GCS, MongoDB)
│   └── gcs/            # Google Cloud Storage utilities
├── shared/             # Shared utilities and configurations
│   ├── config/         # Configuration files
│   └── utils/          # Common utilities
└── docs/               # Documentation
```

## Technology Stack

### Data Ingestion
- Frontend: React/Vue with camera API
- Backend: Flask/FastAPI
- Storage: Google Cloud Storage (signed URLs)
- Metadata: MongoDB Atlas or Cloud SQL

### Training
- Framework: PyTorch with torchvision
- Model: MobileNetV2 (transfer learning)
- Validation: Leave-one-banana-out cross-validation
- Export: ONNX format

### Inference
- Optimization: TensorRT (FP16)
- Runtime: ONNX Runtime
- Deployment: Cloud Run with NVIDIA L4 GPU
- API: FastAPI/Flask REST endpoint

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 16+ (for frontend)
- Google Cloud SDK
- Docker

### Development Setup

```bash
# Clone repository
git clone <repository-url>
cd BananaFate

# Set up Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up frontend (from data-ingestion/frontend)
npm install
```

### Configuration

1. Set up Google Cloud credentials:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

2. Create a `.env` file with required variables:
```
GCS_BUCKET_NAME=your-bucket-name
MONGODB_URI=your-mongodb-connection-string
```

## Target Metrics

- **Dataset Size**: 500+ images (40 bananas × 2 sessions/day × ~7 days)
- **Validation Accuracy**: ≥85% overall
- **Inference Latency**: Low p95 latency on Cloud Run
- **Classes**: 4 (fresh, ripe, very_ripe, overripe)

## Development Phases

- [x] Phase 1: Setup & Architecture
- [ ] Phase 2: Data Ingestion Web App
- [ ] Phase 3: Data Collection (40 bananas, ~2 weeks)
- [ ] Phase 4: Model Training
- [ ] Phase 5: Model Optimization (TensorRT)
- [ ] Phase 6: Inference Deployment (Cloud Run)
- [ ] Phase 7: MLOps & Monitoring

## Data Collection Protocol

- Fixed-angle capture with stem oriented left
- 2 sessions per day per banana
- Guided camera overlay for consistency
- Client-side resize to ≤1024px before upload
- Metadata tracking for cross-validation splits

## License

[Specify license]

## Contributors

[Your name/team]

---

For detailed technical specifications, see the full architecture documentation in `/docs`.
