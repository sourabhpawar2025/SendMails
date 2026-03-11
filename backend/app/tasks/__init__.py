"""Celery app and tasks."""
from app.tasks.celery_tasks import send_emails_task

__all__ = ["send_emails_task"]
