FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

COPY package.json ./
COPY tsconfig.worker.json ./
# Copy package.json and install dependencies
COPY c:/backend/services/payment-reconciliation/package.json ./
COPY c:/backend/services/payment-reconciliation/package-lock.json ./
RUN npm ci --production

COPY service.ts ./
# Copy source code
COPY c:/backend/services/payment-reconciliation/service.ts ./
COPY c:/src/platform /app/src/platform # Assuming shared platform utilities
COPY c:/src/domain /app/src/domain     # Assuming shared domain definitions

RUN npx tsc --project tsconfig.worker.json
# Build TypeScript
RUN npx tsc --project tsconfig.json # Assuming a tsconfig.json for the worker

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/worker-dist/service.js ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "service.js"]
CMD ["node", "service.js"] # Assuming tsc outputs to service.js
