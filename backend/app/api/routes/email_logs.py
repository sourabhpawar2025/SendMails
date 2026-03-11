"""Email logs list with filters."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.api.deps import get_db
from app.models import EmailLog, EmailLogStatus
from app.schemas.email_log import EmailLogResponse

router = APIRouter(prefix="/email-logs", tags=["Email Logs"])


@router.get("", response_model=list[EmailLogResponse])
def list_logs(
    db: Session = Depends(get_db),
    sender_email: str | None = Query(None, description="Filter by sender email"),
    status: str | None = Query(None, description="Sent or Failed"),
    date_from: str | None = Query(None, description="YYYY-MM-DD"),
    date_to: str | None = Query(None, description="YYYY-MM-DD"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    q = db.query(EmailLog).filter(
        EmailLog.sender_email.isnot(None),
        EmailLog.recipient_email.isnot(None),
        EmailLog.sent_time.isnot(None),
        EmailLog.status.isnot(None),
    )
    if sender_email:
        q = q.filter(EmailLog.sender_email == sender_email)
    if status:
        if status in ("Sent", "Failed"):
            try:
                status_enum = EmailLogStatus(status)
                q = q.filter(EmailLog.status == status_enum)
            except (ValueError, LookupError):
                pass
    if date_from:
        try:
            d = datetime.strptime(date_from, "%Y-%m-%d")
            q = q.filter(EmailLog.sent_time >= d)
        except ValueError:
            pass
    if date_to:
        try:
            d = datetime.strptime(date_to, "%Y-%m-%d")
            d = d.replace(hour=23, minute=59, second=59, microsecond=999999)
            q = q.filter(EmailLog.sent_time <= d)
        except ValueError:
            pass
    return q.order_by(EmailLog.sent_time.desc()).offset(skip).limit(limit).all()
