# Ride Matching Service Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --workspace=backend

# Copy source
COPY backend/services/ride-matching ./backend/services/ride-matching
COPY backend/tsconfig.json ./backend/
COPY src/domain ./src/domain
COPY src/platform ./src/platform

# Build
RUN cd backend/services/ride-matching && npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Copy built service
COPY --from=builder /app/backend/services/ride-matching/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 8080

CMD ["node", "dist/index.js"]
