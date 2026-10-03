import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evidence import Evidence, EvidenceStatus, FilesystemType
from app.models.analysis_job import AnalysisJob, JobStatus, JobType
from app.orchestrator.service import OrchestrationService


class TestOrchestratorIntegrityBlocking:
    @pytest.fixture
    def mock_db(self):
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def service(self, mock_db):
        return OrchestrationService(mock_db)

    @pytest.fixture
    def sample_case(self):
        case = MagicMock()
        case.id = uuid4()
        case.case_number = "CASE-0001"
        case.name = "Test Case"
        case.status = "open"
        return case

    @pytest.fixture
    def sample_evidence_error(self, sample_case):
        evidence = MagicMock(spec=Evidence)
        evidence.id = uuid4()
        evidence.case_id = sample_case.id
        evidence.evidence_number = "EVD-0002"
        evidence.original_filename = "corrupted.dd"
        evidence.stored_path = "/evidence/corrupted.dd"
        evidence.size_bytes = 1024
        evidence.sha256_hash = "a" * 64
        evidence.filesystem_type = FilesystemType.UNKNOWN
        evidence.status = EvidenceStatus.ERROR
        return evidence

    @pytest.fixture
    def sample_evidence_verified(self, sample_case):
        evidence = MagicMock(spec=Evidence)
        evidence.id = uuid4()
        evidence.case_id = sample_case.id
        evidence.evidence_number = "EVD-0001"
        evidence.original_filename = "disk_xfs.dd"
        evidence.stored_path = "/evidence/disk_xfs.dd"
        evidence.size_bytes = 1024
        evidence.sha256_hash = "a" * 64
        evidence.filesystem_type = FilesystemType.XFS
        evidence.status = EvidenceStatus.VERIFIED
        return evidence

    @pytest.fixture
    def sample_evidence_imported(self, sample_case):
        evidence = MagicMock(spec=Evidence)
        evidence.id = uuid4()
        evidence.case_id = sample_case.id
        evidence.evidence_number = "EVD-0003"
        evidence.original_filename = "new.dd"
        evidence.stored_path = "/evidence/new.dd"
        evidence.size_bytes = 1024
        evidence.sha256_hash = "a" * 64
        evidence.filesystem_type = FilesystemType.UNKNOWN
        evidence.status = EvidenceStatus.IMPORTED
        return evidence

    def _setup_db_get(self, mock_db, job, evidence):
        """Setup db.get to return job first, then evidence on subsequent calls."""
        call_count = [0]
        
        async def mock_get(model, id):
            call_count[0] += 1
            if call_count[0] == 1:
                return job
            return evidence
        
        mock_db.get.side_effect = mock_get

    @pytest.mark.asyncio
    async def test_run_job_blocks_on_error_status(self, service, sample_case, sample_evidence_error):
        job = MagicMock(spec=AnalysisJob)
        job.id = uuid4()
        job.case_id = sample_case.id
        job.evidence_id = sample_evidence_error.id
        job.job_type = JobType.FULL_ANALYSIS
        job.status = JobStatus.CREATED
        job.config = {}
        job.error = None
        job.started_at = None
        job.completed_at = None
        
        self._setup_db_get(service.db, job, sample_evidence_error)
        service.db.flush = AsyncMock()
        service.db.commit = AsyncMock()

        result = await service.run_job(job.id)

        assert result.status == JobStatus.FAILED
        assert "integrity" in result.error.lower()

    @pytest.mark.asyncio
    async def test_run_job_allows_verified_evidence(self, service, sample_case, sample_evidence_verified):
        job = MagicMock(spec=AnalysisJob)
        job.id = uuid4()
        job.case_id = sample_case.id
        job.evidence_id = sample_evidence_verified.id
        job.job_type = JobType.FULL_ANALYSIS
        job.status = JobStatus.CREATED
        job.config = {}
        job.error = None
        job.started_at = None
        job.completed_at = None
        
        self._setup_db_get(service.db, job, sample_evidence_verified)
        service.db.flush = AsyncMock()
        service.db.commit = AsyncMock()

        service._verify_evidence = AsyncMock()
        service._detect_filesystem = AsyncMock(return_value=FilesystemType.XFS)
        service._select_engines = MagicMock(return_value=["xfs", "carving"])
        service._run_engine = AsyncMock(return_value=[])
        service._update_stage = AsyncMock()

        result = await service.run_job(job.id)

        service._verify_evidence.assert_called_once()

    @pytest.mark.asyncio
    async def test_run_job_allows_imported_evidence_then_verifies(self, service, sample_case, sample_evidence_imported):
        job = MagicMock(spec=AnalysisJob)
        job.id = uuid4()
        job.case_id = sample_case.id
        job.evidence_id = sample_evidence_imported.id
        job.job_type = JobType.FULL_ANALYSIS
        job.status = JobStatus.CREATED
        job.config = {}
        job.error = None
        job.started_at = None
        job.completed_at = None
        
        self._setup_db_get(service.db, job, sample_evidence_imported)
        service.db.flush = AsyncMock()
        service.db.commit = AsyncMock()

        mock_verify = AsyncMock()
        async def mock_verify_impl(evidence):
            evidence.status = EvidenceStatus.VERIFIED
        mock_verify.side_effect = mock_verify_impl
        
        service._verify_evidence = mock_verify
        service._detect_filesystem = AsyncMock(return_value=FilesystemType.XFS)
        service._select_engines = MagicMock(return_value=["xfs", "carving"])
        service._run_engine = AsyncMock(return_value=[])
        service._update_stage = AsyncMock()

        result = await service.run_job(job.id)

        mock_verify.assert_called_once()

    @pytest.mark.asyncio
    async def test_run_job_fails_if_verify_results_in_error(self, service, sample_case, sample_evidence_imported):
        job = MagicMock(spec=AnalysisJob)
        job.id = uuid4()
        job.case_id = sample_case.id
        job.evidence_id = sample_evidence_imported.id
        job.job_type = JobType.FULL_ANALYSIS
        job.status = JobStatus.CREATED
        job.config = {}
        job.error = None
        job.started_at = None
        job.completed_at = None
        
        self._setup_db_get(service.db, job, sample_evidence_imported)
        service.db.flush = AsyncMock()
        service.db.commit = AsyncMock()

        async def mock_verify(evidence):
            evidence.status = EvidenceStatus.ERROR
        
        service._verify_evidence = mock_verify
        service._update_stage = AsyncMock()

        result = await service.run_job(job.id)

        assert result.status == JobStatus.FAILED
        assert "integrity verification failed" in result.error.lower()