"""Celery tasks for sendmails app."""
from celery import shared_task
from app.models import SmtpSender, Result
from app.services.email_service import send_single_email


@shared_task(bind=True)
def send_emails_task(
    self,
    sender_id: int,
    subject_template: str,
    body_template: str,
    limit: int = 100,
    use_tls: bool = True,
):
    """Send emails to recipients from results table (email IS NOT NULL)."""
    try:
        sender = SmtpSender.objects.filter(id=sender_id).first()
    except Exception:
        sender = None
    if not sender or not sender.is_active:
        return {"error": "Sender not found or inactive", "sent": 0, "failed": 0}
    recipients = (
        Result.objects.exclude(email__isnull=True)
        .exclude(email="")
        .order_by("id")[:limit]
    )
    sent, failed = 0, 0
    for r in recipients:
        ok, _ = send_single_email(
            sender, r, subject_template, body_template, use_tls=use_tls
        )
        if ok:
            sent += 1
        else:
            failed += 1
    return {"sent": sent, "failed": failed}
