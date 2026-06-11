FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/services/ride-matching/package*.json ./
RUN npm ci --only=production

COPY backend/services/ride-matching/ ./
COPY backend/services/shared/ ./shared/
COPY src/domain/ ./domain/
COPY src/platform/ ./platform/

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production

EXPOSE 8081

CMD ["node", "dist/service-production.js"]
