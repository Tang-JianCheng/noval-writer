import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.database import Base
from src.models import Project, ProjectStatus, Character, CharacterRole, PlotNode, PlotNodeStatus, Chapter, ChapterStatus, InformationEntry, ModificationLog

@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    s = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with s() as session:
        yield session
    await engine.dispose()

async def test_create_project(db):
    p = Project(title="修仙从炼丹开始"); db.add(p); await db.commit()
    assert p.id and p.status == ProjectStatus.IDLE

async def test_character_linked_to_project(db):
    p = Project(title="t"); db.add(p); await db.flush()
    c = Character(project_id=p.id, name="林风", role_type=CharacterRole.PROTAGONIST,
                  card={"personality":"坚韧"}, current_state={"location":"青云宗"})
    db.add(c); await db.commit()
    assert c.project_id == p.id

async def test_plot_node_tree(db):
    p = Project(title="t"); db.add(p); await db.flush()
    root = PlotNode(project_id=p.id, title="卷一", sort_order=0); db.add(root); await db.flush()
    child = PlotNode(project_id=p.id, title="第1章", parent_id=root.id, sort_order=1); db.add(child)
    await db.commit()
    assert child.parent_id == root.id

async def test_chapter_with_content_path(db):
    p = Project(title="t"); db.add(p); await db.flush()
    ch = Chapter(project_id=p.id, chapter_number=1, title="觉醒",
                 content_path="projects/1/ch_001.md", word_count=4200)
    db.add(ch); await db.commit()
    assert ch.status == ChapterStatus.DRAFT

async def test_information_entry(db):
    p = Project(title="t"); db.add(p); await db.flush()
    ie = InformationEntry(project_id=p.id, category="时代背景", title="明代科举",
                          content="科举制度是...", keywords=["科举","明代"])
    db.add(ie); await db.commit()
    assert ie.category == "时代背景"

async def test_modification_log(db):
    p = Project(title="t"); db.add(p); await db.flush()
    ml = ModificationLog(project_id=p.id, target_type="character", target_id="c1",
                         change_description="修改了林风的性格", affected_chapters=[3,5,7])
    db.add(ml); await db.commit()
    assert ml.affected_chapters == [3,5,7]
