import enum
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.core.database import Base
from sqlalchemy import DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class UserRole(str, enum.Enum):
    INVESTIGATOR = "investigator"
    ADMINISTRATOR = "administrator"
    AUDITOR = "auditor"


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False),
        default=UserRole.INVESTIGATOR,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    cases: Mapped[list["Case"]] = relationship(
        back_populates="investigator",
        foreign_keys="Case.investigator_id",
    )
    acquired_evidence: Mapped[list["Evidence"]] = relationship(
        back_populates="acquired_by_user",
        foreign_keys="Evidence.acquired_by",
    )
    generated_reports: Mapped[list["Report"]] = relationship(
        back_populates="generated_by_user",
        foreign_keys="Report.generated_by",
    )
