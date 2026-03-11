"""Send email request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List


class SendEmailRequest(BaseModel):
    """Trigger send to recipients from results (email IS NOT NULL)."""
    sender_id: int = Field(..., description="ID of smtp_senders row to use")
    subject_template: str = Field(
        ...,
        min_length=1,
        description="Subject with placeholders e.g. Hello {{Title}}",
    )
    body_template: str = Field(
        ...,
        min_length=1,
        description="Body with placeholders: {{Title}}, {{Email}}, etc.",
    )
    limit: Optional[int] = Field(default=100, ge=1, le=500, description="Max recipients per run")
    recipient_ids: Optional[List[int]] = Field(default=None, description="If set, send only to these result IDs (must have email)")
    use_tls: bool = True


class SendEmailResponse(BaseModel):
    sent: int = 0
    failed: int = 0
    message: str = ""
    error_detail: Optional[str] = None  # Last error when failed > 0
