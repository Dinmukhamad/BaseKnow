from datetime import UTC, datetime, timedelta
from hashlib import sha256
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def create_token(subject: str, token_type: str, expires_delta: timedelta, extra: dict | None = None) -> tuple[str, datetime, str]:
    settings = get_settings()
    expires_at = datetime.now(UTC) + expires_delta
    jti = str(uuid4())
    payload = {"sub": subject, "type": token_type, "exp": expires_at, "iat": datetime.now(UTC), "jti": jti}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm), expires_at, jti


def decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
