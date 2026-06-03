from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models.chapter import Chapter, ChapterStatus
from ..models.project import Project


class ChapterService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_next_chapter_number(self, project_id: str) -> int:
        result = await self.db.execute(
            select(Chapter).where(Chapter.project_id == project_id).order_by(Chapter.chapter_number.desc()).limit(1)
        )
        last = result.scalar_one_or_none()
        return (last.chapter_number + 1) if last else 1

    async def create_chapter(self, project_id: str, chapter_number: int, title: str = "",
                             content_path: str = "", word_count: int = 0) -> Chapter:
        chapter = Chapter(
            project_id=project_id, chapter_number=chapter_number, title=title,
            content_path=content_path, word_count=word_count, status=ChapterStatus.DRAFT
        )
        self.db.add(chapter)
        await self.db.commit()
        await self.db.refresh(chapter)
        return chapter

    async def get_chapter(self, project_id: str, chapter_number: int) -> Chapter | None:
        result = await self.db.execute(
            select(Chapter).where(Chapter.project_id == project_id, Chapter.chapter_number == chapter_number)
        )
        return result.scalar_one_or_none()

    async def update_content(self, chapter: Chapter, content: str, word_count: int) -> Chapter:
        chapter.word_count = word_count
        chapter.version += 1
        await self.db.commit()
        return chapter

    async def confirm(self, chapter: Chapter) -> Chapter:
        chapter.status = ChapterStatus.CONFIRMED
        await self.db.commit()
        return chapter
