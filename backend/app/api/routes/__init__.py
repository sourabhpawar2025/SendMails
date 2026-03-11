"""API routes package."""
from fastapi import APIRouter
from app.api.routes import smtp_senders, email_logs, send_emails, results

api_router = APIRouter()
api_router.include_router(smtp_senders.router)
api_router.include_router(email_logs.router)
api_router.include_router(results.router)
api_router.include_router(send_emails.router)
