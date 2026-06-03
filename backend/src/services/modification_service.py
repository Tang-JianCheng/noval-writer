"""Modification cascade service — detects and tracks the impact of changes."""

from sqlalchemy.ext.asyncio import AsyncSession
from ..models.modification_log import ModificationLog
from ..models.chapter import Chapter
from sqlalchemy import select


class ModificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze_impact(self, project_id: str, target_type: str,
                              target_id: str, change_description: str) -> ModificationLog:
        """Analyze which chapters are affected by a change and create a log entry."""
        # Get all confirmed chapters for this project
        result = await self.db.execute(
            select(Chapter).where(Chapter.project_id == project_id).order_by(Chapter.chapter_number)
        )
        chapters = list(result.scalars().all())

        affected = [ch.chapter_number for ch in chapters if ch.status == "confirmed"]

        log = ModificationLog(
            project_id=project_id,
            target_type=target_type,
            target_id=target_id,
            change_description=change_description,
            affected_chapters=affected,
        )
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log

    async def get_pending_modifications(self, project_id: str) -> list[ModificationLog]:
        result = await self.db.execute(
            select(ModificationLog)
            .where(ModificationLog.project_id == project_id, ModificationLog.resolved_at.is_(None))
            .order_by(ModificationLog.created_at.desc())
        )
        return list(result.scalars().all())

    async def resolve(self, log_id: str, resolution: str) -> ModificationLog | None:
        from datetime import datetime
        log = await self.db.get(ModificationLog, log_id)
        if log:
            log.resolved_at = datetime.utcnow()
            await self.db.commit()
        return log
