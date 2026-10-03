//! Filesystem abstraction layer.
//!
//! Defines the traits that all filesystem parsers must implement.
//! Keeps filesystem-specific logic separate from recovery policy.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use evidence::{EvidenceSource, FilesystemType};
use metadata::{ObjectMetadata, RecoveryCandidate, RecoveryStatus};

/// Classification of a parse/analysis error.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ParseErrorKind {
    CorruptMetadata,
    UnsupportedFeature,
    InvalidStructure,
    ReadError,
    ParserError,
    PermissionError,
    IncompleteData,
    RecursionLimit,
    IntegerOverflow,
    InvalidPointer,
}

/// A non-fatal parse error.  Parsing continues after recording these.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseWarning {
    pub kind: ParseErrorKind,
    pub message: String,
    pub offset: Option<u64>,
    pub object_id: Option<u64>,
}

/// Summary of a filesystem analysis pass.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisSummary {
    pub filesystem_type: FilesystemType,
    pub filesystem_uuid: Option<String>,
    pub volume_label: Option<String>,
    /// Total objects (active + deleted).
    pub total_objects: u64,
    /// Objects identified as deleted or unreferenced.
    pub deleted_candidates: u64,
    /// Objects with recoverable content.
    pub recoverable: u64,
    pub partial_recoveries: u64,
    pub carved: u64,
    pub unrecoverable: u64,
    pub warnings: Vec<ParseWarning>,
}

/// Core trait that all filesystem parsers must implement.
pub trait FilesystemParser: Send + Sync {
    /// The filesystem type this parser handles.
    fn filesystem_type(&self) -> FilesystemType;

    /// Returns true if the source contains a recognizable filesystem.
    fn detect(&self, source: &mut EvidenceSource) -> Result<bool>;

    /// Parse filesystem geometry and superblock information.
    fn parse_superblock(&self, source: &mut EvidenceSource) -> Result<SuperblockInfo>;

    /// Enumerate all filesystem objects (active and deleted).
    fn enumerate_objects(
        &self,
        source: &mut EvidenceSource,
        superblock: &SuperblockInfo,
        callback: &mut dyn FnMut(ObjectRecord),
    ) -> Result<AnalysisSummary>;

    /// Attempt to recover content for a candidate.
    fn recover_content(
        &self,
        source: &mut EvidenceSource,
        candidate: &RecoveryCandidate,
        output: &mut dyn std::io::Write,
    ) -> Result<RecoveryResult>;
}

/// Filesystem geometry from the superblock.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuperblockInfo {
    pub filesystem_type: FilesystemType,
    pub uuid: Option<String>,
    pub volume_label: Option<String>,
    /// Total filesystem size in bytes.
    pub total_size: u64,
    /// Block size in bytes.
    pub block_size: u32,
    /// Sector size in bytes.
    pub sector_size: u32,
    /// Total block count.
    pub total_blocks: u64,
    /// Free blocks at time of image acquisition.
    pub free_blocks: Option<u64>,
    /// Inode/object count.
    pub inode_count: Option<u64>,
    /// Free inode/object count.
    pub free_inodes: Option<u64>,
    /// Filesystem-specific flags (raw).
    pub feature_flags: u64,
    /// Human-readable features list.
    pub features: Vec<String>,
    /// Whether the filesystem has a journal/log.
    pub has_journal: bool,
    /// Filesystem creation time if available.
    pub created_at: Option<i64>,
    /// Last mount time if available.
    pub last_mounted_at: Option<i64>,
    /// Last write time if available.
    pub last_written_at: Option<i64>,
    /// Additional filesystem-specific fields.
    pub extended: serde_json::Value,
}

/// A single filesystem object record (may be active or deleted).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectRecord {
    pub record_id: Uuid,
    pub evidence_id: Uuid,
    /// Filesystem-specific identifier.
    pub object_id: u64,
    pub parent_id: Option<u64>,
    pub filename: Option<String>,
    pub status: RecoveryStatus,
    pub metadata: Option<ObjectMetadata>,
    /// Byte offset of this record in the evidence.
    pub source_offset: u64,
}

/// Result of a content recovery attempt.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryResult {
    pub bytes_written: u64,
    pub status: RecoveryStatus,
    pub warnings: Vec<ParseWarning>,
    pub sha256: Option<String>,
    pub blake3: Option<String>,
}
