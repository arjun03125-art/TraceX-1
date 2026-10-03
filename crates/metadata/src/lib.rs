//! Metadata model for forensic filesystem objects.
//!
//! All metadata carries explicit provenance — each field records how it was
//! obtained (RECOVERED, INFERRED, DERIVED, UNKNOWN).  Never fabricate values.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Provenance of a metadata field.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MetadataSource {
    /// Directly read from filesystem structures.
    Recovered,
    /// Logically inferred from other recovered values.
    Inferred,
    /// Derived from a calculation (e.g. block count × block size).
    Derived,
    /// Not available in the evidence.
    Unknown,
}

/// A metadata value with explicit provenance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaField<T: Clone + Serialize> {
    pub value: Option<T>,
    pub source: MetadataSource,
    /// Human-readable explanation of how the value was obtained.
    pub note: Option<String>,
}

impl<T: Clone + Serialize> MetaField<T> {
    pub fn recovered(value: T) -> Self {
        Self { value: Some(value), source: MetadataSource::Recovered, note: None }
    }
    pub fn inferred(value: T, note: impl Into<String>) -> Self {
        Self { value: Some(value), source: MetadataSource::Inferred, note: Some(note.into()) }
    }
    pub fn derived(value: T, note: impl Into<String>) -> Self {
        Self { value: Some(value), source: MetadataSource::Derived, note: Some(note.into()) }
    }
    pub fn unknown() -> Self {
        Self { value: None, source: MetadataSource::Unknown, note: None }
    }
}

/// File object type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ObjectType {
    RegularFile,
    Directory,
    SymbolicLink,
    BlockDevice,
    CharDevice,
    Fifo,
    Socket,
    Unknown,
}

/// Timestamp with explicit provenance label.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TimestampKind {
    Created,
    Modified,
    MetadataChanged,
    Accessed,
    Deleted,
    TransactionTime,
}

/// A single timestamp entry with provenance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForensicTimestamp {
    pub kind: TimestampKind,
    /// UTC timestamp. None if unavailable.
    pub value: Option<DateTime<Utc>>,
    pub source: MetadataSource,
    pub note: Option<String>,
}

impl ForensicTimestamp {
    pub fn recovered(kind: TimestampKind, value: DateTime<Utc>) -> Self {
        Self { kind, value: Some(value), source: MetadataSource::Recovered, note: None }
    }
    pub fn unknown(kind: TimestampKind) -> Self {
        Self { kind, value: None, source: MetadataSource::Unknown, note: None }
    }
}

/// Full metadata record for a recovered or candidate forensic object.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectMetadata {
    pub metadata_id: Uuid,
    pub evidence_id: Uuid,

    /// Filesystem-specific identifier (inode number, object ID, etc.)
    pub object_id: MetaField<u64>,
    pub parent_id: MetaField<u64>,

    pub filename: MetaField<String>,
    pub path: MetaField<String>,

    pub object_type: MetaField<ObjectType>,
    /// Unix permission bits.
    pub permissions: MetaField<u32>,
    pub uid: MetaField<u32>,
    pub gid: MetaField<u32>,
    pub link_count: MetaField<u32>,

    /// Logical file size in bytes.
    pub size: MetaField<u64>,
    /// Allocated size (may differ due to sparse files, alignment).
    pub allocated_size: MetaField<u64>,

    /// Number of filesystem blocks/extents.
    pub extent_count: MetaField<u32>,

    /// Filesystem-specific flags.
    pub flags: MetaField<u64>,

    /// Extended attributes present.
    pub has_xattrs: MetaField<bool>,

    /// Timestamps — multiple may be present.
    pub timestamps: Vec<ForensicTimestamp>,

    /// If this is a symlink, the link target.
    pub symlink_target: MetaField<String>,

    pub created_at: DateTime<Utc>,
}

impl ObjectMetadata {
    pub fn new(evidence_id: Uuid) -> Self {
        Self {
            metadata_id: Uuid::new_v4(),
            evidence_id,
            object_id: MetaField::unknown(),
            parent_id: MetaField::unknown(),
            filename: MetaField::unknown(),
            path: MetaField::unknown(),
            object_type: MetaField::unknown(),
            permissions: MetaField::unknown(),
            uid: MetaField::unknown(),
            gid: MetaField::unknown(),
            link_count: MetaField::unknown(),
            size: MetaField::unknown(),
            allocated_size: MetaField::unknown(),
            extent_count: MetaField::unknown(),
            flags: MetaField::unknown(),
            has_xattrs: MetaField::unknown(),
            timestamps: Vec::new(),
            symlink_target: MetaField::unknown(),
            created_at: Utc::now(),
        }
    }

    pub fn get_timestamp(&self, kind: &TimestampKind) -> Option<&ForensicTimestamp> {
        self.timestamps.iter().find(|t| {
            std::mem::discriminant(&t.kind) == std::mem::discriminant(kind)
        })
    }
}

/// Recovery status — how much content and metadata was obtainable.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RecoveryStatus {
    /// Full content and metadata recovered and validated.
    Confirmed,
    /// Content recovered but validation incomplete or uncertain.
    Probable,
    /// Some content recovered, some missing.
    Partial,
    /// Recovered via file carving only — no filesystem metadata.
    Carved,
    /// Content cannot be recovered (blocks reused, overwritten, etc.)
    Unrecoverable,
    /// Status not yet determined.
    Unknown,
}

