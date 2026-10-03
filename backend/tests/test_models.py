import pytest
from uuid import uuid4
from datetime import datetime, timezone

from app.models.case import Case, CaseStatus
from app.models.evidence import Evidence, EvidenceStatus, FilesystemType
from app.models.analysis_job import AnalysisJob, JobStatus, JobType, JobStage
from app.models.artifact import Artifact, ArtifactType, RecoveryMethod, RecoveryStatus


class TestCaseModel:
    def test_case_creation(self):
        case = Case(
            id=uuid4(),
            case_number="CASE-0001",
            name="Test Case",
            description="Test description",
            status=CaseStatus.OPEN,
        )
        assert case.case_number == "CASE-0001"
        assert case.name == "Test Case"
        assert case.status == CaseStatus.OPEN

    def test_case_defaults(self):
        case = Case(case_number="CASE-0002", name="Default Case", status=CaseStatus.OPEN)
        assert case.status == CaseStatus.OPEN
        # created_at is set by SQLAlchemy on flush, not on construction


class TestEvidenceModel:
    def test_evidence_creation(self):
        evidence = Evidence(
            id=uuid4(),
            case_id=uuid4(),
            evidence_number="EVD-0001",
            stored_path="/evidence/test.dd",
            size_bytes=1024,
            sha256_hash="a" * 64,
            filesystem_type=FilesystemType.XFS,
            status=EvidenceStatus.VERIFIED,
        )
        assert evidence.evidence_number == "EVD-0001"
        assert evidence.filesystem_type == FilesystemType.XFS
        assert evidence.status == EvidenceStatus.VERIFIED


class TestAnalysisJobModel:
    def test_job_creation(self):
        job = AnalysisJob(
            id=uuid4(),
            case_id=uuid4(),
            evidence_id=uuid4(),
            job_type=JobType.FULL_ANALYSIS,
            status=JobStatus.CREATED,
            progress_percent=0,
        )
        assert job.job_type == JobType.FULL_ANALYSIS
        assert job.status == JobStatus.CREATED
        assert job.progress_percent == 0

    def test_job_stages(self):
        assert JobStage.EVIDENCE_VERIFICATION.value == "evidence_verification"
        assert JobStage.XFS_ANALYSIS.value == "xfs_analysis"
        assert JobStage.CARVING.value == "carving"


class TestArtifactModel:
    def test_artifact_creation(self):
        artifact = Artifact(
            id=uuid4(),
            case_id=uuid4(),
            evidence_id=uuid4(),
            artifact_number="ART-0001",
            artifact_type=ArtifactType.RECOVERED_FILE,
            name="test.pdf",
            filesystem="xfs",
            recovery_method=RecoveryMethod.FILESYSTEM,
            recovery_status=RecoveryStatus.COMPLETE,
        )
        assert artifact.artifact_number == "ART-0001"
        assert artifact.artifact_type == ArtifactType.RECOVERED_FILE
        assert artifact.recovery_method == RecoveryMethod.FILESYSTEM


if __name__ == "__main__":
    pytest.main([__file__, "-v"])