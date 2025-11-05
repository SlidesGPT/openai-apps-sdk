# Multi-stage build for SlidesGPT deployment to Google Cloud Run

# Stage 1: Build frontend assets
FROM node:20-slim AS frontend-builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace configuration and package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY slides_server_node/package.json ./slides_server_node/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source files needed for frontend build
COPY src ./src
COPY vite.config.mts ./
COPY build-all.mts ./
COPY tailwind.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.app.json ./
COPY tsconfig.node.json ./
COPY vite-env.d.ts ./

# Set BASE_URL environment variable for production
# Default to relative path which works for most deployments
# Override with --build-arg BASE_URL=https://your-domain.com/assets if needed
ARG BASE_URL=/assets
ENV BASE_URL=${BASE_URL}

# Build frontend assets
RUN pnpm run build

# Stage 2: Production server
FROM node:20-slim AS production

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace configuration and lock file
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy slides_server_node package files
COPY slides_server_node/package.json ./slides_server_node/

# Install production dependencies from workspace root
# Include tsx as it's needed to run TypeScript files
RUN pnpm install --frozen-lockfile --filter slides-mcp-node

# Copy server source code
COPY slides_server_node/src ./slides_server_node/src

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/assets /app/assets

# Expose port (Cloud Run will set PORT environment variable)
ENV PORT=8080
EXPOSE 8080

# Start the server from the workspace root
# pnpm --filter will handle running the script in the correct package
CMD ["pnpm", "--filter", "slides-mcp-node", "start"]
