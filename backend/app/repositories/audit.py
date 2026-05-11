from sqlalchemy import or_, select

from app.core.enums import ActionType, EntityType
from app.models.audit import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    model = AuditLog

    def build_query(
        self,
        *,
        user_id: str | None = None,
        action: ActionType | None = None,
        entity_type: EntityType | None = None,
        entity_id: str | None = None,
        query: str | None = None,
    ):
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
        if user_id:
            stmt = stmt.where(AuditLog.user_id == user_id)
        if action:
            stmt = stmt.where(AuditLog.action == action)
        if entity_type:
            stmt = stmt.where(AuditLog.entity_type == entity_type)
        if entity_id:
            stmt = stmt.where(AuditLog.entity_id == entity_id)
        if query:
            stmt = stmt.where(or_(AuditLog.description.ilike(f"%{query}%"), AuditLog.entity_id.ilike(f"%{query}%")))
        return stmt
