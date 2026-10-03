import hashlib
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class HashService:
    """Service for calculating and verifying file hashes."""

    def __init__(self, chunk_size: int = 8192):
        self.chunk_size = chunk_size

    def calculate_sha256(self, file_path: Path) -> str:
        """
        Calculate SHA-256 hash of a file using streaming.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Hex digest of SHA-256 hash
        """
        sha256 = hashlib.sha256()
        with file_path.open("rb") as f:
            for chunk in iter(lambda: f.read(self.chunk_size), b""):
                sha256.update(chunk)
        
        return sha256.hexdigest()

    def verify_hash(self, file_path: Path, expected_hash: str) -> tuple[str, bool]:
        """
        Verify file hash against expected value.
        
        Args:
            file_path: Path to the file
            expected_hash: Expected SHA-256 hex digest
            
        Returns:
            tuple: (calculated_hash, matches)
        """
        calculated = self.calculate_sha256(file_path)
        return calculated, calculated == expected_hash

    def calculate_sha256_stream(self, stream, chunk_size: int = 8192) -> tuple[str, int]:
        """
        Calculate SHA-256 from a stream while counting bytes.
        
        Args:
            stream: Readable stream
            chunk_size: Size of chunks to read
            
        Returns:
            tuple: (sha256_hex, total_bytes)
        """
        sha256 = hashlib.sha256()
        total = 0
        
        while True:
            chunk = stream.read(chunk_size)
            if not chunk:
                break
            sha256.update(chunk)
            total += len(chunk)
        
        return sha256.hexdigest(), total


# Singleton instance
_hash_service: Optional[HashService] = None


def get_hash_service() -> HashService:
    global _hash_service
    if _hash_service is None:
        _hash_service = HashService()
    return _hash_service