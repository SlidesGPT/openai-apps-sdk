# Docker Deployment Guide

Quick reference for building and running the SlidesGPT server with Docker.

## Quick Start

### Build the Image

```bash
docker build -t slidesgpt-server .
```

### Run Locally

```bash
docker run -p 8080:8080 slidesgpt-server
```

The server will be available at `http://localhost:8080`

## Build Arguments

### Custom BASE_URL

If you need to specify a custom URL for assets (e.g., when using a CDN):

```bash
docker build \
  --build-arg BASE_URL=https://your-cdn.com/assets \
  -t slidesgpt-server .
```

### Using a Different Node Version

Edit the `FROM` statements in the Dockerfile if you need a different Node.js version.

## Environment Variables

### At Build Time

- `BASE_URL` - URL path for serving static assets (default: `/assets`)

### At Runtime

- `PORT` - Server port (default: `8080`, automatically set by Cloud Run)
- `NODE_ENV` - Environment mode (set to `production` for production)

Example:

```bash
docker run -p 3000:3000 -e PORT=3000 -e NODE_ENV=production slidesgpt-server
```

## Testing the Build Locally

1. Build the image:
   ```bash
   docker build -t slidesgpt-server .
   ```

2. Run the container:
   ```bash
   docker run -p 8080:8080 slidesgpt-server
   ```

3. Test the endpoints:
   ```bash
   # Test MCP endpoint
   curl http://localhost:8080/mcp

   # Test asset serving
   curl http://localhost:8080/assets/slides-viewer.html
   ```

## Multi-Architecture Builds

To build for multiple architectures (useful for ARM-based systems):

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t slidesgpt-server .
```

## Docker Compose (Optional)

Create a `docker-compose.yml` for local development:

```yaml
version: '3.8'
services:
  slidesgpt:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
    restart: unless-stopped
```

Run with:
```bash
docker-compose up
```

## Troubleshooting

### Build Fails at Frontend Build Stage

- Ensure all source files are present
- Check that `pnpm-lock.yaml` is up to date
- Verify Node.js version compatibility

### Assets Not Loading

- Check that BASE_URL environment variable matches your deployment URL
- Verify assets exist in `/app/assets` inside the container:
  ```bash
  docker run -it slidesgpt-server ls -la /app/assets
  ```

### Server Won't Start

- Check logs:
  ```bash
  docker logs <container-id>
  ```
- Verify PORT environment variable is set correctly
- Ensure all dependencies are installed

## Image Optimization

Current image size optimizations:
- Multi-stage build separates build and runtime dependencies
- Only production dependencies in final image
- Node modules not included from build stage
- Uses `node:20-slim` base image

To further reduce size:
- Consider using `node:20-alpine` (smaller but may have compatibility issues)
- Add more files to `.dockerignore`
- Use `--production` flag for npm/pnpm install

## Security Scanning

Scan the image for vulnerabilities:

```bash
# Using Docker Scout
docker scout cves slidesgpt-server

# Using Trivy
trivy image slidesgpt-server
```

## Pushing to Container Registry

### Google Artifact Registry

```bash
# Tag the image
docker tag slidesgpt-server \
  us-central1-docker.pkg.dev/PROJECT_ID/REPO_NAME/slidesgpt-server:latest

# Push to registry
docker push us-central1-docker.pkg.dev/PROJECT_ID/REPO_NAME/slidesgpt-server:latest
```

### Docker Hub

```bash
# Login
docker login

# Tag and push
docker tag slidesgpt-server your-username/slidesgpt-server:latest
docker push your-username/slidesgpt-server:latest
```

## Production Recommendations

1. **Use specific version tags** instead of `latest`
2. **Implement health checks** (already included in Dockerfile)
3. **Set resource limits** when running:
   ```bash
   docker run -m 1g --cpus 1 -p 8080:8080 slidesgpt-server
   ```
4. **Use secrets management** for sensitive data (not environment variables)
5. **Enable logging driver** for centralized logs
6. **Run as non-root user** (consider adding a USER directive to Dockerfile)
