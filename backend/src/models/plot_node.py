import enum, uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, Enum, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

class PlotNodeStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class PlotNode(Base):
    __tablename__ = "plot_nodes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    parent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("plot_nodes.id"), nullable=True)
    chapter_estimate: Mapped[str] = mapped_column(String(50), default="")
    actual_chapter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[PlotNodeStatus] = mapped_column(Enum(PlotNodeStatus), default=PlotNodeStatus.PENDING)
    importance: Mapped[str] = mapped_column(String(20), default="main")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
