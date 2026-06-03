# NovalWriter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-agent novel writing web app — Dispatcher coordinates 6 module agents to build outlines, Writing Agent generates chapter-by-chapter content with layered context management.

**Architecture:** Python FastAPI backend with self-built Dispatcher (state machine + pipeline). 6 agents: Information → Theme → Character → Plot → Setting → Narrative, plus Writing Agent. PostgreSQL + file storage. React + TypeScript frontend with "Writer's Study" dark theme. TDD throughout.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy (async), PostgreSQL, Pydantic, pytest + pytest-asyncio, React 18, TypeScript, Tailwind CSS, Vitest, Playwright

---

## File Structure

```
noval-writer/
├── backend/
│   ├── src/
│   │   ├── main.py, config.py, database.py
│   │   ├── llm/          — base.py, adapters.py, mock.py
│   │   ├── agents/       — base.py, prompts.py, information.py, theme.py,
│   │   │                   character.py, plot.py, setting.py, narrative.py, writing.py
│   │   ├── dispatcher/   — state_machine.py, context_assembler.py, orchestrator.py
│   │   ├── models/       — project.py, character.py, plot_node.py, scene.py,
│   │   │                   chapter.py, information_entry.py, modification_log.py
│   │   ├── api/          — router.py, projects.py, outline.py, agents.py,
│   │   │                   chapters.py, export.py, websocket.py
│   │   ├── services/     — project_service.py, outline_service.py, chapter_service.py,
│   │   │                   supplement_service.py, summary_service.py
│   │   └── utils/        — token_counter.py, output_parser.py
│   └── tests/
│       ├── conftest.py
│       ├── unit/         — test_state_machine.py, test_context_assembler.py,
│       │                   test_summary_service.py, test_token_counter.py,
│       │                   test_output_parser.py, test_prompts.py, test_models.py
│       ├── integration/  — test_agent_pipeline.py, test_api_*.py, test_modification_cascade.py
│       └── e2e/          — test_user_journey.py
├── frontend/
│   ├── src/
│   │   ├── App.tsx, main.tsx
│   │   ├── pages/        — Dashboard.tsx, OutlineStudio.tsx, ChapterWriting.tsx
│   │   ├── components/   — Topbar.tsx, ProjectCard.tsx, PlotTree.tsx, ModuleTabs.tsx,
│   │   │                   CharacterCard.tsx, ContextPanel.tsx, WritingArea.tsx,
│   │   │                   StatusPanel.tsx, Toast.tsx, Modal.tsx
│   │   ├── hooks/        — useWebSocket.ts, useApi.ts
│   │   └── types/        — index.ts
│   └── tests/            — Dashboard.test.tsx, OutlineStudio.test.tsx, ChapterWriting.test.tsx
├── .gitignore
└── docs/superpowers/     — specs/ + plans/
```

---

## Phase 0: Project Scaffold

### Task 0.1: Backend project setup

**Files:**
- Create: `backend/requirements.txt`, `backend/pytest.ini`
- Create: `backend/src/__init__.py`, `backend/src/config.py`, `backend/src/database.py`, `backend/src/main.py`

- [ ] **Step 1: Write requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.35
asyncpg==0.29.0
alembic==1.13.0
pydantic==2.9.0
pydantic-settings==2.5.0
httpx==0.27.0
python-jose[cryptography]==3.3.0
websockets==12.0
pytest==8.3.0
pytest-asyncio==0.24.0
pytest-cov==5.0.0
aiosqlite==0.20.0
```

- [ ] **Step 2: Write pytest.ini**

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
pythonpath = src
addopts = -v --tb=short
```

- [ ] **Step 3: Write config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/novalwriter"
    secret_key: str = "dev-secret-key"
    llm_provider: str = "mock"
    deepseek_api_key: str = ""
    qwen_api_key: str = ""
    chapter_storage_path: str = "./projects"

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 4: Write database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

- [ ] **Step 5: Write minimal main.py**

