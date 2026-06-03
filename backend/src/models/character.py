import enum, uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, Enum, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column
from ..database import Base

class CharacterRole(str, enum.Enum):
    PROTAGONIST = "protagonist"
    ANTAGONIST = "antagonist"
    SUPPORTING = "supporting"

class Character(Base):
    __tablename__ = "characters"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    role_type: Mapped[CharacterRole] = mapped_column(Enum(CharacterRole), default=CharacterRole.SUPPORTING)
    card: Mapped[dict] = mapped_column(JSON, default=dict)
    initial_state: Mapped[dict] = mapped_column(JSON, default=dict)
    current_state: Mapped[dict] = mapped_column(JSON, default=dict)
    relationships: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
