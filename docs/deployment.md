# KRAXX HQ Bot - Production Deployment Guide

Guide for deploying **KRAXX** to production environments using PM2, Docker, or systemd services.

---

## 1. Environment Preparation

1. Verify environment variables in `.env`:
   ```env
   NODE_ENV=production
   LOG_LEVEL=info
   DATABASE_URL="postgresql://user:password@db-host:5432/kraxx_hq"
   ```
2. Run configuration validation diagnostic:
   ```bash
   npm run validate:config
   ```

---

## 2. PM2 Process Deployment

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```
2. Build TypeScript distribution bundle:
   ```bash
   npm run build
   ```
3. Start bot process under PM2 supervision:
   ```bash
   pm2 start dist/index.js --name "kraxx-bot" --time
   pm2 save
   ```

---

## 3. Docker Container Deployment

Sample `Dockerfile` for containerized environments:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run db:generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

CMD ["node", "dist/index.js"]
```
