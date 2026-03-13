# Migration: create mail_templates or add campaign_ids if table already exists (from failed M2M run)

from django.db import migrations, connection


def create_or_alter_mail_templates(apps, schema_editor):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = DATABASE() AND table_name = 'mail_templates' LIMIT 1"
        )
        exists = cursor.fetchone() is not None
    if not exists:
        schema_editor.execute("""
            CREATE TABLE mail_templates (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                from_field VARCHAR(512) NOT NULL DEFAULT '',
                to_field VARCHAR(512) NOT NULL DEFAULT '',
                subject VARCHAR(512) NOT NULL,
                body LONGTEXT NOT NULL,
                campaign_ids JSON NULL,
                created_at DATETIME(6) NOT NULL,
                updated_at DATETIME(6) NOT NULL
            )
        """)
        return
    # Table exists (from previous failed migration); add campaign_ids if missing
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = DATABASE() AND table_name = 'mail_templates' AND column_name = 'campaign_ids' LIMIT 1"
        )
        has_col = cursor.fetchone() is not None
    if not has_col:
        schema_editor.execute("ALTER TABLE mail_templates ADD COLUMN campaign_ids JSON NULL")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ("app", "0003_campaign"),
    ]

    operations = [
        migrations.RunPython(create_or_alter_mail_templates, noop_reverse),
    ]
