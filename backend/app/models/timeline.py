import enum
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.core.database import Base
from sqlalchemy import DateTime, Enum, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship


class TimestampType(str, enum.Enum):
    CREATED = "created"
    MODIFIED = "modified"
    ACCESSED = "accessed"
    CHANGED = "changed"
    DELETED = "deleted"
    ANALYSIS_EVENT = "analysis_event"
    RECOVERY_EVENT = "recovery_event"
    CUSTODY_EVENT = "custody_event"


class EventSource(str, enum.Enum):
    FILESYSTEM = "filesystem"
    FILE_METADATA = "file_metadata"
    ANALYSIS = "analysis"
    RECOVERY = "recovery"
    CHAIN_OF_CUSTODY = "chain_of_custody"


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    case_id: Mapped[UUID] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    artifact_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("artifacts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    timestamp_type: Mapped[TimestampType] = mapped_column(
        Enum(TimestampType, native_enum=False),
        nullable=False,
    )
    source: Mapped[EventSource] = mapped_column(
        Enum(EventSource, native_enum=False),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float | None] = mapped_column(nullable=True)
    provenance: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    case: Mapped["Case"] = relationship(back_populates="timeline_events")
    artifact: Mapped["Artifact | None"] = relationship(back_populates="timeline_events")

    __table_args__ = (
        Index("ix_timeline_case_timestamp", "case_id", "event_timestamp"),
        Index("ix_timeline_artifact_timestamp", "artifact_id", "event_timestamp"),
    )
