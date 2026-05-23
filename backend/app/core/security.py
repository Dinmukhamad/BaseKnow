from datetime import UTC, datetime, timedelta
from hashlib import sha256
from uuid import uuid4

import bcrypt
import jwt

from app.core.config import get_settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))


def hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def create_token(subject: str, token_type: str, expires_delta: timedelta, extra: dict | None = None) -> tuple[str, datetime, str]:
    settings = get_settings()
    now = datetime.now(UTC)
    expires_at = now + expires_delta
    jti = str(uuid4())
    payload = {"sub": subject, "type": token_type, "exp": expires_at, "iat": now, "jti": jti}
    if extra:
        payload.update(extra)
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, expires_at, jti


def decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            # Pin the algorithm — never trust the `alg` header on input,
            # or you open the door to "alg: none" / HS256-vs-RS256 confusion.
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.PyJWTError as exc:
        raise ValueError("Invalid token") from exc
