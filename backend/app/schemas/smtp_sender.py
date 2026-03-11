"""SMTP sender schemas - password never in response."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime


class SmtpSenderBase(BaseModel):
    sender_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    smtp_host: str = Field(..., min_length=1, max_length=255)
    smtp_port: int = Field(default=587, ge=1, le=65535)
    username: str = Field(..., min_length=1, max_length=255)
    is_active: bool = True


class SmtpSenderCreate(SmtpSenderBase):
    password: str = Field(..., min_length=1)


class SmtpSenderUpdate(BaseModel):
    sender_name: Optional[str] = Field(None, min_length=1, max_length=255)
    smtp_host: Optional[str] = Field(None, min_length=1, max_length=255)
    smtp_port: Optional[int] = Field(None, ge=1, le=65535)
    username: Optional[str] = Field(None, min_length=1, max_length=255)
    password: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None


class SmtpSenderResponse(SmtpSenderBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SmtpSenderTestRequest(BaseModel):
    """Used only for test connection - password in body, never stored."""
    smtp_host: str
    smtp_port: int = 587
    username: str
    password: str
