"""Test script: verify API and DB connectivity."""
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


def main():
    db = SessionLocal()
    try:
        r = db.query(Result).filter(Result.email.isnot(None)).limit(1).first()
        s = db.query(SmtpSender).limit(1).first()
        l = db.query(EmailLog).limit(1).first()
        print("DB connection OK")
        print(f"  results (with email): {r.id if r else 'none'}")
        print(f"  smtp_senders: {s.email if s else 'none'}")
        print(f"  email_logs: {l.id if l else 'none'}")
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
