from datetime import UTC, datetime

from sqlalchemy import select

from app.models.token import RefreshToken
from app.repositories.base import BaseRepository


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    model = RefreshToken

    def get_active_by_hash(self, token_hash: str) -> RefreshToken | None:
        return self.db.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == token_hash,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > datetime.now(UTC),
            )
        )

    def revoke(self, token: RefreshToken) -> RefreshToken:
        token.revoked_at = datetime.now(UTC)
        self.db.flush()
        return token
