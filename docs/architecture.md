# KRAXX HQ Bot - Technical Architecture

Overview of code organization, design patterns, data flows, and subsystem components in **KRAXX**.

---

## 1. Architectural Principles

- **Clean Layered Architecture**: Clear separation of concerns between Event Handlers, Command Routers, Domain Services, Data Repositories, and Configuration.
- **Database Abstraction (Prisma ORM)**: Persistence is PostgreSQL-backed; changing providers requires an explicit schema and migration review.
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

## 4. Phase 0.5 Canonical Domain Boundaries

Each Discord guild is a tenant. The requested `guildId` is required before any
tenant-owned read or mutation; Phase 0 authorization remains the authorization
boundary for dashboard mutations and Discord member actions.

- **Settings:** `src/config/settings.ts` is the shared allow-listed contract.
  `dashboard/src/lib/settings-service.ts` performs dashboard persistence and
  Discord target validation; `GuildRepository.updateSettings` applies the same
  contract for bot callers. Setup and guild settings routes use the dashboard
  service.
- **Modules:** `src/config/modules.ts` is the single catalog and operational
  state mapping. `GuildModule` stores per-guild enabled state. Dashboard routes,
  guild reconciliation, and bot initialization consume this catalog. A module
  without a runtime consumer is reported as `UNAVAILABLE`, never operational.
- **Audit:** `src/services/audit-event.ts` defines the shared event shape and
  serialization. `AuditLog` is the canonical table. `DashboardAuditLog` is
  retained as a compatibility mirror for historical/dashboard consumers and is
  not the source of truth.
- **Tickets:** `src/services/ticket-domain.service.ts` owns tenant-scoped ticket
  lookup and state transitions. Dashboard ticket routes and bot ticket handlers
  call it; `TicketRepository` remains the persistence boundary and requires
  `guildId` for every tenant-owned operation. Discord channel side effects stay
  in the interface adapters after the domain transition.

The dashboard and bot therefore remain separate entry points, but share the
same contracts, tenant predicates, state transitions, and audit event format.

## 5. Durable scheduled delivery

`SchedulerService` processes due reminders and scheduled announcements from
PostgreSQL. `SchedulerRepository` acquires each row with a conditional,
guild-scoped update, increments its attempt count, and writes a five-minute
lease token. Completion and failure updates require that same tenant and lease
token, so a stale worker cannot overwrite a newer worker's result. Expired
leases are reclaimed after restart; failed deliveries use bounded exponential
backoff and stop after `maxAttempts`. Persisted error details contain only a
safe error class, not raw Discord responses. Discord.js's REST manager handles
route/global rate-limit queues; if a 429 escapes that manager, the scheduler
uses the exposed retry delay rather than an earlier backoff. Other HTTP 4xx
responses (including permission and missing-resource failures) are terminal;
transient server/network errors use the bounded retry policy.

Discord message sends include a stable per-record nonce. This reduces duplicate
delivery when Discord recognizes a retry, but is not an exactly-once guarantee:
a worker can lose its lease or process state after Discord accepts a message
and before PostgreSQL records completion. The practical delivery guarantee is
at-least-once. The additive migration
`20260925000000_durable_scheduled_delivery` must be reviewed and applied through
the normal migration release process before deploying this worker; do not use
`prisma db push` against production.
