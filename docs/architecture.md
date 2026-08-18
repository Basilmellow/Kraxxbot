# KRAXX HQ Bot - Technical Architecture

Overview of code organization, design patterns, data flows, and subsystem components in **KRAXX**.

---

## 1. Architectural Principles

- **Clean Layered Architecture**: Clear separation of concerns between Event Handlers, Command Routers, Domain Services, Data Repositories, and Configuration.
- **Database Abstraction (Prisma ORM)**: Loose coupling with database implementation. Seamless portability between local SQLite development and production PostgreSQL clusters.
- **Fail-Safe Interaction Handling**: Global error handling in event listeners ensuring bot resilience without unhandled process crashes.
- **Zero Secrets Leakage**: Structured logging via Pino with field redacting for tokens and keys.

---

## 2. Directory Layout & Flow Architecture

```
KraxxBot/
├── src/
│   ├── commands/        # Slash command definitions (Subcommands, Options)
│   ├── events/          # Gateway event handlers (ready, interactionCreate, guildMemberAdd)
│   ├── interactions/    # Button, Modal, Select Menu interaction handlers
│   ├── services/        # Domain business logic (onboarding, verification, tasks, role hierarchy)
│   ├── database/        # Prisma client & Repository layer
│   ├── config/          # Zod environment validation & role hierarchy definitions
│   ├── embeds/          # Centralized corporate UI embed builders
│   └── utils/           # Pino logger & system helpers
├── prisma/              # Database schema & migrations
└── scripts/             # CLI command deployment & diagnostic validation scripts
```

---

## 3. Core Data Flow Diagram

```
Discord Gateway Event / Slash Command
          │
          ▼
   events/interactionCreate.ts (Router & Error Guard)
          │
          ▼
   services/ (e.g. VerificationService / RoleService)
          │
          ├─────────────────────────┐
          ▼                         ▼
   config/roles.ts (Auth Check)  database/repositories/ (Prisma DB Query)
          │                         │
          └─────────────────────────┘
          │
          ▼
   embeds/kraxxEmbedBuilder.ts (Corporate UI Format)
          │
          ▼
   Discord Ephemeral / Channel Response & Audit Log Dispatch
```
