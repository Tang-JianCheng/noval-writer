import json
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..config import settings
from ..services.project_service import ProjectService
from ..dispatcher.orchestrator import OutlineOrchestrator
from ..dispatcher.state_machine import DispatcherState
from .deps import get_llm_client
from ..llm.base import LLMClient
from pydantic import BaseModel
from .schemas import OutlineConfirm


class OutlineUpdate(BaseModel):
    outline: dict

router = APIRouter(prefix="/api/projects/{project_id}/outline", tags=["outline"])


def _outline_file_path(project_id: str) -> str:
    base = settings.chapter_storage_path
    os.makedirs(f"{base}/{project_id}/agents", exist_ok=True)
    return f"{base}/{project_id}/agents/outline.json"


def _save_outline(project_id: str, outline: dict) -> None:
    path = _outline_file_path(project_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(outline, f, ensure_ascii=False, indent=2)


def _load_outline(project_id: str) -> dict | None:
    path = _outline_file_path(project_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.post("/build")
async def build_outline(project_id: str, db: AsyncSession = Depends(get_db),
                         llm: LLMClient = Depends(get_llm_client)):
    svc = ProjectService(db)
    project = await svc.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    orch = OutlineOrchestrator(llm)
    outline = await orch.build_outline(project.description or project.title)

    # Save outline to file system
    _save_outline(project_id, outline)

    project.status = orch.sm.current_state.value
    await db.commit()

    return {"project_id": project_id, "outline": outline, "status": project.status}


@router.get("")
async def get_outline(project_id: str, db: AsyncSession = Depends(get_db)):
    # Load saved outline from file system
    outline = _load_outline(project_id)
    svc = ProjectService(db)
    project = await svc.get(project_id)
    status = project.status.value if project else "idle"

    if outline:
        return {"project_id": project_id, "outline": outline, "status": status}
    else:
        return {"project_id": project_id, "outline": {}, "status": status}


@router.put("")
async def update_outline(project_id: str, data: OutlineUpdate):
    _save_outline(project_id, data.outline)
    return {"project_id": project_id, "status": "updated"}


@router.post("/confirm")
async def confirm_outline(project_id: str, data: OutlineConfirm = None,
                           db: AsyncSession = Depends(get_db)):
    svc = ProjectService(db)
    project = await svc.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.status = "writing_chapter"
    await db.commit()
    return {"project_id": project_id, "status": project.status}
