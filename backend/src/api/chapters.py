import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..config import settings
from ..models.project import Project
from ..models.chapter import Chapter, ChapterStatus
from ..services.project_service import ProjectService
from ..services.chapter_service import ChapterService
from ..dispatcher.context_assembler import ContextAssembler
from ..dispatcher.state_machine import DispatcherState, StateMachine
from ..agents.writing import WritingAgent
from .deps import get_llm_client
from ..llm.base import LLMClient
from .schemas import ChapterResponse, ChapterRetry, ChapterEdit

router = APIRouter(prefix="/api/projects/{project_id}/chapters", tags=["chapters"])


def _outline_path(project_id: str) -> str:
    return f"{settings.chapter_storage_path}/{project_id}/agents/outline.json"


def _chapter_path(project_id: str, chapter_number: int) -> str:
    base = settings.chapter_storage_path
    os.makedirs(f"{base}/{project_id}/chapters", exist_ok=True)
    return f"{base}/{project_id}/chapters/ch_{chapter_number:03d}.md"


def _load_outline(project_id: str) -> dict | None:
    path = _outline_path(project_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_chapter_text(project_id: str, chapter_number: int) -> str:
    path = _chapter_path(project_id, chapter_number)
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _save_chapter(project_id: str, chapter_number: int, content: str) -> None:
    path = _chapter_path(project_id, chapter_number)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def _get_plot_node_for_chapter(outline: dict, chapter_number: int) -> list[dict]:
    """Find plot nodes assigned to this chapter."""
    nodes = outline.get("plot_nodes", {}).get("plot_nodes", [])
    result = []

    def find(ns, cn):
        for n in ns:
            if n.get("chapter_estimate", ""):
                try:
                    parts = n["chapter_estimate"].split("-")
                    lo = int(parts[0])
                    hi = int(parts[-1]) if len(parts) > 1 else lo
                    if lo <= cn <= hi:
                        result.append(n)
                except (ValueError, IndexError):
                    pass
            find(n.get("children", []), cn)

    find(nodes, chapter_number)
    return result


@router.get("", response_model=list[ChapterResponse])
async def list_chapters(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Chapter)
        .where(Chapter.project_id == project_id)
        .order_by(Chapter.chapter_number)
    )
    return list(result.scalars().all())


from pydantic import BaseModel

class GenerateRequest(BaseModel):
    guidance: str = ""


@router.post("/next")
async def generate_next_chapter(
    project_id: str,
    req: GenerateRequest = GenerateRequest(),
    db: AsyncSession = Depends(get_db),
    llm: LLMClient = Depends(get_llm_client),
):
    svc = ProjectService(db)
    project = await svc.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Load outline
    outline = _load_outline(project_id)
    if not outline:
        raise HTTPException(status_code=400, detail="请先构建大纲")

    ch_svc = ChapterService(db)
    next_num = await ch_svc.get_next_chapter_number(project_id)
    chapter = await ch_svc.create_chapter(project_id, next_num, title=f"第{next_num}章",
                                          content_path=_chapter_path(project_id, next_num))

    chapter.status = ChapterStatus.GENERATING
    await db.commit()

    # Build context
    plot_nodes = _get_plot_node_for_chapter(outline, next_num)
    chars = outline.get("characters", {}).get("characters", [])
    scenes = outline.get("setting", {}).get("scenes", [])
    narrative = outline.get("narrative", {})
    background = json.dumps(outline.get("information", {}), ensure_ascii=False)[:500]

    # Hot data: previous 2 chapters
    hot = []
    for offset in range(2, 0, -1):
        prev = next_num - offset
        if prev > 0:
            txt = _load_chapter_text(project_id, prev)
            if txt:
                hot.append(txt[:3000])

    # Warm data: chapter summaries
    result = await db.execute(
        select(Chapter)
        .where(Chapter.project_id == project_id, Chapter.status == ChapterStatus.CONFIRMED)
        .order_by(Chapter.chapter_number.desc()).limit(10)
    )
    warm = [ch.summary for ch in result.scalars().all() if ch.summary]

    assembler = ContextAssembler(max_tokens=32000)
    ctx = assembler.assemble(
        chapter_number=next_num,
        plot_nodes=plot_nodes if plot_nodes else [{"title": project.title, "description": project.description or ""}],
        characters=chars,
        scenes=scenes,
        narrative_rules=narrative,
        hot_chapters=hot,
        warm_summaries=warm,
        background_info=background,
    )

    # Append user guidance if provided
    prompt = ctx.prompt
    if req.guidance.strip():
        prompt += f"\n\n[USER_GUIDANCE]\n用户对本章的具体要求：{req.guidance.strip()}\n请严格遵循以上指导来撰写本章内容。"

    # Call Writing Agent
    agent = WritingAgent(llm)
    result = await agent.run({"assembled_context": prompt})

    # Parse result — content + summary
    raw = result.get("raw", "")
    summary = {}
    if "summary" in result:
        summary = {
            "summary": result.get("summary", ""),
            "plot_progress": result.get("plot_progress", ""),
            "character_changes": result.get("character_changes", ""),
            "key_events": result.get("key_events", []),
            "new_elements": result.get("new_elements", []),
        }

    # Filter out summary JSON or markers from content
    content = raw
    if "SUMMARY_JSON" in content:
        content = content.split("SUMMARY_JSON")[0].strip()
    # Also strip any trailing JSON block
    import re
    content = re.sub(r'\n*\{[^{]*"summary"[^}]*\}\s*$', '', content).strip()

    # Save
    _save_chapter(project_id, next_num, content)
    chapter.status = ChapterStatus.DRAFT
    chapter.word_count = len(content)
    chapter.summary = summary.get("summary", content[:200])
    chapter.content_path = _chapter_path(project_id, next_num)
    await db.commit()

    return {
        "project_id": project_id,
        "chapter_number": next_num,
        "chapter_id": chapter.id,
        "title": chapter.title,
        "content": content,
        "word_count": len(content),
        "summary": summary,
    }


