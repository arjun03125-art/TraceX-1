from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EvidenceBase(BaseModel):
    original_filename: str | None = Field(None, max_length=500)


class EvidenceCreate(EvidenceBase):
    pass


class EvidenceResponse(EvidenceBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    evidence_number: str
    stored_path: str
    size_bytes: int
    sha256_hash: str
    mime_type: str | None
    filesystem_type: str
    status: str
    metadata: dict[str, Any]
    acquired_at: datetime
    acquired_by: UUID | None


class EvidenceVerifyResponse(BaseModel):
    evidence_id: str
    stored_hash: str
    calculated_hash: str
    match: bool
    status: str


class EvidenceListResponse(BaseModel):
    evidence: list[EvidenceResponse]
    total: int
    page: int
    page_size: int