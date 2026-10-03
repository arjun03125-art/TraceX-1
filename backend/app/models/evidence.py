import enum
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.core.database import Base
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship


class EvidenceStatus(str, enum.Enum):
    IMPORTED = "imported"
    VERIFIED = "verified"
    PROCESSING = "processing"
    PROCESSED = "processed"
    ERROR = "error"
    ARCHIVED = "archived"


class FilesystemType(str, enum.Enum):
    UNKNOWN = "unknown"
    XFS = "xfs"
    BTRFS = "btrfs"
    EXT4 = "ext4"
    NTFS = "ntfs"
    FAT32 = "fat32"
    OTHER = "other"


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    case_id: Mapped[UUID] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    original_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    stored_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    filesystem_type: Mapped[FilesystemType] = mapped_column(
        Enum(FilesystemType, native_enum=False),
        default=FilesystemType.UNKNOWN,
        nullable=False,
    )
    status: Mapped[EvidenceStatus] = mapped_column(
        Enum(EvidenceStatus, native_enum=False),
        default=EvidenceStatus.IMPORTED,
        nullable=False,
    )
    evidence_metadata: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    acquired_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    acquired_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    case: Mapped["Case"] = relationship(back_populates="evidence")
    acquired_by_user: Mapped["User"] = relationship(
        back_populates="acquired_evidence",
        foreign_keys=[acquired_by],
    )
    analysis_jobs: Mapped[list["AnalysisJob"]] = relationship(
        back_populates="evidence",
        cascade="all, delete-orphan",
    )
    artifacts: Mapped[list["Artifact"]] = relationship(
        back_populates="evidence",
        cascade="all, delete-orphan",
    )
    audit_events: Mapped[list["AuditEvent"]] = relationship(
        back_populates="evidence",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_evidence_case_status", "case_id", "status"),
        Index("ix_evidence_hash", "sha256_hash"),
    )
