//! Block scanner — scans unallocated and allocated regions for structures.
//!
//! Coordinates carvers and signature scanners across evidence blocks.

use anyhow::Result;
use tracing::info;

use evidence::EvidenceSource;
use file_carver::{default_carvers, FileCarver};
use metadata::RecoveryCandidate;

/// Block scanner — applies all registered carvers to an evidence source.
pub struct BlockScanner {
    carvers: Vec<Box<dyn FileCarver>>,
}

impl BlockScanner {
    pub fn new() -> Self {
        Self { carvers: default_carvers() }
    }

    pub fn with_carvers(carvers: Vec<Box<dyn FileCarver>>) -> Self {
        Self { carvers }
    }

    /// Run all carvers against the evidence source.
    pub fn scan(&self, source: &mut EvidenceSource) -> Result<Vec<RecoveryCandidate>> {
        let mut all_candidates = Vec::new();
        for carver in &self.carvers {
            info!(carver = carver.name(), "Running file carver");
            let candidates = carver.scan(source);
            info!(carver = carver.name(), found = candidates.len(), "Carver complete");
            all_candidates.extend(candidates);
        }
        Ok(all_candidates)
    }
}

impl Default for BlockScanner {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn scanner_runs_without_panic_on_empty_image() {
        let content = vec![0u8; 65536];
        let mut tmp = NamedTempFile::new().unwrap();
        tmp.write_all(&content).unwrap();
        tmp.flush().unwrap();

        let mut src = evidence::EvidenceSource::open(
            tmp.path(),
            evidence::SourceType::RawImage,
            None,
            "test",
            None,
        ).unwrap();

        let scanner = BlockScanner::new();
        let candidates = scanner.scan(&mut src).unwrap();
        assert!(candidates.is_empty());
    }

    #[test]
    fn scanner_finds_jpeg_in_image() {
        let mut content = vec![0u8; 65536];
        // Embed a JPEG header at offset 1000
        content[1000] = 0xFF;
        content[1001] = 0xD8;
        content[1002] = 0xFF;
        content[1003] = 0xE0;
        // Embed JPEG footer
        content[2000] = 0xFF;
        content[2001] = 0xD9;

        let mut tmp = NamedTempFile::new().unwrap();
        tmp.write_all(&content).unwrap();
        tmp.flush().unwrap();

        let mut src = evidence::EvidenceSource::open(
            tmp.path(),
            evidence::SourceType::RawImage,
            None,
            "test",
            None,
        ).unwrap();

        let scanner = BlockScanner::new();
        let candidates = scanner.scan(&mut src).unwrap();
        let jpegs: Vec<_> = candidates.iter().filter(|c| c.recovery_method.contains("JPEG")).collect();
        assert!(!jpegs.is_empty());
    }
}