```python
from fastapi import FastAPI

app = FastAPI(title="NovalWriter", version="0.1.0")

@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Install and verify**

Run: `cd backend && pip install -r requirements.txt`
Run: `cd backend && python -c "from src.main import app; print(app.title)"`
Expected: `NovalWriter`

- [ ] **Step 7: Commit**

```bash
git checkout -b phase/00-scaffold
git add backend/
git commit -m "feat(scaffold): backend project setup — FastAPI + SQLAlchemy + pytest"
git checkout main && git merge phase/00-scaffold
```

### Task 0.2: Frontend scaffold

**Files:**
- Create: `frontend/` via Vite + React + TypeScript
- Modify: `frontend/src/App.tsx`, `frontend/src/styles/globals.css`

- [ ] **Step 1: Scaffold**

Run: `cd frontend && npm create vite@latest . -- --template react-ts`
Run: `cd frontend && npm install && npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom`

- [ ] **Step 2: Configure globals.css**

```css
@import "tailwindcss";

:root {
  --bg-deep: #12100e; --bg-base: #1a1714; --bg-surface: #221e1a;
  --text-primary: #e4dcc8; --text-secondary: #b8ae9a; --text-muted: #6b6358;
  --accent: #d4a853; --success: #7a8b6e; --warning: #d4943a; --danger: #b85c5c;
  --font-display: 'Playfair Display', serif;
  --font-body: 'Crimson Pro', serif;
}
body { background: var(--bg-deep); color: var(--text-primary); font-family: var(--font-body); }
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npm run dev`
Expected: Dev server starts

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat(scaffold): frontend — React + Vite + Tailwind + Writer's Study theme"
git checkout main && git merge phase/00-scaffold
```

---

## Phase 1: LLM Abstraction + Output Parser

### Task 1.1: LLMClient interface + MockLLM

**Files:**
- Create: `backend/src/llm/__init__.py`, `backend/src/llm/base.py`, `backend/src/llm/mock.py`
- Create: `backend/tests/conftest.py`, `backend/tests/unit/test_llm_abstraction.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/unit/test_llm_abstraction.py`:

```python
import pytest
from src.llm.base import LLMClient, LLMResponse
from src.llm.mock import MockLLM

def test_llm_client_is_abstract():
    with pytest.raises(TypeError):
        LLMClient()

def test_mock_llm_returns_configured_response():
    mock = MockLLM(default_response="预定义响应")
    response = await mock.chat("提示词")
    assert response.content == "预定义响应"

def test_mock_llm_sequence():
    mock = MockLLM(responses=["第1", "第2", "第3"])
    r1 = await mock.chat("a"); r2 = await mock.chat("b"); r3 = await mock.chat("c")
    assert r1.content == "第1"; assert r2.content == "第2"; assert r3.content == "第3"

def test_mock_llm_records_calls():
    mock = MockLLM(default_response="x")
    await mock.chat("A"); await mock.chat("B")
    assert mock.calls == ["A", "B"]
```

- [ ] **Step 2: Run → FAIL**

Run: `cd backend && pytest tests/unit/test_llm_abstraction.py -v`
Expected: FAIL (ModuleNotFoundError)

- [ ] **Step 3: Implement base.py + mock.py**

Create `backend/src/llm/base.py`:

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class LLMResponse:
    content: str
    model: str = ""
    tokens_used: int = 0

class LLMClient(ABC):
    @abstractmethod
    async def chat(self, prompt: str, system_prompt: str = "") -> LLMResponse: ...
```

Create `backend/src/llm/mock.py`:

```python
from .base import LLMClient, LLMResponse

class MockLLM(LLMClient):
    def __init__(self, default_response: str = "", responses: list[str] | None = None):
        self.default_response = default_response
        self._responses = responses or []
        self._index = 0
        self.calls: list[str] = []

    async def chat(self, prompt: str, system_prompt: str = "") -> LLMResponse:
        self.calls.append(prompt)
        content = self._responses[self._index] if self._index < len(self._responses) else self.default_response
        self._index += 1
        return LLMResponse(content=content, model="mock", tokens_used=len(content))
```

- [ ] **Step 4: Run → PASS**

Run: `cd backend && pytest tests/unit/test_llm_abstraction.py -v`
Expected: 4 PASSED

- [ ] **Step 5: Commit**

```bash
git checkout -b phase/01-llm-abstraction
git add backend/src/llm/ backend/tests/
git commit -m "feat(llm): add LLMClient interface + MockLLM with sequence and recording"
```

### Task 1.2: LLM adapters

**Files:**
- Create: `backend/src/llm/adapters.py`, `backend/tests/unit/test_llm_adapters.py`

- [ ] **Step 1: Write test**

Create `backend/tests/unit/test_llm_adapters.py`:

```python
from unittest.mock import AsyncMock, patch
from src.llm.adapters import DeepSeekAdapter, QwenAdapter, create_llm_client
from src.llm.mock import MockLLM

