from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UserRepository(db)

    def create_user(self, payload: UserCreate) -> User:
        data = payload.model_dump()
        password = data.pop("password")
        data["password_hash"] = hash_password(password)
        try:
            user = self.repo.create(data)
            return user
        except IntegrityError as exc:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username or email already exists") from exc

    def update_user(self, user_id: str, payload: UserUpdate) -> User:
        user = self.repo.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        data = payload.model_dump(exclude_unset=True)
        if password := data.pop("password", None):
            data["password_hash"] = hash_password(password)
        try:
            user = self.repo.update(user, data)
            return user
        except IntegrityError as exc:
            self.db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists") from exc

    def list_users(self) -> list[User]:
        return self.repo.list_all()
