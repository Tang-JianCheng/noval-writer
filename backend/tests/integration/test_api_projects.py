import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.main import app
from src.database import Base, get_db
from src.api.deps import get_llm_client
from src.llm.mock import MockLLM

INFO_JSON = '{"时代背景":[{"title":"科举制度","content":"明代科举..."}],"官方描述":[],"野史记载":[],"地理风貌":[],"风俗习惯":[],"传说故事":[],"民间演绎":[]}'
THEME_JSON = '{"statement":"逆境中成长","keywords":["成长"],"tone":"热血","taboos":[]}'
CHAR_JSON = '{"characters":[{"name":"林风","role_type":"protagonist","card":{"appearance":"清秀","personality":"坚韧","motivation":"变强","arc":"成长","speech_style":"少言"},"initial_state":{"location":"新手村","mood":"平静","goal":"修炼"}}],"relationships":[]}'
PLOT_JSON = '{"plot_nodes":[{"title":"觉醒","description":"发现天赋","chapter_estimate":"1-3","importance":"main","sort_order":0,"children":[]}]}'
SETTING_JSON = '{"world_overview":"修真大陆","scenes":[{"name":"青云宗","description":"修仙门派","atmosphere":"庄严","details":{}}]}'
NARR_JSON = '{"pov":"第三人称","tense":"过去时","chapter_template":"开场-冲突-收尾","dialogue_style":"古风","description_density":"中","rhythm_notes":"张弛有度"}'


@pytest.fixture
async def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    mock_llm = MockLLM(responses=[INFO_JSON, THEME_JSON, CHAR_JSON, PLOT_JSON, SETTING_JSON, NARR_JSON])

    async def override_get_llm_client():
        return mock_llm

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_llm_client] = override_get_llm_client

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    await engine.dispose()
    app.dependency_overrides.clear()


async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


async def test_create_project(client):
    resp = await client.post("/api/projects", json={"title": "测试小说"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "测试小说"
    assert data["status"] == "idle"


async def test_list_projects(client):
    await client.post("/api/projects", json={"title": "项目A"})
    await client.post("/api/projects", json={"title": "项目B"})
    resp = await client.get("/api/projects")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_get_project(client):
    r = await client.post("/api/projects", json={"title": "修仙"})
    pid = r.json()["id"]
    resp = await client.get(f"/api/projects/{pid}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "修仙"


async def test_delete_project(client):
    r = await client.post("/api/projects", json={"title": "删除测试"})
    pid = r.json()["id"]
    resp = await client.delete(f"/api/projects/{pid}")
    assert resp.status_code == 204


async def test_build_outline(client):
    r = await client.post("/api/projects", json={"title": "明代修仙小说", "description": "一个炼丹师的修仙故事"})
    pid = r.json()["id"]
    resp = await client.post(f"/api/projects/{pid}/outline/build")
    assert resp.status_code == 200
    data = resp.json()
    assert "outline" in data
    assert "information" in data["outline"]
    assert "theme" in data["outline"]


async def test_create_and_confirm_chapter(client):
    r = await client.post("/api/projects", json={"title": "章节测试"})
    pid = r.json()["id"]
    # Build outline first to enter writing state
    await client.post(f"/api/projects/{pid}/outline/build")
    await client.post(f"/api/projects/{pid}/outline/confirm")

    resp = await client.post(f"/api/projects/{pid}/chapters/next")
    assert resp.status_code == 200
    assert resp.json()["chapter_number"] == 1
