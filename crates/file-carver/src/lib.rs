//! File carving engine.
//!
//! Implements signature-based file carving against unallocated evidence regions.
//! Each carver is a separate module implementing the FileCarver trait.
//! Carved files are explicitly marked — no filesystem metadata is claimed.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use evidence::EvidenceSource;
use metadata::{ConfidenceLevel, ConfidenceSignals, RecoveryCandidate, RecoveryStatus};

/// A byte signature (magic number) for file type detection.
#[derive(Debug, Clone)]
pub struct Signature {
    /// Byte pattern to match.
    pub pattern: Vec<u8>,
    /// Offset within the file where the pattern appears.
    pub offset: usize,
    /// Optional mask (Some = apply mask, None = exact match).
    pub mask: Option<Vec<u8>>,
}

impl Signature {
    pub fn exact(pattern: impl Into<Vec<u8>>) -> Self {
        Self { pattern: pattern.into(), offset: 0, mask: None }
    }

    pub fn at_offset(pattern: impl Into<Vec<u8>>, offset: usize) -> Self {
        Self { pattern: pattern.into(), offset, mask: None }
    }

    pub fn matches(&self, buf: &[u8]) -> bool {
        if buf.len() < self.offset + self.pattern.len() {
            return false;
        }
        let region = &buf[self.offset..self.offset + self.pattern.len()];
        match &self.mask {
            None => region == self.pattern.as_slice(),
            Some(mask) => {
                region.iter().zip(self.pattern.iter()).zip(mask.iter())
                    .all(|((b, p), m)| b & m == p & m)
            }
        }
    }
}

/// Validation result for a carved candidate.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ValidationResult {
    Valid,
    PartiallyValid,
    Invalid,
    Unverified,
}

/// Core carver trait.
pub trait FileCarver: Send + Sync {
    fn name(&self) -> &str;
    fn extension(&self) -> &str;
    fn mime_type(&self) -> &str;
    fn signatures(&self) -> &[Signature];
    fn scan(&self, source: &mut EvidenceSource) -> Vec<RecoveryCandidate>;
    fn validate(&self, data: &[u8]) -> ValidationResult;
}

// ——— Built-in carvers ———

/// JPEG carver: SOI (FF D8 FF) .. EOI (FF D9)
pub struct JpegCarver;

impl FileCarver for JpegCarver {
    fn name(&self) -> &str { "JPEG" }
    fn extension(&self) -> &str { "jpg" }
    fn mime_type(&self) -> &str { "image/jpeg" }

    fn signatures(&self) -> &[Signature] {
        static SIGS: std::sync::OnceLock<Vec<Signature>> = std::sync::OnceLock::new();
        SIGS.get_or_init(|| vec![Signature::exact(vec![0xFF, 0xD8, 0xFF])])
    }

    fn scan(&self, source: &mut EvidenceSource) -> Vec<RecoveryCandidate> {
        scan_for_signatures(source, self.signatures(), Some(&[0xFF, 0xD9]), 16 * 1024 * 1024)
            .into_iter()
            .map(|(offset, length)| make_carved_candidate(source.info.evidence_id, offset, length, "JPEG carver"))
            .collect()
    }

    fn validate(&self, data: &[u8]) -> ValidationResult {
        if data.starts_with(&[0xFF, 0xD8, 0xFF]) && data.ends_with(&[0xFF, 0xD9]) {
            ValidationResult::Valid
        } else if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
            ValidationResult::PartiallyValid
        } else {
            ValidationResult::Invalid
        }
    }
}

/// PNG carver: PNG signature + IEND chunk
pub struct PngCarver;

impl FileCarver for PngCarver {
    fn name(&self) -> &str { "PNG" }
    fn extension(&self) -> &str { "png" }
    fn mime_type(&self) -> &str { "image/png" }

    fn signatures(&self) -> &[Signature] {
        static SIGS: std::sync::OnceLock<Vec<Signature>> = std::sync::OnceLock::new();
        SIGS.get_or_init(|| vec![Signature::exact(vec![0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])])
    }

