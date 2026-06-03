from pydantic import BaseModel
from datetime import datetime


class ProjectCreate(BaseModel):
    title: str
    description: str = ""


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OutlineConfirm(BaseModel):
    action: str = "confirm"  # confirm | rebuild


class ChapterRetry(BaseModel):
    guidance: str = ""


class ChapterEdit(BaseModel):
    content: str


class ChapterResponse(BaseModel):
    id: str
    chapter_number: int
    title: str
    status: str
    word_count: int
    summary: str
    version: int

    model_config = {"from_attributes": True}


class HealthResponse(BaseModel):
    status: str
