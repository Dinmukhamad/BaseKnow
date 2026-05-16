from typing import Any, Generic, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


class BaseRepository(Generic[ModelT]):
    model: type[ModelT]

    def __init__(self, db: Session):
        self.db = db

    def get(self, entity_id: str) -> ModelT | None:
        return self.db.get(self.model, entity_id)

    def list(self, *, page: int = 1, page_size: int = 20, statement: Select | None = None) -> tuple[list[ModelT], int]:
        stmt = statement if statement is not None else select(self.model)
        total = self.db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
        result = self.db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).unique()
        return list(result.scalars().all()), total

    def create(self, data: dict[str, Any]) -> ModelT:
        entity = self.model(**data)
        self.db.add(entity)
        self.db.flush()
        return entity

    def update(self, entity: ModelT, data: dict[str, Any]) -> ModelT:
        for key, value in data.items():
            setattr(entity, key, value)
        self.db.flush()
        return entity

    def delete(self, entity: ModelT) -> None:
        self.db.delete(entity)
        self.db.flush()
