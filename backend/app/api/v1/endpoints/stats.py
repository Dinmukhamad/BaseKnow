from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permissions
from app.core.enums import ActionType, EntityType, Permission
from app.models.audit import AuditLog
from app.models.kb import KBArticle
from app.models.user import User

router = APIRouter()


@router.get("", dependencies=[Depends(require_permissions(Permission.STATS_READ))])
def get_stats(db: Session = Depends(get_db)):
    now = datetime.now(UTC)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_articles = db.scalar(select(func.count()).select_from(KBArticle)) or 0
    actual_articles = db.scalar(select(func.count()).select_from(KBArticle).where(KBArticle.is_actual == True)) or 0
    total_users = db.scalar(select(func.count()).select_from(User).where(User.is_active == True)) or 0

    def count_views(since: datetime) -> int:
        return db.scalar(
            select(func.count()).select_from(AuditLog).where(
                AuditLog.action == ActionType.KB_ARTICLE_OPEN,
                AuditLog.created_at >= since,
            )
        ) or 0

    def count_searches(since: datetime) -> int:
        return db.scalar(
            select(func.count()).select_from(AuditLog).where(
                AuditLog.action == ActionType.SEARCH,
                AuditLog.created_at >= since,
            )
        ) or 0

    # Top 5 articles by views this month
    top_articles = db.execute(
        select(AuditLog.entity_id, func.count().label("views"))
        .where(AuditLog.action == ActionType.KB_ARTICLE_OPEN, AuditLog.entity_id.isnot(None), AuditLog.created_at >= month_ago)
        .group_by(AuditLog.entity_id)
        .order_by(func.count().desc())
        .limit(5)
    ).all()

    top_article_ids = [row.entity_id for row in top_articles]
    articles_map = {}
    if top_article_ids:
        articles_map = {
            str(a.id): a.title
            for a in db.scalars(select(KBArticle).where(KBArticle.id.in_(top_article_ids)))
        }

    return {
        "articles": {"total": total_articles, "actual": actual_articles, "outdated": total_articles - actual_articles},
        "users": {"total": total_users},
        "views": {
            "today": count_views(today),
            "week": count_views(week_ago),
            "month": count_views(month_ago),
        },
        "searches": {
            "today": count_searches(today),
            "week": count_searches(week_ago),
            "month": count_searches(month_ago),
        },
        "top_articles": [
            {"id": row.entity_id, "title": articles_map.get(str(row.entity_id), "—"), "views": row.views}
            for row in top_articles
        ],
    }
