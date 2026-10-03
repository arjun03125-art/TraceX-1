import enum
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.core.database import Base
from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship


class JobStatus(str, enum.Enum):
    CREATED = "created"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobStage(str, enum.Enum):
    EVIDENCE_VERIFICATION = "evidence_verification"
    FILESYSTEM_DETECTION = "filesystem_detection"
    XFS_ANALYSIS = "xfs_analysis"
    BTRFS_ANALYSIS = "btrfs_analysis"
    CARVING = "carving"
    NORMALIZATION = "normalization"
    CORRELATION = "correlation"
    VALIDATION = "validation"
    REPORTING = "reporting"


class JobType(str, enum.Enum):
    FULL_ANALYSIS = "full_analysis"
    FILESYSTEM_ANALYSIS = "filesystem_analysis"
    CARVING_ONLY = "carving_only"
    REPORT_GENERATION = "report_generation"


class EngineRunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

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
    job_type: Mapped[JobType] = mapped_column(
        Enum(JobType, native_enum=False),
        default=JobType.FULL_ANALYSIS,
        nullable=False,
    )
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, native_enum=False),
        default=JobStatus.CREATED,
        nullable=False,
    )
    current_stage: Mapped[JobStage | None] = mapped_column(
        Enum(JobStage, native_enum=False),
        nullable=True,
    )
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    config: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    case: Mapped["Case"] = relationship(back_populates="analysis_jobs")
    evidence: Mapped["Evidence"] = relationship(back_populates="analysis_jobs")
    engine_runs: Mapped[list["EngineRun"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_analysis_jobs_case_status", "case_id", "status"),
        Index("ix_analysis_jobs_evidence_status", "evidence_id", "status"),
    )


class EngineRun(Base):
    __tablename__ = "engine_runs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("analysis_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    engine_name: Mapped[str] = mapped_column(String(50), nullable=False)
    engine_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[EngineRunStatus] = mapped_column(
        Enum(EngineRunStatus, native_enum=False),
        default=EngineRunStatus.PENDING,
        nullable=False,
    )
    command: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    stdout_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    stderr_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    exit_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    job: Mapped["AnalysisJob"] = relationship(back_populates="engine_runs")
