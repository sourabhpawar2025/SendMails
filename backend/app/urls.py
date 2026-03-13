"""App URL configuration - same paths as FastAPI /api/."""
from django.urls import path
from app import views

urlpatterns = [
    path("smtp-senders", views.smtp_sender_list_or_create),
    path("smtp-senders/test-connection", views.smtp_sender_test_connection),
    path("smtp-senders/<int:sender_id>", views.smtp_sender_detail),
    path("email-logs", views.email_log_list),
    path("email-logs/<int:log_id>", views.email_log_detail),
    path("results", views.result_list),
    path("results/filters", views.result_filters),
    path("results/count", views.result_count),
    path("send/now", views.send_now),
    path("send/schedule", views.send_schedule),
    path("health", views.health),
    path("campaigns", views.campaign_list_or_create),
    path("campaigns/<int:campaign_id>", views.campaign_detail),
    path("campaigns/<int:campaign_id>/template", views.campaign_template),
    path("mail-templates", views.mail_template_list_or_create),
    path("mail-templates/<int:template_id>", views.mail_template_detail),
]
