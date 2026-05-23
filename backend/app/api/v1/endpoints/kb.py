from fastapi import APIRouter, Body, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, get_audit_context, get_db, require_permissions
from app.core.enums import ActionType, EntityType, Permission
from app.core.limiter import limiter
from app.repositories.kb import KBDirectionRepository, KBTopicRepository
from app.schemas.common import PaginatedResponse
from app.schemas.kb import (
    KBArticleCreate,
    KBArticleListItem,
    KBArticleRead,
    KBArticleUpdate,
    KBAttachmentRead,
    KBDirectionCreate,
    KBDirectionRead,
    KBDirectionUpdate,
    KBTopicCreate,
    KBTopicRead,
    KBTopicUpdate,
)
from app.services.audit import AuditContext, AuditService
from app.services.kb import KBService

router = APIRouter()


@router.get("/articles", response_model=PaginatedResponse[KBArticleListItem], dependencies=[Depends(require_permissions(Permission.KB_SEARCH))])
@limiter.limit("60/minute")
def list_articles(
    request,
    response: Response,
    current_user: CurrentUser,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
    query: str | None = None,
    direction_id: str | None = None,
    topic_id: str | None = None,
    is_actual: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    # Cache list for 30s — short enough to stay fresh, long enough to help on repeated navigations
    if not query:
        response.headers["Cache-Control"] = "private, max-age=30"
    items, total = KBService(db).list_articles(query=query, direction_id=direction_id, topic_id=topic_id, is_actual=is_actual, page=page, page_size=page_size)
    if query:
        context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
        AuditService(db).log(action=ActionType.SEARCH, entity_type=EntityType.KB_ARTICLE, context=context, description=query)
        db.commit()
    return PaginatedResponse[KBArticleListItem].create(items, total, page, page_size)


@router.post("/articles", response_model=KBArticleRead, dependencies=[Depends(require_permissions(Permission.KB_MANAGE))])
def create_article(
    payload: KBArticleCreate,
    current_user: CurrentUser,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    return KBService(db).create_article(payload, current_user, context)


# ── Bulk routes MUST be declared before /{article_id} to avoid path conflicts ──

@router.post("/articles/bulk-delete", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permissions(Permission.KB_MANAGE))])
def bulk_delete_articles(
    current_user: CurrentUser,
    ids: list[str] = Body(..., embed=True),
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    from app.repositories.kb import KBArticleRepository
    repo = KBArticleRepository(db)
    audit = AuditService(db)
    ctx = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    for article_id in ids:
        article = repo.get(article_id)
        if article:
            audit.log(action=ActionType.DELETE, entity_type=EntityType.KB_ARTICLE, entity_id=article_id, context=ctx, description="Bulk delete")
            repo.delete(article)
    db.commit()


@router.post("/articles/bulk-outdated", dependencies=[Depends(require_permissions(Permission.KB_MANAGE))])
def bulk_mark_outdated(
    current_user: CurrentUser,
    ids: list[str] = Body(..., embed=True),
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    from app.repositories.kb import KBArticleRepository
    repo = KBArticleRepository(db)
    audit = AuditService(db)
    ctx = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    updated = 0
    for article_id in ids:
        article = repo.get(article_id)
        if article and article.is_actual:
            repo.update(article, {"is_actual": False})
            audit.log(action=ActionType.UPDATE, entity_type=EntityType.KB_ARTICLE, entity_id=article_id, context=ctx, description="Bulk mark outdated")
            updated += 1
    db.commit()
    return {"updated": updated}


# ── Per-article routes ──

@router.get("/articles/{article_id}", response_model=KBArticleRead, dependencies=[Depends(require_permissions(Permission.KB_READ))])
def get_article(
    article_id: str,
    response: Response,
    current_user: CurrentUser,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, max-age=60"
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    return KBService(db).get_article(article_id, context)


@router.patch("/articles/{article_id}", response_model=KBArticleRead, dependencies=[Depends(require_permissions(Permission.KB_MANAGE))])
def update_article(
    article_id: str,
    payload: KBArticleUpdate,
    current_user: CurrentUser,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    return KBService(db).update_article(article_id, payload, context)


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permissions(Permission.KB_MANAGE))])
def delete_article(
    article_id: str,
    current_user: CurrentUser,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    KBService(db).delete_article(article_id, context)


@router.post("/articles/{article_id}/attachments", response_model=KBAttachmentRead, dependencies=[Depends(require_permissions(Permission.KB_MANAGE))])
@limiter.limit("20/minute")
async def upload_attachment(
    request,
    article_id: str,
    current_user: CurrentUser,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    return await KBService(db).upload_attachment(article_id, file, current_user, context)


@router.delete("/articles/{article_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permissions(Permission.KB_MANAGE))])
def delete_attachment(
    article_id: str,
    attachment_id: str,
    current_user: CurrentUser,
    context: AuditContext = Depends(get_audit_context),
    db: Session = Depends(get_db),
):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    KBService(db).delete_attachment(article_id, attachment_id, context)


# ── Directions ──

@router.get("/directions", response_model=list[KBDirectionRead], dependencies=[Depends(require_permissions(Permission.KB_READ))])
def list_directions(response: Response, db: Session = Depends(get_db), is_active: bool | None = None):
    response.headers["Cache-Control"] = "private, max-age=300"  # 5 min — directions rarely change
    return KBDirectionRepository(db).find(is_active=is_active)


@router.post("/directions", response_model=KBDirectionRead, dependencies=[Depends(require_permissions(Permission.DICTIONARIES_MANAGE))])
def create_direction(payload: KBDirectionCreate, current_user: CurrentUser, context: AuditContext = Depends(get_audit_context), db: Session = Depends(get_db)):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    return KBService(db).create_direction(payload, context)


@router.patch("/directions/{direction_id}", response_model=KBDirectionRead, dependencies=[Depends(require_permissions(Permission.DICTIONARIES_MANAGE))])
def update_direction(direction_id: str, payload: KBDirectionUpdate, current_user: CurrentUser, context: AuditContext = Depends(get_audit_context), db: Session = Depends(get_db)):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    return KBService(db).update_direction(direction_id, payload, context)


@router.delete("/directions/{direction_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permissions(Permission.DICTIONARIES_MANAGE))])
def delete_direction(direction_id: str, current_user: CurrentUser, context: AuditContext = Depends(get_audit_context), db: Session = Depends(get_db)):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    KBService(db).delete_direction(direction_id, context)


# ── Topics ──

@router.get("/topics", response_model=list[KBTopicRead], dependencies=[Depends(require_permissions(Permission.KB_READ))])
def list_topics(response: Response, db: Session = Depends(get_db), direction_id: str | None = None, is_active: bool | None = None):
    response.headers["Cache-Control"] = "private, max-age=300"
    return KBTopicRepository(db).find(direction_id=direction_id, is_active=is_active)


@router.post("/topics", response_model=KBTopicRead, dependencies=[Depends(require_permissions(Permission.DICTIONARIES_MANAGE))])
def create_topic(payload: KBTopicCreate, current_user: CurrentUser, context: AuditContext = Depends(get_audit_context), db: Session = Depends(get_db)):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    return KBService(db).create_topic(payload, context)


@router.patch("/topics/{topic_id}", response_model=KBTopicRead, dependencies=[Depends(require_permissions(Permission.DICTIONARIES_MANAGE))])
def update_topic(topic_id: str, payload: KBTopicUpdate, current_user: CurrentUser, context: AuditContext = Depends(get_audit_context), db: Session = Depends(get_db)):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    return KBService(db).update_topic(topic_id, payload, context)


@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permissions(Permission.DICTIONARIES_MANAGE))])
def delete_topic(topic_id: str, current_user: CurrentUser, context: AuditContext = Depends(get_audit_context), db: Session = Depends(get_db)):
    context = AuditContext(user_id=current_user.id, ip_address=context.ip_address, user_agent=context.user_agent)
    KBService(db).delete_topic(topic_id, context)
