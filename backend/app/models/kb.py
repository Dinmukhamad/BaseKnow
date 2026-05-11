from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class KBDirection(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "kb_directions"

    name: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    topics = relationship("KBTopic", back_populates="direction", cascade="all, delete-orphan")
    articles = relationship("KBArticle", back_populates="direction")


class KBTopic(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "kb_topics"
    __table_args__ = (UniqueConstraint("direction_id", "name", name="uq_kb_topics_direction_name"),)

    name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    direction_id: Mapped[str] = mapped_column(ForeignKey("kb_directions.id", ondelete="CASCADE"), index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    direction = relationship("KBDirection", back_populates="topics")
    articles = relationship("KBArticle", back_populates="topic")


class KBArticle(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "kb_articles"

    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    direction_id: Mapped[str | None] = mapped_column(ForeignKey("kb_directions.id", ondelete="SET NULL"), index=True, nullable=True)
    topic_id: Mapped[str | None] = mapped_column(ForeignKey("kb_topics.id", ondelete="SET NULL"), index=True, nullable=True)
    author_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    is_actual: Mapped[bool] = mapped_column(Boolean, index=True, nullable=False, default=True)
    links: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)

    direction = relationship("KBDirection", back_populates="articles")
    topic = relationship("KBTopic", back_populates="articles")
    author = relationship("User", back_populates="authored_articles")
    attachments = relationship("KBAttachment", back_populates="article", cascade="all, delete-orphan")


class KBAttachment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "kb_attachments"

    article_id: Mapped[str] = mapped_column(ForeignKey("kb_articles.id", ondelete="CASCADE"), index=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(160), nullable=True)
    uploaded_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    article = relationship("KBArticle", back_populates="attachments")
