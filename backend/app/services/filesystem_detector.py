import logging
from pathlib import Path
from typing import Optional

from app.models.evidence import FilesystemType

logger = logging.getLogger(__name__)


class FilesystemDetector:
    """Detect filesystem type from evidence file using signature analysis."""

    # Filesystem signatures (magic bytes)
    SIGNATURES = {
        FilesystemType.XFS: [
            # XFS superblock magic: "XFSB" at offset 0
            (0, b"XFSB"),
        ],
        FilesystemType.BTRFS: [
            # Btrfs superblock magic: "_BHRfS_M" at offset 0x10000 (64KB)
            (0x10000, b"_BHRfS_M"),
            # Alternative location at 0x10000 + 64KB * n
        ],
        FilesystemType.EXT4: [
            # ext4 superblock magic: 0xEF53 at offset 1024 (0x400)
            (0x400, b"\x53\xef"),
        ],
        FilesystemType.NTFS: [
            # NTFS boot sector: "NTFS    " at offset 3
            (3, b"NTFS    "),
        ],
        FilesystemType.FAT32: [
            # FAT32 boot sector: jump instruction + OEM name
            (0, b"\xeb"),
            (0x36, b"FAT32   "),
        ],
    }

    def __init__(self, max_read_size: int = 1024 * 1024):  # 1MB max read
        self.max_read_size = max_read_size

    def detect(self, file_path: Path) -> FilesystemType:
        """
        Detect filesystem type from evidence file.
        
        Reads the file at known superblock offsets to identify filesystem signatures.
        """
        try:
            with file_path.open("rb") as f:
                # Read first 1MB which should contain most superblocks
                data = f.read(self.max_read_size)
            
            if not data:
                logger.warning(f"Empty file: {file_path}")
                return FilesystemType.UNKNOWN

            # Check each filesystem signature
            for fs_type, signatures in self.SIGNATURES.items():
                for offset, signature in signatures:
                    if self._check_signature(data, offset, signature):
                        logger.info(f"Detected {fs_type.value} filesystem at offset {offset}")
                        return fs_type

            logger.info(f"No known filesystem signature found in {file_path}")
            return FilesystemType.UNKNOWN

        except Exception as e:
            logger.error(f"Filesystem detection failed for {file_path}: {e}")
            return FilesystemType.UNKNOWN

    def _check_signature(self, data: bytes, offset: int, signature: bytes) -> bool:
        """Check if signature exists at offset in data."""
        end = offset + len(signature)
        if end > len(data):
            return False
        return data[offset:end] == signature

    def detect_with_confidence(self, file_path: Path) -> tuple[FilesystemType, float]:
        """
        Detect filesystem with confidence score.
        
        Returns:
            tuple: (filesystem_type, confidence_0_to_1)
        """
        try:
            with file_path.open("rb") as f:
                data = f.read(self.max_read_size)
            
            if not data:
                return FilesystemType.UNKNOWN, 0.0

            best_match = FilesystemType.UNKNOWN
            best_confidence = 0.0

            for fs_type, signatures in self.SIGNATURES.items():
                for offset, signature in signatures:
                    if self._check_signature(data, offset, signature):
                        # Higher confidence for signatures at expected locations
                        confidence = 0.9 if offset == 0 else 0.8
                        if confidence > best_confidence:
                            best_confidence = confidence
                            best_match = fs_type

            return best_match, best_confidence

        except Exception as e:
            logger.error(f"Filesystem detection failed for {file_path}: {e}")
            return FilesystemType.UNKNOWN, 0.0


# Singleton instance
_detector: Optional[FilesystemDetector] = None


def get_filesystem_detector() -> FilesystemDetector:
    global _detector
    if _detector is None:
        _detector = FilesystemDetector()
    return _detector