from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.enums import ActionType, EntityType
from app.core.security import create_token, decode_token, hash_token, verify_password
from app.models.user import User
from app.repositories.token import RefreshTokenRepository
from app.repositories.user import UserRepository
from app.schemas.auth import TokenResponse
from app.services.audit import AuditContext, AuditService


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.users = UserRepository(db)
        self.refresh_tokens = RefreshTokenRepository(db)
        self.audit = AuditService(db)

    def authenticate(self, username: str, password: str, context: AuditContext) -> TokenResponse:
        user = self.users.get_by_username(username)
        if not user or not verify_password(password, user.password_hash) or not user.is_active:
            self.audit.log(action=ActionType.LOGIN_FAILED, entity_type=EntityType.AUTH, context=context, description=f"Failed login for {username}")
            self.db.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

        user.last_login_at = datetime.now(UTC)
        tokens = self._issue_tokens(user, context)
        self.audit.log(action=ActionType.LOGIN, entity_type=EntityType.AUTH, entity_id=user.id, context=context, description="User logged in")
        self.db.commit()
        return tokens

    def refresh(self, refresh_token: str, context: AuditContext) -> TokenResponse:
        payload = self._decode_refresh(refresh_token)
        stored = self.refresh_tokens.get_active_by_hash(hash_token(refresh_token))
        if not stored or stored.user_id != payload["sub"]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        self.refresh_tokens.revoke(stored)
        user = self.users.get(stored.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
        tokens = self._issue_tokens(user, context)
        self.audit.log(action=ActionType.TOKEN_REFRESH, entity_type=EntityType.AUTH, entity_id=user.id, context=context, description="Refresh token rotated")
        self.db.commit()
        return tokens

    def logout(self, refresh_token: str | None, user: User, context: AuditContext) -> None:
        if refresh_token:
            stored = self.refresh_tokens.get_active_by_hash(hash_token(refresh_token))
            if stored:
                self.refresh_tokens.revoke(stored)
        self.audit.log(action=ActionType.LOGOUT, entity_type=EntityType.AUTH, entity_id=user.id, context=context, description="User logged out")
        self.db.commit()

    def _issue_tokens(self, user: User, context: AuditContext) -> TokenResponse:
        access, access_expires_at, _ = create_token(
            user.id,
            "access",
            timedelta(minutes=self.settings.access_token_expire_minutes),
            {"role": user.role.value},
        )
        refresh, refresh_expires_at, jti = create_token(user.id, "refresh", timedelta(days=self.settings.refresh_token_expire_days))
        self.refresh_tokens.create(
            {
                "user_id": user.id,
                "token_hash": hash_token(refresh),
                "jti": jti,
                "expires_at": refresh_expires_at,
                "ip_address": context.ip_address,
                "user_agent": context.user_agent,
            }
        )
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            expires_in=int((access_expires_at - datetime.now(UTC)).total_seconds()),
        )

    @staticmethod
    def _decode_refresh(token: str) -> dict:
        try:
            payload = decode_token(token)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        return payload
