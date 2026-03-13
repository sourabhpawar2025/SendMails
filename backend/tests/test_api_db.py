"""Test script: verify API and DB connectivity (Django)."""
import os
import sys
BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sendmails.settings")
django.setup()

from app.models import Result, SmtpSender, EmailLog


def main():
    try:
        r = Result.objects.exclude(email__isnull=True).exclude(email="").first()
        s = SmtpSender.objects.first()
        l = EmailLog.objects.first()
        print("DB connection OK")
        print(f"  results (with email): {r.id if r else 'none'}")
        print(f"  smtp_senders: {s.email if s else 'none'}")
        print(f"  email_logs: {l.id if l else 'none'}")
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