/// Overall confidence level in a recovery result.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ConfidenceLevel {
    High,
    Medium,
    Low,
    Unknown,
}

/// Individual signals contributing to confidence.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceSignals {
    pub metadata_validity: Option<bool>,
    pub extent_validity: Option<bool>,
    pub signature_validity: Option<bool>,
    pub content_validation: Option<bool>,
    pub checksum_validation: Option<bool>,
    pub directory_relationship: Option<bool>,
    pub timestamp_confidence: Option<bool>,
    /// Penalty applied when fragmentation is detected.
    pub fragmentation_penalty: bool,
    /// Human-readable reasons for each signal.
    pub reasons: Vec<String>,
}

impl ConfidenceSignals {
    pub fn new() -> Self {
        Self {
            metadata_validity: None,
            extent_validity: None,
            signature_validity: None,
            content_validation: None,
            checksum_validation: None,
            directory_relationship: None,
            timestamp_confidence: None,
            fragmentation_penalty: false,
            reasons: Vec::new(),
        }
    }

    /// Compute overall confidence from individual signals.
    pub fn overall(&self) -> ConfidenceLevel {
        let positives = [
            self.metadata_validity,
            self.extent_validity,
            self.signature_validity,
            self.content_validation,
            self.checksum_validation,
        ]
        .iter()
        .filter_map(|x| *x)
        .filter(|x| *x)
        .count();

        let negatives = [
            self.metadata_validity,
            self.extent_validity,
            self.content_validation,
        ]
        .iter()
        .filter_map(|x| *x)
        .filter(|x| !x)
        .count();

        if negatives >= 2 {
            return ConfidenceLevel::Low;
        }
        if self.fragmentation_penalty && positives < 3 {
            return ConfidenceLevel::Low;
        }
        match positives {
            4.. => ConfidenceLevel::High,
            2..=3 => ConfidenceLevel::Medium,
            1 => ConfidenceLevel::Low,
            _ => ConfidenceLevel::Unknown,
        }
    }
}

impl Default for ConfidenceSignals {
    fn default() -> Self {
        Self::new()
    }
}

/// Fragment / extent information for a recovered file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryFragment {
    pub fragment_index: u32,
    /// Starting byte offset in the evidence source.
    pub source_offset: u64,
    /// Length of this fragment in bytes.
    pub length: u64,
    /// Offset in the reconstructed logical file.
    pub logical_offset: u64,
    pub confidence: ConfidenceLevel,
}

/// A candidate for recovery — may be confirmed, partial, or carved.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryCandidate {
    pub candidate_id: Uuid,
    pub evidence_id: Uuid,

    pub status: RecoveryStatus,
    pub confidence: ConfidenceSignals,

    pub metadata: Option<ObjectMetadata>,

    /// Total logical size (from metadata, may differ from recovered_size).
    pub logical_size: Option<u64>,
    /// Bytes successfully recovered.
    pub recovered_size: u64,
    /// Bytes that could not be recovered (gaps).
    pub missing_bytes: u64,

    pub fragments: Vec<RecoveryFragment>,

    /// Recovery method description.
    pub recovery_method: String,

    /// SHA-256 of the recovered content, if computed.
    pub sha256: Option<String>,
    /// BLAKE3 of the recovered content, if computed.
    pub blake3: Option<String>,

    pub discovered_at: DateTime<Utc>,
}

impl RecoveryCandidate {
    pub fn reconstruction_percentage(&self) -> Option<f64> {
        self.logical_size.map(|total| {
            if total == 0 {
                100.0
            } else {
                (self.recovered_size as f64 / total as f64) * 100.0
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn confidence_high_with_all_signals() {
        let mut signals = ConfidenceSignals::new();
        signals.metadata_validity = Some(true);
        signals.extent_validity = Some(true);
        signals.signature_validity = Some(true);
        signals.content_validation = Some(true);
        signals.checksum_validation = Some(true);
        assert_eq!(signals.overall(), ConfidenceLevel::High);
    }

    #[test]
    fn confidence_low_with_negatives() {
        let mut signals = ConfidenceSignals::new();
        signals.metadata_validity = Some(false);
        signals.extent_validity = Some(false);
        assert_eq!(signals.overall(), ConfidenceLevel::Low);
    }

    #[test]
    fn confidence_unknown_with_no_signals() {
        let signals = ConfidenceSignals::new();
        assert_eq!(signals.overall(), ConfidenceLevel::Unknown);
    }

    #[test]
    fn meta_field_provenance() {
        let f: MetaField<u64> = MetaField::recovered(42);
        assert_eq!(f.source, MetadataSource::Recovered);
        assert_eq!(f.value, Some(42));

        let u: MetaField<u64> = MetaField::unknown();
        assert_eq!(u.source, MetadataSource::Unknown);
        assert!(u.value.is_none());
    }

    #[test]
    fn reconstruction_percentage() {
        let mut candidate = RecoveryCandidate {
            candidate_id: Uuid::new_v4(),
            evidence_id: Uuid::new_v4(),
            status: RecoveryStatus::Partial,
            confidence: ConfidenceSignals::new(),
            metadata: None,
            logical_size: Some(1000),
            recovered_size: 834,
            missing_bytes: 166,
            fragments: vec![],
            recovery_method: "extent reconstruction".into(),
            sha256: None,
            blake3: None,
            discovered_at: Utc::now(),
        };
        let pct = candidate.reconstruction_percentage().unwrap();
        assert!((pct - 83.4).abs() < 0.1);
    }
}