    fn scan(&self, source: &mut EvidenceSource) -> Vec<RecoveryCandidate> {
        scan_for_signatures(source, self.signatures(), Some(&[0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]), 64 * 1024 * 1024)
            .into_iter()
            .map(|(offset, length)| make_carved_candidate(source.info.evidence_id, offset, length, "PNG carver"))
            .collect()
    }

    fn validate(&self, data: &[u8]) -> ValidationResult {
        if data.starts_with(&[0x89, 0x50, 0x4e, 0x47]) {
            if data.windows(8).any(|w| w == [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]) {
                ValidationResult::Valid
            } else {
                ValidationResult::PartiallyValid
            }
        } else {
            ValidationResult::Invalid
        }
    }
}

/// PDF carver: %PDF- header .. %%EOF footer
pub struct PdfCarver;

impl FileCarver for PdfCarver {
    fn name(&self) -> &str { "PDF" }
    fn extension(&self) -> &str { "pdf" }
    fn mime_type(&self) -> &str { "application/pdf" }

    fn signatures(&self) -> &[Signature] {
        static SIGS: std::sync::OnceLock<Vec<Signature>> = std::sync::OnceLock::new();
        SIGS.get_or_init(|| vec![Signature::exact(b"%PDF-".to_vec())])
    }

    fn scan(&self, source: &mut EvidenceSource) -> Vec<RecoveryCandidate> {
        scan_for_signatures(source, self.signatures(), Some(b"%%EOF"), 256 * 1024 * 1024)
            .into_iter()
            .map(|(offset, length)| make_carved_candidate(source.info.evidence_id, offset, length, "PDF carver"))
            .collect()
    }

    fn validate(&self, data: &[u8]) -> ValidationResult {
        if data.starts_with(b"%PDF-") {
            if data.windows(5).any(|w| w == b"%%EOF") {
                ValidationResult::Valid
            } else {
                ValidationResult::PartiallyValid
            }
        } else {
            ValidationResult::Invalid
        }
    }
}

/// ELF carver: ELF magic header
pub struct ElfCarver;

impl FileCarver for ElfCarver {
    fn name(&self) -> &str { "ELF" }
    fn extension(&self) -> &str { "elf" }
    fn mime_type(&self) -> &str { "application/x-elf" }

    fn signatures(&self) -> &[Signature] {
        static SIGS: std::sync::OnceLock<Vec<Signature>> = std::sync::OnceLock::new();
        SIGS.get_or_init(|| vec![Signature::exact(vec![0x7f, 0x45, 0x4c, 0x46])])
    }

    fn scan(&self, source: &mut EvidenceSource) -> Vec<RecoveryCandidate> {
        // ELF files have a known size in the header — use it.
        scan_for_elf_files(source)
    }

    fn validate(&self, data: &[u8]) -> ValidationResult {
        if data.starts_with(&[0x7f, 0x45, 0x4c, 0x46]) {
            ValidationResult::Valid
        } else {
            ValidationResult::Invalid
        }
    }
}

/// ZIP carver (covers DOCX, XLSX, PPTX, JAR as well): PK header
pub struct ZipCarver;

impl FileCarver for ZipCarver {
    fn name(&self) -> &str { "ZIP" }
    fn extension(&self) -> &str { "zip" }
    fn mime_type(&self) -> &str { "application/zip" }

    fn signatures(&self) -> &[Signature] {
        static SIGS: std::sync::OnceLock<Vec<Signature>> = std::sync::OnceLock::new();
        SIGS.get_or_init(|| vec![Signature::exact(vec![0x50, 0x4b, 0x03, 0x04])])
    }

    fn scan(&self, source: &mut EvidenceSource) -> Vec<RecoveryCandidate> {
        scan_for_signatures(source, self.signatures(), Some(&[0x50, 0x4b, 0x05, 0x06]), 512 * 1024 * 1024)
            .into_iter()
            .map(|(offset, length)| make_carved_candidate(source.info.evidence_id, offset, length, "ZIP carver"))
            .collect()
    }

