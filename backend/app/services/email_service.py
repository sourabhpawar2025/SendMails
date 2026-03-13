"""Send emails via SMTP and log to email_logs (Django ORM)."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

from email_validator import validate_email as _validate_email, EmailNotValidError

from app.models import Result, EmailLog, SmtpSender
from app.services.encryption import decrypt_password
from app.services.template_service import get_placeholder_map, render_template

REMARKS_MAX_LEN = 2000


def _validate_recipient_email(email: str) -> tuple:
    """
    Validate email format. Returns (True, None) if valid, else (False, reason).
    No DNS/deliverability check for efficiency.
    """
    if not email or not isinstance(email, str):
        return False, "Invalid email address (empty or missing)"
    raw = (email or "").strip()
    if not raw:
        return False, "Invalid email address (empty)"
    try:
        _validate_email(raw, check_deliverability=False)
        return True, None
    except EmailNotValidError as e:
        return False, "Invalid email address: " + str(e)


def _connect_smtp(sender, password: str, use_tls: bool = True):
    """Create and return connected SMTP server. Caller must call server.quit()."""
    if sender.smtp_port == 465:
        server = smtplib.SMTP_SSL(sender.smtp_host, sender.smtp_port)
    elif use_tls:
        server = smtplib.SMTP(sender.smtp_host, sender.smtp_port)
        server.starttls()
    else:
        server = smtplib.SMTP_SSL(sender.smtp_host, sender.smtp_port)
    server.login(sender.username, password)
    return server


def send_emails_batch(
    sender,
    recipients,
    subject_template: str,
    body_template: str,
    use_tls: bool = True,
    campaign_name: str = "",
) -> tuple:
    """
    Send multiple emails using one SMTP connection. Log each to email_logs with campaign_name and remarks (failure reason).
    Returns (sent: int, failed: int, last_error: str or None).
    """
    if not recipients:
        return 0, 0, None
    try:
        password = decrypt_password(sender.password_encrypted)
    except Exception as e:
        return 0, len(recipients), f"Decrypt error: {e}"

    campaign_name = (campaign_name or "").strip()[:255]
    sent_time = datetime.now(timezone.utc)
    sent, failed = 0, 0
    last_error = None
    sent_emails = set()
    server = None
    try:
        server = _connect_smtp(sender, password, use_tls)
        for r in recipients:
            placeholder_map = get_placeholder_map(r)
            subject = render_template(subject_template, placeholder_map)
            body = render_template(body_template, placeholder_map)
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = sender.email
            msg["To"] = r.email
            msg.attach(MIMEText(body, "plain"))
            try:
                valid, invalid_reason = _validate_recipient_email(r.email)
                if not valid:
                    remarks = (invalid_reason or "Invalid email address")[:REMARKS_MAX_LEN]
                    EmailLog.objects.create(
                        sender_id=sender.id,
                        sender_email=sender.email,
                        recipient_email=r.email,
                        sent_time=sent_time,
                        status=EmailLog.Status.FAILED,
                        campaign_name=campaign_name,
                        remarks=remarks,
                    )
                    failed += 1
                    last_error = invalid_reason
                    continue
                server.sendmail(sender.email, r.email, msg.as_string())
                EmailLog.objects.create(
                    sender_id=sender.id,
                    sender_email=sender.email,
                    recipient_email=r.email,
                    sent_time=sent_time,
                    status=EmailLog.Status.SENT,
                    campaign_name=campaign_name,
                    remarks="",
                )
                sent += 1
                sent_emails.add(r.email)
            except Exception as e:
                error_msg = (str(e))[:REMARKS_MAX_LEN]
                EmailLog.objects.create(
                    sender_id=sender.id,
                    sender_email=sender.email,
                    recipient_email=r.email,
                    sent_time=sent_time,
                    status=EmailLog.Status.FAILED,
                    campaign_name=campaign_name,
                    remarks=error_msg,
                )
                failed += 1
                last_error = error_msg
    except Exception as e:
        last_error = (str(e))[:REMARKS_MAX_LEN]
        for r in recipients:
            if r.email not in sent_emails:
                EmailLog.objects.create(
                    sender_id=sender.id,
                    sender_email=sender.email,
                    recipient_email=r.email,
                    sent_time=sent_time,
                    status=EmailLog.Status.FAILED,
                    campaign_name=campaign_name,
                    remarks=last_error[:REMARKS_MAX_LEN],
                )
                failed += 1
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass
    return sent, failed, last_error


def send_single_email(
    sender,
    recipient,
    subject_template: str,
    body_template: str,
    use_tls: bool = True,
    campaign_name: str = "",
) -> tuple:
    """
    Send one email to recipient using sender's SMTP. Log in email_logs with campaign_name and remarks on failure.
    sender, recipient are Django model instances.
    Returns (success: bool, message: str).
    """
    try:
        password = decrypt_password(sender.password_encrypted)
    except Exception as e:
        return False, f"Decrypt error: {e}"

    campaign_name = (campaign_name or "").strip()[:255]
    sent_time = datetime.now(timezone.utc)

    valid, invalid_reason = _validate_recipient_email(recipient.email)
    if not valid:
        remarks = (invalid_reason or "Invalid email address")[:REMARKS_MAX_LEN]
        EmailLog.objects.create(
            sender_id=sender.id,
            sender_email=sender.email,
            recipient_email=recipient.email,
            sent_time=sent_time,
            status=EmailLog.Status.FAILED,
            campaign_name=campaign_name,
            remarks=remarks,
        )
        return False, invalid_reason or "Invalid email address"

    placeholder_map = get_placeholder_map(recipient)
    subject = render_template(subject_template, placeholder_map)
    body = render_template(body_template, placeholder_map)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender.email
    msg["To"] = recipient.email
    msg.attach(MIMEText(body, "plain"))

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
        error_msg = (str(e))[:REMARKS_MAX_LEN]
        EmailLog.objects.create(
            sender_id=sender.id,
            sender_email=sender.email,
            recipient_email=recipient.email,
            sent_time=sent_time,
            status=EmailLog.Status.FAILED,
            campaign_name=campaign_name,
            remarks=error_msg,
        )
        return False, str(e)

    EmailLog.objects.create(
        sender_id=sender.id,
        sender_email=sender.email,
        recipient_email=recipient.email,
        sent_time=sent_time,
        status=EmailLog.Status.SENT,
        campaign_name=campaign_name,
        remarks="",
    )
    return True, "Sent"


def test_smtp_connection(
    host: str,
    port: int,
    username: str,
    password_plain: str,
    use_tls: bool = True,
) -> tuple:
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
