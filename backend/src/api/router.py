from fastapi import APIRouter
from .projects import router as projects_router
from .outline import router as outline_router
from .chapters import router as chapters_router

api_router = APIRouter()
api_router.include_router(projects_router)
api_router.include_router(outline_router)
api_router.include_router(chapters_router)
