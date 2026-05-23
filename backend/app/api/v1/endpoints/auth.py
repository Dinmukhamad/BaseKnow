from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_audit_context, get_db
from app.core.config import get_settings
from app.core.limiter import limiter
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.schemas.user import UserRead
from app.services.audit import AuditContext
from app.services.auth import AuthService

router = APIRouter()

# Cookie name and path constants. Path is scoped narrowly to /auth so the
# cookie is not sent on every API call (only login/refresh/logout will
# actually need it).
REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Attach the refresh token as a HttpOnly cookie to the response.

    Cross-site cookies (frontend on a different origin than the API) require
    SameSite=None and Secure. The browser will only send this cookie back
    when the request is made with credentials: 'include' AND the server's
    CORS config returns Access-Control-Allow-Credentials: true.
    """
    settings = get_settings()
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.refresh_token_expire_days * 86400,
        httponly=True,
        secure=True,
        samesite="none",
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        # Match Secure/SameSite of the original Set-Cookie so the browser
        # actually invalidates it.
        secure=True,
        samesite="none",
        httponly=True,
    )


@router.post("/login", response_model=TokenResponse, summary="Login and issue JWT tokens")
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    tokens, refresh_plain = AuthService(db).authenticate(payload.username, payload.password, context)
    _set_refresh_cookie(response, refresh_plain)
    return tokens


@router.post("/refresh", response_model=TokenResponse, summary="Rotate refresh token")
@limiter.limit("30/minute")
def refresh(
    request: Request,
    response: Response,
    payload: RefreshRequest | None = None,
    refresh_cookie: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    # Prefer cookie (the secure path). Fall back to body for clients that
    # haven't migrated yet.
    token = refresh_cookie or (payload.refresh_token if payload else None)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")
    tokens, refresh_plain = AuthService(db).refresh(token, context)
    _set_refresh_cookie(response, refresh_plain)
    return tokens


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Logout and revoke refresh token")
def logout(
    response: Response,
    current_user: CurrentUser,
    payload: RefreshRequest | None = None,
    refresh_cookie: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    token = refresh_cookie or (payload.refresh_token if payload else None)
    AuthService(db).logout(token, current_user, context)
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserRead, summary="Current authenticated user")
def me(current_user: CurrentUser):
    return current_user
