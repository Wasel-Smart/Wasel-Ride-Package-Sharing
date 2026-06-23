FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package.json ./package.json
COPY tsconfig.json ./tsconfig.json
COPY backend/services/shared/package*.json ./backend/services/shared/
COPY backend/services/shared/src ./backend/services/shared/src
RUN npm install --omit=dev

COPY backend/services/identity-service/package*.json ./backend/services/identity-service/
COPY backend/services/identity-service/src ./backend/services/identity-service/src
RUN cd backend/services/identity-service && npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/services/shared/src ./shared/src

COPY backend/services/identity-service/package*.json ./package.json
COPY backend/services/identity-service/src ./src

COPY backend/services/runtime/http-health.ts ./runtime/http-health.ts

ENV NODE_ENV=production
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]