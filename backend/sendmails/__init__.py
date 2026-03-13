# Django project package
try:
    from app.celery_app import app as celery_app
    __all__ = ["celery_app"]
except ImportError:
    __all__ = []