def test_create_llm_client_mock():
    client = create_llm_client(provider="mock")
    assert isinstance(client, MockLLM)

def test_create_llm_client_deepseek():
    client = create_llm_client(provider="deepseek", api_key="sk-test")
    assert isinstance(client, DeepSeekAdapter)

def test_deepseek_adapter_formats_request():
    with patch('httpx.AsyncClient.post') as mock_post:
        mock_response = AsyncMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "DS响应"}}],
            "model": "deepseek-chat", "usage": {"total_tokens": 10}
        }
        mock_response.raise_for_status = AsyncMock()
        mock_post.return_value = mock_response
        adapter = DeepSeekAdapter(api_key="test")
        assert adapter.model_name == "deepseek-chat"
```

- [ ] **Step 2: Implement adapters.py**

```python
import httpx
from .base import LLMClient, LLMResponse
from .mock import MockLLM

class DeepSeekAdapter(LLMClient):
    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com/v1"):
        self.api_key = api_key; self.base_url = base_url
        self.model_name = "deepseek-chat"

    async def chat(self, prompt: str, system_prompt: str = "") -> LLMResponse:
        messages = []
        if system_prompt: messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model_name, "messages": messages}
            )
            resp.raise_for_status()
            data = resp.json()
        choice = data["choices"][0]["message"]
        return LLMResponse(content=choice["content"], model=data.get("model", self.model_name),
                          tokens_used=data.get("usage", {}).get("total_tokens", 0))

class QwenAdapter(LLMClient):
    def __init__(self, api_key: str, base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"):
        self.api_key = api_key; self.base_url = base_url
        self.model_name = "qwen-plus"

    async def chat(self, prompt: str, system_prompt: str = "") -> LLMResponse:
        messages = []
        if system_prompt: messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model_name, "messages": messages}
            )
            resp.raise_for_status()
            data = resp.json()
        choice = data["choices"][0]["message"]
        return LLMResponse(content=choice["content"], model=data.get("model", self.model_name),
                          tokens_used=data.get("usage", {}).get("total_tokens", 0))

def create_llm_client(provider: str = "deepseek", **kwargs) -> LLMClient:
    if provider == "mock": return MockLLM(**kwargs)
    elif provider == "deepseek": return DeepSeekAdapter(api_key=kwargs.get("api_key", ""))
    elif provider == "qwen": return QwenAdapter(api_key=kwargs.get("api_key", ""))
    raise ValueError(f"Unknown provider: {provider}")
```

- [ ] **Step 3: Run → PASS, Commit**

Run: `cd backend && pytest tests/unit/test_llm_adapters.py -v`
Expected: 3 PASSED

```bash
git add backend/src/llm/adapters.py backend/tests/unit/test_llm_adapters.py
git commit -m "feat(llm): add DeepSeek + Qwen adapters with factory function"
```

### Task 1.3: Output parser

**Files:**
- Create: `backend/src/utils/__init__.py`, `backend/src/utils/output_parser.py`
- Create: `backend/tests/unit/test_output_parser.py`

- [ ] **Step 1: Write test**

```python
import pytest
from src.utils.output_parser import parse_json, extract_section, OutputParseError

def test_parse_valid_json():
    assert parse_json('{"name":"林风"}') == {"name":"林风"}

def test_fix_trailing_comma():
    assert parse_json('{"name":"林风",}') == {"name":"林风"}

def test_fix_unclosed_bracket():
    assert parse_json('{"items":["剑","丹炉"') == {"items":["剑","丹炉"]}

def test_extract_from_markdown_block():
    assert parse_json('```json\n{"k":"v"}\n```') == {"k":"v"}

def test_unfixable_raises():
    with pytest.raises(OutputParseError):
        parse_json('{{{bad')

def test_extract_section():
    text = "[CHARACTERS]\n林风\n[PLOT]\n大比"
    assert "林风" in extract_section(text, "CHARACTERS", "PLOT")
    assert "大比" in extract_section(text, "PLOT", None)
```

- [ ] **Step 2: Implement output_parser.py**

```python
import json, re

class OutputParseError(Exception): pass

