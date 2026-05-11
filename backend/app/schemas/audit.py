from datetime import datetime

from app.core.enums import ActionType, EntityType
from app.schemas.common import ORMModel


class AuditLogRead(ORMModel):
    id: str
    user_id: str | None = None
    action: ActionType
    entity_type: EntityType | None = None
    entity_id: str | None = None
    before_data: dict | None = None
    after_data: dict | None = None
    changed_fields: list[str] | None = None
    description: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime
