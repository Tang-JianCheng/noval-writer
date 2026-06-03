from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services.project_service import ProjectService
from ..dispatcher.orchestrator import OutlineOrchestrator
from ..dispatcher.state_machine import DispatcherState
from .deps import get_llm_client
from ..llm.base import LLMClient
from .schemas import OutlineConfirm

router = APIRouter(prefix="/api/projects/{project_id}/outline", tags=["outline"])


@router.post("/build")
async def build_outline(project_id: str, db: AsyncSession = Depends(get_db),
                         llm: LLMClient = Depends(get_llm_client)):
    svc = ProjectService(db)
    project = await svc.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    orch = OutlineOrchestrator(llm)
    outline = await orch.build_outline(project.description or project.title)

    project.status = orch.sm.current_state.value
    await db.commit()

    return {"project_id": project_id, "outline": outline, "status": project.status}


@router.get("")
async def get_outline(project_id: str, db: AsyncSession = Depends(get_db)):
    # Return a stub for now - full outline retrieval from DB will come later
    return {"project_id": project_id, "outline": {}, "status": "awaiting_outline_confirm"}


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
