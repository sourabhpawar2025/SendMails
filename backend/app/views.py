"""
Django REST API views - same endpoints as FastAPI.
"""
from django.http import JsonResponse
from django.db.models import Min
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from datetime import datetime

from app.models import SmtpSender, EmailLog, Result, Campaign, MailTemplate
from app.serializers import (
    SmtpSenderSerializer,
    SmtpSenderCreateSerializer,
    SmtpSenderUpdateSerializer,
    SmtpSenderTestRequestSerializer,
    EmailLogSerializer,
    ResultSerializer,
    SendEmailRequestSerializer,
    CampaignSerializer,
    MailTemplateSerializer,
)
from app.services.encryption import encrypt_password
from app.services.email_service import test_smtp_connection, send_single_email, send_emails_batch
from app.tasks import send_emails_task


# ---------- SMTP Senders ----------
@api_view(["GET", "POST"])
def smtp_sender_list_or_create(request):
    if request.method == "GET":
        senders = SmtpSender.objects.all().order_by("id")
        return Response(SmtpSenderSerializer(senders, many=True).data)
    # POST
    ser = SmtpSenderCreateSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    if SmtpSender.objects.filter(email=ser.validated_data["email"]).exists():
        return Response({"detail": "Email already registered"}, status=status.HTTP_400_BAD_REQUEST)
    sender = ser.save()
    return Response(SmtpSenderSerializer(sender).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
def smtp_sender_detail(request, sender_id):
    sender = get_object_or_404(SmtpSender, id=sender_id)
    if request.method == "GET":
        return Response(SmtpSenderSerializer(sender).data)
    if request.method == "PATCH":
        ser = SmtpSenderUpdateSerializer(sender, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(SmtpSenderSerializer(sender).data)
    # DELETE
    sender.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
def smtp_sender_test_connection(request):
    ser = SmtpSenderTestRequestSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    data = ser.validated_data
    ok, msg = test_smtp_connection(
        data["smtp_host"],
        data["smtp_port"],
        data["username"],
        data["password"],
        use_tls=True,
    )
    return Response({"success": ok, "message": msg})


# ---------- Email Logs ----------
@api_view(["GET"])
def email_log_list(request):
    qs = EmailLog.objects.select_related("sender").filter(
        sender_email__isnull=False,
        recipient_email__isnull=False,
        sent_time__isnull=False,
        status__isnull=False,
    )
    sender_email = request.query_params.get("sender_email")
    if sender_email:
        qs = qs.filter(sender_email=sender_email)
    sender_id = request.query_params.get("sender_id")
    if sender_id:
        try:
            qs = qs.filter(sender_id=int(sender_id))
        except (TypeError, ValueError):
            pass
    status_filter = request.query_params.get("status")
    if status_filter and status_filter in ("Sent", "Failed"):
        qs = qs.filter(status=status_filter)
    campaign_name = request.query_params.get("campaign", "").strip()
    if campaign_name:
        qs = qs.filter(campaign_name=campaign_name)
    date_from = request.query_params.get("date_from")
    if date_from:
        try:
            d = datetime.strptime(date_from, "%Y-%m-%d")
            qs = qs.filter(sent_time__gte=d)
        except ValueError:
            pass
    date_to = request.query_params.get("date_to")
    if date_to:
        try:
            d = datetime.strptime(date_to, "%Y-%m-%d")
            d = d.replace(hour=23, minute=59, second=59, microsecond=999999)
            qs = qs.filter(sent_time__lte=d)
        except ValueError:
            pass
    skip = int(request.query_params.get("skip", 0))
    limit = int(request.query_params.get("limit", 50))
    limit = max(1, min(200, limit))
    qs = qs.order_by("-sent_time")[skip : skip + limit]
    return Response(EmailLogSerializer(qs, many=True).data)


@api_view(["GET", "PATCH"])
def email_log_detail(request, log_id):
    """Get a single log or update its status/remarks (e.g. mark as bounced)."""
    log = get_object_or_404(EmailLog.objects.select_related("sender"), id=log_id)
    if request.method == "GET":
        return Response(EmailLogSerializer(log).data)
    # PATCH: allow updating status and remarks only (e.g. mark as Address not Found)
    data = request.data or {}
    if "status" in data and data["status"] in ("Sent", "Failed"):
        log.status = data["status"]
    if "remarks" in data:
        remarks = str(data["remarks"])[:2000]
        log.remarks = remarks
    log.save(update_fields=["status", "remarks"])
    return Response(EmailLogSerializer(log).data)


@api_view(["GET"])
def result_filters(request):
    """Return distinct locations and (location, category) pairs from results for dropdowns. Uses raw SQL; DB columns: location, keyword."""
    from django.db import connection

    locations = []
    pairs = []
    error_detail = None

    try:
        with connection.cursor() as cursor:
            # Distinct non-empty locations
            cursor.execute("""
                SELECT DISTINCT location FROM results
                WHERE location IS NOT NULL AND TRIM(COALESCE(location, '')) != ''
                ORDER BY location
            """)
            locations = [str(row[0]) if row[0] is not None else "" for row in cursor.fetchall()]
            locations = sorted(set(locations), key=lambda x: (x or "").lower())

            # Distinct (location, keyword) pairs; return as "category" for frontend dropdown
            cursor.execute("""
                SELECT DISTINCT location, keyword FROM results
                WHERE location IS NOT NULL AND TRIM(COALESCE(location, '')) != ''
                  AND keyword IS NOT NULL AND TRIM(COALESCE(keyword, '')) != ''
                ORDER BY location, keyword
            """)
            pairs = [
                {"location": str(loc) if loc is not None else "", "category": str(cat) if cat is not None else ""}
                for loc, cat in cursor.fetchall()
            ]
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("result_filters failed: %s", e)
        error_detail = str(e)

    return Response({
        "locations": locations,
        "pairs": pairs,
        **({"error": error_detail} if error_detail else {}),
    })


def _get_list_param(query_params, key):
    """Get list from query params; support both 'key' and 'key[]' (axios array serialization)."""
    values = query_params.getlist(key) or query_params.getlist(f"{key}[]")
    return [v.strip() for v in values if v and str(v).strip()]


def _parse_date_param(value):
    """Parse YYYY-MM-DD string to date or None."""
    if not value or not str(value).strip():
        return None
    try:
        return datetime.strptime(str(value).strip()[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


@api_view(["GET"])
def result_list(request):
    # Always exclude rows without email (null or empty) so only mailable data is reflected
    qs = (
        Result.objects.exclude(email__isnull=True)
        .exclude(email="")
        .order_by("id")
    )
    # Filter by category (query param "category") and location (multi-value); DB column for category is "keyword"
    categories = _get_list_param(request.query_params, "category")
    if categories:
        qs = qs.filter(keyword__in=categories)
    locations = _get_list_param(request.query_params, "location")
    if locations:
        qs = qs.filter(location__in=locations)
    # Date range filter on created_at (inclusive: from start-of-day to end-of-day)
    date_from = _parse_date_param(request.query_params.get("date_from"))
    date_to = _parse_date_param(request.query_params.get("date_to"))
    if date_from is not None:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to is not None:
        qs = qs.filter(created_at__date__lte=date_to)
    # Keep one row per unique email (smallest id wins) when requested
    unique_email_only = request.query_params.get("unique_email_only", "true").lower() in ("true", "1", "yes")
    if unique_email_only:
        ids = qs.values("email").annotate(min_id=Min("id")).values_list("min_id", flat=True)
        qs = Result.objects.filter(id__in=ids).order_by("id")
    skip = int(request.query_params.get("skip", 0))
    limit = int(request.query_params.get("limit", 500))
    limit = max(1, min(2000, limit))
    qs = qs[skip : skip + limit]
    return Response(ResultSerializer(qs, many=True).data)


@api_view(["GET"])
def result_count(request):
    """Return total count of results matching filters (location, category, date range). Same filters as result_list. Only rows with non-empty email are counted."""
    # Always exclude rows without email (null or empty)
    qs = Result.objects.exclude(email__isnull=True).exclude(email="")
    locations = _get_list_param(request.query_params, "location")
    if locations:
        qs = qs.filter(location__in=locations)
    categories = _get_list_param(request.query_params, "category")
    if categories:
        qs = qs.filter(keyword__in=categories)
    date_from = _parse_date_param(request.query_params.get("date_from"))
    date_to = _parse_date_param(request.query_params.get("date_to"))
    if date_from is not None:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to is not None:
        qs = qs.filter(created_at__date__lte=date_to)
    unique_email_only = request.query_params.get("unique_email_only", "true").lower() in ("true", "1", "yes")
    if unique_email_only:
        count = qs.values("email").distinct().count()
        return Response({"count": count})
    return Response({"count": qs.count()})


# ---------- Send Emails ----------
@api_view(["POST"])
def send_now(request):
    ser = SendEmailRequestSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    data = ser.validated_data

    # Resolve senders from validated sender_ids (single or multiple)
    sender_ids = data["sender_ids"]
    senders = list(SmtpSender.objects.filter(id__in=sender_ids, is_active=True).order_by("id"))
    if not senders:
        return Response(
            {"detail": "No active SMTP senders found. Select at least one active sender."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    recipients = Result.objects.exclude(email__isnull=True).exclude(email="").order_by("id")
    if data.get("recipient_ids"):
        recipients = recipients.filter(id__in=data["recipient_ids"])
    if data.get("recipient_ids"):
        recipients = list(recipients)
    else:
        recipients = list(recipients[: data.get("limit", 100)])

    # Deduplicate by email (keep first by id)
    seen_emails = set()
    unique_recipients = []
    for r in recipients:
        email = (r.email or "").strip().lower()
        if email and email not in seen_emails:
            seen_emails.add(email)
            unique_recipients.append(r)
    recipients = unique_recipients

    recipients_count = len(recipients)
    total_sent, total_failed = 0, 0
    last_error = None
    campaign_name = ""
    if data.get("campaign_id"):
        campaign = Campaign.objects.filter(id=data["campaign_id"]).values_list("name", flat=True).first()
        if campaign:
            campaign_name = campaign

    if recipients_count == 0:
        message = (
            "No recipients found. "
            + ("Check that selected recipient IDs exist in the results table and have email."
               if data.get("recipient_ids") else
               "Ensure the results table has rows with non-empty email.")
        )
    else:
        # Each recipient gets one email from every selected sender (senders × recipients)
        for sender in senders:
            sent, failed, err = send_emails_batch(
                sender,
                unique_recipients,
                data["subject_template"],
                data["body_template"],
                use_tls=data.get("use_tls", True),
                campaign_name=campaign_name,
            )
            total_sent += sent
            total_failed += failed
            if err:
                last_error = err
        message = f"Sent: {total_sent}, Failed: {total_failed}"

    return Response({
        "sent": total_sent,
        "failed": total_failed,
        "message": message,
        "error_detail": last_error,
        "recipients_count": recipients_count,
    })


@api_view(["POST"])
def send_schedule(request):
    ser = SendEmailRequestSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    data = ser.validated_data
    # Schedule uses first sender from sender_ids
    sender_id = data["sender_ids"][0]
    send_emails_task.delay(
        sender_id=sender_id,
        subject_template=data["subject_template"],
        body_template=data["body_template"],
        limit=data.get("limit", 100),
        use_tls=data.get("use_tls", True),
    )
    return Response({"message": "Email send task queued", "sender_id": sender_id})


# ---------- Health ----------
def health(request):
    return JsonResponse({"status": "ok"})


# ---------- Campaigns ----------
@api_view(["GET", "POST"])
def campaign_list_or_create(request):
    if request.method == "GET":
        campaigns = Campaign.objects.all()
        return Response(CampaignSerializer(campaigns, many=True).data)
    ser = CampaignSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    campaign = ser.save()
    return Response(CampaignSerializer(campaign).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
def campaign_detail(request, campaign_id):
    campaign = get_object_or_404(Campaign, id=campaign_id)
    if request.method == "GET":
        return Response(CampaignSerializer(campaign).data)
    if request.method == "PATCH":
        ser = CampaignSerializer(campaign, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(CampaignSerializer(campaign).data)
    campaign.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def campaign_template(request, campaign_id):
    """Return the first mail template linked to this campaign (for prefill in send flow)."""
    get_object_or_404(Campaign, id=campaign_id)
    template = MailTemplate.objects.filter(
        template_campaign_links__campaign_id=campaign_id
    ).order_by("-updated_at").first()
    if not template:
        return Response(
            {"detail": "No mail template linked to this campaign. Link a template to the campaign first."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(MailTemplateSerializer(template).data)


# ---------- Mail Templates ----------
@api_view(["GET", "POST"])
def mail_template_list_or_create(request):
    if request.method == "GET":
        templates = MailTemplate.objects.all()
        return Response(MailTemplateSerializer(templates, many=True).data)
    ser = MailTemplateSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    template = ser.save()
    return Response(MailTemplateSerializer(template).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
def mail_template_detail(request, template_id):
    template = get_object_or_404(MailTemplate, id=template_id)
    if request.method == "GET":
        return Response(MailTemplateSerializer(template).data)
    if request.method == "PATCH":
        ser = MailTemplateSerializer(template, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(MailTemplateSerializer(template).data)
    template.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
