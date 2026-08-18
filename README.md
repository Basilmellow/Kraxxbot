# KRAXX - Discord Operations Platform

Official internal Discord operations bot for **KRAXX HQ** (Parent Organization for **KRAXXSEC** Cybersecurity & Security Engineering and **KRAXX STUDIO** Digital Creative / Technology Services).

Built with **Node.js**, **TypeScript** (Strict Mode), **discord.js v14+**, **Prisma ORM**, **SQLite/PostgreSQL**, **Zod**, **Pino**, and **node-cron**.

---

## 🛡️ Organization & Brand Divisions

- **KRAXX HQ**: Parent Organization Discord Server
- 🛡️ **KRAXXSEC**: Cybersecurity & Security Engineering Division
- 🎨 **KRAXX STUDIO**: Digital Creative & Technology Services Division

---

## 🚀 Key Features & Subsystems

1. **Member Onboarding & Join System**
   - Automatically detects member joins (`guildMemberAdd`).
   - Assigns base `@User` role and logs user in Prisma database.
   - Sends corporate welcome message to `#welcome` channel with an interactive `[ VERIFY ]` button.
   - Restricts department access until verified and manually assigned by management.

2. **Idempotent Member Verification**
   - Interactive Discord Button verification in `#verify` and `#welcome`.
   - Assigns base `@User` role if missing, updates database verification log, and returns clean ephemeral responses.

3. **Hierarchical Role Management (`/role`)**
   - Executive & management commands: `/role assign`, `/role remove`, `/role info`.
   - Enforces strict organizational hierarchy bounds (`Founder` → `Co-Founder` → `Management Head` → `Team Lead` → `Partner` → `Staff` → `Client` → `User`).
   - Prevents self-elevation or granting roles above an executor's authority.

4. **Corporate Announcement System (`/announce`)**
   - Modal interface for drafting title, message body, target division (`GENERAL`, `KRAXXSEC`, `KRAXX_STUDIO`), category, role mentions, and optional image links.
   - Dispatches clean division embeds directly as KRAXX bot.

5. **Operational Modules**
   - **Tasks (`/task`)**: Departmental task creation, assignment, priority levels, and status transitions.
   - **Reminders (`/remind`)**: User and channel reminders powered by background `node-cron` scheduler.
   - **Meetings (`/meeting`)**: Internal meeting scheduling and calendar notifications.
   - **Events (`/event`)**: Organizational event management.
   - **Projects (`/project`)**: KRAXXSEC and KRAXX STUDIO project tracking.
   - **Clients (`/client`)**: Confidential client directory management.
   - **Templates (`/template`)**: Operational document and message template registry.

6. **Audit & Diagnostics (`/config`, `/ping`, Audit Logs)**
   - Audit trail recorded in database and dispatched to Discord `#bot-logs` channel.
   - `/config check` diagnostic overview for channel and role readiness.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js v18+
- **Language**: TypeScript (`strict: true`)
- **API Wrapper**: `discord.js` v14+
- **ORM**: Prisma ORM (SQLite local dev / PostgreSQL production-ready)
- **Validation**: Zod schema parser
- **Logger**: Pino (with token sanitization/redact)
- **Scheduler**: `node-cron`
- **Linting & Code Style**: ESLint & Prettier

---

## 📁 Project Architecture

```
KraxxBot/
├── src/
│   ├── commands/        # Slash command definitions (admin, announcements, tasks, etc.)
│   ├── events/          # Gateway event listeners (ready, interactionCreate, guildMemberAdd)
│   ├── interactions/    # Button, Modal, Select Menu handlers
│   ├── services/        # Business logic services (onboarding, verification, tasks, role hierarchy)
│   ├── database/        # Prisma client & Repositories
│   ├── config/          # Environment Zod schemas, Role hierarchy, Channel mappings
│   ├── embeds/          # Centralized corporate UI embed builders
│   └── utils/           # Pino logger & system utilities
├── prisma/              # Prisma database schema & SQLite/PostgreSQL setup
├── scripts/             # CLI command deployment & diagnostic validation scripts
├── docs/                # Setup, Command reference, Permissions matrix, Deployment guides
├── .env.example         # Environment template with placeholders
├── package.json
└── tsconfig.json
```

---

## ⚡ Quick Start

### 1. Installation
```bash
git clone <repository-url>
cd KraxxBot
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```
Fill in `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, role IDs, and channel IDs in `.env`.

### 3. Database Migration & Command Deployment
```bash
# Push Prisma schema to database
npm run db:push

# Validate environment and role/channel readiness
npm run validate:config

# Register slash commands with Discord API
npm run deploy:commands
```

### 4. Running the Application
```bash
# Development mode
npm run dev

# Production build & execution
npm run build
npm run start
```

---

## 📖 Complete Documentation

- [Setup Guide](file:///d:/KraxxBot/docs/setup.md)
- [Command Reference](file:///d:/KraxxBot/docs/commands.md)
- [Permissions Matrix](file:///d:/KraxxBot/docs/permissions.md)
- [Deployment Guide](file:///d:/KraxxBot/docs/deployment.md)
- [Architecture Guide](file:///d:/KraxxBot/docs/architecture.md)

---

## 🔒 Security Policy

- **Token Safety**: DISCORD_TOKEN and secrets are never printed in logs or hardcoded.
- **Hierarchy Enforcement**: Roles cannot be self-assigned or elevated above executor authority.
