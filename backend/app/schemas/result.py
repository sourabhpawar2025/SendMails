"""Result (recipients) schema for API response."""
from pydantic import BaseModel, ConfigDict
from typing import Optional


class ResultResponse(BaseModel):
    id: int
    title: Optional[str] = None
    link: Optional[str] = None
    email: Optional[str] = None
    phones: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
