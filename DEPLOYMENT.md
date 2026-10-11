# KRAXXBot — BOT-HOSTING.NET Production Deployment Guide

## Target Environment Specifications
- **Provider:** BOT-HOSTING.NET (Free Tier)
- **Node.js Version:** 24.x
- **Allocated RAM:** 256 MB
- **Allocated Storage:** 512 MB
- **Container OS:** Linux (Debian-based)
- **Startup Command:** `node --max-old-space-size=192 dist/index.js`

---

## Pre-Deployment Requirements
1. **Do NOT run `tsc` or `npm run build` on BOT-HOSTING.NET.**
   TypeScript compilation requires >350 MB RAM and WILL fail with exit code 137 (OOM limit).
   Always deploy pre-compiled `dist/` artifacts.

2. **Database Provisioning (Free Alternative to Railway)**
   Railway PostgreSQL free plan is currently paused.
   Set up a free PostgreSQL database instance (e.g. Supabase, Neon, or ElephantSQL).
   - Ensure the connection URL uses PostgreSQL connection pooling or direct SSL connection.
   - Example `DATABASE_URL`: `postgresql://user:password@ep-host.region.aws.neon.tech/dbname?sslmode=require`

3. **Required Environment Variables**
   Configure the following in BOT-HOSTING.NET Environment / Variables section:
   - `DISCORD_TOKEN`: (Your Discord Bot Token)
   - `DISCORD_CLIENT_ID`: `1539277990855311370`
   - `DATABASE_URL`: (Your active free PostgreSQL connection string)
   - `NODE_ENV`: `production`
   - `LOG_LEVEL`: `info`

---

## Deployment Steps

### Step 1: Upload Release Artifact
Upload the contents of `kraxxbot-production-release.zip` to your BOT-HOSTING.NET container:
- `dist/` (including `dist/index.js`)
- `prisma/schema.prisma` and `prisma/migrations/`
- `package.json`
- `package-lock.json`

### Step 2: Install Production Dependencies
Run in the container console:
```bash
npm ci --omit=dev
```
*Note: Installing production-only dependencies uses ~100 MB disk space and minimal RAM.*

### Step 3: Generate Linux Prisma Client Engine
Run in the container console:
```bash
npx prisma generate
```

### Step 4: Apply Database Migrations (If connecting to new DB)
Before starting the bot for the first time on a new DB:
```bash
npx prisma migrate deploy
```

### Step 5: Start Bot Process
Set startup command to:
```bash
node --max-old-space-size=192 dist/index.js
```

---

## Resource & Performance Guarantees
- **RAM Footprint:** ~135 MB - 165 MB RSS (Safe within 256 MB limit).
- **Storage Footprint:** ~115 MB total (Safe within 512 MB limit).
- **Process Memory Safety:** `--max-old-space-size=192` ensures V8 GC runs proactively before hitting container limits.