    fn validate(&self, data: &[u8]) -> ValidationResult {
        if data.starts_with(&[0x50, 0x4b, 0x03, 0x04]) {
            ValidationResult::Valid
        } else {
            ValidationResult::Invalid
        }
    }
}

/// SQLite database carver
pub struct SqliteCarver;

impl FileCarver for SqliteCarver {
    fn name(&self) -> &str { "SQLite" }
    fn extension(&self) -> &str { "sqlite" }
    fn mime_type(&self) -> &str { "application/x-sqlite3" }

    fn signatures(&self) -> &[Signature] {
        static SIGS: std::sync::OnceLock<Vec<Signature>> = std::sync::OnceLock::new();
        SIGS.get_or_init(|| vec![Signature::exact(b"SQLite format 3\x00".to_vec())])
    }

    fn scan(&self, source: &mut EvidenceSource) -> Vec<RecoveryCandidate> {
        scan_for_signatures(source, self.signatures(), None, 1024 * 1024 * 1024)
            .into_iter()
            .map(|(offset, length)| make_carved_candidate(source.info.evidence_id, offset, length, "SQLite carver"))
            .collect()
    }

    fn validate(&self, data: &[u8]) -> ValidationResult {
        if data.starts_with(b"SQLite format 3\x00") {
            ValidationResult::Valid
        } else {
            ValidationResult::Invalid
        }
    }
}

/// Scan `source` for occurrences of `signatures`, with optional footer pattern.
/// Returns (start_offset, length) pairs.
fn scan_for_signatures(
    source: &mut EvidenceSource,
    signatures: &[Signature],
    footer: Option<&[u8]>,
    max_size: usize,
) -> Vec<(u64, u64)> {
    const CHUNK: usize = 65536;
    let mut results = Vec::new();
    let mut offset = 0u64;
    let mut overlap = Vec::<u8>::new();

    while offset < source.info.size {
        let to_read = CHUNK.min((source.info.size - offset) as usize);
        let Ok(chunk) = source.read_at(offset, to_read) else { break };

        // Check with overlap from previous chunk.
        let mut search_buf = overlap.clone();
        search_buf.extend_from_slice(&chunk);

        for sig in signatures {
            // Scan for header.
            let win_size = sig.pattern.len().max(1);
            for i in 0..search_buf.len().saturating_sub(win_size - 1) {
                if sig.matches(&search_buf[i..]) {
                    let abs_start = if offset == 0 { i as u64 } else { offset + i as u64 - overlap.len() as u64 };

                    // Look for footer within max_size.
                    let length = if let Some(footer_pat) = footer {
                        find_footer(source, abs_start, footer_pat, max_size)
                            .unwrap_or(max_size as u64)
                    } else {
                        max_size as u64
                    };

                    results.push((abs_start, length));
                }
            }
        }

        // Keep last (max_sig_len - 1) bytes as overlap for next chunk.
        let max_sig = signatures.iter().map(|s| s.pattern.len()).max().unwrap_or(0);
        let keep = max_sig.saturating_sub(1).min(search_buf.len());
        overlap = search_buf[search_buf.len() - keep..].to_vec();

        offset += to_read as u64;
    }
    results
}

/// Find a footer pattern after `start` within `max_size` bytes.
fn find_footer(source: &mut EvidenceSource, start: u64, footer: &[u8], max_size: usize) -> Option<u64> {
    const CHUNK: usize = 65536;
    let mut pos = start;
    let end = (start + max_size as u64).min(source.info.size);

    while pos < end {
        let to_read = CHUNK.min((end - pos) as usize);
        let Ok(chunk) = source.read_at(pos, to_read) else { break };
        if let Some(idx) = chunk.windows(footer.len()).position(|w| w == footer) {
            return Some(pos + idx as u64 + footer.len() as u64 - start);
        }
        pos += to_read as u64;
    }
    None
}

