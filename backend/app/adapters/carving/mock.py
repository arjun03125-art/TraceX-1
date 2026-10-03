from pathlib import Path
from typing import Any
from uuid import UUID

from app.adapters.base import EngineCapabilities, EngineResult, ForensicEngineAdapter
from app.schemas.artifact import ArtifactCreate


class MockCarvingAdapter(ForensicEngineAdapter):
    """Mock file carving adapter for development and testing."""

    @property
    def capabilities(self) -> EngineCapabilities:
        return EngineCapabilities(
            engine_name="mock_carving",
            engine_version="0.1.0-test",
            supported_filesystems=["*"],
            can_detect=False,
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
                artifact_number=f"ART-CAR-{i:06d}",
                artifact_type="carved_file",
                name=f"carved_file_{i}.png",
                path=None,
                filesystem=None,
                size_bytes=512 * (i + 1) * 100,
                timestamps={},
                hashes={"sha256": f"{'c' * 56}{i:08x}"},
                recovery_method="carving",
                recovery_status="complete",
                validation={"file_signature": "PNG", "integrity": "valid"},
                provenance={
                    "source_image": str(evidence_id),
                    "source_offset": 512 * 1024 * (i + 1),
                    "carving_method": "header_footer",
                },
                confidence_score=0.75,
                confidence_signals={
                    "content_signature": "strong",
                    "integrity_validation": "strong",
                    "filesystem_metadata": "none",
                },
            )
            for i in range(2)
        ]
        return EngineResult(
            success=True,
            artifacts=artifacts,
            metadata={"carving_method": "header_footer", "signatures_found": 2},
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
            out_path.write_bytes(b"MOCK CARVED CONTENT")
        return EngineResult(success=True, metadata={"recovered_count": len(artifacts)})

    async def validate(
        self,
        artifacts: list[ArtifactCreate],
        config: dict[str, Any] | None = None,
    ) -> EngineResult:
        return EngineResult(success=True, metadata={"validated_count": len(artifacts)})
