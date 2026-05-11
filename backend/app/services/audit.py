from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.core.enums import ActionType, EntityType
from app.models.audit import AuditLog
from app.repositories.audit import AuditLogRepository


@dataclass(frozen=True)
class AuditContext:
    user_id: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None


class AuditService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = AuditLogRepository(db)

    def log(
        self,
        *,
        action: ActionType,
        context: AuditContext,
        entity_type: EntityType | None = None,
        entity_id: str | None = None,
        before_data: dict[str, Any] | None = None,
        after_data: dict[str, Any] | None = None,
        description: str | None = None,
    ) -> AuditLog:
        changed_fields = self._changed_fields(before_data, after_data)
        return self.repo.create(
            {
                "user_id": context.user_id,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "before_data": before_data,
                "after_data": after_data,
                "changed_fields": changed_fields,
                "description": description,
                "ip_address": context.ip_address,
                "user_agent": context.user_agent,
            }
        )

    @staticmethod
    def _changed_fields(before: dict[str, Any] | None, after: dict[str, Any] | None) -> list[str] | None:
        if before is None or after is None:
            return None
        keys = set(before) | set(after)
        changed = sorted(key for key in keys if before.get(key) != after.get(key))
        return changed or None


class AuditPublisher:
    def publish(self, log: AuditLog) -> None:
        # Extension point for Celery/Kafka/event bus without changing services.
        return None
