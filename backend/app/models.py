"""
Django ORM models for SMTP senders, email logs, and results.
Uses existing table names: smtp_senders, email_logs, results, queries.
"""
from django.db import models


class SmtpSender(models.Model):
    sender_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True, db_index=True)
    smtp_host = models.CharField(max_length=255)
    smtp_port = models.IntegerField(default=587)
    username = models.CharField(max_length=255)
    password_encrypted = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "smtp_senders"
        ordering = ["id"]


class EmailLog(models.Model):
    class Status(models.TextChoices):
        SENT = "Sent", "Sent"
        FAILED = "Failed", "Failed"

    sender = models.ForeignKey(
        SmtpSender,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_logs",
        db_column="sender_id",
    )
    sender_email = models.CharField(max_length=255, db_index=True)
    recipient_email = models.CharField(max_length=255, db_index=True)
    sent_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SENT)
    campaign_name = models.CharField(max_length=255, blank=True, default="")
    remarks = models.TextField(blank=True, default="")

    class Meta:
        db_table = "email_logs"
        ordering = ["-sent_time"]


class Result(models.Model):
    """Recipients from existing results table (scraperdb). Column names: name, website, keyword, location, created_at."""
    name = models.CharField(max_length=255, null=True, blank=True)
    website = models.CharField(max_length=512, null=True, blank=True)
    email = models.CharField(max_length=255, db_index=True)
    phone = models.CharField(max_length=255, null=True, blank=True)
    instagram = models.CharField(max_length=255, null=True, blank=True)
    facebook = models.CharField(max_length=255, null=True, blank=True)
    twitter = models.CharField(max_length=255, null=True, blank=True)
    keyword = models.CharField(max_length=255, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "results"
        ordering = ["id"]
        managed = False  # Table already exists in scraperdb


class Query(models.Model):
    """Independent query model - same table name as existing DB."""
    query = models.CharField(max_length=512)
    status = models.CharField(max_length=64, null=True, blank=True)
    result_count = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "queries"
        ordering = ["id"]
        managed = False  # Table may already exist


class Campaign(models.Model):
    """Campaigns stored in scraperdb.campaign_names."""
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"
        IN_PROGRESS = "In Progress", "In Progress"

    name = models.CharField(max_length=255)
    type = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "campaign_names"
        ordering = ["-updated_at"]


class MailTemplate(models.Model):
    """Reusable mail templates; linked to campaigns via campaign_ids and mail_templates_campaigns junction table."""
    name = models.CharField(max_length=255)
    from_field = models.CharField(max_length=512, blank=True, default="", help_text="From display or placeholder e.g. {{sender_email}}")
    to_field = models.CharField(max_length=512, blank=True, default="", help_text="To display e.g. Recipients")
    subject = models.CharField(max_length=512)
    body = models.TextField()
    campaign_ids = models.JSONField(default=list, blank=True, help_text="List of campaign IDs this template is used for")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "mail_templates"
        ordering = ["-updated_at"]


class MailTemplateCampaign(models.Model):
    """Junction table: links mail templates to campaigns. Updated when a template is created/updated with campaign selection."""
    template = models.ForeignKey(
        MailTemplate,
        on_delete=models.CASCADE,
        related_name="template_campaign_links",
        db_column="mailtemplate_id",
    )
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name="campaign_template_links",
        db_column="campaign_id",
    )

    class Meta:
        db_table = "mail_templates_campaigns"
        ordering = ["template", "campaign"]
        unique_together = [["template", "campaign"]]
