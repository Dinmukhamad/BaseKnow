from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import UserRole
from app.schemas.common import ORMModel


class UserRead(ORMModel):
    id: str
    email: EmailStr
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None = None


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=64)
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.OPERATOR


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: UserRole | None = None
    is_active: bool | None = None
