"""Encryption/decryption for SMTP passwords."""
import base64
import os
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _get_fernet():
    key = (getattr(settings, "ENCRYPTION_KEY", None) or "").strip()
    if not key:
        raise ValueError(
            "ENCRYPTION_KEY must be set in .env (32 bytes base64). "
            'Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"'
        )
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt_password(plain: str) -> str:
    """Encrypt plain SMTP password for storage."""
    if not plain:
        return ""
    f = _get_fernet()
    return f.encrypt(plain.encode()).decode()


def decrypt_password(encrypted: str) -> str:
    """Decrypt stored password for SMTP use. Never expose to API."""
    if not encrypted:
        return ""
    f = _get_fernet()
    try:
        return f.decrypt(encrypted.encode()).decode()
    except InvalidToken:
        raise ValueError("Invalid encrypted password (wrong ENCRYPTION_KEY?)")
