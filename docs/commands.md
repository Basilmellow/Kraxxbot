# KRAXX HQ - Command Reference Manual

Complete reference guide for all slash commands implemented in **KRAXX**.

---

## 1. Administration & Security Commands

### `/role assign`
- **Description**: Assign an organizational role to a guild member.
- **Parameters**: `user` (User), `role` (Role)
- **Permissions**: Management Head+
- **Security Check**: Enforces role hierarchy rules (`canManageRole`).

### `/role remove`
- **Description**: Remove an organizational role from a guild member.
- **Parameters**: `user` (User), `role` (Role)
- **Permissions**: Management Head+

### `/role info`
- **Description**: Inspect diagnostic metadata for a target role.
- **Parameters**: `role` (Role)
- **Permissions**: Management Head+

### `/config check`
- **Description**: Inspect configured Discord channel and role mappings.
- **Permissions**: Management Head+

### `/setup welcome-embed`
- **Description**: Publish official KRAXX HQ welcome embed with `[ VERIFY ]` button to a channel.
- **Permissions**: Administrator / Management Head+

### `/setup verify-embed`
- **Description**: Publish official KRAXX HQ verification embed with `[ VERIFY ]` button to a channel.
- **Permissions**: Administrator / Management Head+

---

## 2. Communications & Announcements

### `/announce`
- **Description**: Opens modal interface to draft and publish corporate announcements.
- **Modal Fields**:
  - `Title` (Required)
  - `Message Body` (Required)
  - `Department` (`GENERAL` | `KRAXXSEC` | `KRAXX_STUDIO`)
  - `Category` (`GENERAL` | `IMPORTANT` | `EVENT` | `MAINTENANCE` | `RECRUITMENT`)
  - `Role Mention` (`everyone` | `here` | Role ID)
- **Permissions**: Management Head+

---

## 3. Operations & Task System

### `/task create`
- **Description**: Register a new operational task.
- **Parameters**: `title`, `description`, `assignee` (optional), `department` (optional), `priority` (optional)
- **Permissions**: Team Lead+

### `/task list`
- **Description**: List active tasks filtered by division or status.
- **Parameters**: `department` (optional), `status` (optional)
- **Permissions**: All Members

### `/task status`
- **Description**: Update status of an operational task.
- **Parameters**: `number` (Task Number), `status` (`PENDING` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`)
- **Permissions**: All Members

---

## 4. Meetings & Events

### `/meeting schedule`
- **Description**: Schedule an internal meeting with calendar notification.
- **Parameters**: `title`, `agenda`, `in_minutes`, `department` (optional)
- **Permissions**: Team Lead+

### `/meeting list`
- **Description**: Display upcoming scheduled meetings.
- **Permissions**: All Members

### `/event create`
- **Description**: Schedule an organizational event.
- **Parameters**: `title`, `description`, `in_hours`, `department` (optional), `type` (optional)
- **Permissions**: Team Lead+

### `/event list`
- **Description**: List upcoming organizational events.
- **Permissions**: All Members

---

## 5. Reminders & Scheduling

### `/remind set`
- **Description**: Schedule a personal reminder.
- **Parameters**: `title`, `message`, `minutes`
- **Permissions**: All Members

### `/remind list`
- **Description**: List active pending reminders.
- **Permissions**: All Members

---

## 6. Projects & Clients Directory

### `/project create`
- **Description**: Register a new division project.
- **Parameters**: `code` (e.g., `SEC-01`), `name`, `description`, `department`, `client` (optional)
- **Permissions**: Team Lead+

### `/project list`
- **Description**: Directory of active registered projects.
- **Permissions**: All Members

### `/client add`
- **Description**: Register a client profile record.
- **Parameters**: `name`, `company`, `email` (optional), `division` (optional), `notes` (optional)
- **Permissions**: Management Head+

### `/client list`
- **Description**: Confidential client directory listing.
- **Permissions**: Management Head+

---

## 7. Templates & General

### `/template create` | `/template list` | `/template use`
- **Description**: Manage and render operational document templates.
- **Permissions**: Team Lead+ for create; All Members for list/use.

### `/ping`
- **Description**: Display system status, WebSocket latency, and roundtrip time.
- **Permissions**: All Members

### `/info`
- **Description**: Organization and architecture summary overview.
- **Permissions**: All Members

### `/verify`
- **Description**: Command fallback for member verification.
- **Permissions**: All Members
