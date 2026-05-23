from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class RefreshRequest(BaseModel):
    # Optional: the refresh token now travels in an HttpOnly cookie.
    # The body field is kept for backwards compatibility during migration
    # and for clients that cannot use cookies (e.g. server-to-server).
    refresh_token: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    # refresh_token is delivered via HttpOnly cookie and is intentionally
    # absent from the response body. Kept as Optional[str] = None so older
    # clients reading this field don't crash on a missing key.
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int
