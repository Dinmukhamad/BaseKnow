from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import get_settings


@lru_cache
def _get_engine():
    """Create the SQLAlchemy engine.

    Pool sizing strategy is controlled by ``settings.db_pool_mode``:

    * ``serverless`` (default): use ``NullPool`` — each request opens and
      closes its own connection. This is the correct choice for Vercel /
      AWS Lambda because the process may be frozen or killed between
      invocations; persistent pool connections silently leak in that model.
      Strongly recommended to point ``DATABASE_URL`` at a connection pooler
      (PgBouncer, Neon pooled URL) so the per-request connection is cheap.

    * ``server``: traditional pool tuned for a long-running uvicorn worker.
    """
    settings = get_settings()

    if settings.db_pool_mode == "server":
        return create_engine(
            settings.database_url,
            pool_pre_ping=True,
            future=True,
            pool_size=10,
            max_overflow=20,
            pool_recycle=1800,  # 30 min
            pool_timeout=30,
        )

    # serverless (default)
    return create_engine(
        settings.database_url,
        poolclass=NullPool,
        future=True,
        # pool_pre_ping is irrelevant with NullPool — every connection is fresh.
    )


@lru_cache
def _get_session_factory():
    return sessionmaker(
        bind=_get_engine(),
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        class_=Session,
    )


def get_db() -> Generator[Session, None, None]:
    db = _get_session_factory()()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Legacy alias for seed.py
SessionLocal = _get_session_factory()
