"""Test script: verify email sending flow (single recipient from results)."""
import os
import sys
BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(BACKEND, ".env"))
    except ImportError:
        pass

from app.database import SessionLocal
from app.models import Result, SmtpSender, EmailLog
from app.services.encryption import encrypt_password, decrypt_password
from app.services.email_service import send_single_email, test_smtp_connection


def main():
    db = SessionLocal()
    try:
        # 1) Check encryption
        key = os.getenv("ENCRYPTION_KEY")
        if not key:
            print("ENCRYPTION_KEY not set. Generate and add to .env")
            return 1
        secret = encrypt_password("test123")
        assert decrypt_password(secret) == "test123"
        print("[OK] Encryption/decryption works")

        # 2) Count recipients (email IS NOT NULL)
        count = db.query(Result).filter(Result.email.isnot(None), Result.email != "").count()
        print(f"[OK] Recipients in results (email not null): {count}")

        # 3) List SMTP senders
        senders = db.query(SmtpSender).filter(SmtpSender.is_active == True).all()
        if not senders:
            print("[SKIP] No active SMTP sender. Add one via dashboard or API.")
            return 0
        sender = senders[0]
        print(f"[OK] Using sender: {sender.email}")

        # 4) Test SMTP (optional - requires correct password)
        # ok, msg = test_smtp_connection(sender.smtp_host, sender.smtp_port, sender.username, decrypt_password(sender.password_encrypted))
        # print(f"Test connection: {msg}")

        # 5) Send one test email if we have a recipient
        one = db.query(Result).filter(Result.email.isnot(None), Result.email != "").first()
        if not one:
            print("[SKIP] No recipient with email in results.")
            return 0
        print(f"Sending test email to {one.email}...")
        ok, msg = send_single_email(
            db,
            sender,
            one,
            subject_template="Test {{Title}}",
            body_template="Hello {{Title}}, email: {{Email}}.",
            use_tls=True,
        )
        print(f"Result: {'Sent' if ok else 'Failed'} - {msg}")
        if ok:
            log = db.query(EmailLog).order_by(EmailLog.id.desc()).first()
            print(f"Log: id={log.id} status={log.status} at {log.sent_time}")
        return 0 if ok else 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
