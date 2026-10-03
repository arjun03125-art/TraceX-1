import pytest
import hashlib
import io
from pathlib import Path
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.evidence import add_evidence, get_evidence, verify_evidence, detect_filesystem, list_evidence
from app.models.case import Case
from app.models.evidence import Evidence, EvidenceStatus, FilesystemType


class TestEvidenceAPI:
    @pytest.fixture
    def mock_db(self):
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def mock_case(self):
        return Case(
            id=uuid4(),
            case_number="CASE-0001",
            name="Test Case",
            status="open",
        )

    @pytest.fixture
    def mock_evidence(self, mock_case):
        from datetime import datetime, UTC
        return Evidence(
            id=uuid4(),
            case_id=mock_case.id,
            evidence_number="EVD-0001",
            original_filename="disk.dd",
            stored_path="/evidence/disk.dd",
            size_bytes=1024,
            sha256_hash="a" * 64,
            filesystem_type=FilesystemType.XFS,
            status=EvidenceStatus.VERIFIED,
            metadata={},
            acquired_at=datetime.now(UTC),
        )

    @pytest.mark.asyncio
    async def test_add_evidence_success(self, mock_db, mock_case, tmp_path):
        mock_db.get.return_value = mock_case
        
        # Mock the execute to return a proper mock for scalar_one_or_none
        mock_execute_result = MagicMock()
        mock_execute_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_execute_result
        
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        test_content = b"test evidence content"
        expected_hash = hashlib.sha256(test_content).hexdigest()

        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "disk.dd"
        mock_file.content_type = "application/octet-stream"
        mock_file.file = io.BytesIO(test_content)

        with patch("app.api.evidence.get_storage_service") as mock_storage:
            storage = MagicMock()
            # Create the file so rename works
            test_file = tmp_path / "disk.dd"
            test_file.write_bytes(test_content)
            storage.store_evidence.return_value = (
                test_file,
                len(test_content),
                expected_hash,
            )
            storage.get_evidence_original_dir.return_value = tmp_path
            mock_storage.return_value = storage

            with patch("app.api.evidence.Evidence.generate_evidence_number", return_value=12345):
                result = await add_evidence(
                    case_id=mock_case.id,
                    file=mock_file,
                    db=mock_db,
                )

        assert result.original_filename == "disk.dd"
        assert result.sha256_hash == expected_hash
        assert result.size_bytes == len(test_content)
        mock_db.add.assert_called()
        mock_db.commit.assert_called()

    @pytest.mark.asyncio
    async def test_add_evidence_case_not_found(self, mock_db):
        mock_db.get.return_value = None
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "disk.dd"
        mock_file.file = io.BytesIO(b"test")

        with pytest.raises(Exception) as exc_info:
            await add_evidence(
                case_id=uuid4(),
                file=mock_file,
                db=mock_db,
            )
        assert "Case not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_add_evidence_duplicate_hash(self, mock_db, mock_case):
        mock_db.get.return_value = mock_case
        
        mock_existing = MagicMock()
        mock_execute_result = MagicMock()
        mock_execute_result.scalar_one_or_none.return_value = mock_existing
        mock_db.execute.return_value = mock_execute_result
        
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "disk.dd"
        mock_file.file = io.BytesIO(b"test")

        with patch("app.api.evidence.get_storage_service") as mock_storage:
            storage = MagicMock()
            storage.store_evidence.return_value = (Path("/tmp/test"), 100, "a" * 64)
            mock_storage.return_value = storage

            with pytest.raises(Exception) as exc_info:
                await add_evidence(
                    case_id=mock_case.id,
                    file=mock_file,
                    db=mock_db,
                )
            assert "already exists" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_list_evidence(self, mock_db, mock_case, mock_evidence):
        mock_db.get.return_value = mock_case
        
        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [mock_evidence]
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute.return_value = mock_result
        mock_db.scalar.return_value = 1

        result = await list_evidence(case_id=mock_case.id, page=1, page_size=20, db=mock_db)

        assert result.total == 1
        assert len(result.evidence) == 1
        assert result.evidence[0].evidence_number == "EVD-0001"

    @pytest.mark.asyncio
    async def test_get_evidence(self, mock_db, mock_evidence):
        mock_db.get.return_value = mock_evidence

        result = await get_evidence(case_id=mock_evidence.case_id, evidence_id=mock_evidence.id, db=mock_db)

        assert result.id == mock_evidence.id
        assert result.evidence_number == "EVD-0001"

    @pytest.mark.asyncio
    async def test_get_evidence_not_found(self, mock_db):
        mock_db.get.return_value = None

        with pytest.raises(Exception) as exc_info:
            await get_evidence(case_id=uuid4(), evidence_id=uuid4(), db=mock_db)
        assert "not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_verify_evidence_success(self, mock_db, mock_evidence, tmp_path):
        mock_db.get.return_value = mock_evidence
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.add = MagicMock()

        test_content = b"test evidence content"
        test_file = tmp_path / "test.dd"
        test_file.write_bytes(test_content)
        mock_evidence.stored_path = str(test_file)
        mock_evidence.sha256_hash = hashlib.sha256(test_content).hexdigest()

        with patch("app.api.evidence.get_hash_service") as mock_hash:
            hash_service = MagicMock()
            hash_service.verify_hash.return_value = (mock_evidence.sha256_hash, True)
            mock_hash.return_value = hash_service

            result = await verify_evidence(
                case_id=mock_evidence.case_id,
                evidence_id=mock_evidence.id,
                db=mock_db,
            )

        assert result.match is True
        assert result.status == "verified"
        assert mock_evidence.status == EvidenceStatus.VERIFIED

    @pytest.mark.asyncio
    async def test_verify_evidence_hash_mismatch(self, mock_db, mock_evidence, tmp_path):
        mock_db.get.return_value = mock_evidence
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.flush = AsyncMock()
        mock_db.add = MagicMock()

        test_content = b"test evidence content"
        test_file = tmp_path / "test.dd"
        test_file.write_bytes(test_content)
        mock_evidence.stored_path = str(test_file)
        mock_evidence.sha256_hash = "wrong_hash"

        with patch("app.api.evidence.get_hash_service") as mock_hash:
            hash_service = MagicMock()
            hash_service.verify_hash.return_value = (hashlib.sha256(test_content).hexdigest(), False)
            mock_hash.return_value = hash_service

            result = await verify_evidence(
                case_id=mock_evidence.case_id,
                evidence_id=mock_evidence.id,
                db=mock_db,
            )

        assert result.match is False
        assert result.status == "error"
        assert mock_evidence.status == EvidenceStatus.ERROR

    @pytest.mark.asyncio
    async def test_verify_evidence_file_missing(self, mock_db, mock_evidence):
        mock_db.get.return_value = mock_evidence
        mock_db.commit = AsyncMock()
        mock_db.add = MagicMock()
        mock_evidence.stored_path = "/nonexistent/path"

        with pytest.raises(Exception) as exc_info:
            await verify_evidence(
                case_id=mock_evidence.case_id,
                evidence_id=mock_evidence.id,
                db=mock_db,
            )
        assert "not found" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_detect_filesystem(self, mock_db, mock_evidence, tmp_path):
        mock_db.get.return_value = mock_evidence
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        mock_db.add = MagicMock()

        test_file = tmp_path / "test.dd"
        test_file.write_bytes(b"XFSB" + b"\x00" * 1000)
        mock_evidence.stored_path = str(test_file)

        with patch("app.api.evidence.get_filesystem_detector") as mock_detector:
            detector = MagicMock()
            detector.detect_with_confidence.return_value = (FilesystemType.XFS, 0.9)
            mock_detector.return_value = detector

            result = await detect_filesystem(
                case_id=mock_evidence.case_id,
                evidence_id=mock_evidence.id,
                db=mock_db,
            )

        assert result["filesystem_type"] == "xfs"
        assert result["confidence"] == 0.9
        assert mock_evidence.filesystem_type == FilesystemType.XFS