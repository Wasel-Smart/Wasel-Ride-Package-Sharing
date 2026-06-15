FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache dumb-init

COPY backend/services/payment-reconciliation/package.json ./package.json
RUN npm install --omit=dev

COPY backend/services/payment-reconciliation/service-production.ts ./
COPY backend/services/runtime ./runtime
COPY backend/services/shared/src ./shared/src
COPY src/platform/event-broker-redis-production.ts ./shared/platform/
COPY src/platform/event-bus.ts ./shared/platform/
COPY src/domain/events.ts ./shared/domain/

ENV NODE_ENV=production
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "service-production.ts"]
