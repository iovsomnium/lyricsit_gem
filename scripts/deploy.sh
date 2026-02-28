#!/bin/bash
set -e
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-asia-northeast3}"
IMAGE="gcr.io/${PROJECT_ID}/crossrhyme"

gcloud config set project "$PROJECT_ID"
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
gcloud builds submit --tag "$IMAGE" --timeout=1200
gcloud run deploy crossrhyme \
  --image "$IMAGE" --region "$REGION" --platform managed \
  --allow-unauthenticated --port 8080 --memory 512Mi \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY}"

echo "Deployed: $(gcloud run services describe crossrhyme --region $REGION --format='value(status.url)')"
