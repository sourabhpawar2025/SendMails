"""Celery configuration and email sending task."""
from celery import Celery
from app.config import get_settings

settings = get_settings()
celery_app = Celery(
    "sendmails",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.celery_tasks"],
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)


@celery_app.task(bind=True)
def send_emails_task(
    self,
    sender_id: int,
    subject_template: str,
    body_template: str,
    limit: int = 100,
    use_tls: bool = True,
):
    """Send emails to recipients from results table (email IS NOT NULL)."""
    from app.database import SessionLocal
    from app.models import SmtpSender, Result
    from app.services.email_service import send_single_email

    db = SessionLocal()
    try:
        sender = db.query(SmtpSender).filter(SmtpSender.id == sender_id).first()
        if not sender or not sender.is_active:
            return {"error": "Sender not found or inactive", "sent": 0, "failed": 0}
        recipients = (
            db.query(Result)
            .filter(Result.email.isnot(None), Result.email != "")
            .limit(limit)
            .all()
        )
        sent, failed = 0, 0
        for r in recipients:
            ok, _ = send_single_email(
                db, sender, r, subject_template, body_template, use_tls=use_tls
            )
            if ok:
                sent += 1
            else:
                failed += 1
        return {"sent": sent, "failed": failed}
    finally:
        db.close()
