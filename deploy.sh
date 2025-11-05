#!/bin/bash

# SlidesGPT Deployment Script for Google Cloud Run
# Usage: ./deploy.sh [PROJECT_ID] [REGION]

set -e

# Configuration
PROJECT_ID="${1:-$(gcloud config get-value project)}"
REGION="${2:-us-central1}"
SERVICE_NAME="slidesgpt-server"
MEMORY="4Gi"
CPU="1"
MAX_INSTANCES="10"
MIN_INSTANCES="0"
TIMEOUT="300"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}SlidesGPT Cloud Run Deployment${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Validate project ID
if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}Error: No project ID specified and no default project configured${NC}"
  echo "Usage: ./deploy.sh [PROJECT_ID] [REGION]"
  exit 1
fi

echo -e "${YELLOW}Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service Name: $SERVICE_NAME"
echo "  Memory: $MEMORY"
echo "  CPU: $CPU"
echo ""

# Confirm deployment
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Deployment cancelled${NC}"
  exit 0
fi

# Set project
echo -e "${GREEN}Setting project...${NC}"
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo -e "${GREEN}Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Deploy to Cloud Run
echo -e "${GREEN}Deploying to Cloud Run...${NC}"
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory "$MEMORY" \
  --cpu "$CPU" \
  --timeout "$TIMEOUT" \
  --max-instances "$MAX_INSTANCES" \
  --min-instances "$MIN_INSTANCES" \
  --set-env-vars "NODE_ENV=production" \
  --no-cpu-throttling

# Get the service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format 'value(status.url)')

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${GREEN}Service URL:${NC} $SERVICE_URL"
echo ""
echo -e "${YELLOW}Important:${NC} Update BASE_URL environment variable with the service URL:"
echo ""
echo -e "${YELLOW}gcloud run services update $SERVICE_NAME \\${NC}"
echo -e "${YELLOW}  --region $REGION \\${NC}"
echo -e "${YELLOW}  --set-env-vars \"BASE_URL=$SERVICE_URL/assets\"${NC}"
echo ""
echo -e "${GREEN}Testing endpoints:${NC}"
echo "  MCP Endpoint: $SERVICE_URL/mcp"
echo ""
echo -e "${GREEN}View logs:${NC}"
echo "  gcloud run services logs read $SERVICE_NAME --region $REGION"
echo ""
echo -e "${GREEN}Monitor service:${NC}"
echo "  https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
echo ""
