from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from app.adapters.base import EngineCapabilities, EngineResult, ForensicEngineAdapter
from app.schemas.artifact import ArtifactCreate


class MockBtrfsAdapter(ForensicEngineAdapter):
    """Mock Btrfs adapter for development and testing."""

    @property
    def capabilities(self) -> EngineCapabilities:
        return EngineCapabilities(
            engine_name="mock_btrfs",
            engine_version="0.1.0-test",
            supported_filesystems=["btrfs"],
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
                artifact_number=f"ART-BTR-{i:06d}",
                artifact_type="recovered_file",
                name=f"photo_{i}.jpg",
                path=f"/media/photos/photo_{i}.jpg",
                filesystem="btrfs",
                size_bytes=2048 * (i + 1) * 100,
                timestamps={
                    "created": datetime(2024, 6, i + 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                    "modified": datetime(2024, 7, i + 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                    "accessed": datetime(2024, 8, i + 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                    "changed": datetime(2024, 9, i + 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                    "deleted": datetime(2024, 10, i + 1, 12, 0, 0, tzinfo=UTC).isoformat(),
                },
                hashes={"sha256": f"{'b' * 56}{i:08x}"},
                recovery_method="filesystem",
                recovery_status="complete",
                validation={"file_signature": "JPEG", "integrity": "valid"},
                provenance={
                    "source_image": str(evidence_id),
                    "source_offset": 2048 * 1024 * (i + 1),
                    "object_id": 2000 + i,
                },
                confidence_score=0.92,
                confidence_signals={
                    "filesystem_metadata": "strong",
                    "content_signature": "strong",
                    "integrity_validation": "strong",
                    "snapshot_consistency": "moderate",
                },
            )
            for i in range(2)
        ]
        return EngineResult(
            success=True,
            artifacts=artifacts,
            metadata={"filesystem": "btrfs", "subvolumes": 2},
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
            out_path.write_bytes(b"MOCK BTRFS RECOVERED CONTENT")
        return EngineResult(success=True, metadata={"recovered_count": len(artifacts)})

    async def validate(
        self,
        artifacts: list[ArtifactCreate],
        config: dict[str, Any] | None = None,
    ) -> EngineResult:
        return EngineResult(success=True, metadata={"validated_count": len(artifacts)})
