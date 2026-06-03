import enum, uuid
from datetime import datetime
from sqlalchemy import String, Text, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

class ProjectStatus(str, enum.Enum):
    IDLE = "idle"
    BUILDING_OUTLINE = "building_outline"
    AWAITING_OUTLINE_CONFIRM = "awaiting_outline_confirm"
    WRITING_CHAPTER = "writing_chapter"
    AWAITING_CHAPTER_CONFIRM = "awaiting_chapter_confirm"
    SUPPLEMENTING = "supplementing"
    COMPLETED = "completed"
    ERROR = "error"

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus), default=ProjectStatus.IDLE)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
