from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_audit_context, get_db, require_permissions
from app.core.enums import ActionType, EntityType, Permission
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.audit import AuditContext, AuditService
from app.services.user import UserService

router = APIRouter()


@router.get("", dependencies=[Depends(require_permissions(Permission.USERS_MANAGE))])
def list_users(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    query: str | None = None,
):
    from sqlalchemy import or_, select
    from app.models.user import User as UserModel
    from app.schemas.common import PaginatedResponse
    stmt = select(UserModel).order_by(UserModel.created_at.desc())
    if query:
        stmt = stmt.where(or_(UserModel.full_name.ilike(f"%{query}%"), UserModel.email.ilike(f"%{query}%"), UserModel.username.ilike(f"%{query}%")))
    from app.repositories.base import BaseRepository
    from sqlalchemy import func
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    items = list(db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all())
    return PaginatedResponse[UserRead].create(items, total, page, page_size)


@router.get("/{user_id}", response_model=UserRead, dependencies=[Depends(require_permissions(Permission.USERS_MANAGE))])
def get_user(user_id: str, db: Session = Depends(get_db)):
    return UserService(db).get_user(user_id)


@router.post("", response_model=UserRead, dependencies=[Depends(require_permissions(Permission.USERS_MANAGE))])
def create_user(
    payload: UserCreate,
    current_user: CurrentUser,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    user = UserService(db).create_user(payload)
    AuditService(db).log(
        action=ActionType.CREATE,
        entity_type=EntityType.USER,
        entity_id=user.id,
        after_data={"email": user.email, "username": user.username, "role": user.role.value},
        context=context,
        description="User created by administrator",
    )
    db.commit()
    return user


@router.patch("/{user_id}", response_model=UserRead, dependencies=[Depends(require_permissions(Permission.USERS_MANAGE))])
def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: CurrentUser,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    svc = UserService(db)
    existing = svc.get_user(user_id)
    before = {"email": existing.email, "full_name": existing.full_name, "role": existing.role.value, "is_active": existing.is_active}
    user = svc.update_user(user_id, payload)
    AuditService(db).log(
        action=ActionType.UPDATE,
        entity_type=EntityType.USER,
        entity_id=user.id,
        before_data=before,
        after_data={"email": user.email, "full_name": user.full_name, "role": user.role.value, "is_active": user.is_active},
        context=context,
        description="User updated by administrator",
    )
    db.commit()
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permissions(Permission.USERS_MANAGE))])
def delete_user(
    user_id: str,
    current_user: CurrentUser,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    svc = UserService(db)
    user = svc.get_user(user_id)
    before = {"email": user.email, "username": user.username, "role": user.role.value}
    svc.delete_user(user_id, current_user.id)
    AuditService(db).log(
        action=ActionType.DELETE,
        entity_type=EntityType.USER,
        entity_id=user_id,
        before_data=before,
        context=context,
        description="User deleted by administrator",
    )
    db.commit()