@router.post("/{chapter_number}/confirm")
async def confirm_chapter(project_id: str, chapter_number: int, db: AsyncSession = Depends(get_db)):
    ch_svc = ChapterService(db)
    chapter = await ch_svc.get_chapter(project_id, chapter_number)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    await ch_svc.confirm(chapter)
    return {"project_id": project_id, "chapter_number": chapter_number, "status": chapter.status.value}


@router.post("/{chapter_number}/retry")
async def retry_chapter(
    project_id: str,
    chapter_number: int,
    data: ChapterRetry = None,
    db: AsyncSession = Depends(get_db),
    llm: LLMClient = Depends(get_llm_client),
):
    ch_svc = ChapterService(db)
    chapter = await ch_svc.get_chapter(project_id, chapter_number)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    outline = _load_outline(project_id) or {}
    chars = outline.get("characters", {}).get("characters", [])
    narrative = outline.get("narrative", {})
    guidance = data.guidance if data else ""

    prompt = f"""请重新撰写第{chapter_number}章。
上一版存在问题：{guidance if guidance else "需要改进"}
请参考以下信息：
角色：{json.dumps(chars, ensure_ascii=False)[:1000]}
叙事规则：{json.dumps(narrative, ensure_ascii=False)}
"""

    agent = WritingAgent(llm)
    result = await agent.run({"assembled_context": prompt})

    raw = result.get("raw", "")
    content = raw.split("SUMMARY_JSON")[0].strip() if "SUMMARY_JSON" in raw else raw

    _save_chapter(project_id, chapter_number, content)
    chapter.word_count = len(content)
    chapter.version += 1
    await db.commit()

    return {
        "project_id": project_id,
        "chapter_number": chapter_number,
        "content": content,
        "word_count": len(content),
    }


@router.get("/{chapter_number}")
async def get_chapter(project_id: str, chapter_number: int, db: AsyncSession = Depends(get_db)):
    ch_svc = ChapterService(db)
    chapter = await ch_svc.get_chapter(project_id, chapter_number)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    content = _load_chapter_text(project_id, chapter_number)
    return {
        "project_id": project_id,
        "chapter_number": chapter.chapter_number,
        "chapter_id": chapter.id,
        "title": chapter.title,
        "status": chapter.status.value,
        "content": content,
        "word_count": chapter.word_count,
        "summary": chapter.summary,
        "version": chapter.version,
    }


@router.put("/{chapter_number}")
async def edit_chapter(project_id: str, chapter_number: int, data: ChapterEdit,
                        db: AsyncSession = Depends(get_db)):
    ch_svc = ChapterService(db)
    chapter = await ch_svc.get_chapter(project_id, chapter_number)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    chapter.word_count = len(data.content)
    chapter.version += 1
    _save_chapter(project_id, chapter_number, data.content)
    await db.commit()
    return {"project_id": project_id, "chapter_number": chapter_number, "word_count": len(data.content)}
