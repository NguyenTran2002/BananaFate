FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Build arguments for credentials
# These are baked into the image as environment variables during build
ARG username
ARG password
ARG server_address
ARG GCS_PROJECT_ID
ARG GCS_BUCKET_NAME
ARG GCS_SERVICE_ACCOUNT_EMAIL

# Set environment variables from build args
ENV username=${username}
ENV password=${password}
ENV server_address=${server_address}
ENV GCS_PROJECT_ID=${GCS_PROJECT_ID}
ENV GCS_BUCKET_NAME=${GCS_BUCKET_NAME}
ENV GCS_SERVICE_ACCOUNT_EMAIL=${GCS_SERVICE_ACCOUNT_EMAIL}

# Cloud Run standard port
EXPOSE 8080
ENV PORT=8080

# Start FastAPI server
CMD ["python", "app.py"]
