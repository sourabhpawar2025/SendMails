"""SMTP sender CRUD and test connection."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models import SmtpSender
from app.schemas.smtp_sender import (
    SmtpSenderCreate,
    SmtpSenderUpdate,
    SmtpSenderResponse,
    SmtpSenderTestRequest,
)
from app.services.encryption import encrypt_password
from app.services.email_service import test_smtp_connection

router = APIRouter(prefix="/smtp-senders", tags=["SMTP Senders"])


@router.get("", response_model=list[SmtpSenderResponse])
def list_senders(db: Session = Depends(get_db)):
    """List all SMTP sender accounts (no passwords)."""
    return db.query(SmtpSender).order_by(SmtpSender.id).all()


@router.get("/{sender_id}", response_model=SmtpSenderResponse)
def get_sender(sender_id: int, db: Session = Depends(get_db)):
    s = db.query(SmtpSender).filter(SmtpSender.id == sender_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Sender not found")
    return s


@router.post("", response_model=SmtpSenderResponse, status_code=201)
def create_sender(data: SmtpSenderCreate, db: Session = Depends(get_db)):
    if db.query(SmtpSender).filter(SmtpSender.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    encrypted = encrypt_password(data.password)
    sender = SmtpSender(
        sender_name=data.sender_name,
        email=data.email,
        smtp_host=data.smtp_host,
        smtp_port=data.smtp_port,
        username=data.username,
        password_encrypted=encrypted,
        is_active=data.is_active,
    )
    db.add(sender)
    db.commit()
    db.refresh(sender)
    return sender


@router.patch("/{sender_id}", response_model=SmtpSenderResponse)
def update_sender(sender_id: int, data: SmtpSenderUpdate, db: Session = Depends(get_db)):
    sender = db.query(SmtpSender).filter(SmtpSender.id == sender_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    update = data.model_dump(exclude_unset=True)
    if "password" in update:
        update["password_encrypted"] = encrypt_password(update.pop("password"))
    for k, v in update.items():
        setattr(sender, k, v)
    db.commit()
    db.refresh(sender)
    return sender


@router.delete("/{sender_id}", status_code=204)
def delete_sender(sender_id: int, db: Session = Depends(get_db)):
    sender = db.query(SmtpSender).filter(SmtpSender.id == sender_id).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found")
    db.delete(sender)
    db.commit()
    return None


@router.post("/test-connection")
def test_connection(body: SmtpSenderTestRequest):
    """Test SMTP credentials without saving. Password not stored."""
    ok, msg = test_smtp_connection(
        body.smtp_host,
        body.smtp_port,
        body.username,
        body.password,
        use_tls=True,
    )
    return {"success": ok, "message": msg}
