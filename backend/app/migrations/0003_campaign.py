# Generated migration for Campaign (campaign_names table)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0002_query_result"),
    ]

    operations = [
        migrations.CreateModel(
            name="Campaign",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("type", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("status", models.CharField(choices=[("active", "Active"), ("paused", "Paused"), ("completed", "Completed"), ("In Progress", "In Progress")], default="active", max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "campaign_names",
                "ordering": ["-updated_at"],
            },
        ),
    ]
