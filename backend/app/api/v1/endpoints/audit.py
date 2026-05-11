from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permissions
from app.core.enums import ActionType, EntityType, Permission
from app.repositories.audit import AuditLogRepository
from app.schemas.audit import AuditLogRead
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("/logs", response_model=PaginatedResponse[AuditLogRead], dependencies=[Depends(require_permissions(Permission.AUDIT_READ))])
def list_logs(
    db: Session = Depends(get_db),
    user_id: str | None = None,
    action: ActionType | None = None,
    entity_type: EntityType | None = None,
    entity_id: str | None = None,
    query: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    repo = AuditLogRepository(db)
    items, total = repo.list(
        page=page,
        page_size=page_size,
        statement=repo.build_query(user_id=user_id, action=action, entity_type=entity_type, entity_id=entity_id, query=query),
    )
    return PaginatedResponse[AuditLogRead].create(items, total, page, page_size)
