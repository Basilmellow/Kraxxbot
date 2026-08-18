# KRAXX HQ Bot - Setup & Configuration Guide

This guide details environment setup, database provisioning, Discord Bot Portal configuration, and execution instructions for **KRAXX**.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm** or **yarn**
- **Git**
- **Discord Account** with Administrator access to **KRAXX HQ**

---

## 2. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Populate the required environment variables:
   - `DISCORD_TOKEN`: Bot application token from Discord Developer Portal.
   - `DISCORD_CLIENT_ID`: Application Client ID.
   - `DISCORD_GUILD_ID`: KRAXX HQ Guild ID.
   - `DATABASE_URL`: `"file:./dev.db"` (SQLite default for local development).
   - `FOUNDER_ROLE_ID`, `MANAGEMENT_ROLE_ID`, etc.: Copy role IDs from Discord server settings.
   - `WELCOME_CHANNEL_ID`, `VERIFY_CHANNEL_ID`, etc.: Copy channel IDs from Discord server.

---

## 3. Database Initialization (Prisma)

1. Generate Prisma Client bindings:
   ```bash
   npm run db:generate
   ```
2. Push database schema to SQLite database file:
   ```bash
   npm run db:push
   ```

### PostgreSQL Migration (Production)
To switch to PostgreSQL for production:
1. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/kraxx_hq?schema=public"
   ```
2. Update provider in `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Run schema push or migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

---

## 4. Register Slash Commands

Deploy application slash commands to Discord:
```bash
npm run deploy:commands
```

---

## 5. Diagnostic Configuration Check

Run system diagnostic verification without starting gateway connection:
```bash
npm run validate:config
```

---

## 6. Running the Bot

### Development Mode (with hot reloading):
```bash
npm run dev
```

### Production Build & Execution:
```bash
npm run build
npm run start
```
