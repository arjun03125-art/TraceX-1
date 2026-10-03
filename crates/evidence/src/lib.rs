//! Evidence source abstraction layer.
//!
//! Provides read-only access to forensic images, block devices, and raw files.
//! NEVER modifies the evidence source.  All writes are explicitly prohibited.

use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::{bail, Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::{debug, info, warn};
use uuid::Uuid;

use hashing::{HashAlgorithm, HashResult, Hasher, FORENSIC_ALGORITHMS};

/// Error types specific to evidence handling.
#[derive(Debug, Error)]
pub enum EvidenceError {
    #[error("Evidence path does not exist: {0}")]
    NotFound(PathBuf),
    #[error("Evidence is not a supported source type")]
    UnsupportedSourceType,
    #[error("Write operations are forbidden on evidence sources")]
    WriteForbidden,
    #[error("Sector offset {offset} is out of bounds (source size: {size})")]
    OffsetOutOfBounds { offset: u64, size: u64 },
    #[error("Evidence I/O error: {0}")]
    Io(#[from] io::Error),
    #[error("Hashing failed: {0}")]
    Hash(#[from] hashing::HashError),
    #[error("Evidence verification failed — expected {expected}, computed {computed}")]
    HashMismatch { expected: String, computed: String },
}

/// Type of evidence source.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SourceType {
    /// Raw disk image (.img, .dd, .raw)
    RawImage,
    /// Physical or virtual block device (read-only mode)
    BlockDevice,
    /// Partition image (subset of a full disk)
    PartitionImage,
    /// E01 forensic image (future support)
    E01,
    /// AFF4 forensic container (future support)
    Aff4,
}

/// Metadata about the evidence source.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceInfo {
    pub evidence_id: Uuid,
    pub case_id: Option<Uuid>,
    pub source_path: PathBuf,
    pub source_type: SourceType,
    /// Total size in bytes.
    pub size: u64,
    /// Sector size (typically 512 or 4096).
    pub sector_size: u32,
    pub added_at: DateTime<Utc>,
    pub added_by: String,
    pub hashes: Vec<HashResult>,
    /// Optional expected hash for verification.
    pub expected_hash: Option<(HashAlgorithm, String)>,
    pub description: Option<String>,
}

impl EvidenceInfo {
    /// True if acquisition hash has been verified against expected.
    pub fn is_hash_verified(&self) -> bool {
        if let Some((alg, expected)) = &self.expected_hash {
            self.hashes
                .iter()
                .any(|h| h.algorithm == *alg && h.verify_against(expected))
        } else {
            false
        }
    }
}

/// Read-only evidence source.  Cannot be written to under any circumstances.
pub struct EvidenceSource {
    pub info: EvidenceInfo,
    /// The underlying file handle (opened O_RDONLY).
    file: File,
}

impl EvidenceSource {
    /// Open a raw image or block device in read-only mode.
    /// Immediately hashes the source with SHA-256 and BLAKE3.
    pub fn open(
        path: impl AsRef<Path>,
        source_type: SourceType,
        case_id: Option<Uuid>,
        added_by: impl Into<String>,
        description: Option<String>,
    ) -> Result<Self, EvidenceError> {
        let path = path.as_ref().to_path_buf();
        if !path.exists() {
            return Err(EvidenceError::NotFound(path));
        }

        // Open strictly read-only.
        let file = std::fs::OpenOptions::new()
            .read(true)
            .write(false)
            .create(false)
            .open(&path)?;

        let metadata = file.metadata()?;
        let size = metadata.len();

        info!(path = %path.display(), size, "Opened evidence source read-only");

        let info = EvidenceInfo {
            evidence_id: Uuid::new_v4(),
            case_id,
            source_path: path.clone(),
            source_type,
            size,
            sector_size: 512, // default; can be updated by caller
            added_at: Utc::now(),
            added_by: added_by.into(),
            hashes: Vec::new(),
            expected_hash: None,
            description,
        };

        Ok(Self { info, file })
    }

    /// Compute acquisition hashes (SHA-256 + BLAKE3).
    /// Must be called before analysis begins.
    pub fn acquire_hashes(&mut self, tool_version: &str) -> Result<&[HashResult], EvidenceError> {
        let hasher = Hasher::new(tool_version);
        let path = self.info.source_path.clone();
        info!(path = %path.display(), "Acquiring evidence hashes");

        let results = FORENSIC_ALGORITHMS
            .iter()
            .map(|&alg| {
                let f = std::fs::File::open(&path)?;
                hasher
                    .hash_reader(f, alg, path.display().to_string())
                    .map_err(EvidenceError::Hash)
            })
            .collect::<Result<Vec<_>, _>>()?;

        self.info.hashes = results;
        info!("Evidence hashing complete ({} hashes)", self.info.hashes.len());
        Ok(&self.info.hashes)
    }

    /// Verify the evidence hash against an expected digest.
    /// Returns Ok(()) if verified, Err if mismatch.
    pub fn verify_hash(
        &self,
        algorithm: HashAlgorithm,
        expected: &str,
    ) -> Result<(), EvidenceError> {
        let computed = self
            .info
            .hashes
            .iter()
            .find(|h| h.algorithm == algorithm)
            .ok_or_else(|| EvidenceError::Hash(hashing::HashError::Io(
                io::Error::new(io::ErrorKind::NotFound, "Hash not computed yet")
            )))?;

        if computed.verify_against(expected) {
            info!("Evidence hash verified OK ({:?})", algorithm);
            Ok(())
        } else {
            Err(EvidenceError::HashMismatch {
                expected: expected.to_string(),
                computed: computed.digest.clone(),
            })
        }
    }

    /// Read `len` bytes from absolute byte offset `offset`.
    /// Never seeks beyond the evidence boundary.
    pub fn read_at(&mut self, offset: u64, len: usize) -> Result<Vec<u8>, EvidenceError> {
        if offset >= self.info.size {
            return Err(EvidenceError::OffsetOutOfBounds {
                offset,
                size: self.info.size,
            });
        }
        let available = (self.info.size - offset).min(len as u64) as usize;
        let mut buf = vec![0u8; available];
        self.file.seek(SeekFrom::Start(offset))?;
        self.file.read_exact(&mut buf)?;
        Ok(buf)
    }

    /// Read a full sector at a given LBA.
    pub fn read_sector(&mut self, lba: u64) -> Result<Vec<u8>, EvidenceError> {
        let offset = lba * self.info.sector_size as u64;
        self.read_at(offset, self.info.sector_size as usize)
    }

    /// Size in sectors.
    pub fn sector_count(&self) -> u64 {
        self.info.size / self.info.sector_size as u64
    }

    /// Read up to `block_size` bytes from `block_index`.
    pub fn read_block(&mut self, block_index: u64, block_size: u32) -> Result<Vec<u8>, EvidenceError> {
        let offset = block_index * block_size as u64;
        self.read_at(offset, block_size as usize)
    }
}

/// Filesystem type detected from the evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FilesystemType {
    Xfs,
    Btrfs,
    Ext4,
    Ntfs,
    Apfs,
    Fat32,
    ExFat,
    Unknown,
}

