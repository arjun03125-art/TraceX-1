import pytest
import hashlib
from pathlib import Path
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.evidence_storage import EvidenceStorageService
from app.services.hash_service import HashService
from app.services.filesystem_detector import FilesystemDetector, get_filesystem_detector
from app.models.evidence import FilesystemType


class TestEvidenceStorageService:
    @pytest.fixture
    def storage(self, tmp_path):
        return EvidenceStorageService(tmp_path)

    @pytest.fixture
    def case_id(self):
        return uuid4()

    @pytest.fixture
    def evidence_id(self):
        return uuid4()

    def test_get_evidence_original_dir(self, storage, case_id, evidence_id):
        path = storage.get_evidence_original_dir(case_id, evidence_id)
        expected = storage.root_path / "input" / str(case_id) / str(evidence_id) / "original"
        assert path == expected

    def test_get_evidence_working_dir(self, storage, case_id, evidence_id):
        path = storage.get_evidence_working_dir(case_id, evidence_id)
        expected = storage.root_path / "working" / str(case_id) / str(evidence_id)
        assert path == expected

    def test_sanitize_filename(self, storage):
        assert storage._sanitize_filename("normal_file.txt") == "normal_file.txt"
        assert storage._sanitize_filename("file with spaces.txt") == "filewithspaces.txt"
        assert storage._sanitize_filename("../../etc/passwd") == "passwd"
        assert storage._sanitize_filename("") == "evidence"
        assert storage._sanitize_filename("file@#$%.txt") == "file.txt"

    def test_store_evidence_streaming_hash(self, storage, case_id, evidence_id, tmp_path):
        # Create a test file
        test_content = b"test content for streaming hash"
        test_file = tmp_path / "test.txt"
        test_file.write_bytes(test_content)

        with test_file.open("rb") as f:
            stored_path, size, sha256 = storage.store_evidence(case_id, evidence_id, "test.txt", f)

        assert size == len(test_content)
        assert sha256 == hashlib.sha256(test_content).hexdigest()
        assert stored_path.exists()
        assert stored_path.read_bytes() == test_content

    def test_path_traversal_protection(self, storage, case_id, evidence_id):
        # Try to escape the evidence root
        with pytest.raises(ValueError, match="Path traversal"):
            storage._resolve_safe_path(Path("/etc/passwd"))

    def test_delete_evidence(self, storage, case_id, evidence_id, tmp_path):
        # Create some directories
        original_dir = storage.get_evidence_original_dir(case_id, evidence_id)
        original_dir.mkdir(parents=True)
        (original_dir / "test.txt").write_text("test")

        working_dir = storage.get_evidence_working_dir(case_id, evidence_id)
        working_dir.mkdir(parents=True)

        storage.delete_evidence(case_id, evidence_id)

        assert not original_dir.exists()
        assert not working_dir.exists()


class TestHashService:
    @pytest.fixture
    def hash_service(self):
        return HashService()

    @pytest.fixture
    def test_file(self, tmp_path):
        content = b"test file content for hashing"
        f = tmp_path / "test.bin"
        f.write_bytes(content)
        return f, content

    def test_calculate_sha256(self, hash_service, test_file):
        file_path, content = test_file
        hash_val = hash_service.calculate_sha256(file_path)
        assert hash_val == hashlib.sha256(content).hexdigest()

    def test_verify_hash_success(self, hash_service, test_file):
        file_path, content = test_file
        expected = hashlib.sha256(content).hexdigest()
        calculated, matches = hash_service.verify_hash(file_path, expected)
        assert matches is True
        assert calculated == expected

    def test_verify_hash_failure(self, hash_service, test_file):
        file_path, _ = test_file
        calculated, matches = hash_service.verify_hash(file_path, "wrong_hash")
        assert matches is False
        assert calculated != "wrong_hash"

    def test_calculate_sha256_stream(self, hash_service):
        import io
        content = b"streaming test content"
        stream = io.BytesIO(content)
        hash_val, total = hash_service.calculate_sha256_stream(stream)
        assert hash_val == hashlib.sha256(content).hexdigest()
        assert total == len(content)


class TestFilesystemDetector:
    @pytest.fixture
    def detector(self):
        return FilesystemDetector()

    @pytest.fixture
    def xfs_file(self, tmp_path):
        # XFS signature at offset 0: "XFSB"
        f = tmp_path / "test.xfs"
        f.write_bytes(b"XFSB" + b"\x00" * 1000)
        return f

    @pytest.fixture
    def btrfs_file(self, tmp_path):
        # Btrfs signature at offset 0x10000: "_BHRfS_M"
        f = tmp_path / "test.btrfs"
        data = bytearray(0x10000 + 8)
        data[0x10000:0x10000+8] = b"_BHRfS_M"
        f.write_bytes(data)
        return f

    @pytest.fixture
    def ext4_file(self, tmp_path):
        # ext4 signature at offset 0x400: 0xEF53 (little endian: 0x53 0xef)
        f = tmp_path / "test.ext4"
        data = bytearray(0x400 + 2)
        data[0x400] = 0x53
        data[0x401] = 0xef
        f.write_bytes(data)
        return f

    @pytest.fixture
    def ntfs_file(self, tmp_path):
        # NTFS signature at offset 3: "NTFS    "
        f = tmp_path / "test.ntfs"
        data = bytearray(100)
        data[3:11] = b"NTFS    "
        f.write_bytes(data)
        return f

    def test_detect_xfs(self, detector, xfs_file):
        fs_type = detector.detect(xfs_file)
        assert fs_type == FilesystemType.XFS

    def test_detect_btrfs(self, detector, btrfs_file):
        fs_type = detector.detect(btrfs_file)
        assert fs_type == FilesystemType.BTRFS

    def test_detect_ext4(self, detector, ext4_file):
        fs_type = detector.detect(ext4_file)
        assert fs_type == FilesystemType.EXT4

    def test_detect_ntfs(self, detector, ntfs_file):
        fs_type = detector.detect(ntfs_file)
        assert fs_type == FilesystemType.NTFS

    def test_detect_unknown(self, detector, tmp_path):
        f = tmp_path / "unknown.bin"
        f.write_bytes(b"random data" * 100)
        fs_type = detector.detect(f)
        assert fs_type == FilesystemType.UNKNOWN

    def test_detect_with_confidence(self, detector, xfs_file):
        fs_type, confidence = detector.detect_with_confidence(xfs_file)
        assert fs_type == FilesystemType.XFS
        assert confidence > 0.8


class TestFilesystemDetectorSingleton:
    def test_get_filesystem_detector_returns_same_instance(self):
        detector1 = get_filesystem_detector()
        detector2 = get_filesystem_detector()
        assert detector1 is detector2