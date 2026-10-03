import enum
from datetime import datetime
from uuid import UUID, uuid4

from app.core.database import Base
from sqlalchemy import DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class ReportFormat(str, enum.Enum):
    JSON = "json"
    CSV = "csv"
    PDF = "pdf"


class ReportStatus(str, enum.Enum):
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    case_id: Mapped[UUID] = mapped_column(
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    report_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    format: Mapped[ReportFormat] = mapped_column(
        Enum(ReportFormat, native_enum=False),
        nullable=False,
    )
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, native_enum=False),
        default=ReportStatus.GENERATING,
        nullable=False,
    )
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    generated_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    case: Mapped["Case"] = relationship(back_populates="reports")
    generated_by_user: Mapped["User | None"] = relationship(
        back_populates="generated_reports",
        foreign_keys=[generated_by],
    )

    __table_args__ = (
        Index("ix_reports_case_format", "case_id", "format"),
    )