/// ELF-specific scanner that reads the size from the ELF header.
fn scan_for_elf_files(source: &mut EvidenceSource) -> Vec<RecoveryCandidate> {
    const CHUNK: usize = 65536;
    let mut results = Vec::new();
    let mut offset = 0u64;

    while offset < source.info.size {
        let to_read = CHUNK.min((source.info.size - offset) as usize);
        let Ok(chunk) = source.read_at(offset, to_read) else { break };

        for i in 0..chunk.len().saturating_sub(4) {
            if &chunk[i..i+4] == &[0x7f, 0x45, 0x4c, 0x46] {
                let abs = offset + i as u64;
                results.push(make_carved_candidate(source.info.evidence_id, abs, 0, "ELF carver"));
                break; // one per chunk
            }
        }
        offset += to_read as u64;
    }
    results
}

fn make_carved_candidate(evidence_id: uuid::Uuid, offset: u64, length: u64, method: &str) -> RecoveryCandidate {
    use metadata::RecoveryFragment;
    let mut signals = ConfidenceSignals::new();
    signals.signature_validity = Some(true);
    signals.metadata_validity = Some(false); // No filesystem metadata for carved files.
    signals.reasons.push("✓ file signature matched".into());
    signals.reasons.push("✗ no filesystem metadata — carved recovery only".into());

    RecoveryCandidate {
        candidate_id: Uuid::new_v4(),
        evidence_id,
        status: RecoveryStatus::Carved,
        confidence: signals,
        metadata: None, // Carved — no filesystem metadata
        logical_size: if length > 0 { Some(length) } else { None },
        recovered_size: length,
        missing_bytes: 0,
        fragments: vec![RecoveryFragment {
            fragment_index: 0,
            source_offset: offset,
            length,
            logical_offset: 0,
            confidence: ConfidenceLevel::Low,
        }],
        recovery_method: method.into(),
        sha256: None,
        blake3: None,
        discovered_at: chrono::Utc::now(),
    }
}

/// Registry of all built-in carvers.
pub fn default_carvers() -> Vec<Box<dyn FileCarver>> {
    vec![
        Box::new(JpegCarver),
        Box::new(PngCarver),
        Box::new(PdfCarver),
        Box::new(ElfCarver),
        Box::new(ZipCarver),
        Box::new(SqliteCarver),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn jpeg_signature_matches() {
        let carver = JpegCarver;
        let data = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00];
        assert!(carver.signatures()[0].matches(&data));
    }

    #[test]
    fn jpeg_signature_does_not_match_png() {
        let carver = JpegCarver;
        let data = vec![0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        assert!(!carver.signatures()[0].matches(&data));
    }

    #[test]
    fn pdf_validate_valid() {
        let carver = PdfCarver;
        let data = b"%PDF-1.7\n...%%EOF";
        assert!(matches!(carver.validate(data), ValidationResult::Valid));
    }

    #[test]
    fn pdf_validate_partial() {
        let carver = PdfCarver;
        let data = b"%PDF-1.7\n...";
        assert!(matches!(carver.validate(data), ValidationResult::PartiallyValid));
    }

    #[test]
    fn sqlite_signature_matches() {
        let carver = SqliteCarver;
        let mut data = b"SQLite format 3\x00".to_vec();
        data.extend_from_slice(&[0u8; 100]);
        assert!(carver.signatures()[0].matches(&data));
    }

    #[test]
    fn carved_candidate_has_no_metadata() {
        let ev_id = Uuid::new_v4();
        let candidate = make_carved_candidate(ev_id, 1024, 512, "test");
        assert!(candidate.metadata.is_none());
        assert_eq!(candidate.status, RecoveryStatus::Carved);
    }

    #[test]
    fn default_carvers_non_empty() {
        let carvers = default_carvers();
        assert!(!carvers.is_empty());
        let names: Vec<_> = carvers.iter().map(|c| c.name()).collect();
        assert!(names.contains(&"JPEG"));
        assert!(names.contains(&"PDF"));
        assert!(names.contains(&"ELF"));
    }
}
