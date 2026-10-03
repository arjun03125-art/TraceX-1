from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ReportBase(BaseModel):
    format: str


class ReportCreate(ReportBase):
    case_id: UUID


class ReportResponse(ReportBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    report_number: str
    file_path: str | None
    status: str
    generated_at: datetime | None
    generated_by: UUID | None
