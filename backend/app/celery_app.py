"""Celery app and email sending task (Django)."""
from celery import Celery
from django.conf import settings

app = Celery("sendmails")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# Broker from settings (set in sendmails.settings)
app.conf.broker_url = getattr(settings, "CELERY_BROKER_URL", "redis://localhost:6379/0")
app.conf.result_backend = getattr(settings, "CELERY_BROKER_URL", "redis://localhost:6379/0")
app.conf.task_serializer = "json"
app.conf.accept_content = ["json"]
app.conf.result_serializer = "json"
app.conf.timezone = "UTC"
app.conf.enable_utc = True
app.conf.task_track_started = True
