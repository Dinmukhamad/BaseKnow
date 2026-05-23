"""Idempotent database seeding.

Behavior:
- In any environment: ensures the admin user exists. Never resets the password
  of an existing admin (avoid clobbering changes made through the UI; avoid
  printing secrets to logs).
- In dev only: also creates supervisor/operator demo accounts and a sample
  KB article. These accounts have well-known passwords and MUST NOT exist
  in production.

This module is safe to run multiple times. It should NOT be wired into the
production container entrypoint — run it explicitly when bootstrapping a new
environment.
"""
import logging

from sqlalchemy import select

from app.core.config import get_settings
from app.core.enums import UserRole
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.kb import KBArticle, KBDirection, KBTopic
from app.models.user import User

logger = logging.getLogger(__name__)


def _ensure_admin(db, settings) -> User:
    """Create the admin user if missing. Never reset its password."""
    admin = db.scalar(select(User).where(User.username == settings.seed_admin_username))
    if admin:
        logger.info("Admin user %r already exists; leaving password untouched.", admin.username)
        return admin

    admin = User(
        email=settings.seed_admin_email,
        username=settings.seed_admin_username,
        full_name="System Administrator",
        password_hash=hash_password(settings.seed_admin_password),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(admin)
    db.flush()
    logger.info("Created admin user %r.", admin.username)
    return admin


def _seed_dev_demo(db, admin: User) -> None:
    """Create demo accounts and sample content. Dev only."""
    if not db.scalar(select(User).where(User.username == "supervisor")):
        db.add(User(
            email="supervisor@example.com",
            username="supervisor",
            full_name="Supervisor Demo",
            password_hash=hash_password("Supervisor123!"),
            role=UserRole.SUPERVISOR,
            is_active=True,
        ))

    if not db.scalar(select(User).where(User.username == "operator")):
        db.add(User(
            email="operator@example.com",
            username="operator",
            full_name="Operator Demo",
            password_hash=hash_password("Operator123!"),
            role=UserRole.OPERATOR,
            is_active=True,
        ))

    direction = db.scalar(select(KBDirection).where(KBDirection.name == "Customer Support"))
    if not direction:
        direction = KBDirection(name="Customer Support", description="Common contact-center procedures")
        db.add(direction)
        db.flush()

    topic = db.scalar(
        select(KBTopic)
        .where(KBTopic.name == "Authentication")
        .where(KBTopic.direction_id == direction.id)
    )
    if not topic:
        topic = KBTopic(name="Authentication", description="Login and access questions", direction_id=direction.id)
        db.add(topic)
        db.flush()

    if not db.scalar(select(KBArticle).where(KBArticle.title == "Password reset procedure")):
        db.add(KBArticle(
            title="Password reset procedure",
            content="# Password reset\n\n1. Verify customer identity.\n2. Open CRM profile.\n3. Send reset link to verified email.",
            direction_id=direction.id,
            topic_id=topic.id,
            author_id=admin.id,
            links=[],
            is_actual=True,
        ))


def run() -> None:
    settings = get_settings()
    db = SessionLocal()
    try:
        admin = _ensure_admin(db, settings)

        if settings.environment == "dev":
            _seed_dev_demo(db, admin)
        else:
            logger.info("Environment is %r; skipping demo accounts.", settings.environment)

        db.commit()
        logger.info("Seed completed.")
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    run()
