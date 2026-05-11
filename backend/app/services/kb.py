from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.enums import ActionType, EntityType
from app.models.kb import KBArticle, KBAttachment, KBDirection, KBTopic
from app.models.user import User
from app.repositories.kb import KBAttachmentRepository, KBArticleRepository, KBDirectionRepository, KBTopicRepository
from app.schemas.kb import KBArticleCreate, KBArticleUpdate, KBDirectionCreate, KBDirectionUpdate, KBTopicCreate, KBTopicUpdate
from app.services.audit import AuditContext, AuditService


def serialize_article(article: KBArticle) -> dict:
    return {
        "id": article.id,
        "title": article.title,
        "content": article.content,
        "direction_id": article.direction_id,
        "topic_id": article.topic_id,
        "author_id": article.author_id,
        "links": article.links,
        "is_actual": article.is_actual,
    }


class KBService:
    def __init__(self, db: Session):
        self.db = db
        self.articles = KBArticleRepository(db)
        self.directions = KBDirectionRepository(db)
        self.topics = KBTopicRepository(db)
        self.attachments = KBAttachmentRepository(db)
        self.audit = AuditService(db)
        self.settings = get_settings()

    def list_articles(self, *, query: str | None, direction_id: str | None, topic_id: str | None, is_actual: bool | None, page: int, page_size: int):
        stmt = self.articles.build_search_query(query=query, direction_id=direction_id, topic_id=topic_id, is_actual=is_actual)
        return self.articles.list(page=page, page_size=page_size, statement=stmt)

    def get_article(self, article_id: str, context: AuditContext) -> KBArticle:
        article = self.articles.get_with_details(article_id)
        if not article:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
        self.audit.log(
            action=ActionType.KB_ARTICLE_OPEN,
            entity_type=EntityType.KB_ARTICLE,
            entity_id=article.id,
            context=context,
            description="Knowledge base article opened",
        )
        self.db.commit()
        return article

    def create_article(self, payload: KBArticleCreate, author: User, context: AuditContext) -> KBArticle:
        data = payload.model_dump()
        data["links"] = [str(link) for link in data.get("links", [])]
        data["author_id"] = author.id
        article = self.articles.create(data)
        self.audit.log(
            action=ActionType.CREATE,
            entity_type=EntityType.KB_ARTICLE,
            entity_id=article.id,
            after_data=serialize_article(article),
            context=context,
            description="Knowledge base article created",
        )
        self.db.commit()
        return article

    def update_article(self, article_id: str, payload: KBArticleUpdate, context: AuditContext) -> KBArticle:
        article = self.articles.get_with_details(article_id)
        if not article:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
        before = serialize_article(article)
        data = payload.model_dump(exclude_unset=True)
        if "links" in data and data["links"] is not None:
            data["links"] = [str(link) for link in data["links"]]
        article = self.articles.update(article, data)
        self.audit.log(
            action=ActionType.UPDATE,
            entity_type=EntityType.KB_ARTICLE,
            entity_id=article.id,
            before_data=before,
            after_data=serialize_article(article),
            context=context,
            description="Knowledge base article updated",
        )
        self.db.commit()
        return article

    def delete_article(self, article_id: str, context: AuditContext) -> None:
        article = self.articles.get(article_id)
        if not article:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
        before = serialize_article(article)
        self.articles.delete(article)
        self.audit.log(action=ActionType.DELETE, entity_type=EntityType.KB_ARTICLE, entity_id=article_id, before_data=before, context=context)
        self.db.commit()

    async def upload_attachment(self, article_id: str, file: UploadFile, user: User, context: AuditContext) -> KBAttachment:
        article = self.articles.get(article_id)
        if not article:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
        content = await file.read()
        max_bytes = self.settings.max_upload_size_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File is too large")
        upload_dir = Path(self.settings.upload_dir) / "kb" / article_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        safe_name = f"{uuid4()}_{Path(file.filename or 'file').name}"
        storage_path = upload_dir / safe_name
        storage_path.write_bytes(content)
        attachment = self.attachments.create(
            {
                "article_id": article_id,
                "filename": safe_name,
                "original_filename": file.filename or safe_name,
                "storage_path": str(storage_path),
                "file_size": len(content),
                "mime_type": file.content_type,
                "uploaded_by_id": user.id,
            }
        )
        self.audit.log(action=ActionType.FILE_UPLOAD, entity_type=EntityType.KB_ARTICLE, entity_id=article_id, context=context, description=file.filename)
        self.db.commit()
        return attachment

    def create_direction(self, payload: KBDirectionCreate, context: AuditContext) -> KBDirection:
        direction = self.directions.create(payload.model_dump())
        self.audit.log(action=ActionType.CREATE, entity_type=EntityType.KB_DIRECTION, entity_id=direction.id, after_data=payload.model_dump(), context=context)
        self.db.commit()
        return direction

    def update_direction(self, direction_id: str, payload: KBDirectionUpdate, context: AuditContext) -> KBDirection:
        direction = self.directions.get(direction_id)
        if not direction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Direction not found")
        before = {"name": direction.name, "description": direction.description, "is_active": direction.is_active}
        data = payload.model_dump(exclude_unset=True)
        direction = self.directions.update(direction, data)
        after = {"name": direction.name, "description": direction.description, "is_active": direction.is_active}
        self.audit.log(action=ActionType.UPDATE, entity_type=EntityType.KB_DIRECTION, entity_id=direction.id, before_data=before, after_data=after, context=context)
        self.db.commit()
        return direction

    def create_topic(self, payload: KBTopicCreate, context: AuditContext) -> KBTopic:
        topic = self.topics.create(payload.model_dump())
        self.audit.log(action=ActionType.CREATE, entity_type=EntityType.KB_TOPIC, entity_id=topic.id, after_data=payload.model_dump(), context=context)
        self.db.commit()
        return topic

    def update_topic(self, topic_id: str, payload: KBTopicUpdate, context: AuditContext) -> KBTopic:
        topic = self.topics.get(topic_id)
        if not topic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Topic not found")
        before = {"name": topic.name, "description": topic.description, "direction_id": topic.direction_id, "is_active": topic.is_active}
        data = payload.model_dump(exclude_unset=True)
        topic = self.topics.update(topic, data)
        after = {"name": topic.name, "description": topic.description, "direction_id": topic.direction_id, "is_active": topic.is_active}
        self.audit.log(action=ActionType.UPDATE, entity_type=EntityType.KB_TOPIC, entity_id=topic.id, before_data=before, after_data=after, context=context)
        self.db.commit()
        return topic
