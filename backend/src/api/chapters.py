from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services.project_service import ProjectService
from ..services.chapter_service import ChapterService
from .schemas import ChapterResponse, ChapterRetry, ChapterEdit

router = APIRouter(prefix="/api/projects/{project_id}/chapters", tags=["chapters"])


@router.get("", response_model=list[ChapterResponse])
async def list_chapters(project_id: str, db: AsyncSession = Depends(get_db)):
    svc = ProjectService(db)
    project = await svc.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # Stub - return empty list for now
    return []


@router.post("/next")
async def generate_next_chapter(project_id: str, db: AsyncSession = Depends(get_db)):
    svc = ProjectService(db)
    project = await svc.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ch_svc = ChapterService(db)
    next_num = await ch_svc.get_next_chapter_number(project_id)
    chapter = await ch_svc.create_chapter(project_id, next_num, title=f"第{next_num}章")

    return {"project_id": project_id, "chapter_number": next_num, "chapter_id": chapter.id}


@router.post("/{chapter_number}/confirm")
async def confirm_chapter(project_id: str, chapter_number: int, db: AsyncSession = Depends(get_db)):
    ch_svc = ChapterService(db)
    chapter = await ch_svc.get_chapter(project_id, chapter_number)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    await ch_svc.confirm(chapter)
    return {"project_id": project_id, "chapter_number": chapter_number, "status": chapter.status}


@router.post("/{chapter_number}/retry")
async def retry_chapter(project_id: str, chapter_number: int, data: ChapterRetry = None,
                         db: AsyncSession = Depends(get_db)):
    return {"project_id": project_id, "chapter_number": chapter_number, "guidance": data.guidance if data else ""}


@router.put("/{chapter_number}")
async def edit_chapter(project_id: str, chapter_number: int, data: ChapterEdit,
                        db: AsyncSession = Depends(get_db)):
    ch_svc = ChapterService(db)
    chapter = await ch_svc.get_chapter(project_id, chapter_number)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    word_count = len(data.content)
    await ch_svc.update_content(chapter, data.content, word_count)
    return {"project_id": project_id, "chapter_number": chapter_number, "word_count": word_count}
