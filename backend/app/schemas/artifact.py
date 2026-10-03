from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ArtifactBase(BaseModel):
    artifact_type: str
    name: str | None = None
    path: str | None = None
    filesystem: str | None = None
    size_bytes: int | None = None
    timestamps: dict[str, Any] = Field(default_factory=dict)
    hashes: dict[str, str] = Field(default_factory=dict)
    recovery_method: str
    recovery_status: str
    validation: dict[str, Any] = Field(default_factory=dict)
    provenance: dict[str, Any] = Field(default_factory=dict)
    confidence_score: float | None = None
    confidence_signals: dict[str, Any] = Field(default_factory=dict)


class ArtifactCreate(ArtifactBase):
    case_id: UUID
    evidence_id: UUID
    artifact_number: str


class ArtifactResponse(ArtifactBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    evidence_id: UUID
    artifact_number: str
    created_at: datetime


class ArtifactObservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    artifact_id: UUID
    engine_name: str
    engine_data: dict[str, Any]
    source_offset: int | None
    source_inode: int | None
    created_at: datetime


class ArtifactDetailResponse(ArtifactResponse):
    observations: list[ArtifactObservationResponse] = []


class ArtifactListResponse(BaseModel):
    artifacts: list[ArtifactResponse]
    total: int
    page: int
    page_size: int
