"""Application-wide rate limiter.

Uses slowapi (FastAPI wrapper around `limits`). The default backend is
in-memory, which means counters are NOT shared across processes / serverless
invocations. For multi-instance or serverless deployments configure a Redis
storage backend via the LIMITER_STORAGE_URI environment variable, e.g.::

    LIMITER_STORAGE_URI=redis://default:<password>@<host>:6379/0

In-memory mode is still useful even on Vercel — it slows down brute force on
any single warm Lambda instance — but it is not a complete defence on its own.
"""
import os

from slowapi import Limiter
from slowapi.util import get_remote_address

_storage_uri = os.environ.get("LIMITER_STORAGE_URI", "memory://")

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
    # Don't 500 if a backend (e.g. Redis) blips — fail open rather than locking everyone out.
    swallow_errors=True,
)
