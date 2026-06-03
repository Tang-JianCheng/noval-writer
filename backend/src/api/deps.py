from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..config import settings
from ..llm.adapters import create_llm_client
from ..llm.base import LLMClient


async def get_llm_client() -> LLMClient:
    kwargs = {}
    if settings.llm_provider != "mock":
        kwargs["api_key"] = settings.deepseek_api_key
    return create_llm_client(
        provider=settings.llm_provider,
        **kwargs,
    )
