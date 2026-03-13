# IMAP Integration — Inbox Tracking per Sender

This document describes how to integrate **IMAP** into the SendMails application so you can **track the inbox** for each configured SMTP sender. It covers architecture, data model, services, API, security, and implementation steps.

---

## 1. Overview

### 1.1 Goal

- **Track inbox** for each sender account (the same account used for SMTP sending).
- Associate received emails with a **particular sender** so you can:
  - See replies and bounces in one place per sender.
  - Filter and search inbox entries by sender.
  - Optionally link inbox items to outbound `EmailLog` (e.g. by thread or recipient).

### 1.2 Scope

- **Read-only** IMAP: connect to the mailbox, fetch messages (metadata and optionally body), store in the app DB.
- **Per-sender**: each `SmtpSender` can have its own IMAP configuration (or reuse SMTP credentials when provider allows).
- **Sync**: periodic or on-demand sync of INBOX (and optionally other folders) into a new `InboxLog` (or similar) model.

### 1.3 Out of Scope (for this plan)

- Sending email via IMAP (sending stays SMTP).
- Full bidirectional threading (can be added later using `Message-ID` / `In-Reply-To`).
- Real-time push (IMAP IDLE); can be added as an enhancement.

---

## 2. Architecture

### 2.1 High-Level Flow

```
┌─────────────────┐     IMAP (read)      ┌──────────────────┐
│  Mailbox        │ ◄─────────────────── │  IMAP Service    │
│  (Gmail/Outlook)│                       │  (Python)        │
└─────────────────┘                      └────────┬─────────┘
                                                   │
                                                   ▼
┌─────────────────┐     Store / Query    ┌──────────────────┐
│  SmtpSender     │ ◄─────────────────── │  InboxLog        │
│  (existing)     │   sender_id          │  (new model)     │
└─────────────────┘                      └──────────────────┘
         │                                          │
         │                                          ▼
         │                                 ┌──────────────────┐
         └────────────────────────────────►│  API / Dashboard │
                   filter by sender        │  (list inbox)    │
                                          └──────────────────┘
```

### 2.2 Design Choices

| Decision | Recommendation | Reason |
|----------|----------------|--------|
| **IMAP credentials** | Store IMAP host/port (and optionally separate password) per sender | Many providers use same username/password for SMTP and IMAP; some use different host/port only. |
| **Reuse SMTP password** | Default: use same encrypted password for IMAP when IMAP is enabled | Fewer secrets to manage; same `ENCRYPTION_KEY` and encryption service. |
| **Where to store IMAP config** | Either extend `SmtpSender` with optional IMAP fields, or add `ImapConfig` 1:1 with `SmtpSender` | Extending `SmtpSender` is simpler; separate model is cleaner if you later support multiple mailboxes per sender. |
| **Inbox storage** | New model `InboxLog` (or `InboxMessage`) with `sender_id` | Keeps inbox data separate from outbound `EmailLog`; same sender can have both. |
| **Sync trigger** | Celery periodic task + optional manual “Sync now” API | Balances freshness with provider rate limits and server load. |

---

## 3. Data Model

### 3.1 Extend SmtpSender (recommended)

Add optional IMAP fields to the existing `SmtpSender` model (or to a 1:1 `ImapConfig` model):

| Field | Type | Description |
|-------|------|-------------|
| `imap_host` | CharField(255), null=True, blank=True | IMAP server host (e.g. `imap.gmail.com`). If null, inbox tracking is disabled for this sender. |
| `imap_port` | IntegerField, default=993 | Usually 993 (SSL). |
| `imap_use_ssl` | BooleanField, default=True | Use SSL for IMAP. |
| `imap_password_encrypted` | TextField, null=True, blank=True | If null, use SMTP password for IMAP (same account). |

**Alternative:** Single encrypted field for “IMAP password override”; when null, use decrypted SMTP password for IMAP login.

### 3.2 New Model: InboxLog (or InboxMessage)

Store one row per received message (or per sync event, depending on whether you want to support “last N messages” or “all history”).

| Field | Type | Description |
|-------|------|-------------|
| `id` | Auto | Primary key. |
| `sender` | ForeignKey(SmtpSender) | Which sender’s mailbox this came from. |
| `message_uid` | CharField, indexed | IMAP UID (or UID + folder) to avoid duplicates on re-sync. |
| `folder` | CharField (e.g. "INBOX") | IMAP folder name. |
| `from_email` | CharField, indexed | Sender of the received email. |
| `to_email` | CharField | Recipient (usually the sender’s address). |
| `subject` | CharField | Subject. |
| `received_at` | DateTimeField | Parsed date from message. |
| `body_preview` | TextField, optional | First N characters of body (for list view). |
| `message_id_header` | CharField, optional, indexed | `Message-ID` for threading. |
| `in_reply_to` | CharField, optional | `In-Reply-To` for linking to outbound. |
| `synced_at` | DateTimeField | When we inserted/updated this row. |

**Unique constraint:** `(sender_id, folder, message_uid)` to avoid duplicates when re-syncing.

---

## 4. IMAP Service Layer

### 4.1 Responsibilities

- Connect to IMAP using host, port, SSL, username, and password (from sender’s IMAP config or SMTP password).
- Select folder (e.g. `INBOX`).
- Fetch message list (e.g. by UID range or “since date”).
- For each message: fetch envelope (and optionally body), parse, then create/update `InboxLog`.
- Use existing `decrypt_password` for IMAP password (same as SMTP).

### 4.2 Suggested Module Layout

