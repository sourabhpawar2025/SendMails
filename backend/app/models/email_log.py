"""Email log model - track sent/failed emails."""
from sqlalchemy import Column, Integer, String, DateTime, Enum
from app.database import Base
import enum


class EmailLogStatus(str, enum.Enum):
    SENT = "Sent"
    FAILED = "Failed"


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sender_email = Column(String(255), nullable=False, index=True)
    recipient_email = Column(String(255), nullable=False, index=True)
    sent_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        Enum(EmailLogStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EmailLogStatus.SENT,
    )
