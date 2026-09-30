# Moderation implementation and local exit gate

The dashboard POST `/api/moderation` and the locally registered `/moderate` command both call `src/services/moderation.service.ts`. The Discord adapter, input contract, transport, case allocator, and canonical AuditLog format are shared. The tenant layout and `requireGuildPageAccess` are unchanged. Command definitions have been added to the registration script but have not been registered with Discord.

## Supported actions

| Action   | Actor / bot capability                                                               | Discord effect                                                                | Scope / boundary                                                                                                                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WARN     | Actor Moderate Members; no bot moderation permission                                 | No Discord mutation; internal warning case                                    | Member must exist in the guild; actor hierarchy and protected-target checks                                                                                                                                                                       |
| TIMEOUT  | Both Moderate Members                                                                | PATCH member communication_disabled_until; zero removes timeout               | Member belongs to guild; actor and bot hierarchy; owner, self, bot and administrator targets protected                                                                                                                                            |
| KICK     | Both Kick Members                                                                    | DELETE guild member                                                           | Current member; actor and bot hierarchy; protected-target checks                                                                                                                                                                                  |
| BAN      | Both Ban Members                                                                     | PUT guild ban; no message-history deletion                                    | Current member required by this application's policy; actor and bot hierarchy                                                                                                                                                                     |
| UNBAN    | Both Ban Members                                                                     | DELETE guild ban                                                              | Ban is looked up within the requested guild; no current membership requirement                                                                                                                                                                    |
| PURGE    | Both View Channel, Read Message History and Manage Messages after channel overwrites | Fetch up to 100 recent messages; one bulk deletion or single-message deletion | Text/announcement channels only. Pinned messages and messages within one minute of / beyond Discord's 14-day bulk limit are skipped. Zero eligible messages is an explicit no-op result. No member hierarchy applies to channel-message deletion. |
| SLOWMODE | Both View Channel and Manage Channels after overwrites                               | PATCH rate_limit_per_user, 0–21600 seconds                                    | Text channels only; zero disables slowmode                                                                                                                                                                                                        |
| LOCK     | Both View Channel and Manage Roles; Send Messages held at guild or channel level     | PUT @everyone overwrite denying Send Messages                                 | Saves the previous Send Messages allow/deny bits. Preserves all unrelated bits and other overwrites. This is an @everyone posting lock, not a universal lockdown.                                                                                 |
| UNLOCK   | Same as LOCK                                                                         | Restore saved @everyone Send Messages bits                                    | Requires a tracked successful lock to change Discord; otherwise a no-op. Unexpected changes to the controlled bit cause a conflict.                                                                                                               |
| ESCALATE | Capability and hierarchy of the resulting action                                     | Active successful WARN → TIMEOUT; active successful TIMEOUT → BAN             | Staff selects an existing case number and matching member. Same-guild source required. Consumes source only when the downstream action and audit commit succeed. No automatic punishment rules.                                                   |

The dashboard additionally requires a NextAuth session and live guild-management access through the existing mutation wrapper. Bot actor and guild come from the signed interaction. Both paths fetch live actor, bot, guild and target data; client permission claims and role names are not used. Administrator/owner overrides follow the shared policy, but cannot bypass protected member/bot hierarchy checks for Discord member mutations. Managed roles contribute to actual role position; membership in a managed role is not itself a separate punishment exemption.

## Persistence and failure behavior

Every command has a request key and a hash of its normalized input and actor. Per-target transaction locks serialize reservations. Duplicate keys return the existing result; mismatched reuse is rejected. Case numbering uses the one shared per-guild transaction advisory lock and allocator. Existing historical cases retain SUCCESS as their migration default.

An authorized request first commits a PENDING case and canonical attempt audit atomically. No Discord side effect runs if that commit fails. The target remains reserved while PENDING or UNKNOWN; another request key cannot silently replay a punishment on that target.

Before dispatch, authorization is checked again. Plans (including purge message IDs, timeout deadline, and lock baseline) are persisted while still PENDING. Confirmed Discord success then commits the SUCCESS case, final audit, and any consumed escalation source in one transaction.

Definite Discord 4xx rejections, including exhausted 429s, become FAILURE; they do not create successful cases. Timeout/network/5xx results after dispatch become UNKNOWN because Discord may already have applied the action. Failure before dispatch is definite FAILURE. The transport retries only explicit 429 rejection, at most three attempts within its 12-second deadline. It never automatically retries an ambiguous mutation. No exactly-once delivery claim is made.

