"""Create smtp_senders and email_logs tables in scraperdb. Run once."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.models.smtp_sender import SmtpSender
from app.models.email_log import EmailLog

if __name__ == "__main__":
    # Only create new tables; results and queries already exist
    SmtpSender.__table__.create(engine, checkfirst=True)
    EmailLog.__table__.create(engine, checkfirst=True)
    print("Tables smtp_senders and email_logs created (if not exist).")
