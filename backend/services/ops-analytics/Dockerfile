# Ops Analytics Service Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/

RUN npm ci --workspace=backend

COPY backend/services/ops-analytics ./backend/services/ops-analytics
COPY backend/tsconfig.json ./backend/
COPY src/domain ./src/domain
COPY src/platform ./src/platform

RUN cd backend/services/ops-analytics && npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/services/ops-analytics/dist ./dist

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 8080

CMD ["node", "dist/index.js"]