def parse_json(text: str) -> dict | list:
    text = text.strip()
    md = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if md: text = md.group(1).strip()
    try: return json.loads(text)
    except json.JSONDecodeError: pass
    repaired = re.sub(r',\s*([}\]])', r'\1', text)
    try: return json.loads(repaired)
    except json.JSONDecodeError: pass
    open_b = repaired.count('{') - repaired.count('}'); open_a = repaired.count('[') - repaired.count(']')
    repaired += '}' * open_b + ']' * open_a
    try: return json.loads(repaired)
    except json.JSONDecodeError: raise OutputParseError(f"Cannot parse: {text[:200]}")

def extract_section(text: str, start_marker: str, end_marker: str | None) -> str:
    pattern = re.escape(f"[{start_marker}]")
    m = re.search(pattern, text)
    if not m: return ""
    start = m.end()
    if end_marker:
        end_p = re.escape(f"[{end_marker}]")
        end_m = re.search(end_p, text[start:])
        return text[start:start + end_m.start()].strip() if end_m else text[start:].strip()
    return text[start:].strip()
```

- [ ] **Step 3: Run → PASS, Commit**

Run: `cd backend && pytest tests/unit/test_output_parser.py -v`
Expected: 6 PASSED

```bash
git add backend/src/utils/ backend/tests/unit/test_output_parser.py
git commit -m "feat(utils): add JSON parser with repair + section extractor"
git checkout main && git merge phase/01-llm-abstraction
git tag v0.1.0
```

---

## Phase 2: Data Models

### Task 2.1: All SQLAlchemy models

**Files:**
- Create: `backend/src/models/__init__.py`, `project.py`, `character.py`, `plot_node.py`, `scene.py`, `chapter.py`, `information_entry.py`, `modification_log.py`
- Create: `backend/tests/unit/test_models.py`

- [ ] **Step 1: Write test**

```python
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from src.database import Base
from src.models import Project, ProjectStatus, Character, CharacterRole, PlotNode, PlotNodeStatus, Chapter, ChapterStatus

@pytest.fixture
async def db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)
    s = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with s() as session: yield session
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
```

- [ ] **Step 2: Implement all models**

Create `backend/src/models/project.py`:

```python
import enum, uuid
from datetime import datetime
from sqlalchemy import String, Text, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

