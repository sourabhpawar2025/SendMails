"""Create smtp_senders and email_logs tables. Run: python manage.py migrate"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sendmails.settings")
django.setup()
from django.core.management import call_command
if __name__ == "__main__":
    call_command("migrate")
