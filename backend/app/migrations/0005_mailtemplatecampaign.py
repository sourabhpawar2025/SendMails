# Migration: create mail_templates_campaigns junction table and backfill from mail_templates.campaign_ids
# Uses SeparateDatabaseAndState so MailTemplate is in the migration state (0004 only created the table via SQL).
# Table columns match existing DB: id, mailtemplate_id, campaign_id. Backfill uses raw SQL (no ORM state).

import json
from django.db import migrations, models


def create_mtc_table(apps, schema_editor):
    """Create junction table only if it does not exist (idempotent). Uses mailtemplate_id to match existing DB."""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = DATABASE() AND table_name = 'mail_templates_campaigns' LIMIT 1"
        )
        if cursor.fetchone() is not None:
            return
    schema_editor.execute("""
        CREATE TABLE mail_templates_campaigns (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            mailtemplate_id BIGINT NOT NULL,
            campaign_id BIGINT NOT NULL,
            UNIQUE KEY unique_template_campaign (mailtemplate_id, campaign_id),
            KEY mail_templates_campaigns_mailtemplate_id (mailtemplate_id),
            KEY mail_templates_campaigns_campaign_id (campaign_id),
            CONSTRAINT fk_mtc_template FOREIGN KEY (mailtemplate_id) REFERENCES mail_templates (id) ON DELETE CASCADE,
            CONSTRAINT fk_mtc_campaign FOREIGN KEY (campaign_id) REFERENCES campaign_names (id) ON DELETE CASCADE
        )
    """)


def drop_mtc_table(apps, schema_editor):
    schema_editor.execute("DROP TABLE IF EXISTS mail_templates_campaigns")


def backfill_junction(apps, schema_editor):
    """Backfill using raw SQL only (migration state does not have MailTemplate/MailTemplateCampaign here)."""
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute("SELECT id, campaign_ids FROM mail_templates")
        templates = cursor.fetchall()
        cursor.execute("SELECT id FROM campaign_names")
        valid_campaign_ids = {row[0] for row in cursor.fetchall()}

        for template_id, campaign_ids_json in templates:
            if campaign_ids_json is None:
                continue
            try:
                if isinstance(campaign_ids_json, str):
                    ids = json.loads(campaign_ids_json)
                elif isinstance(campaign_ids_json, (list, tuple)):
                    ids = list(campaign_ids_json)
                else:
                    continue
            except (TypeError, ValueError):
                continue
            if not isinstance(ids, list):
                continue
            seen = set()
            for cid in ids:
                try:
                    cid = int(cid)
                except (TypeError, ValueError):
                    continue
                if cid not in valid_campaign_ids or cid in seen:
                    continue
                seen.add(cid)
                cursor.execute(
                    "INSERT IGNORE INTO mail_templates_campaigns (mailtemplate_id, campaign_id) VALUES (%s, %s)",
                    [template_id, cid],
                )


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0004_mailtemplate"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="MailTemplate",
                    fields=[
                        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("name", models.CharField(max_length=255)),
                        ("from_field", models.CharField(blank=True, default="", max_length=512)),
                        ("to_field", models.CharField(blank=True, default="", max_length=512)),
                        ("subject", models.CharField(max_length=512)),
                        ("body", models.TextField()),
                        ("campaign_ids", models.JSONField(blank=True, default=list)),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                        ("updated_at", models.DateTimeField(auto_now=True)),
                    ],
                    options={
                        "db_table": "mail_templates",
                        "ordering": ["-updated_at"],
                    },
                ),
                migrations.CreateModel(
                    name="MailTemplateCampaign",
                    fields=[
                        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("campaign", models.ForeignKey(on_delete=models.CASCADE, related_name="campaign_template_links", to="app.campaign", db_column="campaign_id")),
                        ("template", models.ForeignKey(on_delete=models.CASCADE, related_name="template_campaign_links", to="app.mailtemplate", db_column="mailtemplate_id")),
                    ],
                    options={
                        "db_table": "mail_templates_campaigns",
                        "ordering": ["template", "campaign"],
                        "unique_together": {("template", "campaign")},
                    },
                ),
            ],
            database_operations=[
                migrations.RunPython(create_mtc_table, drop_mtc_table),
                migrations.RunPython(backfill_junction, migrations.RunPython.noop),
            ],
        ),
    ]
