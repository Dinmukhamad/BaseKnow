from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
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

# Compress responses > 1KB — reduces payload size by ~70% for JSON
app.add_middleware(GZipMiddleware, minimum_size=1000)

_origins = [str(o) for o in settings.cors_origins]
_allow_credentials = "*" not in _origins  # credentials не работают с wildcard

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://.*\.vercel\.app" if "*" in _origins else None,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestContextMiddleware)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok"}
