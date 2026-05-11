from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_audit_context, get_db
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.schemas.user import UserRead
from app.services.audit import AuditContext
from app.services.auth import AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse, summary="Login and issue JWT tokens")
def login(payload: LoginRequest, context: AuditContext = Depends(get_audit_context), db: Session = Depends(get_db)):
    return AuthService(db).authenticate(payload.username, payload.password, context)


@router.post("/refresh", response_model=TokenResponse, summary="Rotate refresh token")
def refresh(payload: RefreshRequest, context: AuditContext = Depends(get_audit_context), db: Session = Depends(get_db)):
    return AuthService(db).refresh(payload.refresh_token, context)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Logout and revoke refresh token")
def logout(
    current_user: CurrentUser,
    payload: RefreshRequest | None = None,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    AuthService(db).logout(payload.refresh_token if payload else None, current_user, context)


@router.get("/me", response_model=UserRead, summary="Current authenticated user")
def me(current_user: CurrentUser):
    return current_user
