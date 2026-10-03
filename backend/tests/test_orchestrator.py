import pytest
from pathlib import Path
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
import hashlib

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import Case
from app.models.evidence import Evidence, EvidenceStatus, FilesystemType
from app.models.analysis_job import AnalysisJob, JobStatus, JobType
from app.orchestrator.service import OrchestrationService


class TestOrchestrationService:
    @pytest.fixture
    def mock_db(self):
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def service(self, mock_db):
        return OrchestrationService(mock_db)

    @pytest.fixture
    def sample_case(self):
        return Case(
            id=uuid4(),
            case_number="CASE-0001",
            name="Test Case",
            status="open",
        )

    @pytest.fixture
    def sample_evidence(self, sample_case):
        return Evidence(
            id=uuid4(),
            case_id=sample_case.id,
            evidence_number="EVD-0001",
            original_filename="disk.dd",
            stored_path="/evidence/disk.dd",
            size_bytes=1024,
            sha256_hash="a" * 64,
            filesystem_type=FilesystemType.XFS,
            status=EvidenceStatus.IMPORTED,
        )

    @pytest.mark.asyncio
    async def test_create_job(self, service, sample_case, sample_evidence):
        job = await service.create_job(
            case_id=sample_case.id,
            evidence_id=sample_evidence.id,
            job_type=JobType.FULL_ANALYSIS,
        )

        assert job.case_id == sample_case.id
        assert job.evidence_id == sample_evidence.id
        assert job.job_type == JobType.FULL_ANALYSIS
        assert job.status == JobStatus.CREATED
        service.db.add.assert_called()
        service.db.flush.assert_called()

    @pytest.mark.asyncio
    async def test_verify_evidence_success(self, service, sample_evidence, tmp_path):
        test_file = tmp_path / "test.dd"
        test_content = b"test content"
        test_file.write_bytes(test_content)
        sample_evidence.stored_path = str(test_file)
        sample_evidence.sha256_hash = hashlib.sha256(test_content).hexdigest()

        await service._verify_evidence(sample_evidence)
        assert sample_evidence.status == EvidenceStatus.VERIFIED

    @pytest.mark.asyncio
    async def test_verify_evidence_hash_mismatch(self, service, sample_evidence, tmp_path):
        test_file = tmp_path / "test.dd"
        test_file.write_bytes(b"test content")
        sample_evidence.stored_path = str(test_file)
        sample_evidence.sha256_hash = "wrong_hash"

        with pytest.raises(ValueError, match="Hash mismatch"):
            await service._verify_evidence(sample_evidence)

    @pytest.mark.asyncio
    async def test_verify_evidence_file_not_found(self, service, sample_evidence):
        sample_evidence.stored_path = "/nonexistent/path"
        with pytest.raises(FileNotFoundError):
            await service._verify_evidence(sample_evidence)

    @pytest.mark.asyncio
    async def test_detect_filesystem_xfs(self, service, sample_evidence):
        sample_evidence.original_filename = "disk_xfs.dd"
        fs_type = await service._detect_filesystem(sample_evidence)
        assert fs_type == FilesystemType.XFS

    @pytest.mark.asyncio
    async def test_detect_filesystem_btrfs(self, service, sample_evidence):
        sample_evidence.original_filename = "disk_btrfs.dd"
        fs_type = await service._detect_filesystem(sample_evidence)
        assert fs_type == FilesystemType.BTRFS

    @pytest.mark.asyncio
    async def test_detect_filesystem_unknown_defaults_xfs(self, service, sample_evidence):
        sample_evidence.original_filename = "unknown.dd"
        fs_type = await service._detect_filesystem(sample_evidence)
        assert fs_type == FilesystemType.XFS

    def test_select_engines_xfs_full(self, service):
        engines = service._select_engines(FilesystemType.XFS, JobType.FULL_ANALYSIS)
        assert "xfs" in engines
        assert "carving" in engines
        assert "btrfs" not in engines

    def test_select_engines_btrfs_full(self, service):
        engines = service._select_engines(FilesystemType.BTRFS, JobType.FULL_ANALYSIS)
        assert "btrfs" in engines
        assert "carving" in engines
        assert "xfs" not in engines

    def test_select_engines_unknown_full(self, service):
        engines = service._select_engines(FilesystemType.UNKNOWN, JobType.FULL_ANALYSIS)
        assert "xfs" in engines
        assert "btrfs" in engines
        assert "carving" in engines

    def test_select_engines_carving_only(self, service):
        engines = service._select_engines(FilesystemType.XFS, JobType.CARVING_ONLY)
        assert engines == ["carving"]

    def test_engine_to_stage(self, service):
        assert service._engine_to_stage("xfs").value == "xfs_analysis"
        assert service._engine_to_stage("btrfs").value == "btrfs_analysis"
        assert service._engine_to_stage("carving").value == "carving"
        assert service._engine_to_stage("unknown").value == "normalization"