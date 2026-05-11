from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.common import ORMModel


class KBDirectionRead(ORMModel):
    id: str
    name: str
    description: str | None = None
    is_active: bool
    created_at: datetime


class KBDirectionCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str | None = None
    is_active: bool = True


class KBDirectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = None
    is_active: bool | None = None


class KBTopicRead(ORMModel):
    id: str
    name: str
    description: str | None = None
    direction_id: str
    is_active: bool
    created_at: datetime


class KBTopicCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    direction_id: str
    description: str | None = None
    is_active: bool = True


class KBTopicUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    direction_id: str | None = None
    description: str | None = None
    is_active: bool | None = None


class KBAttachmentRead(ORMModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    mime_type: str | None = None
    created_at: datetime


class KBArticleBase(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    content: str = Field(min_length=1)
    direction_id: str | None = None
    topic_id: str | None = None
    links: list[HttpUrl] | list[str] = Field(default_factory=list)
    is_actual: bool = True


class KBArticleCreate(KBArticleBase):
    pass


class KBArticleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    content: str | None = Field(default=None, min_length=1)
    direction_id: str | None = None
    topic_id: str | None = None
    links: list[HttpUrl] | list[str] | None = None
    is_actual: bool | None = None


class KBArticleListItem(ORMModel):
    id: str
    title: str
    direction_id: str | None = None
    topic_id: str | None = None
    author_id: str | None = None
    is_actual: bool
    created_at: datetime
    updated_at: datetime


class KBArticleRead(KBArticleListItem):
    content: str
    links: list[str]
    attachments: list[KBAttachmentRead] = []
