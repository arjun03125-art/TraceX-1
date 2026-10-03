from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from app.adapters.base import EngineCapabilities, EngineResult, ForensicEngineAdapter
from app.schemas.artifact import ArtifactCreate


class MockXFSAdapter(ForensicEngineAdapter):
    """Mock XFS adapter for development and testing."""

    @property
    def capabilities(self) -> EngineCapabilities:
        return EngineCapabilities(
            engine_name="mock_xfs",
            engine_version="0.1.0-test",
            supported_filesystems=["xfs"],
            can_detect=True,
            can_analyze=True,
            can_recover=True,
            can_validate=True,
        )

    async def detect(self, evidence_path: Path) -> bool:
        return True

    async def analyze(
        self,
        evidence_path: Path,
        case_id: UUID,
        evidence_id: UUID,
        config: dict[str, Any] | None = None,
    ) -> EngineResult:
        artifacts = [
            ArtifactCreate(
                case_id=case_id,
                evidence_id=evidence_id,
                artifact_number=f"ART-XFS-{i:06d}",
                artifact_type="recovered_file",
                name=f"document_{i}.pdf",
                path=f"/home/user/documents/document_{i}.pdf",
                filesystem="xfs",
                size_bytes=1024 * (i + 1) * 100,
                timestamps={
                    "created": datetime(2024, 1, i + 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                    "modified": datetime(2024, 2, i + 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                    "accessed": datetime(2024, 3, i + 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                    "changed": datetime(2024, 4, i + 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                    "deleted": datetime(2024, 5, i + 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                },
                hashes={"sha256": f"{'a' * 56}{i:08x}"},
                recovery_method="filesystem",
                recovery_status="complete",
                validation={"file_signature": "PDF", "integrity": "valid"},
                provenance={
                    "source_image": str(evidence_id),
                    "source_offset": 1024 * 1024 * (i + 1),
                    "inode": 1000 + i,
                },
                confidence_score=0.95,
                confidence_signals={
                    "filesystem_metadata": "strong",
                    "content_signature": "strong",
                    "integrity_validation": "strong",
                },
            )
            for i in range(3)
        ]
        return EngineResult(
            success=True,
            artifacts=artifacts,
            metadata={"filesystem": "xfs", "inode_count": 3},
        )

    async def recover(
        self,
        artifacts: list[ArtifactCreate],
        evidence_path: Path,
        output_dir: Path,
        config: dict[str, Any] | None = None,
    ) -> EngineResult:
        output_dir.mkdir(parents=True, exist_ok=True)
        for art in artifacts:
            out_path = output_dir / art.name
            out_path.write_bytes(b"MOCK XFS RECOVERED CONTENT")
        return EngineResult(success=True, metadata={"recovered_count": len(artifacts)})

    async def validate(
        self,
        artifacts: list[ArtifactCreate],
        config: dict[str, Any] | None = None,
    ) -> EngineResult:
        return EngineResult(success=True, metadata={"validated_count": len(artifacts)})