class ProjectStatus(str, enum.Enum):
    IDLE="idle"; BUILDING_OUTLINE="building_outline"; AWAITING_OUTLINE_CONFIRM="awaiting_outline_confirm"
    WRITING_CHAPTER="writing_chapter"; AWAITING_CHAPTER_CONFIRM="awaiting_chapter_confirm"
    SUPPLEMENTING="supplementing"; COMPLETED="completed"; ERROR="error"

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus), default=ProjectStatus.IDLE)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
```

Create remaining models similarly: `character.py`, `plot_node.py`, `scene.py`, `chapter.py`, `information_entry.py`, `modification_log.py` — each following the spec's data model table. `backend/src/models/__init__.py` re-exports all.

- [ ] **Step 3: Run → PASS, Commit**

Run: `cd backend && pytest tests/unit/test_models.py -v`
Expected: 3 PASSED

```bash
git checkout -b phase/02-data-model
git add backend/src/models/ backend/tests/unit/test_models.py
git commit -m "feat(models): add all 8 SQLAlchemy tables with enums"
git checkout main && git merge phase/02-data-model && git tag v0.2.0
```

---

## Phase 3: Dispatcher — State Machine + Context Assembler

### Task 3.1: State machine

**Files:**
- Create: `backend/src/dispatcher/__init__.py`, `backend/src/dispatcher/state_machine.py`
- Create: `backend/tests/unit/test_state_machine.py`

Test: 11 cases covering all 9 states + transitions + error paths.
Implementation: `DispatcherState` enum, `TRANSITIONS` dict, `StateMachine` class with `transition()`, `force_state()`, `can_transition()`, `InvalidTransitionError`.

Commit: `feat(dispatcher): add state machine with 9 states and transition validation`

### Task 3.2: Token counter

**Files:**
- Create: `backend/src/utils/token_counter.py`, `backend/tests/unit/test_token_counter.py`

Estimate: Chinese chars ≈ 1 token, English ≈ chars/4.

Commit: `feat(utils): add token estimator for Chinese+English mixed text`

### Task 3.3: Context assembler

**Files:**
- Create: `backend/src/dispatcher/context_assembler.py`, `backend/tests/unit/test_context_assembler.py`

Assembles prompt with 8 sections: [SYSTEM], [BACKGROUND], [CHARACTERS], [PLOT], [SCENES], [CONTEXT], [RECENT], [INSTRUCTION]. Token budget check at 80% max, trim order: warm → hot → character cards.

Commit: `feat(dispatcher): add context assembler with token budget and trim`

Merge: `git checkout main && git merge phase/03-dispatcher && git tag v0.3.0`

---

## Phase 4: Agent Prompts + Implementations

### Task 4.1: Base agent + Prompt templates

**Files:**
- Create: `backend/src/agents/__init__.py`, `backend/src/agents/base.py`, `backend/src/agents/prompts.py`
- Create: `backend/tests/unit/test_prompts.py`

`BaseAgent` abstract class with `async run(input_data: dict) -> dict`. `prompts.py` contains all 7 prompt templates (Information, Theme, Character, Plot, Setting, Narrative, Writing) — each with JSON output format instructions.

Commit: `feat(agents): add BaseAgent + 7 prompt templates with JSON output format`

### Task 4.2-4.7: Individual agent implementations

Each agent follows the same TDD pattern:

1. **Write test** — Create `backend/tests/unit/test_agent_<name>.py` with mock LLM, verify the agent formats its prompt correctly and parses the response
2. **Implement** — Agent class extends `BaseAgent`, injects prompt template, calls LLM, parses JSON output
3. **Run → PASS → Commit**

| Task | Agent | Commit Message |
|------|-------|---------------|
| 4.2 | InformationAgent | `feat(agents): add InformationAgent with 7-category search` |
| 4.3 | ThemeAgent | `feat(agents): add ThemeAgent with statement+keywords output` |
| 4.4 | CharacterAgent | `feat(agents): add CharacterAgent with card+state+relationships` |
| 4.5 | PlotAgent | `feat(agents): add PlotAgent with tree-structured nodes` |
| 4.6 | SettingAgent | `feat(agents): add SettingAgent with world overview+scene cards` |
| 4.7 | NarrativeAgent | `feat(agents): add NarrativeAgent with pov+tense+rhythm` |

### Task 4.8: Orchestrator (pipeline runner)

**Files:**
- Create: `backend/src/dispatcher/orchestrator.py`
- Create: `backend/tests/integration/test_agent_pipeline.py`

The orchestrator runs the 6-agent serial pipeline for outline building and coordinates writing + supplement cycles. Uses the state machine for flow control.

Integration test: with MockLLM, run full pipeline:
```python
async def test_full_outline_pipeline():
    """6 agents run in order, each receiving previous output."""
    orchestrator = OutlineOrchestrator(llm_client=MockLLM(...), state_machine=StateMachine())
    result = await orchestrator.build_outline(user_requirements="明代科举修仙小说")
    assert "theme" in result; assert "characters" in result; assert "plot_nodes" in result
