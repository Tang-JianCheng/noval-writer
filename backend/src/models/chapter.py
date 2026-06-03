import enum, uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Enum, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

class ChapterStatus(str, enum.Enum):
    GENERATING = "generating"
    DRAFT = "draft"
    CONFIRMED = "confirmed"

class Chapter(Base):
    __tablename__ = "chapters"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    chapter_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(300), default="")
    status: Mapped[ChapterStatus] = mapped_column(Enum(ChapterStatus), default=ChapterStatus.DRAFT)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    summary: Mapped[str] = mapped_column(Text, default="")
    content_path: Mapped[str] = mapped_column(String(500), default="")
    related_characters: Mapped[dict] = mapped_column(JSON, default=list)
    related_plot_nodes: Mapped[dict] = mapped_column(JSON, default=list)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
