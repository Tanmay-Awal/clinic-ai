# ================================
# Build stage (production)
# ================================
FROM node:22-slim AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci

# Copy source and build
COPY . .

COPY .env.build .env
RUN npm run build

# ================================
# Runtime stage (production only)
# ================================
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install curl for healthcheck
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r nodejs \
    && useradd -r -g nodejs nextjs

# Copy Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Fix ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Production healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
