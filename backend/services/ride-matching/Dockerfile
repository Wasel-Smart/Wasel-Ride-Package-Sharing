# Ride Matching Service Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/services/ride-matching/package*.json ./
RUN npm ci --only=production

# Copy service code
COPY backend/services/ride-matching/ ./
COPY src/domain/ ./src/domain/
COPY src/platform/event-broker-redis.ts ./src/platform/
COPY src/platform/telemetry.ts ./src/platform/

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Health check endpoint
EXPOSE 8080

# Run service
CMD ["node", "dist/service.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
