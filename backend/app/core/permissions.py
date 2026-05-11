from fastapi import HTTPException, status

from app.core.enums import Permission, ROLE_PERMISSIONS, UserRole
from app.models.user import User


def user_permissions(role: UserRole | str) -> set[Permission]:
    return ROLE_PERMISSIONS[UserRole(role)]


def ensure_permissions(user: User, required: set[Permission]) -> None:
    granted = user_permissions(user.role)
    if not required.issubset(granted):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def ensure_roles(user: User, roles: set[UserRole]) -> None:
    if UserRole(user.role) not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role is not allowed")
