# KraxxBot — PostgreSQL Database Migration Procedure

## Overview
Railway PostgreSQL hosting was paused due to usage limits. This document details the step-by-step non-destructive procedure to migrate existing KraxxBot data and schema history from Railway to a free PostgreSQL hosting alternative (such as Neon.tech or Supabase).

---

## Safety Constraints
- **Do NOT run `prisma db push`** (this could alter or reset existing production tables).
- **Do NOT run `prisma migrate reset`** (this drops all tables).
- **Backup Verification First**: Validate the restore on a test database before updating production connection credentials.
- **Do NOT print passwords or tokens** in CLI scripts or logs.

---

## 1. Existing Production Data Backup
A pre-migration PostgreSQL custom archive exists in the repository root:
- File: `kraxxbot-production-pre-migration.backup`
- Format: `pg_dump -Fc` (PostgreSQL Custom Format)
- Size: ~62.6 KB
- Contains: Full table schema, data, sequences, indexes, and initial data for Guilds, Settings, Members, Tickets, Tasks, Reminders, Moderation Cases, Audit Logs, etc.

If Railway database becomes accessible again, an updated backup can be generated via:
```bash
pg_dump -h <RAILWAY_HOST> -p <RAILWAY_PORT> -U <RAILWAY_USER> -d <RAILWAY_DB> -F c -b -v -f railway_kraxxbot_latest.dump
```

---

## 2. Free Target Database Provisioning Options

### Option A: Neon.tech (Recommended)
- **Free Plan:** 0.5 GiB storage, auto-suspend when idle, pooled connection support.
- **Connection URL Format:**
  `postgresql://<user>:<password>@ep-name.region.aws.neon.tech/neondb?sslmode=require`

### Option B: Supabase
- **Free Plan:** 500 MB database, connection pooling via Supavisor.
- **Connection URL Format:**
  `postgresql://postgres.<project_ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true`

---

## 3. Data Restoration Procedure

To restore existing KraxxBot production data into the new target database:

```bash
pg_restore -h <TARGET_HOST> -p <TARGET_PORT> -U <TARGET_USER> -d <TARGET_DBNAME> --clean --if-exists --no-owner --no-acl kraxxbot-production-pre-migration.backup
```

*(Enter target database password when prompted).*

---

## 4. Migration History & Integrity Verification

1. **Verify Migration Status:**
   Set `DATABASE_URL` in `.env` to the target database and execute:
   ```bash
   npx prisma migrate status
   ```
   *Expected Output: "Database schema is up to date!" (All 16 migration steps applied).*

2. **Verify Record Counts:**
   Check that key operational data was successfully restored:
   - `Guild` & `GuildSettings`
   - `GuildMember`
   - `Ticket` & `TicketPanel`
   - `Task` & `Reminder`
   - `ModerationCase` & `AuditLog`
   - `Poll` & `Suggestion`

3. **Production Connection Cutover:**
   Update `DATABASE_URL` in BOT-HOSTING.NET Environment Variables only after data integrity check passes.