If the final database/audit commit fails after Discord success, it rolls back. The service attempts to record UNKNOWN; if the database remains unavailable, the pre-existing PENDING record remains. Neither case claims success. Case numbers may include failed/unknown attempts; they are unique, not a count of successful punishments.

UNKNOWN/PENDING recovery is deliberately manual: inspect Discord state and the exact case/audit evidence before deciding a reconciliation action. There is no automated replay or UI button that guesses success. A crash between reservation and dispatch can therefore leave a target blocked even if nothing happened on Discord. This is the conservative recovery boundary, not a silently completed operation.

Canonical final audits contain guild, actor, target, requested/effective action, case number, execution ID, source case where relevant, result status, reason and safe failure identifier. Raw Discord exception text and credentials are excluded. Audit persistence failures propagate. The generic dashboard mutation wrapper may also write its existing request-level audit; this does not replace the action-level audit.

Evidence is limited to five same-guild HTTPS Discord message links, at most 300 characters each, without credentials, nonstandard origins, queries or fragments. Evidence is stored with the case and there is no evidence-edit endpoint. Case history reads remain guild authorized. Message links are references; message contents are not fetched or archived as evidence.

## Remaining operational boundaries

- No live Discord mutations, authenticated browser QA, production database operations, command registration, commits, pushes or deployments were performed for this work.
- Text/announcement channels are supported. Thread/forum/voice moderation, universal lockdown, automatic escalations, softbans, banning users outside the guild, and message restoration are not implemented.
- Explicit role/member allows and administrators can bypass @everyone Send Messages denial. Existing threads are not locked by this action.
- Discord has no conditional compare-and-set for permission overwrite edits. An administrator editing the same overwrite between the final read and PUT can race this operation. The service preserves the latest observed unrelated bits and detects controlled-bit drift before dispatch, but cannot provide an atomic cross-system guarantee.
- Purge selection is bounded to one fetch and one mutation; old/pinned messages are intentionally skipped. A concurrent pin between selection and deletion is not atomic with the delete.
- History UI shows the latest 100 matching attempts and their statuses. Evidence URLs do not prove the actor can read the linked message.
- A bot slash interaction ID is stable for delivery retries, but a newly issued command is a new request. Staff must inspect status before repeating a completed command.

## Migration and release

`20260928000000_moderation_attempts` adds status, request key/hash, details and safe error code to ModerationCase, plus a guild/request unique key and guild/target/status index. No existing migration was rewritten. Both Prisma schemas include the same changes. Application was limited to the disposable loopback `kraxxbot_gate_20260926_01` database.

Production migration compatibility remains RED. Before any eventual release, authorized read-only inspection must compare the actual production migration table/history with the repository. This change neither baselines nor resolves production history. Fresh local migration success is not evidence that the production migration chain is compatible.

Discord constraints were checked against the official [message API](https://docs.discord.com/developers/resources/message), [channel API](https://docs.discord.com/developers/resources/channel), and [permission rules](https://docs.discord.com/developers/topics/permissions).

## Files in this implementation

- `src/services/moderation-contract.ts`
- `src/services/moderation-discord.ts`
- `src/services/moderation.service.ts`
- `src/services/discord-transport.ts` (moved from dashboard; dashboard retains a re-export)
- `src/database/repositories/moderation-case.repository.ts`
- `src/database/repositories/moderation.repository.ts`
- `src/commands/admin/moderate.ts`
- `src/index.ts`
- `scripts/deploy-commands.ts`
- `prisma/schema.prisma`
- `dashboard/prisma/schema.prisma`
- `prisma/migrations/20260928000000_moderation_attempts/migration.sql`
- `dashboard/src/app/api/moderation/route.ts`
- `dashboard/src/app/api/analytics/route.ts` (exclude unsuccessful attempts from action counts)
- `dashboard/src/app/dashboard/[guildId]/moderation/page.tsx`
- `dashboard/src/lib/moderation-case.ts`
- `dashboard/src/lib/moderation-service.ts` (removed; shared service replaces it)
- `dashboard/src/lib/capabilities.ts` (removed unused duplicate moderation authorization)
- `dashboard/src/lib/discord.ts` (removed unused duplicate moderation mutations)
- `dashboard/src/lib/discord-transport.ts`
- `tests/moderation.test.cjs`
- `tests/moderation-postgres.integration.test.cjs`
- `tests/security.test.cjs` (existing moderation checks migrated to shared runtime; endpoint denial coverage added)
- `docs/moderation.md`
