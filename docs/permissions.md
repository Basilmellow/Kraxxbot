# KRAXX HQ - Permission & Access Hierarchy Model

Security architecture document detailing role tiers, hierarchy enforcement, and channel access policies inside **KRAXX HQ**.

---

## 1. Role Hierarchy Tiers

KRAXX operations enforcement relies on a strict numerical priority scale (`RoleTier`):

| Role Title | Tier Level | Scope / Responsibilities |
|---|---|---|
| **Founder** | 100 | Full Organization Access & Governance |
| **Co-Founder** | 90 | Full Executive Operations & Security |
| **Management Head** | 80 | Division Management & Administrative Commands |
| **Team Lead** | 70 | Project Execution, Task & Meeting Scheduling |
| **Partner** | 60 | External Strategic Partner Access |
| **Team KRAXXSEC** | 50 | Cybersecurity & Security Engineering Staff |
| **Team KRAXX STUDIO** | 50 | Digital Creative & Technology Services Staff |
| **Client** | 20 | Verified Client Organization Access |
| **User** | 10 | Base Verified Guild Member |
| **Guest / Unverified** | 0 | Public Onboarding & Verification Channels Only |

---

## 2. Role Assignment Security Matrix

To prevent unauthorized escalation (e.g. `@User` granting themselves `@Founder` or `@Management` roles):

1. **Strict Superiority Requirement**: An executor can only grant or revoke roles whose priority tier is **strictly lower** than the executor's highest role priority.
2. **Self-Elevation Prevention**: Users cannot manage their own tier or higher tiers.
3. **KRAXX Bot Hierarchy**: The KRAXX Bot role must be positioned above managed roles in server role settings.

---

## 3. Department Isolation Matrix

- **KRAXXSEC Category**: Restricted to `Team KRAXXSEC` staff, Team Leads, Management, and Executives.
- **KRAXX STUDIO Category**: Restricted to `Team KRAXX STUDIO` staff, Team Leads, Management, and Executives.
- **Client Zone**: Restricted to `Client` role, Management, and assigned project leads.
- **Management Zone**: Restricted to Management Head, Co-Founder, and Founder.
