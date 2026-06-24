FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --silent

COPY src ./src
EXPOSE 8080
CMD ["npx", "tsx", "src/index.ts"]
