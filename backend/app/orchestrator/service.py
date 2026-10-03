import hashlib
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from app.adapters import get_engine_adapter
from app.models.analysis_job import (
    AnalysisJob,
    EngineRun,
    EngineRunStatus,
    JobStage,
    JobStatus,
    JobType,
)
from app.models.artifact import (
    Artifact,
    ArtifactObservation,
    Hash,
)
from app.models.audit import AuditEvent
from app.models.evidence import Evidence, EvidenceStatus, FilesystemType
from app.schemas.artifact import ArtifactCreate
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class OrchestrationService:
    """Orchestrates the forensic analysis pipeline."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_job(
        self,
        case_id: UUID,
        evidence_id: UUID,
        job_type: JobType = JobType.FULL_ANALYSIS,
        config: dict[str, Any] | None = None,
    ) -> AnalysisJob:
        """Create a new analysis job."""
        job = AnalysisJob(
            id=uuid4(),
            case_id=case_id,
            evidence_id=evidence_id,
            job_type=job_type,
            status=JobStatus.CREATED,
            config=config or {},
        )
        self.db.add(job)
        await self.db.flush()

        # Create audit event
        await self._audit(
            case_id=case_id,
            evidence_id=evidence_id,
            event_type="ANALYSIS_STARTED",
            action="Created analysis job",
            description=f"Job {job.id} created for case {case_id}",
        )

        return job

    async def run_job(self, job_id: UUID) -> AnalysisJob:
        """Run the full analysis pipeline for a job."""
        job = await self.db.get(AnalysisJob, job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")

        job.status = JobStatus.RUNNING
        job.started_at = datetime.now(UTC)
        await self.db.flush()

        try:
            evidence = await self.db.get(Evidence, job.evidence_id)
            if not evidence:
                raise ValueError(f"Evidence not found: {job.evidence_id}")

            # Check evidence integrity before starting analysis
            if evidence.status == EvidenceStatus.ERROR:
                raise ValueError(
                    f"Evidence integrity check failed. "
                    f"Cannot start analysis on evidence {evidence.evidence_number}. "
                    f"Run verification first."
                )

            evidence.status = EvidenceStatus.PROCESSING
            await self.db.flush()

            # Stage 1: Evidence Verification
            await self._update_stage(job, JobStage.EVIDENCE_VERIFICATION, 10)
            await self._verify_evidence(evidence)

            # Verify integrity after hash check
            if evidence.status == EvidenceStatus.ERROR:
                raise ValueError(
                    f"Evidence integrity verification failed. "
                    f"Cannot proceed with analysis on evidence {evidence.evidence_number}."
                )

            # Stage 2: Filesystem Detection
            await self._update_stage(job, JobStage.FILESYSTEM_DETECTION, 20)
            fs_type = await self._detect_filesystem(evidence)
            evidence.filesystem_type = fs_type
            await self.db.flush()

            # Stage 3: Run applicable engines
            engines_to_run = self._select_engines(fs_type, job.job_type)
            all_artifacts = []

            for engine_name in engines_to_run:
                stage = self._engine_to_stage(engine_name)
                await self._update_stage(job, stage, 30 + engines_to_run.index(engine_name) * 20)
                artifacts = await self._run_engine(
                    job, engine_name, evidence, all_artifacts
                )
                all_artifacts.extend(artifacts)

            # Stage 4: Normalization & Deduplication
            await self._update_stage(job, JobStage.NORMALIZATION, 70)
            normalized_artifacts = await self._normalize_artifacts(
                job, evidence, all_artifacts
            )

            # Stage 5: Correlation
            await self._update_stage(job, JobStage.CORRELATION, 80)
            await self._correlate_artifacts(job, evidence, normalized_artifacts)

            # Stage 6: Validation
            await self._update_stage(job, JobStage.VALIDATION, 85)
            await self._validate_artifacts(job, evidence, normalized_artifacts)

            # Stage 7: Timeline
            await self._update_stage(job, JobStage.REPORTING, 90)
            await self._build_timeline(job, evidence, normalized_artifacts)

            job.status = JobStatus.COMPLETED
            job.progress_percent = 100
            job.completed_at = datetime.now(UTC)
            evidence.status = EvidenceStatus.PROCESSED

            await self._audit(
                case_id=job.case_id,
                evidence_id=job.evidence_id,
                event_type="ANALYSIS_COMPLETED",
                action="Analysis completed",
                description=f"Job {job.id} completed successfully",
            )

        except Exception as e:
            job.status = JobStatus.FAILED
            job.error = str(e)
            job.completed_at = datetime.now(UTC)
            logger.exception("Job failed: %s", job_id)

            await self._audit(
                case_id=job.case_id,
                evidence_id=job.evidence_id,
                event_type="ANALYSIS_FAILED",
                action="Analysis failed",
                description=f"Job {job.id} failed: {e}",
            )

        await self.db.flush()
        return job

    async def _verify_evidence(self, evidence: Evidence) -> None:
        """Verify evidence integrity by checking hash."""
        file_path = Path(evidence.stored_path)
        if not file_path.exists():
            raise FileNotFoundError(f"Evidence file not found: {file_path}")

        # Calculate hash
        sha256 = hashlib.sha256()
        with file_path.open("rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        calculated_hash = sha256.hexdigest()

        if calculated_hash != evidence.sha256_hash:
            raise ValueError(
                f"Hash mismatch for evidence {evidence.id}: "
                f"expected {evidence.sha256_hash}, got {calculated_hash}"
            )

        evidence.status = EvidenceStatus.VERIFIED

        await self._audit(
            case_id=evidence.case_id,
            evidence_id=evidence.id,
            event_type="HASH_VALIDATED",
            action="Evidence hash validated",
            description=f"SHA-256 verified for evidence {evidence.evidence_number}",
            input_hash=evidence.sha256_hash,
            output_hash=calculated_hash,
        )

    async def _detect_filesystem(self, evidence: Evidence) -> FilesystemType:
        """Detect filesystem type from evidence."""
        # In mock mode, check filename or default to XFS
        filename = evidence.original_filename or evidence.stored_path
        filename_lower = filename.lower()

        if "xfs" in filename_lower:
            return FilesystemType.XFS
        if "btrfs" in filename_lower:
            return FilesystemType.BTRFS

        # Default to XFS for testing
        return FilesystemType.XFS

    def _select_engines(self, fs_type: FilesystemType, job_type: JobType) -> list[str]:
        """Select which engines to run based on filesystem and job type."""
        engines = []

        if job_type in (JobType.FULL_ANALYSIS, JobType.FILESYSTEM_ANALYSIS):
            if fs_type == FilesystemType.XFS:
                engines.append("xfs")
            elif fs_type == FilesystemType.BTRFS:
                engines.append("btrfs")
            elif fs_type == FilesystemType.UNKNOWN:
                engines.extend(["xfs", "btrfs"])

        if job_type in (JobType.FULL_ANALYSIS, JobType.CARVING_ONLY):
            engines.append("carving")

        return engines

    def _engine_to_stage(self, engine_name: str) -> JobStage:
        mapping = {
            "xfs": JobStage.XFS_ANALYSIS,
            "btrfs": JobStage.BTRFS_ANALYSIS,
            "carving": JobStage.CARVING,
        }
        return mapping.get(engine_name, JobStage.NORMALIZATION)

    async def _run_engine(
        self,
        job: AnalysisJob,
        engine_name: str,
        evidence: Evidence,
        previous_artifacts: list[ArtifactCreate],
    ) -> list[ArtifactCreate]:
        """Run a single forensic engine."""
        engine = get_engine_adapter(engine_name)

        # Create engine run record
        engine_run = EngineRun(
            id=uuid4(),
            job_id=job.id,
            engine_name=engine_name,
            engine_version=engine.capabilities.engine_version,
            status=EngineRunStatus.RUNNING,
            command={"engine": engine_name, "evidence": str(evidence.id)},
            started_at=datetime.now(UTC),
        )
        self.db.add(engine_run)
        await self.db.flush()

        try:
            # Detect if engine can handle this evidence
            can_handle = await engine.detect(Path(evidence.stored_path))
            if not can_handle:
                engine_run.status = EngineRunStatus.SKIPPED
                engine_run.completed_at = datetime.now(UTC)
                await self.db.flush()
                return []

            # Analyze
            result = await engine.analyze(
                Path(evidence.stored_path),
                job.case_id,
                evidence.id,
                job.config,
            )

            # Record artifacts
            if result.success and result.artifacts:
                for art_create in result.artifacts:
                    _ = await self._create_artifact(
                        job.case_id, evidence.id, art_create, engine_name
                    )
                    previous_artifacts.append(art_create)

            if result.success:
                engine_run.status = EngineRunStatus.SUCCESS
            else:
                engine_run.status = EngineRunStatus.FAILED
            engine_run.stdout = result.stdout
            engine_run.stderr = result.stderr
            engine_run.exit_code = result.exit_code
            engine_run.duration_ms = result.duration_ms
            engine_run.completed_at = datetime.now(UTC)

        except Exception as e:
            engine_run.status = EngineRunStatus.FAILED
            engine_run.stderr = str(e)
            engine_run.completed_at = datetime.now(UTC)
            logger.exception("Engine %s failed", engine_name)

        await self.db.flush()
        return result.artifacts if result.success else []

    async def _create_artifact(
        self,
        case_id: UUID,
        evidence_id: UUID,
        art_create: ArtifactCreate,
        engine_name: str,
    ) -> Artifact:
        """Create artifact record with observation."""
        artifact = Artifact(
            id=uuid4(),
            case_id=case_id,
            evidence_id=evidence_id,
            artifact_number=art_create.artifact_number,
            artifact_type=art_create.artifact_type,
            name=art_create.name,
            path=art_create.path,
            filesystem=art_create.filesystem,
            size_bytes=art_create.size_bytes,
            timestamps=art_create.timestamps,
            hashes=art_create.hashes,
            recovery_method=art_create.recovery_method,
            recovery_status=art_create.recovery_status,
            validation=art_create.validation,
            provenance=art_create.provenance,
            confidence_score=art_create.confidence_score,
            confidence_signals=art_create.confidence_signals,
        )
        self.db.add(artifact)
        await self.db.flush()

        # Create observation
        observation = ArtifactObservation(
            id=uuid4(),
            artifact_id=artifact.id,
            engine_name=engine_name,
            engine_data=art_create.model_dump(),
            source_offset=art_create.provenance.get("source_offset"),
            source_inode=(
                art_create.provenance.get("inode")
                or art_create.provenance.get("object_id")
            ),
        )
        self.db.add(observation)

        # Create hash records
        for algo, value in art_create.hashes.items():
            hash_record = Hash(
                id=uuid4(),
                artifact_id=artifact.id,
                algorithm=algo,
                value=value,
            )
            self.db.add(hash_record)

        await self._audit(
            case_id=case_id,
            evidence_id=evidence_id,
            event_type="ARTIFACT_DISCOVERED",
            action=f"Artifact discovered by {engine_name}",
            description=f"Artifact {artifact.artifact_number} ({artifact.name})",
        )

        return artifact

    async def _normalize_artifacts(
        self,
        job: AnalysisJob,
        evidence: Evidence,
        artifacts: list[ArtifactCreate],
    ) -> list[ArtifactCreate]:
        """Normalize and deduplicate artifacts."""
        # For Phase 1, just return artifacts as-is
        # Real implementation would do hash-based deduplication
        return artifacts

    async def _correlate_artifacts(
        self,
        job: AnalysisJob,
        evidence: Evidence,
        artifacts: list[ArtifactCreate],
    ) -> None:
        """Correlate artifacts across engines."""
        # Phase 1 placeholder - real implementation in Phase 7
        pass

    async def _validate_artifacts(
        self,
        job: AnalysisJob,
        evidence: Evidence,
        artifacts: list[ArtifactCreate],
    ) -> None:
        """Validate recovered artifacts."""
        # Phase 1 placeholder - real implementation in Phase 7
        pass

    async def _build_timeline(
        self,
        job: AnalysisJob,
        evidence: Evidence,
        artifacts: list[ArtifactCreate],
    ) -> None:
        """Build timeline from artifacts."""
        # Phase 1 placeholder - real implementation in Phase 7
        pass

    async def _update_stage(
        self,
        job: AnalysisJob,
        stage: JobStage,
        progress: int,
    ) -> None:
        """Update job stage and progress."""
        job.current_stage = stage
        job.progress_percent = progress
        await self.db.flush()

    async def _audit(
        self,
        case_id: UUID,
        evidence_id: UUID,
        event_type: str,
        action: str,
        description: str,
        input_hash: str | None = None,
        output_hash: str | None = None,
    ) -> None:
        """Create audit event."""
        event = AuditEvent(
            id=uuid4(),
            case_id=case_id,
            evidence_id=evidence_id,
            event_type=event_type,
            actor="system",
            action=action,
            description=description,
            input_hash=input_hash,
            output_hash=output_hash,
        )
        self.db.add(event)
