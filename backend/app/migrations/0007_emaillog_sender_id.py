# Add sender_id to email_logs for tracking which sender was used

from django.db import migrations, models


def add_sender_id_if_missing(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = DATABASE() AND table_name = 'email_logs'"
        )
        existing = {row[0] for row in cursor.fetchall()}
    if "sender_id" not in existing:
        schema_editor.execute("ALTER TABLE email_logs ADD COLUMN sender_id BIGINT NULL")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0006_emaillog_campaign_name_remarks"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="emaillog",
                    name="sender",
                    field=models.ForeignKey(
                        blank=True,
                        db_column="sender_id",
                        null=True,
                        on_delete=models.SET_NULL,
                        related_name="email_logs",
                        to="app.smtpsender",
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(add_sender_id_if_missing, noop_reverse),
            ],
        ),
    ]
