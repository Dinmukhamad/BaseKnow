from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import joinedload

from app.models.kb import KBArticle, KBAttachment, KBDirection, KBTopic
from app.repositories.base import BaseRepository


class KBDirectionRepository(BaseRepository[KBDirection]):
    model = KBDirection

    def find(self, *, is_active: bool | None = None) -> list[KBDirection]:
        stmt = select(KBDirection).order_by(KBDirection.name)
        if is_active is not None:
            stmt = stmt.where(KBDirection.is_active == is_active)
        return list(self.db.scalars(stmt).all())


class KBTopicRepository(BaseRepository[KBTopic]):
    model = KBTopic

    def find(self, *, direction_id: str | None = None, is_active: bool | None = None) -> list[KBTopic]:
        stmt = select(KBTopic).order_by(KBTopic.name)
        if direction_id:
            stmt = stmt.where(KBTopic.direction_id == direction_id)
        if is_active is not None:
            stmt = stmt.where(KBTopic.is_active == is_active)
        return list(self.db.scalars(stmt).all())


class KBArticleRepository(BaseRepository[KBArticle]):
    model = KBArticle

    def count_by_direction(self, direction_id: str) -> int:
        return self.db.scalar(select(func.count()).where(KBArticle.direction_id == direction_id)) or 0

    def count_by_topic(self, topic_id: str) -> int:
        return self.db.scalar(select(func.count()).where(KBArticle.topic_id == topic_id)) or 0

    def build_search_query(
        self,
        *,
        query: str | None = None,
        direction_id: str | None = None,
        topic_id: str | None = None,
        is_actual: bool | None = None,
    ) -> Select:
        stmt = select(KBArticle).options(joinedload(KBArticle.attachments)).order_by(KBArticle.updated_at.desc())
        if direction_id:
            stmt = stmt.where(KBArticle.direction_id == direction_id)
        if topic_id:
            stmt = stmt.where(KBArticle.topic_id == topic_id)
        if is_actual is not None:
            stmt = stmt.where(KBArticle.is_actual == is_actual)
        if query:
            ts_vector = func.to_tsvector("russian", func.concat(KBArticle.title, " ", KBArticle.content))
            ts_query = func.plainto_tsquery("russian", query)
            stmt = stmt.where(or_(ts_vector.op("@@")(ts_query), KBArticle.title.ilike(f"%{query}%")))
        return stmt

    def get_with_details(self, article_id: str) -> KBArticle | None:
        return self.db.scalar(select(KBArticle).options(joinedload(KBArticle.attachments)).where(KBArticle.id == article_id))


class KBAttachmentRepository(BaseRepository[KBAttachment]):
    model = KBAttachment
