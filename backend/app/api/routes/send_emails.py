"""Send emails (immediate and schedule)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models import SmtpSender, Result
from app.schemas.send_email import SendEmailRequest, SendEmailResponse
from app.services.email_service import send_single_email
from app.tasks.celery_tasks import send_emails_task

router = APIRouter(prefix="/send", tags=["Send Emails"])


@router.post("/now", response_model=SendEmailResponse)
def send_now(req: SendEmailRequest, db: Session = Depends(get_db)):
    """Send emails immediately (sync) to recipients from results (email IS NOT NULL)."""
    sender = db.query(SmtpSender).filter(SmtpSender.id == req.sender_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="SMTP sender not found")
    if not sender.is_active:
        raise HTTPException(status_code=400, detail="SMTP sender is disabled")

    recipients = (
        db.query(Result)
        .filter(Result.email.isnot(None), Result.email != "")
    )
    if req.recipient_ids:
        recipients = recipients.filter(Result.id.in_(req.recipient_ids))
    if req.recipient_ids:
        recipients = recipients.all()
    else:
        recipients = recipients.limit(req.limit).all()

    sent, failed = 0, 0
    last_error = None
    for r in recipients:
        ok, msg = send_single_email(
            db,
            sender,
            r,
            req.subject_template,
            req.body_template,
            use_tls=req.use_tls,
        )
        if ok:
            sent += 1
        else:
            failed += 1
            last_error = msg
    message = f"Sent: {sent}, Failed: {failed}"
    return SendEmailResponse(sent=sent, failed=failed, message=message, error_detail=last_error)


@router.post("/schedule", response_model=dict)
def schedule_send(req: SendEmailRequest):
    """Queue email sending with Celery (async)."""
    send_emails_task.delay(
        sender_id=req.sender_id,
        subject_template=req.subject_template,
        body_template=req.body_template,
        limit=req.limit,
        use_tls=req.use_tls,
    )
    return {"message": "Email send task queued", "sender_id": req.sender_id}
