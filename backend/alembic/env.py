from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import get_settings

config = context.config
fileConfig(config.config_file_name)

settings = get_settings()

# Import models only for autogenerate (alembic revision --autogenerate).
if context.config.cmd_opts and getattr(context.config.cmd_opts, "autogenerate", False):
    from app.db.base import Base
    from app import models  # noqa: F401
    target_metadata = Base.metadata
else:
    target_metadata = None


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Use create_engine directly so we can pass connect_args.
    # channel_binding=disable is required for psycopg3 with Vercel Postgres.
    connectable = create_engine(
        settings.database_url,
        poolclass=pool.NullPool,
        connect_args={
            "channel_binding": "disable",
            "connect_timeout": 10,
        },
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
