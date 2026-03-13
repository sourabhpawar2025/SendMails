# Add campaign_name and remarks to email_logs (idempotent: skip if columns already exist)

from django.db import migrations, models


def add_columns_if_missing(apps, schema_editor):
    """Add campaign_name and remarks only if they do not exist (safe when user already added them)."""
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = DATABASE() AND table_name = 'email_logs'"
        )
        existing = {row[0] for row in cursor.fetchall()}
    if "campaign_name" not in existing:
        schema_editor.execute(
            "ALTER TABLE email_logs ADD COLUMN campaign_name VARCHAR(255) NOT NULL DEFAULT ''"
        )
    if "remarks" not in existing:
        schema_editor.execute(
            "ALTER TABLE email_logs ADD COLUMN remarks VARCHAR(2000) NOT NULL DEFAULT ''"
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0005_mailtemplatecampaign"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="emaillog",
                    name="campaign_name",
                    field=models.CharField(blank=True, default="", max_length=255),
                ),
                migrations.AddField(
                    model_name="emaillog",
                    name="remarks",
                    field=models.TextField(blank=True, default=""),
                ),
            ],
            database_operations=[
                migrations.RunPython(add_columns_if_missing, noop_reverse),
            ],
        ),
    ]
