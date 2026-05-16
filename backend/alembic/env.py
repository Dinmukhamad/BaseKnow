from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings

config = context.config
fileConfig(config.config_file_name)
config.set_main_option("sqlalchemy.url", get_settings().database_url)

# Import models only for autogenerate (alembic revision --autogenerate).
# For upgrade/downgrade they are NOT needed and cause SQLAlchemy to fire
# before_create hooks that try to CREATE TYPE even when create_type=False
# is not set, leading to DuplicateObject errors on re-runs.
if context.config.cmd_opts and getattr(context.config.cmd_opts, "autogenerate", False):
    from app.db.base import Base
    from app import models  # noqa: F401
    target_metadata = Base.metadata
else:
    target_metadata = None


def run_migrations_offline() -> None:
    context.configure(
        url=get_settings().database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        run_migrations_online()
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
