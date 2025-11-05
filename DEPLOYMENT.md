# Deployment Guide for Google Cloud Run

This guide covers deploying the SlidesGPT MCP server to Google Cloud Run.

## Prerequisites

1. **Google Cloud CLI** installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Docker** installed (optional, Cloud Build can build remotely)

3. **Artifact Registry** repository (optional, but recommended):
   ```bash
   gcloud artifacts repositories create slidesgpt \
     --repository-format=docker \
     --location=us-central1 \
     --description="SlidesGPT Docker repository"
   ```

## Quick Deploy

### Option 1: Deploy with Cloud Build (Recommended)

This builds and deploys in one command:

```bash
gcloud run deploy slidesgpt-server \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production"
```

### Option 2: Build Locally and Deploy

```bash
# 1. Build the Docker image
docker build -t slidesgpt-server .

# 2. Tag for Artifact Registry
docker tag slidesgpt-server \
  us-central1-docker.pkg.dev/YOUR_PROJECT_ID/slidesgpt/slidesgpt-server:latest

# 3. Push to Artifact Registry
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/slidesgpt/slidesgpt-server:latest

# 4. Deploy to Cloud Run
gcloud run deploy slidesgpt-server \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/slidesgpt/slidesgpt-server:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10
```

## Environment Variables

Set environment variables during deployment:

```bash
gcloud run deploy slidesgpt-server \
  --set-env-vars "NODE_ENV=production,BASE_URL=https://your-service-url.run.app/assets"
```

Or update after deployment:

```bash
gcloud run services update slidesgpt-server \
  --region us-central1 \
  --set-env-vars "NODE_ENV=production"
```

## Custom Domain

1. Map a custom domain:
   ```bash
   gcloud run domain-mappings create \
     --service slidesgpt-server \
     --domain your-domain.com \
     --region us-central1
   ```

2. Update DNS records as instructed by the output

3. Update BASE_URL environment variable:
   ```bash
   gcloud run services update slidesgpt-server \
     --region us-central1 \
     --set-env-vars "BASE_URL=https://your-domain.com/assets"
   ```

## Testing the Deployment

Once deployed, test the endpoints:

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe slidesgpt-server \
  --region us-central1 \
  --format 'value(status.url)')

# Test the MCP endpoint
curl -i $SERVICE_URL/mcp
```

## Architecture

The deployment uses a multi-stage Docker build:

1. **Frontend Builder Stage**: Builds Vite/React assets using `pnpm run build`
2. **Production Stage**: Sets up Node.js server with built assets

Key features:
- Optimized for Google Cloud Run (uses PORT environment variable)
- Static assets served from `/assets/` path
- CORS enabled for cross-origin requests
- Health check endpoint on `/mcp`

## Monitoring

View logs:
```bash
gcloud run services logs read slidesgpt-server \
  --region us-central1 \
  --limit 50
```

View metrics in Google Cloud Console:
- Navigate to Cloud Run > slidesgpt-server > Metrics

## Scaling Configuration

Adjust scaling parameters:

```bash
gcloud run services update slidesgpt-server \
  --region us-central1 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80
```

## Cost Optimization

- Use `--min-instances 0` to scale to zero when idle
- Set appropriate `--max-instances` based on expected traffic
- Use `--cpu-throttling` to reduce CPU when idle
- Consider using `--execution-environment gen2` for faster cold starts

## Troubleshooting

### Build Failures

If the build fails, check:
1. All source files are present (check `.dockerignore`)
2. `pnpm-lock.yaml` is up to date
3. Build logs: `gcloud builds log --region=us-central1`

### Runtime Errors

Check container logs:
```bash
gcloud run services logs read slidesgpt-server --region us-central1
```

### Assets Not Loading

Ensure `BASE_URL` environment variable is set correctly:
```bash
gcloud run services describe slidesgpt-server \
  --region us-central1 \
  --format 'value(spec.template.spec.containers[0].env)'
```

## CI/CD Integration

For automated deployments, use GitHub Actions:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v1
        with:
          service: slidesgpt-server
          region: us-central1
          source: .
```

## Security

For production deployments:

1. **Enable authentication**:
   ```bash
   gcloud run services update slidesgpt-server \
     --region us-central1 \
     --no-allow-unauthenticated
   ```

2. **Use Secret Manager** for sensitive data:
   ```bash
   echo -n "your-secret" | gcloud secrets create my-secret --data-file=-

   gcloud run services update slidesgpt-server \
     --region us-central1 \
     --set-secrets="MY_SECRET=my-secret:latest"
   ```

3. **Enable VPC connector** for private resources access

## Next Steps

- Set up monitoring and alerting
- Configure custom domain
- Implement authentication
- Set up CI/CD pipeline
- Configure Cloud CDN for static assets
