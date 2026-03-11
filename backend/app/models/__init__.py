"""SQLAlchemy models for scraperdb."""
from app.models.result import Result
from app.models.query import Query
from app.models.email_log import EmailLog, EmailLogStatus
from app.models.smtp_sender import SmtpSender

__all__ = ["Result", "Query", "EmailLog", "EmailLogStatus", "SmtpSender"]
