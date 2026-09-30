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
DISCORD_TOKEN="your_bot_token"
DISCORD_CLIENT_ID="your_client_id"
# Optional — development-only instant command registration
DISCORD_GUILD_ID="your_guild_id"
```

### 1.2 Database Migration & Build
The repository build command is `npm run build` (`prisma generate && tsc`). The
current `npm start` command runs `prisma migrate deploy` before starting the
worker. Review the pending SQL migration and verify the target database and
release plan before deploying: migration application is a production database
change. Do not substitute `prisma db push` for the reviewed migration history.

The durable scheduler schema addition is
`20260925000000_durable_scheduled_delivery`. The worker code requires that
migration to be applied before it starts against an existing database. This
repository's current migration history may not match every legacy production
database; confirm schema/history compatibility in a safe environment before
using the automatic start command. No production database was inspected or
modified as part of local development.

---

## 2. Discord Developer Portal OAuth2 Configuration

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your KRAXX Discord Application.
3. Navigate to **OAuth2** > **General**.
4. Under **Redirects**, add your production dashboard redirect URL:
   ```
   https://kraxxbot.kraxxsec.com/api/auth/callback/discord
   ```
   *(For local testing: `http://localhost:3000/api/auth/callback/discord`)*
5. Ensure the following OAuth2 Scopes are enabled:
   - `identify`
   - `guilds`
   - `guilds.members.read`
6. Under **Bot** > **Privileged Gateway Intents**, enable **Server Members Intent** (`GuildMembers`), which the worker uses for member join/leave processing. `GuildMessages` is a non-privileged gateway intent. The worker does not request the privileged **Message Content Intent**; commands and explicit mention-based interactions do not require it.

---

## 3. Vercel / Hosting Deployment (Operations Dashboard)

### 3.1 Project Settings
1. Import your GitHub repository.
2. Set **Root Directory** to `dashboard`.
3. Framework Preset: **Next.js**.

### 3.2 Environment Variables
Add the following in your hosting provider's **Environment Variables**:

| Variable | Description | Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL Connection URL | `postgresql://postgres:...` |
| `DISCORD_CLIENT_ID` | Discord Application Client ID | `1539277990855311370` |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 Client Secret | `your_client_secret` |
| `DISCORD_BOT_TOKEN` | Discord Bot Token used by dashboard-side Discord API operations | `your_bot_token` |
| `DISCORD_GUILD_ID` | Optional target Guild / Server ID for dashboard-specific configuration | `<your_guild_id>` |
| `NEXTAUTH_URL` | Production Dashboard URL | `https://kraxxbot.kraxxsec.com` |
| `NEXTAUTH_SECRET` | 32+ char random string | Generated via `openssl rand -base64 32` |

---

The worker uses `DISCORD_TOKEN`; the dashboard uses `DISCORD_BOT_TOKEN` for its server-side Discord API operations. Dashboard OAuth also requires `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`; these are distinct from the worker's bot login token. Set only the variables required by the service being deployed.

The read-only owner control center requires `KRAXXBOT_OWNER_DISCORD_ID` in the dashboard server environment. Configure it as the owner's Discord user snowflake; the value is checked against the authenticated server-side NextAuth identity and is never accepted from a request. Do not expose this variable through a `NEXT_PUBLIC_` name. The owner registry and worker AI heartbeat fields require the `20261009000000_owner_control_center` Prisma migration before deploying code that reads them. Keep `GEMINI_API_KEY` on the worker only; the dashboard reads only configuration status written to `BotHeartbeat`.

## 4. Git Deployment Commands

To commit all changes and push to GitHub (which automatically triggers Railway & Vercel builds):

```bash
git status --short
git add -- <explicitly-reviewed-file-1> <explicitly-reviewed-file-2>
git diff --cached --check
git diff --cached
git commit -m "feat(platform): release KRAXX Operations Platform (Phases 1-30)"
git push origin main
```

---

## 5. Post-Deployment Verification

1. **Bot Connectivity**: Verify the bot is online in Discord and responding to `/help`.
2. **Dashboard Sign-In**: Navigate to your dashboard URL and click **Sign in with Discord**.
3. **Role Verification**: Confirm that your Discord role matches your expected `RoleTier` in the dashboard topbar.
4. **Command Center**: Verify live telemetry cards display accurate member, ticket, and task counts.
5. **Background Scheduler**: After applying the reviewed migration, verify reminder and scheduled-announcement delivery, retry behavior, and scheduler health in a non-production guild before relying on it operationally. Delivery is at-least-once, not exactly-once.
