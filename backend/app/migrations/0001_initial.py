# Generated migration for Django conversion

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="SmtpSender",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sender_name", models.CharField(max_length=255)),
                ("email", models.EmailField(db_index=True, max_length=254, unique=True)),
                ("smtp_host", models.CharField(max_length=255)),
                ("smtp_port", models.IntegerField(default=587)),
                ("username", models.CharField(max_length=255)),
                ("password_encrypted", models.TextField()),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "smtp_senders",
                "ordering": ["id"],
            },
        ),
        migrations.CreateModel(
            name="EmailLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sender_email", models.CharField(db_index=True, max_length=255)),
                ("recipient_email", models.CharField(db_index=True, max_length=255)),
                ("sent_time", models.DateTimeField()),
                ("status", models.CharField(choices=[("Sent", "Sent"), ("Failed", "Failed")], default="Sent", max_length=20)),
            ],
            options={
                "db_table": "email_logs",
                "ordering": ["-sent_time"],
            },
        ),
    ]