```

Commit: `feat(dispatcher): add orchestrator for outline pipeline + writing cycle`

Merge: `git checkout main && git merge phase/04-module-agents && git tag v0.4.0`

---

## Phase 5: REST API + WebSocket

### Task 5.1: Project endpoints

**Files:** `backend/src/api/__init__.py`, `backend/src/api/router.py`, `backend/src/api/projects.py`, `backend/src/services/project_service.py`

Test: `backend/tests/integration/test_api_projects.py`

Endpoints: `POST /api/projects`, `GET /api/projects`, `GET /api/projects/{id}`, `DELETE /api/projects/{id}`

### Task 5.2: Outline endpoints

**Files:** `backend/src/api/outline.py`, `backend/src/services/outline_service.py`

Test: `backend/tests/integration/test_api_outline.py`

Endpoints: `POST /build` (triggers orchestrator), `GET /outline` (returns all module data), `POST /confirm`

### Task 5.3: Agent data endpoints

**Files:** `backend/src/api/agents.py`

CRUD for characters, plot-nodes, scenes, theme, narrative, information-entries. Each `PUT` triggers modification tracking.

### Task 5.4: Chapter endpoints

**Files:** `backend/src/api/chapters.py`, `backend/src/services/chapter_service.py`

Test: `backend/tests/integration/test_api_chapters.py`

Endpoints: `POST /chapters/next` (triggers writing), `POST /{num}/confirm`, `POST /{num}/retry`, `PUT /{num}`

### Task 5.5: WebSocket handler

**Files:** `backend/src/api/websocket.py`

Events: `state_change`, `agent_progress`, `outline_ready`, `chapter_generated`, `supplement_done`, `modification_impact`, `error`

### Task 5.6: Export endpoint

**Files:** `backend/src/api/export.py`

`GET /export/txt` — concatenates all chapters into a single file.

Merge: `git checkout main && git merge phase/05-api && git tag v0.5.0`

---

## Phase 6: Writing Agent + Summary + Supplement

### Task 6.1: Writing Agent

**Files:** `backend/src/agents/writing.py`, `backend/tests/unit/test_writing_agent.py`

Integrates with context assembler. Output: chapter text + JSON summary.

### Task 6.2: Summary service

**Files:** `backend/src/services/summary_service.py`, `backend/tests/unit/test_summary_service.py`

Generates chapter summaries, aggregates every 10 chapters into compressed summaries.

### Task 6.3: Supplement service

**Files:** `backend/src/services/supplement_service.py`, `backend/tests/integration/test_supplement.py`

Runs 5 module agents in parallel after chapter confirmation (Information Agent excluded). Updates character states, plot progress, scene details, narrative checks.

Merge: `git checkout main && git merge phase/06-writing && git tag v0.6.0`

---

## Phase 7: Modification Cascade

### Task 7.1: Modification detection

**Files:** `backend/src/services/modification_service.py`, `backend/tests/integration/test_modification_cascade.py`

Detects changes to agent data → analyzes affected chapters → creates ModificationLog entries.

### Task 7.2: User resolution

API: `GET /api/projects/{id}/modifications` + `POST /resolve` — user selects: rewrite affected, ignore, future only.

Merge: `git checkout main && git merge phase/07-modification && git tag v0.7.0`

---

## Phase 8: Frontend Pages

### Task 8.1: Types + API hooks

**Files:** `frontend/src/types/index.ts`, `frontend/src/hooks/useApi.ts`, `frontend/src/hooks/useWebSocket.ts`

### Task 8.2: Shared components

**Files:** `Topbar.tsx`, `Toast.tsx`, `Modal.tsx`, `ProjectCard.tsx`

### Task 8.3: Dashboard page

**Files:** `frontend/src/pages/Dashboard.tsx`, `frontend/tests/Dashboard.test.tsx`

### Task 8.4: Outline Studio page

**Files:** `frontend/src/pages/OutlineStudio.tsx`, `ModuleTabs.tsx`, `PlotTree.tsx`, `CharacterCard.tsx`

Test: renders 6 tabs, tab switching, plot tree expand/collapse, character card display, OOC warning.

### Task 8.5: Chapter Writing page

**Files:** `frontend/src/pages/ChapterWriting.tsx`, `ContextPanel.tsx`, `WritingArea.tsx`, `StatusPanel.tsx`

Test: three-column layout, panel toggle, streaming text display, confirm/retry/edit buttons.

### Task 8.6: E2E tests (Playwright)

**Files:** `frontend/e2e/test_user_journey.spec.ts`

Full flow: create project → build outline → confirm → write chapter → confirm → export.

Merge: `git checkout main && git merge phase/08-frontend && git tag v1.0.0`

---

## Final: Push to GitHub

```bash
git push origin main --tags
```

---

## Phase Summary

| Phase | Content | Tasks | Tag |
|-------|---------|-------|-----|
| 0 | Project scaffold | 2 | — |
| 1 | LLM abstraction + output parser | 3 | `v0.1.0` |
| 2 | Data models (8 tables) | 1 | `v0.2.0` |
| 3 | State machine + context assembler | 3 | `v0.3.0` |
| 4 | 7 Agent prompts + implementations + orchestrator | 8 | `v0.4.0` |
| 5 | REST API + WebSocket (6 task groups) | 6 | `v0.5.0` |
| 6 | Writing Agent + summary + supplement | 3 | `v0.6.0` |
| 7 | Modification cascade | 2 | `v0.7.0` |
| 8 | Frontend (3 pages + E2E) | 6 | `v1.0.0` |

**Total: ~34 tasks, 8 milestones, TDD throughout**