impl FilesystemType {
    pub fn name(&self) -> &'static str {
        match self {
            FilesystemType::Xfs => "XFS",
            FilesystemType::Btrfs => "Btrfs",
            FilesystemType::Ext4 => "ext4",
            FilesystemType::Ntfs => "NTFS",
            FilesystemType::Apfs => "APFS",
            FilesystemType::Fat32 => "FAT32",
            FilesystemType::ExFat => "exFAT",
            FilesystemType::Unknown => "Unknown",
        }
    }

    pub fn is_supported(&self) -> bool {
        matches!(self, FilesystemType::Xfs | FilesystemType::Btrfs)
    }
}

/// Detect the filesystem type at a given byte offset in the evidence.
/// Returns FilesystemType::Unknown if not recognized.
pub fn detect_filesystem(source: &mut EvidenceSource, offset: u64) -> Result<FilesystemType> {
    // Read enough data to check magic numbers.
    // XFS superblock magic: 0x58465342 at offset 0
    // Btrfs superblock magic: "_BHRfS_M" at offset 0x10040
    let buf = source
        .read_at(offset, 0x11000)
        .context("Failed to read filesystem detection region")?;

    if buf.len() >= 4 {
        // XFS magic: 'XFSB' = [0x58, 0x46, 0x53, 0x42]
        if &buf[0..4] == b"XFSB" {
            debug!(offset, "XFS superblock magic detected");
            return Ok(FilesystemType::Xfs);
        }
    }

    // Btrfs superblock is at offset 0x10000 (65536) within the filesystem.
    // Magic: "_BHRfS_M" = [0x5f, 0x42, 0x48, 0x52, 0x66, 0x53, 0x5f, 0x4d]
    if buf.len() >= 0x10040 + 8 {
        if &buf[0x10040..0x10048] == b"_BHRfS_M" {
            debug!(offset, "Btrfs superblock magic detected");
            return Ok(FilesystemType::Btrfs);
        }
    }

    // ext4 magic at offset 0x438
    if buf.len() >= 0x43a {
        if buf[0x438] == 0x53 && buf[0x439] == 0xef {
            debug!(offset, "ext4 magic detected");
            return Ok(FilesystemType::Ext4);
        }
    }

    // NTFS magic at offset 3
    if buf.len() >= 7 && &buf[3..7] == b"NTFS" {
        debug!(offset, "NTFS magic detected");
        return Ok(FilesystemType::Ntfs);
    }

    Ok(FilesystemType::Unknown)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn make_temp_evidence(content: &[u8]) -> NamedTempFile {
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(content).unwrap();
        f.flush().unwrap();
        f
    }

    #[test]
    fn open_evidence_read_only() {
        let content = b"FORENSIC TEST IMAGE DATA";
        let tmp = make_temp_evidence(content);
        let src = EvidenceSource::open(
            tmp.path(),
            SourceType::RawImage,
            None,
            "test-investigator",
            None,
        )
        .unwrap();
        assert_eq!(src.info.size, content.len() as u64);
    }

    #[test]
    fn read_at_correct_bytes() {
        let content = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let tmp = make_temp_evidence(content);
        let mut src = EvidenceSource::open(
            tmp.path(),
            SourceType::RawImage,
            None,
            "test",
            None,
        )
        .unwrap();
        let data = src.read_at(5, 5).unwrap();
        assert_eq!(data, b"FGHIJ");
    }

    #[test]
    fn read_at_out_of_bounds_returns_error() {
        let content = b"ABC";
        let tmp = make_temp_evidence(content);
        let mut src = EvidenceSource::open(
            tmp.path(),
            SourceType::RawImage,
            None,
            "test",
            None,
        )
        .unwrap();
        let result = src.read_at(100, 10);
        assert!(matches!(result, Err(EvidenceError::OffsetOutOfBounds { .. })));
    }

    #[test]
    fn detect_xfs_magic() {
        // Build a minimal buffer with XFS magic at offset 0
        let mut content = vec![0u8; 0x11000];
        content[0] = 0x58; // X
        content[1] = 0x46; // F
        content[2] = 0x53; // S
        content[3] = 0x42; // B
        let tmp = make_temp_evidence(&content);
        let mut src = EvidenceSource::open(
            tmp.path(),
            SourceType::RawImage,
            None,
            "test",
            None,
        )
        .unwrap();
        let fs_type = detect_filesystem(&mut src, 0).unwrap();
        assert_eq!(fs_type, FilesystemType::Xfs);
    }

    #[test]
    fn detect_btrfs_magic() {
        let mut content = vec![0u8; 0x11000];
        // Btrfs magic at offset 0x10040
        let magic = b"_BHRfS_M";
        content[0x10040..0x10048].copy_from_slice(magic);
        let tmp = make_temp_evidence(&content);
        let mut src = EvidenceSource::open(
            tmp.path(),
            SourceType::RawImage,
            None,
            "test",
            None,
        )
        .unwrap();
        let fs_type = detect_filesystem(&mut src, 0).unwrap();
        assert_eq!(fs_type, FilesystemType::Btrfs);
    }

    #[test]
    fn detect_unknown_filesystem() {
        let content = vec![0u8; 0x11000];
        let tmp = make_temp_evidence(&content);
        let mut src = EvidenceSource::open(
            tmp.path(),
            SourceType::RawImage,
            None,
            "test",
            None,
        )
        .unwrap();
        let fs_type = detect_filesystem(&mut src, 0).unwrap();
        assert_eq!(fs_type, FilesystemType::Unknown);
    }

    #[test]
    fn hash_mismatch_returns_error() {
        let content = b"EVIDENCE";
        let tmp = make_temp_evidence(content);
        let mut src = EvidenceSource::open(
            tmp.path(),
            SourceType::RawImage,
            None,
            "test",
            None,
        )
        .unwrap();
        src.acquire_hashes("0.1.0").unwrap();
        let result = src.verify_hash(
            HashAlgorithm::Sha256,
            "0000000000000000000000000000000000000000000000000000000000000000",
        );
        assert!(matches!(result, Err(EvidenceError::HashMismatch { .. })));
    }
}
