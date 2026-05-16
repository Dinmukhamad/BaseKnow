from sqlalchemy import select

from app.core.config import get_settings
from app.core.enums import UserRole
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.kb import KBArticle, KBDirection, KBTopic
from app.models.user import User


def run() -> None:
    settings = get_settings()
    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.username == settings.seed_admin_username))
        if not admin:
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
        else:
            admin.password_hash = hash_password(settings.seed_admin_password)
            admin.is_active = True
            print(f"Admin credentials reset: {settings.seed_admin_username} / {settings.seed_admin_password}")

        supervisor = db.scalar(select(User).where(User.username == "supervisor"))
        if not supervisor:
            supervisor = User(
                email="supervisor@example.com",
                username="supervisor",
                full_name="Supervisor Demo",
                password_hash=hash_password("Supervisor123!"),
                role=UserRole.SUPERVISOR,
                is_active=True,
            )
            db.add(supervisor)

        operator = db.scalar(select(User).where(User.username == "operator"))
        if not operator:
            operator = User(
                email="operator@example.com",
                username="operator",
                full_name="Operator Demo",
                password_hash=hash_password("Operator123!"),
                role=UserRole.OPERATOR,
                is_active=True,
            )
            db.add(operator)

        direction = db.scalar(select(KBDirection).where(KBDirection.name == "Customer Support"))
        if not direction:
            direction = KBDirection(name="Customer Support", description="Common contact-center procedures")
            db.add(direction)
            db.flush()

        topic = db.scalar(select(KBTopic).where(KBTopic.name == "Authentication").where(KBTopic.direction_id == direction.id))
        if not topic:
            topic = KBTopic(name="Authentication", description="Login and access questions", direction_id=direction.id)
            db.add(topic)
            db.flush()

        article = db.scalar(select(KBArticle).where(KBArticle.title == "Password reset procedure"))
        if not article:
            db.add(
                KBArticle(
                    title="Password reset procedure",
                    content="# Password reset\n\n1. Verify customer identity.\n2. Open CRM profile.\n3. Send reset link to verified email.",
                    direction_id=direction.id,
                    topic_id=topic.id,
                    author_id=admin.id,
                    links=[],
                    is_actual=True,
                )
            )

        db.commit()
        print("Seed completed")
    finally:
        db.close()


if __name__ == "__main__":
    run()
