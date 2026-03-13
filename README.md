# Automated SMTP Email Sender with Dashboard

Full-stack system to manage SMTP sender accounts, send personalized emails to recipients from the existing **scraperdb** MySQL database, and track status in **email_logs**.

## Features

- **SMTP Sender Management**: Add / Edit / Delete / Enable / Disable senders; test SMTP connection (password never stored in test).
- **Recipients**: Fetched from `results` table where `email IS NOT NULL`.
- **Templates**: Placeholders `{{Title}}`, `{{Email}}`, `{{Phone}}`, `{{Instagram}}`, `{{Facebook}}`, `{{Twitter}}`, `{{Category}}`, `{{Location}}`.
- **Email Logs**: Track From, To, Sent Time (IST), Status (Sent/Failed) with filters.
- **Scheduling**: Celery + Redis for async/scheduled sending (250+ emails/day).
- **Security**: SMTP passwords encrypted in DB; never exposed in API responses; env-based secrets.

## Tech Stack

| Layer    | Stack                    |
|----------|--------------------------|
| Backend  | Python, **Django**, Django REST Framework |
| DB       | MySQL (scraperdb)        |
| Queue    | Celery, Redis            |
| Frontend | React, Vite, TailwindCSS, Axios |

## Project Structure

```
SendMails/
├── backend/
│   ├── manage.py
│   ├── sendmails/           # Django project (settings, urls)
│   ├── app/                 # Django app
│   │   ├── models.py        # SmtpSender, EmailLog, Result, Query
│   │   ├── serializers.py  # DRF serializers
│   │   ├── views.py         # API views
│   │   ├── urls.py
│   │   ├── services/        # encryption, email_service, template_service
│   │   ├── tasks.py         # Celery send_emails_task
│   │   └── celery_app.py
│   ├── tests/
│   ├── init_db.py           # Runs: python manage.py migrate
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── ...
└── README.md
```

## Database (scraperdb)

- **results**: Existing table (recipients). Used only where `email IS NOT NULL`. `managed = False`.
- **queries**: Existing table; `managed = False`.
- **smtp_senders**: Created by Django migrations.
- **email_logs**: Created by Django migrations.

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
```

Copy and configure env:

```bash
copy .env.example .env
```

- Set `MYSQL_*` for scraperdb.
- Set `REDIS_*` if using Celery.
- Set `DJANGO_SECRET_KEY` (and `ALLOWED_HOSTS` in production).
- Generate and set `ENCRYPTION_KEY`:
  ```bash
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```

Create tables (smtp_senders, email_logs; results/queries must already exist):

```bash
python manage.py migrate
```

Run API:

```bash
python manage.py runserver 0.0.0.0:8000
```

### 2. Celery (optional, for scheduled/async send)

Ensure Redis is running, then:

```bash
celery -A sendmails worker -l info
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. API is proxied to http://127.0.0.1:8000.

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/smtp-senders | List senders (no passwords) |
| POST   | /api/smtp-senders | Create sender |
| PATCH  | /api/smtp-senders/{id} | Update sender |
| DELETE | /api/smtp-senders/{id} | Delete sender |
| POST   | /api/smtp-senders/test-connection | Test SMTP (body: host, port, username, password) |
| GET    | /api/email-logs | List logs (query: sender_email, status, date_from, date_to, limit) |
| POST   | /api/send/now | Send immediately (body: sender_id, subject_template, body_template, limit) |
| POST   | /api/send/schedule | Queue send with Celery |

## Test Scripts

```bash
cd backend
python tests/test_api_db.py      # DB connectivity (update for Django if needed)
python tests/test_email_send.py  # Encryption + one test send (update for Django if needed)
```

## Security Notes

- SMTP passwords are encrypted at rest using Fernet (ENCRYPTION_KEY).
- Passwords are never returned in GET/PATCH responses.
- Test connection accepts password in request body only; it is not stored.
- Use environment variables for all secrets; keep `.env` out of version control.
