"""
DRF serializers for API responses and requests.
"""
from rest_framework import serializers
from datetime import datetime, timezone, timedelta

from app.models import SmtpSender, EmailLog, Result, Campaign, MailTemplate, MailTemplateCampaign

IST = timezone(timedelta(hours=5, minutes=30))


class SmtpSenderSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmtpSender
        fields = ["id", "sender_name", "email", "smtp_host", "smtp_port", "username", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SmtpSenderCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=1)

    class Meta:
        model = SmtpSender
        fields = ["sender_name", "email", "smtp_host", "smtp_port", "username", "password", "is_active"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        from app.services.encryption import encrypt_password
        validated_data["password_encrypted"] = encrypt_password(password)
        return super().create(validated_data)


class SmtpSenderUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=1, required=False)

    class Meta:
        model = SmtpSender
        fields = ["sender_name", "smtp_host", "smtp_port", "username", "password", "is_active"]

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        if password is not None:
            from app.services.encryption import encrypt_password
            instance.password_encrypted = encrypt_password(password)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class SmtpSenderTestRequestSerializer(serializers.Serializer):
    smtp_host = serializers.CharField()
    smtp_port = serializers.IntegerField(default=587)
    username = serializers.CharField()
    password = serializers.CharField()


class EmailLogSerializer(serializers.ModelSerializer):
    sent_time = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    sender_id = serializers.IntegerField(read_only=True, allow_null=True)
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailLog
        fields = ["id", "sender_id", "sender_name", "sender_email", "recipient_email", "sent_time", "status", "campaign_name", "remarks"]

    def get_sender_name(self, obj):
        sender = getattr(obj, "sender", None)
        if sender is None:
            return None
        return getattr(sender, "sender_name", None) or getattr(sender, "email", "")

    def get_sent_time(self, obj):
        if obj.sent_time is None:
            return ""
        v = obj.sent_time
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.astimezone(IST).isoformat()

    def get_status(self, obj):
        if obj.status is None:
            return "—"
        return obj.status if isinstance(obj.status, str) else getattr(obj.status, "value", str(obj.status))


class ResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = Result
        fields = ["id", "name", "website", "email", "phone", "instagram", "facebook", "twitter", "keyword", "location", "created_at"]


class SendEmailRequestSerializer(serializers.Serializer):
    sender_id = serializers.IntegerField(required=False, allow_null=True)
    sender_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_null=True)
    subject_template = serializers.CharField(min_length=1)
    body_template = serializers.CharField(min_length=1)
    limit = serializers.IntegerField(default=100, min_value=1, max_value=500, required=False)
    recipient_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_null=True)
    use_tls = serializers.BooleanField(default=True)
    campaign_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        sender_id = attrs.get("sender_id")
        sender_ids = attrs.get("sender_ids") or []
        if sender_ids:
            attrs["sender_ids"] = [int(x) for x in sender_ids if x is not None]
        elif sender_id is not None:
            attrs["sender_ids"] = [int(sender_id)]
        else:
            raise serializers.ValidationError("Provide sender_id or sender_ids.")
        return attrs


class SendEmailResponseSerializer(serializers.Serializer):
    sent = serializers.IntegerField(default=0)
    failed = serializers.IntegerField(default=0)
    message = serializers.CharField(default="")
    error_detail = serializers.CharField(allow_null=True, required=False)


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = ["id", "name", "type", "description", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class MailTemplateSerializer(serializers.ModelSerializer):
    campaigns = serializers.SerializerMethodField()

    class Meta:
        model = MailTemplate
        fields = [
            "id", "name", "from_field", "to_field", "subject", "body",
            "campaign_ids", "campaigns", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_campaign_ids(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            return []
        return [int(x) for x in value if isinstance(x, (int, str)) and str(x).isdigit()]

    def _sync_mail_templates_campaigns(self, template, campaign_ids):
        """Update mail_templates_campaigns so it contains exactly (template_id, campaign_id) for each valid id."""
        campaign_ids = list(campaign_ids or [])
        valid_ids = set(
            Campaign.objects.filter(id__in=campaign_ids).values_list("id", flat=True)
        )
        MailTemplateCampaign.objects.filter(template=template).delete()
        # Dedupe while preserving order so unique_together is satisfied
        valid_ordered = list(dict.fromkeys(cid for cid in campaign_ids if cid in valid_ids))
        MailTemplateCampaign.objects.bulk_create([
            MailTemplateCampaign(template=template, campaign_id=cid)
            for cid in valid_ordered
        ])

    def create(self, validated_data):
        template = super().create(validated_data)
        self._sync_mail_templates_campaigns(
            template, validated_data.get("campaign_ids") or []
        )
        return template

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if "campaign_ids" in validated_data:
            self._sync_mail_templates_campaigns(
                instance, instance.campaign_ids or []
            )
        return instance

    def get_campaigns(self, obj):
        ids = getattr(obj, "campaign_ids", None) or []
        if not ids:
            return []
        from app.models import Campaign
        campaigns = Campaign.objects.filter(id__in=ids).order_by("name")
        return CampaignSerializer(campaigns, many=True).data
