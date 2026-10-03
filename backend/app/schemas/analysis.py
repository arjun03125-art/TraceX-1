from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AnalysisJobBase(BaseModel):
    job_type: str = Field(default="full_analysis")
    config: dict[str, Any] = Field(default_factory=dict)


class AnalysisJobCreate(AnalysisJobBase):
    evidence_id: UUID


class AnalysisJobResponse(AnalysisJobBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    evidence_id: UUID
    status: str
    current_stage: str | None
    progress_percent: int
    error: str | None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None


class EngineRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    engine_name: str
    engine_version: str | None
    status: str
    command: dict[str, Any]
    stdout_path: str | None
    stderr_path: str | None
    exit_code: int | None
    duration_ms: int | None
    started_at: datetime | None
    completed_at: datetime | None


class AnalysisJobDetailResponse(AnalysisJobResponse):
    engine_runs: list[EngineRunResponse] = []
