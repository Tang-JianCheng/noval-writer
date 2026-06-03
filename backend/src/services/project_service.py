from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models.project import Project, ProjectStatus


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, title: str, description: str = "") -> Project:
        project = Project(title=title, description=description)
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def list_all(self) -> list[Project]:
        result = await self.db.execute(select(Project).order_by(Project.updated_at.desc()))
        return list(result.scalars().all())

    async def get(self, project_id: str) -> Project | None:
        return await self.db.get(Project, project_id)

    async def delete(self, project_id: str) -> bool:
        project = await self.get(project_id)
        if not project:
            return False
        await self.db.delete(project)
        await self.db.commit()
        return True
