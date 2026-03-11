"""SMTP sender account model - passwords stored encrypted."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class SmtpSender(Base):
    __tablename__ = "smtp_senders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sender_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    smtp_host = Column(String(255), nullable=False)
    smtp_port = Column(Integer, nullable=False, default=587)
    username = Column(String(255), nullable=False)
    password_encrypted = Column(Text, nullable=False)  # never expose in API
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
