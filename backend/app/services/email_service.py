"""Send emails via SMTP and log to email_logs."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models import Result, EmailLog, SmtpSender, EmailLogStatus
from app.services.encryption import decrypt_password
from app.services.template_service import get_placeholder_map, render_template


def send_single_email(
    db: Session,
    sender: SmtpSender,
    recipient: Result,
    subject_template: str,
    body_template: str,
    use_tls: bool = True,
) -> tuple[bool, str]:
    """
    Send one email to recipient using sender's SMTP. Log in email_logs.
    Returns (success: bool, message: str).
    """
    try:
        password = decrypt_password(sender.password_encrypted)
    except Exception as e:
        return False, f"Decrypt error: {e}"

    placeholder_map = get_placeholder_map(recipient)
    subject = render_template(subject_template, placeholder_map)
    body = render_template(body_template, placeholder_map)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender.email
    msg["To"] = recipient.email
    msg.attach(MIMEText(body, "plain"))

    sent_time = datetime.now(timezone.utc)
    try:
        if sender.smtp_port == 465:
            server = smtplib.SMTP_SSL(sender.smtp_host, sender.smtp_port)
        elif use_tls:
            server = smtplib.SMTP(sender.smtp_host, sender.smtp_port)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(sender.smtp_host, sender.smtp_port)
        server.login(sender.username, password)
        server.sendmail(sender.email, recipient.email, msg.as_string())
        server.quit()
    except Exception as e:
        log = EmailLog(
            sender_email=sender.email,
            recipient_email=recipient.email,
            sent_time=sent_time,
            status=EmailLogStatus.FAILED,
        )
        db.add(log)
        db.commit()
        return False, str(e)

    log = EmailLog(
        sender_email=sender.email,
        recipient_email=recipient.email,
        sent_time=sent_time,
        status=EmailLogStatus.SENT,
    )
    db.add(log)
    db.commit()
    return True, "Sent"


def test_smtp_connection(
    host: str,
    port: int,
    username: str,
    password_plain: str,
    use_tls: bool = True,
) -> tuple[bool, str]:
    """Test SMTP login without sending. Port 465 = SSL; 587 = STARTTLS."""
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port)
        elif use_tls:
            server = smtplib.SMTP(host, port)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(host, port)
        server.login(username, password_plain)
        server.quit()
        return True, "Connection successful"
    except Exception as e:
        return False, str(e)
