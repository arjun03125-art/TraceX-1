from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CaseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = None


class CaseResponse(CaseBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_number: str
    investigator_id: UUID | None
    status: str
    created_at: datetime
    updated_at: datetime


class CaseListResponse(BaseModel):
    cases: list[CaseResponse]
    total: int
    page: int
    page_size: int
