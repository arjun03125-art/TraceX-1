import pytest
from uuid import uuid4
from datetime import datetime, timezone

from app.schemas.case import CaseCreate, CaseUpdate, CaseResponse
from app.schemas.evidence import EvidenceCreate, EvidenceResponse
from app.schemas.analysis import AnalysisJobCreate, AnalysisJobResponse
from app.schemas.artifact import ArtifactCreate, ArtifactResponse
from app.schemas.timeline import TimelineEventCreate, TimelineEventResponse


class TestCaseSchemas:
    def test_case_create(self):
        data = CaseCreate(name="Test Case", description="Description")
        assert data.name == "Test Case"
        assert data.description == "Description"

    def test_case_update(self):
        data = CaseUpdate(name="Updated", status="completed")
        assert data.name == "Updated"
        assert data.status == "completed"

    def test_case_response(self):
        case_id = uuid4()
        data = CaseResponse(
            id=case_id,
            case_number="CASE-0001",
            name="Test",
            description=None,
            investigator_id=None,
            status="open",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        assert data.id == case_id
        assert data.case_number == "CASE-0001"


class TestEvidenceSchemas:
    def test_evidence_create(self):
        data = EvidenceCreate(original_filename="disk.dd")
        assert data.original_filename == "disk.dd"

    def test_evidence_response(self):
        evidence_id = uuid4()
        case_id = uuid4()
        data = EvidenceResponse(
            id=evidence_id,
            case_id=case_id,
            evidence_number="EVD-0001",
            original_filename="disk.dd",
            stored_path="/evidence/disk.dd",
            size_bytes=1024,
            sha256_hash="a" * 64,
            mime_type=None,
            filesystem_type="xfs",
            status="verified",
            metadata={},
            acquired_at=datetime.now(timezone.utc),
            acquired_by=None,
        )
        assert data.id == evidence_id
        assert data.sha256_hash == "a" * 64


class TestAnalysisSchemas:
    def test_analysis_create(self):
        evidence_id = uuid4()
        data = AnalysisJobCreate(evidence_id=evidence_id, job_type="full_analysis")
        assert data.evidence_id == evidence_id
        assert data.job_type == "full_analysis"

    def test_analysis_response(self):
        job_id = uuid4()
        case_id = uuid4()
        evidence_id = uuid4()
        data = AnalysisJobResponse(
            id=job_id,
            case_id=case_id,
            evidence_id=evidence_id,
            job_type="full_analysis",
            status="created",
            current_stage=None,
            progress_percent=0,
            config={},
            error=None,
            created_at=datetime.now(timezone.utc),
            started_at=None,
            completed_at=None,
        )
        assert data.id == job_id


class TestArtifactSchemas:
    def test_artifact_create(self):
        case_id = uuid4()
        evidence_id = uuid4()
        data = ArtifactCreate(
            case_id=case_id,
            evidence_id=evidence_id,
            artifact_number="ART-0001",
            artifact_type="recovered_file",
            name="test.pdf",
            recovery_method="filesystem",
            recovery_status="complete",
        )
        assert data.artifact_number == "ART-0001"
        assert data.artifact_type == "recovered_file"

    def test_artifact_response(self):
        artifact_id = uuid4()
        case_id = uuid4()
        evidence_id = uuid4()
        data = ArtifactResponse(
            id=artifact_id,
            case_id=case_id,
            evidence_id=evidence_id,
            artifact_number="ART-0001",
            artifact_type="recovered_file",
            name="test.pdf",
            path=None,
            filesystem="xfs",
            size_bytes=None,
            timestamps={},
            hashes={},
            recovery_method="filesystem",
            recovery_status="complete",
            validation={},
            provenance={},
            confidence_score=None,
            confidence_signals={},
            created_at=datetime.now(timezone.utc),
        )
        assert data.id == artifact_id


class TestTimelineSchemas:
    def test_timeline_create(self):
        case_id = uuid4()
        data = TimelineEventCreate(
            case_id=case_id,
            event_timestamp=datetime.now(timezone.utc),
            timestamp_type="created",
            source="filesystem",
            description="File created",
        )
        assert data.case_id == case_id
        assert data.timestamp_type == "created"

    def test_timeline_response(self):
        event_id = uuid4()
        case_id = uuid4()
        data = TimelineEventResponse(
            id=event_id,
            case_id=case_id,
            artifact_id=None,
            event_timestamp=datetime.now(timezone.utc),
            timestamp_type="created",
            source="filesystem",
            description="File created",
            confidence=None,
            provenance={},
            created_at=datetime.now(timezone.utc),
        )
        assert data.id == event_id