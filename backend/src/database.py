from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    pass


_engine = None
_async_session = None


def _get_engine():
    global _engine, _async_session
    if _engine is None:
        _engine = create_async_engine(settings.database_url, echo=False)
        _async_session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    return _engine, _async_session


async def get_db() -> AsyncSession:
    _, sessionmaker = _get_engine()
    async with sessionmaker() as session:
        try:
            yield session
        finally:
            await session.close()
