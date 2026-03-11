"""Email log schemas."""
from pydantic import BaseModel, ConfigDict, field_serializer
from typing import Optional, Any
from datetime import datetime, timezone, timedelta

# IST = UTC + 5:30
IST = timezone(timedelta(hours=5, minutes=30))


class EmailLogResponse(BaseModel):
    id: int
    sender_email: str
    recipient_email: str
    sent_time: Optional[datetime] = None
    status: str

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("status")
    def serialize_status(self, v: Any) -> str:
        if v is None:
            return "—"
        if hasattr(v, "value"):
            return str(v.value)
        return str(v)

    @field_serializer("sent_time")
    def serialize_sent_time(self, v: Any) -> str:
        if v is None:
            return ""
        if not hasattr(v, "isoformat"):
            return str(v)
        # DB stores UTC (naive or aware). Convert to IST for dashboard.
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        ist_time = v.astimezone(IST)
        return ist_time.isoformat()


class EmailLogListParams(BaseModel):
    """Query params for listing logs."""
    sender_email: Optional[str] = None
    status: Optional[str] = None  # Sent | Failed
    date_from: Optional[str] = None  # YYYY-MM-DD
    date_to: Optional[str] = None
    skip: int = 0
    limit: int = 50
