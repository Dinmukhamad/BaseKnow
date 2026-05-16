"""
Cloudflare R2 storage service (S3-compatible).
"""

import logging
import uuid
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, status

from app.core.config import get_settings

logger = logging.getLogger(__name__)

ALLOWED_MIME_PREFIXES = (
    "image/",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.",
    "text/plain",
)

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


def _is_allowed_mime(content_type: str) -> bool:
    return any(content_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES)


class R2StorageService:
    """Thin wrapper around boto3 for Cloudflare R2."""

    def __init__(self) -> None:
        settings = get_settings()
        endpoint = f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
        self._bucket = settings.r2_bucket_name
        self._public_url = settings.r2_public_url.rstrip("/")

    def upload(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        """Upload bytes to R2 and return the object key (storage_path).

        Raises:
            HTTPException 400 — invalid MIME type or file too large
            HTTPException 503 — R2 unreachable
        """
        if not _is_allowed_mime(content_type):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{content_type}' is not allowed.",
            )

        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File exceeds the 25 MB size limit.",
            )

        ext = Path(filename).suffix  # e.g. ".pdf"
        object_key = f"uploads/{uuid.uuid4().hex}{ext}"

        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=object_key,
                Body=file_bytes,
                ContentType=content_type,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.error("R2 upload failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="File storage is temporarily unavailable. Please try again later.",
            ) from exc

        return object_key

    def get_url(self, storage_path: str) -> str:
        """Return the public URL for an object key."""
        return f"{self._public_url}/{storage_path}"

    def delete(self, storage_path: str) -> None:
        """Delete an object from R2. Errors are logged but not re-raised."""
        try:
            self._client.delete_object(Bucket=self._bucket, Key=storage_path)
        except (BotoCoreError, ClientError) as exc:
            logger.error("R2 delete failed for key '%s': %s", storage_path, exc)
