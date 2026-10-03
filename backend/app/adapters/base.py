from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from uuid import UUID

from app.schemas.artifact import ArtifactCreate


@dataclass
class EngineCapabilities:
    engine_name: str
    engine_version: str
    supported_filesystems: list[str]
    can_detect: bool = True
    can_analyze: bool = True
    can_recover: bool = True
    can_validate: bool = True


@dataclass
class EngineResult:
    success: bool
    artifacts: list[ArtifactCreate] = field(default_factory=list)
    error: str | None = None
    stdout: str = ""
    stderr: str = ""
    exit_code: int | None = None
    duration_ms: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


class ForensicEngineAdapter(ABC):
    """Base interface for all forensic engine adapters."""

    @property
    @abstractmethod
    def capabilities(self) -> EngineCapabilities:
        """Return engine capabilities and metadata."""
        pass

    @abstractmethod
    async def detect(self, evidence_path: Path) -> bool:
        """
        Detect if this engine can handle the evidence.
        Returns True if the filesystem matches this engine's capabilities.
        """
        pass

    @abstractmethod
    async def analyze(
        self,
        evidence_path: Path,
        case_id: UUID,
        evidence_id: UUID,
        config: dict[str, Any] | None = None,
    ) -> EngineResult:
        """
        Analyze evidence and discover artifacts.
        Does not recover file content - only discovers metadata.
        """
        pass

    @abstractmethod
    async def recover(
        self,
        artifacts: list[ArtifactCreate],
        evidence_path: Path,
        output_dir: Path,
        config: dict[str, Any] | None = None,
    ) -> EngineResult:
        """
        Recover file content for discovered artifacts.
        """
        pass

    @abstractmethod
    async def validate(
        self,
        artifacts: list[ArtifactCreate],
        config: dict[str, Any] | None = None,
    ) -> EngineResult:
        """
        Validate recovered artifacts (check signatures, integrity, etc.)
        """
        pass
