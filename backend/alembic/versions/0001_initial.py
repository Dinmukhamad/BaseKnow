"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    user_role = postgresql.ENUM("OPERATOR", "SUPERVISOR", "ADMIN", name="user_role", create_type=False)
    action_type = postgresql.ENUM(
        "LOGIN",
        "LOGOUT",
        "LOGIN_FAILED",
        "TOKEN_REFRESH",
        "CREATE",
        "UPDATE",
        "DELETE",
        "VIEW",
        "STATUS_CHANGE",
        "ROLE_CHANGE",
        "KB_ARTICLE_OPEN",
        "APPEAL_RETURN",
        "FILE_UPLOAD",
        "FILE_DOWNLOAD",
        "SEARCH",
        name="action_type",
        create_type=False,
    )
    entity_type = postgresql.ENUM("USER", "KB_ARTICLE", "KB_DIRECTION", "KB_TOPIC", "APPEAL", "AUDIT_LOG", "AUTH", name="entity_type", create_type=False)
    
    user_role.create(op.get_bind(), checkfirst=True)
    action_type.create(op.get_bind(), checkfirst=True)
    entity_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "kb_directions",
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kb_directions_name", "kb_directions", ["name"], unique=True)

    op.create_table(
        "refresh_tokens",
        sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("jti", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_refresh_tokens_jti", "refresh_tokens", ["jti"], unique=True)
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])

    op.create_table(
        "kb_topics",
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("direction_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["direction_id"], ["kb_directions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kb_topics_direction_id", "kb_topics", ["direction_id"])
    op.create_index("ix_kb_topics_name", "kb_topics", ["name"])
    op.create_unique_constraint("uq_kb_topics_direction_name", "kb_topics", ["direction_id", "name"])

    op.create_table(
        "kb_articles",
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("direction_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("topic_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("author_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("is_actual", sa.Boolean(), nullable=False),
        sa.Column("links", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["direction_id"], ["kb_directions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["topic_id"], ["kb_topics.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kb_articles_author_id", "kb_articles", ["author_id"])
    op.create_index("ix_kb_articles_direction_id", "kb_articles", ["direction_id"])
    op.create_index("ix_kb_articles_is_actual", "kb_articles", ["is_actual"])
    op.create_index("ix_kb_articles_title", "kb_articles", ["title"])
    op.create_index("ix_kb_articles_topic_id", "kb_articles", ["topic_id"])
    op.create_index(
        "ix_kb_articles_fulltext",
        "kb_articles",
        [sa.text("to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(content, ''))")],
        postgresql_using="gin",
    )

    op.create_table(
        "kb_attachments",
        sa.Column("article_id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("storage_path", sa.String(length=512), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("mime_type", sa.String(length=160), nullable=True),
        sa.Column("uploaded_by_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["article_id"], ["kb_articles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kb_attachments_article_id", "kb_attachments", ["article_id"])

    op.create_table(
        "audit_logs",
        sa.Column("user_id", postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column("action", action_type, nullable=False),
        sa.Column("entity_type", entity_type, nullable=True),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("before_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("after_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("changed_fields", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=False), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])
    op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("kb_attachments")
    op.drop_index("ix_kb_articles_fulltext", table_name="kb_articles")
    op.drop_table("kb_articles")
    op.drop_table("kb_topics")
    op.drop_table("refresh_tokens")
    op.drop_table("kb_directions")
    op.drop_table("users")
    postgresql.ENUM(name="entity_type").drop(op.get_bind())
    postgresql.ENUM(name="action_type").drop(op.get_bind())
    postgresql.ENUM(name="user_role").drop(op.get_bind())
