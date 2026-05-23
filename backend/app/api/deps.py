from typing import Annotated, Callable

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.enums import Permission, UserRole
from app.core.permissions import ensure_permissions, ensure_roles
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user import UserRepository
from app.services.audit import AuditContext

bearer_scheme = HTTPBearer(auto_error=False)
DBSession = Annotated[Session, Depends(get_db)]


def _get_client_ip(request: Request, x_forwarded_for: str | None) -> str | None:
    """Return the real client IP, honouring X-Forwarded-For only when the
    direct connection comes from a configured trusted proxy.

    Without this check any client can forge X-Forwarded-For and spoof their IP
    in audit logs and rate-limit counters.
    """
    direct_ip = request.client.host if request.client else None
    settings = get_settings()

    if x_forwarded_for and direct_ip and direct_ip in settings.trusted_proxies:
        # Take the *first* (leftmost) IP — that's the original client.
        return x_forwarded_for.split(",")[0].strip() or direct_ip

    # Untrusted connection: ignore the header entirely.
    return direct_ip


def get_audit_context(
    request: Request,
    x_forwarded_for: str | None = Header(default=None),
) -> AuditContext:
    client_ip = _get_client_ip(request, x_forwarded_for)
    user_id = getattr(request.state, "user_id", None)
    return AuditContext(
        user_id=user_id,
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent"),
    )


def get_current_user(
    request: Request,
    db: DBSession,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    user = UserRepository(db).get(payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    request.state.user_id = user.id
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_permissions(*permissions: Permission) -> Callable[[CurrentUser], User]:
    def dependency(user: CurrentUser) -> User:
        ensure_permissions(user, set(permissions))
        return user

    return dependency


def require_roles(*roles: UserRole) -> Callable[[CurrentUser], User]:
    def dependency(user: CurrentUser) -> User:
        ensure_roles(user, set(roles))
        return user

    return dependency
