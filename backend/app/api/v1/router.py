from fastapi import APIRouter

from app.api.v1.endpoints import audit, auth, kb, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(kb.router, prefix="/kb", tags=["Knowledge Base"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit"])
