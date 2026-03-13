"""Render email body/subject with placeholder substitution."""
import re
from typing import Any

PLACEHOLDERS = [
    "Title",
    "Email",
    "Phone",
    "Instagram",
    "Facebook",
    "Twitter",
    "Category",
    "Location",
]


def get_placeholder_map(record: Any) -> dict:
    """Build a map of {{Key}} -> value from a result record. Uses name/keyword columns; placeholders Title/Category for compatibility."""
    return {
        "Title": getattr(record, "name", None) or "",
        "Email": getattr(record, "email", None) or "",
        "Phone": getattr(record, "phone", None) or "",
        "Instagram": getattr(record, "instagram", None) or "",
        "Facebook": getattr(record, "facebook", None) or "",
        "Twitter": getattr(record, "twitter", None) or "",
        "Category": getattr(record, "keyword", None) or "",
        "Location": getattr(record, "location", None) or "",
    }


def render_template(text: str, placeholder_map: dict) -> str:
    """Replace {{Placeholder}} with values. Case-sensitive."""
    if not text:
        return ""
    result = text
    for key, value in placeholder_map.items():
        result = result.replace("{{" + key + "}}", str(value or ""))
    return result
