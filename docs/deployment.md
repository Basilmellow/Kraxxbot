# KRAXX Operations Platform — Production Deployment Guide

Guide for deploying **KRAXX Operations Platform** (Discord Bot + Railway PostgreSQL + Vercel Operations Dashboard).

---

## Architecture Overview

```
                       ┌───────────────────────────────┐
                       │  Discord Developer Portal     │
                       │  (OAuth2 Redirect & Bot App)  │
                       └──────────────┬────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
              ▼                                               ▼
┌───────────────────────────┐                   ┌───────────────────────────┐
│     Railway Deployment    │                   │     Vercel Deployment     │
│   • Discord Bot Engine    │ ◄── PostgreSQL ──►│   • Operations Dashboard  │
│   • Background Scheduler  │     (Railway)     │   • NextAuth OAuth2       │
│   • Event Handlers        │                   │   • Next.js 16 App Router │
└───────────────────────────┘                   └───────────────────────────┘
```

---

## 1. Railway Deployment (Discord Bot & Database)

### 1.1 Environment Variables
Set the following environment variables in your Railway Project Settings for the Bot service:

```env
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL="postgresql://postgres:password@postgres.railway.internal:5432/railway"
DISCORD_BOT_TOKEN="your_bot_token"
DISCORD_CLIENT_ID="your_client_id"
DISCORD_GUILD_ID="your_guild_id"
```

### 1.2 Database Migration & Build
Railway automatically runs the build and start commands defined in `package.json`:
- **Build Command**: `npm run build` (`prisma generate && tsc`)
- **Start Command**: `npm start` (`prisma db push && node dist/index.js`)

To apply schema additions to Railway PostgreSQL locally or via CLI:
```bash
npx prisma db push
```

---

## 2. Discord Developer Portal OAuth2 Configuration

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your KRAXX Discord Application.
3. Navigate to **OAuth2** > **General**.
4. Under **Redirects**, add your production dashboard redirect URL:
   ```
   https://<YOUR-DASHBOARD-DOMAIN>/api/auth/callback/discord
   ```
   *(For local testing: `http://localhost:3000/api/auth/callback/discord`)*
5. Ensure the following OAuth2 Scopes are enabled:
   - `identify`
   - `guilds`
   - `guilds.members.read`
6. Under **Bot** > **Privileged Gateway Intents**, ensure enabled:
   - `Server Members Intent`
   - `Message Content Intent`

---

## 3. Vercel Deployment (Operations Dashboard)

### 3.1 Project Settings on Vercel
1. Import your GitHub repository to Vercel.
2. Set **Root Directory** to `dashboard`.
3. Framework Preset: **Next.js**.

### 3.2 Environment Variables on Vercel
Add the following in Vercel **Project Settings** > **Environment Variables**:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Same Railway PostgreSQL URL | `postgresql://postgres:...@...railway.app:5432/railway` |
| `DISCORD_CLIENT_ID` | Discord Application Client ID | `123456789012345678` |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 Client Secret | `a1b2c3d4e5f6...` |
| `DISCORD_BOT_TOKEN` | Discord Bot Token | `MTE...` |
| `DISCORD_GUILD_ID` | Target Guild / Server ID | `123456789012345678` |
| `NEXTAUTH_URL` | Production Dashboard URL | `https://kraxx-dashboard.vercel.app` |
| `NEXTAUTH_SECRET` | 32+ char random string | Generated via `openssl rand -base64 32` |

---

## 4. Git Deployment Commands

To commit all changes and push to GitHub (which automatically triggers Railway & Vercel builds):

```bash
git add .
git commit -m "feat(platform): release KRAXX Operations Platform (Phases 1-30)"
git push origin main
```

---

## 5. Post-Deployment Verification

1. **Bot Connectivity**: Verify the bot is online in Discord and responding to `/help`.
2. **Dashboard Sign-In**: Navigate to your dashboard URL and click **Sign in with Discord**.
3. **Role Verification**: Confirm that your Discord role matches your expected `RoleTier` in the dashboard topbar.
4. **Command Center**: Verify live telemetry cards display accurate member, ticket, and task counts.
5. **Background Scheduler**: Verify that scheduled announcements and reminders execute on time via the Railway logs.