```
app/services/
  imap_service.py   # connect_imap(), fetch_inbox_for_sender(), sync_sender_inbox()
```

### 4.3 Key Functions (pseudo-API)

- **`connect_imap(sender) -> connection`**  
  Resolve IMAP host/port/SSL from sender; get password from `imap_password_encrypted` or `password_encrypted`; open connection and return it (caller closes).

- **`fetch_inbox_for_sender(sender, folder='INBOX', since=None, max_messages=500)`**  
  Connect, select folder, fetch UIDs, then for each UID fetch envelope (and optionally body snippet). Return list of dicts (or similar) for storage.

- **`sync_sender_inbox(sender, folder='INBOX', since=None)`**  
  Call `fetch_inbox_for_sender`, then create/update `InboxLog` rows (using unique constraint to avoid duplicates). Handle duplicates by `(sender_id, folder, message_uid)`.

### 4.4 Python IMAP Usage (reference)

- Use standard library `imaplib` (e.g. `imaplib.IMAP4_SSL` for port 993).
- Login with same username as SMTP (often same as `sender.email` or `sender.username`).
- `SELECT folder`, then `UID FETCH` or `FETCH` with `(ENVELOPE)` and optionally `(BODY.PEEK[])` for body.
- Parse `email.message_from_bytes()` for headers and body; use `received_at` from envelope or `Date` header.

---

## 5. Security

- **Passwords:** Store IMAP password encrypted at rest (same Fernet key as SMTP). Never return it in API responses.
- **Reuse:** If you use SMTP password for IMAP, decrypt only in the service layer and use in memory only; do not expose.
- **Test connection:** Optional endpoint “Test IMAP” that takes host, port, username, password in request body (same pattern as SMTP test); do not persist the password from that request.
- **Env:** No new env vars required for IMAP if reusing SMTP encryption; use same `ENCRYPTION_KEY`.

---

## 6. API Design

### 6.1 Sender (IMAP config)

- **PATCH `/api/smtp-senders/<id>`**  
  Extend request body to accept optional `imap_host`, `imap_port`, `imap_use_ssl`, and optionally `imap_password` (write-only; stored encrypted). If `imap_password` not sent, keep existing or treat as “use SMTP password”.

- **POST `/api/smtp-senders/test-imap`** (optional)  
  Body: `host`, `port`, `username`, `password`, `use_ssl`. Test IMAP login only; do not store.

### 6.2 Inbox (read-only)

- **GET `/api/inbox-logs`**  
  Query params: `sender_id` (required or optional), `folder`, `from_email`, `date_from`, `date_to`, `limit`, `offset`.  
  Returns list of inbox entries for the given sender(s). Filter by sender so “inbox for particular sender” is first-class.

- **GET `/api/inbox-logs/<id>`**  
  Single inbox entry (optional; for body preview or details).

- **POST `/api/inbox-logs/sync`** (optional)  
  Body: `sender_id` (optional; if omitted, sync all senders with IMAP configured). Triggers sync (inline or via Celery); return job id or “synced” count.

---

## 7. Background Sync (Celery)

- **Periodic task:** e.g. `sync_all_imap_inboxes` every 15–30 minutes.
- For each `SmtpSender` where `imap_host` is set, call `sync_sender_inbox(sender, since=last_sync_time)`.
- Store `last_imap_sync_at` on sender or in a small key-value table if you want to limit “since” window and avoid re-fetching full history every time.
- Respect provider rate limits (e.g. Gmail); add backoff or per-sender delay if needed.

---

## 8. Provider Notes (IMAP host/port)

| Provider | IMAP host | Port | SSL |
|----------|-----------|------|-----|
| Gmail | imap.gmail.com | 993 | Yes |
| Outlook / Office 365 | outlook.office365.com | 993 | Yes |
| Yahoo | imap.mail.yahoo.com | 993 | Yes |
| Custom / other | From provider | Usually 993 (SSL) or 143 (STARTTLS) | Varies |

You can prepopulate these in the frontend when user selects “Gmail” / “Outlook” or store in a small table for “IMAP presets”.

---

## 9. Implementation Phases

### Phase 1 — Foundation

1. Add IMAP fields to `SmtpSender` (migration).
2. Implement `imap_service.py`: `connect_imap`, `fetch_inbox_for_sender`, `sync_sender_inbox`.
3. Create `InboxLog` model and migration.
4. Unit tests: mock IMAP, assert parsing and storage.

### Phase 2 — API and UI

5. Extend PATCH sender API and serializers for IMAP config; add optional “Test IMAP” endpoint.
6. Add GET `/api/inbox-logs` (and optional GET by id, POST sync).
7. Frontend: “Inbox” tab or page filtered by sender; show table (from, subject, date); optional “Sync now” button.

### Phase 3 — Automation and Polish

8. Celery periodic task for sync; optional `last_imap_sync_at` on sender.
9. Optional: link inbox to `EmailLog` (e.g. by `In-Reply-To` ↔ sent message).
10. Documentation and .env.example updates (if any new env vars).

---

## 10. Summary

- **Goal:** Track inbox per sender by adding optional IMAP config to each sender and storing received messages in a new `InboxLog` model.
- **Security:** Reuse existing encryption and “no password in response” policy; optional Test IMAP without storing password.
- **API:** Filter inbox by `sender_id` so “inbox for particular sender” is the main use case.
- **Sync:** Service layer + optional Celery periodic task and “Sync now” API.

This plan keeps the current SMTP sending and `EmailLog` unchanged and adds inbox tracking alongside it in a consistent, secure way.
