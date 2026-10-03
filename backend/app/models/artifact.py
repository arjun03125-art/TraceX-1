import enum
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.core.database import Base
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship


class ArtifactType(str, enum.Enum):
    RECOVERED_FILE = "recovered_file"
    DELETED_FILE = "deleted_file"
    METADATA = "metadata"
    CARVED_FILE = "carved_file"
    FRAGMENT = "fragment"
    DIRECTORY = "directory"
    OTHER = "other"


class RecoveryMethod(str, enum.Enum):
    FILESYSTEM = "filesystem"
    CARVING = "carving"
    HYBRID = "hybrid"
    UNKNOWN = "unknown"


class RecoveryStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETE = "complete"
    PARTIAL = "partial"
    FAILED = "failed"
    VALIDATED = "validated"


class Artifact(Base):
    __tablename__ = "artifacts"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    case_id: Mapped[UUID] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_id: Mapped[UUID] = mapped_column(
        ForeignKey("evidence.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    artifact_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    artifact_type: Mapped[ArtifactType] = mapped_column(
        Enum(ArtifactType, native_enum=False),
        nullable=False,
    )
    name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    filesystem: Mapped[str | None] = mapped_column(String(50), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    timestamps: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    hashes: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    recovery_method: Mapped[RecoveryMethod] = mapped_column(
        Enum(RecoveryMethod, native_enum=False),
        default=RecoveryMethod.UNKNOWN,
        nullable=False,
    )
    recovery_status: Mapped[RecoveryStatus] = mapped_column(
        Enum(RecoveryStatus, native_enum=False),
        default=RecoveryStatus.PENDING,
        nullable=False,
    )
    validation: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    provenance: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    confidence_score: Mapped[float | None] = mapped_column(nullable=True)
    confidence_signals: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    case: Mapped["Case"] = relationship(back_populates="artifacts")
    evidence: Mapped["Evidence"] = relationship(back_populates="artifacts")
    observations: Mapped[list["ArtifactObservation"]] = relationship(
        back_populates="artifact",
        cascade="all, delete-orphan",
    )
    hash_records: Mapped[list["Hash"]] = relationship(
        back_populates="artifact",
        cascade="all, delete-orphan",
    )
    timeline_events: Mapped[list["TimelineEvent"]] = relationship(
        back_populates="artifact",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_artifacts_case_type", "case_id", "artifact_type"),
        Index("ix_artifacts_evidence_type", "evidence_id", "artifact_type"),
        Index("ix_artifacts_recovery_method", "recovery_method"),
    )


class ArtifactObservation(Base):
    __tablename__ = "artifact_observations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    artifact_id: Mapped[UUID] = mapped_column(
        ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    engine_name: Mapped[str] = mapped_column(String(50), nullable=False)
    engine_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    source_offset: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    source_inode: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    artifact: Mapped["Artifact"] = relationship(back_populates="observations")


class Hash(Base):
    __tablename__ = "hashes"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    artifact_id: Mapped[UUID] = mapped_column(
        ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    algorithm: Mapped[str] = mapped_column(String(20), nullable=False)
    value: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    artifact: Mapped["Artifact"] = relationship(back_populates="hash_records")

    __table_args__ = (
        Index("ix_hashes_artifact_algorithm", "artifact_id", "algorithm", unique=True),
        Index("ix_hashes_value", "value"),
    )
