from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.limiter import limiter
from app.middleware.audit import RequestContextMiddleware

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.debug,
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting (see app.core.limiter for storage backend).
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Compress responses > 1KB — reduces payload size by ~70% for JSON
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS: explicit allow-list only. Set CORS_ORIGINS in env to your frontend
# origin(s), e.g. CORS_ORIGINS=["https://baseknow.example.com"].
# For Vercel preview deployments add each preview URL explicitly to env,
# or expose a configurable allow_origin_regex via a separate setting — DO NOT
# wildcard `*.vercel.app`: anyone can deploy there.
_origins = [str(o).rstrip("/") for o in settings.cors_origins]
_is_wildcard = "*" in _origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _is_wildcard else _origins,
    allow_credentials=False if _is_wildcard else True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    max_age=600,
)
app.add_middleware(RequestContextMiddleware)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok"}
