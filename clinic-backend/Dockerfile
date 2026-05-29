# ================================
# Base image (slim)
# ================================
FROM node:22-slim AS base

WORKDIR /app

# Install curl (required for healthcheck)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -g 1001 nodejs \
    && useradd -u 1001 -g nodejs -s /usr/sbin/nologin nestjs \
    && chown -R nestjs:nodejs /app

EXPOSE 3000

# ================================
# Production stage
# ================================
FROM base AS production

# Build app
RUN npm run build \
    && npm prune --production

USER nestjs

# Healthcheck using curl
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

CMD ["npm", "run", "start:prod"]
