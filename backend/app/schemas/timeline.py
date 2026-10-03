from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TimelineEventBase(BaseModel):
    event_timestamp: datetime
    timestamp_type: str
    source: str
    description: str
    confidence: float | None = None
    provenance: dict[str, Any] = Field(default_factory=dict)


class TimelineEventCreate(TimelineEventBase):
    case_id: UUID
    artifact_id: UUID | None = None


class TimelineEventResponse(TimelineEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID
    artifact_id: UUID | None
    created_at: datetime


class TimelineResponse(BaseModel):
    events: list[TimelineEventResponse]
    total: int
