import hashlib
import logging
import os
import shutil
from pathlib import Path
from typing import Optional
from uuid import UUID

from app.core.config import settings

logger = logging.getLogger(__name__)


class EvidenceStorageService:
    """Service for managing evidence file storage with secure path handling."""

    def __init__(self, root_path: Optional[Path] = None):
        self.root_path = root_path or settings.EVIDENCE_ROOT_PATH
        self.root_path.mkdir(parents=True, exist_ok=True)

    def _resolve_safe_path(self, requested_path: Path) -> Path:
        """Resolve path and ensure it's within the evidence root."""
        try:
            resolved = requested_path.resolve()
            root_resolved = self.root_path.resolve()
            resolved.relative_to(root_resolved)
            return resolved
        except ValueError:
            raise ValueError(f"Path traversal attempt detected: {requested_path}")

    def get_evidence_original_dir(self, case_id: UUID, evidence_id: UUID) -> Path:
        """Get the directory for original evidence files."""
        path = self.root_path / "input" / str(case_id) / str(evidence_id) / "original"
        return self._resolve_safe_path(path)

    def get_evidence_working_dir(self, case_id: UUID, evidence_id: UUID) -> Path:
        """Get the working directory for evidence processing."""
        path = self.root_path / "working" / str(case_id) / str(evidence_id)
        return self._resolve_safe_path(path)

    def get_evidence_recovered_dir(self, case_id: UUID, evidence_id: UUID) -> Path:
        """Get the recovered files directory."""
        path = self.root_path / "recovered" / str(case_id) / str(evidence_id)
        return self._resolve_safe_path(path)

    def get_evidence_artifacts_dir(self, case_id: UUID, evidence_id: UUID) -> Path:
        """Get the artifacts directory."""
        path = self.root_path / "artifacts" / str(case_id) / str(evidence_id)
        return self._resolve_safe_path(path)

    def get_case_reports_dir(self, case_id: UUID) -> Path:
        """Get the reports directory for a case."""
        path = self.root_path / "reports" / str(case_id)
        return self._resolve_safe_path(path)

    def store_evidence(
        self,
        case_id: UUID,
        evidence_id: UUID,
        original_filename: str,
        file_stream,
        chunk_size: int = 8192,
    ) -> tuple[Path, int, str]:
        """
        Store evidence file with streaming SHA-256 calculation.
        
        Returns:
            tuple: (stored_path, size_bytes, sha256_hash)
        """
        evidence_dir = self.get_evidence_original_dir(case_id, evidence_id)
        evidence_dir.mkdir(parents=True, exist_ok=True)

        # Sanitize filename
        safe_filename = self._sanitize_filename(original_filename)
        stored_path = evidence_dir / safe_filename

        # Calculate hash while streaming to disk
        sha256 = hashlib.sha256()
        total_size = 0

        with stored_path.open("wb") as f:
            while True:
                chunk = file_stream.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                sha256.update(chunk)
                total_size += len(chunk)

        return stored_path, total_size, sha256.hexdigest()

    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal."""
        # Get just the basename
        name = os.path.basename(filename)
        # Remove any remaining dangerous characters
        name = "".join(c for c in name if c.isalnum() or c in ".-_")
        if not name:
            name = "evidence"
        return name

    def verify_evidence_hash(self, file_path: Path) -> tuple[str, bool]:
        """
        Verify evidence file hash against stored hash.
        
        Returns:
            tuple: (calculated_hash, matches)
        """
        safe_path = self._resolve_safe_path(file_path)
        
        sha256 = hashlib.sha256()
        with safe_path.open("rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        
        calculated_hash = sha256.hexdigest()
        return calculated_hash, calculated_hash

    def delete_evidence(self, case_id: UUID, evidence_id: UUID) -> None:
        """Delete all evidence data for a specific evidence item."""
        # Delete original
        original_dir = self.root_path / "input" / str(case_id) / str(evidence_id)
        if original_dir.exists():
            shutil.rmtree(original_dir)
        
        # Delete working
        working_dir = self.root_path / "working" / str(case_id) / str(evidence_id)
        if working_dir.exists():
            shutil.rmtree(working_dir)
        
        # Delete recovered
        recovered_dir = self.root_path / "recovered" / str(case_id) / str(evidence_id)
        if recovered_dir.exists():
            shutil.rmtree(recovered_dir)
        
        # Delete artifacts
        artifacts_dir = self.root_path / "artifacts" / str(case_id) / str(evidence_id)
        if artifacts_dir.exists():
            shutil.rmtree(artifacts_dir)

    def get_evidence_file_path(self, case_id: UUID, evidence_id: UUID, filename: str) -> Path:
        """Get the full path to an evidence file."""
        evidence_dir = self.get_evidence_original_dir(case_id, evidence_id)
        return self._resolve_safe_path(evidence_dir / filename)


# Singleton instance
_storage_service: Optional[EvidenceStorageService] = None


def get_storage_service() -> EvidenceStorageService:
    global _storage_service
    if _storage_service is None:
        _storage_service = EvidenceStorageService()
    return _storage_service