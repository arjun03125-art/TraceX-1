import enum
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.core.database import Base
from sqlalchemy import DateTime, Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship


class CorrelationReason(str, enum.Enum):
    SAME_SHA256 = "same_sha256"
    SAME_SIZE_AND_HASH = "same_size_and_hash"
    SAME_CONTENT_SIGNATURE = "same_content_signature"
    SAME_SOURCE_OFFSET = "same_source_offset"
    POSSIBLE_MATCH = "possible_match"
    METADATA_MATCH = "metadata_match"


class MatchConfidence(str, enum.Enum):
    CONFIRMED = "confirmed"
    PROBABLE = "probable"
    POSSIBLE = "possible"


class Correlation(Base):
    __tablename__ = "correlations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    case_id: Mapped[UUID] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    correlation_group_id: Mapped[UUID] = mapped_column(
        nullable=False,
        index=True,
    )
    artifact_id: Mapped[UUID] = mapped_column(
        ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    correlation_reason: Mapped[CorrelationReason] = mapped_column(
        Enum(CorrelationReason, native_enum=False),
        nullable=False,
    )
    match_confidence: Mapped[MatchConfidence] = mapped_column(
        Enum(MatchConfidence, native_enum=False),
        nullable=False,
    )
    details: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    case: Mapped["Case"] = relationship(back_populates="correlations")
    artifact: Mapped["Artifact"] = relationship()

    __table_args__ = (
        Index("ix_correlations_case_group", "case_id", "correlation_group_id"),
        Index("ix_correlations_artifact", "artifact_id"),
    )
