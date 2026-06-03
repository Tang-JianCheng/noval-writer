import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.database import Base
from src.models.project import Project
from src.models.chapter import Chapter, ChapterStatus
from src.services.modification_service import ModificationService


@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


async def test_analyze_impact_marks_confirmed_chapters(db):
    p = Project(title="测试"); db.add(p); await db.flush()
    for i in range(1, 6):
        ch = Chapter(project_id=p.id, chapter_number=i, status=ChapterStatus.CONFIRMED)
        db.add(ch)
    await db.commit()

    svc = ModificationService(db)
    log = await svc.analyze_impact(p.id, "character", "c1", "修改了林风的性格")
    assert len(log.affected_chapters) == 5
    assert log.target_type == "character"


async def test_get_pending_modifications(db):
    p = Project(title="测试"); db.add(p); await db.flush(); await db.commit()
    svc = ModificationService(db)
    await svc.analyze_impact(p.id, "character", "c1", "修改1")
    pending = await svc.get_pending_modifications(p.id)
    assert len(pending) == 1


async def test_resolve_modification(db):
    p = Project(title="测试"); db.add(p); await db.flush(); await db.commit()
    svc = ModificationService(db)
    log = await svc.analyze_impact(p.id, "plot", "n1", "修改2")
    resolved = await svc.resolve(log.id, "ignore")
    assert resolved.resolved_at is not None
    # Verify no longer pending
    pending = await svc.get_pending_modifications(p.id)
    assert len(pending) == 0
