from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_audit_context, get_db
from app.core.enums import ActionType, EntityType
from app.core.security import hash_password, verify_password
from app.schemas.user import UserRead
from app.services.audit import AuditContext, AuditService
from pydantic import BaseModel, EmailStr, Field

router = APIRouter()


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    current_password: str | None = None
    new_password: str | None = Field(default=None, min_length=8, max_length=128)


@router.get("", response_model=UserRead)
def get_profile(current_user: CurrentUser):
    return current_user


@router.patch("", response_model=UserRead)
def update_profile(
    payload: ProfileUpdate,
    current_user: CurrentUser,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password required to set a new one")
        if not verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    before = {"email": current_user.email, "full_name": current_user.full_name}
    if payload.full_name:
        current_user.full_name = payload.full_name
    if payload.email:
        current_user.email = payload.email
    if payload.new_password:
        current_user.password_hash = hash_password(payload.new_password)

    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    AuditService(db).log(
        action=ActionType.UPDATE,
        entity_type=EntityType.USER,
        entity_id=current_user.id,
        before_data=before,
        after_data={"email": current_user.email, "full_name": current_user.full_name},
        context=AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent),
        description="Profile updated",
    )
    db.commit()
    db.refresh(current_user)
    return current_user
