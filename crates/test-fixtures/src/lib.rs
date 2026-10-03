//! Test fixtures — deterministic forensic image generators for testing.
//!
//! Every fixture has a known, documented expected result.
//! Fixtures are reproducible: same seed = same bytes.

use serde::{Deserialize, Serialize};

/// A deterministic fixture image with documented expected outcomes.
#[derive(Debug, Serialize, Deserialize)]
pub struct FixtureExpectation {
    pub filesystem_type: String,
    pub total_objects: u64,
    pub deleted_objects: u64,
    pub recoverable_files: u64,
    pub sha256_of_image: String,
}

/// XFS fixture: minimal 512-byte superblock, no real data.
pub fn xfs_minimal_superblock() -> Vec<u8> {
    let mut buf = vec![0u8; 0x11000];
    // XFS magic: XFSB
    buf[0] = 0x58; buf[1] = 0x46; buf[2] = 0x53; buf[3] = 0x42;
    // block_size = 4096
    buf[4] = 0x00; buf[5] = 0x00; buf[6] = 0x10; buf[7] = 0x00;
    // total_blocks = 256 (little field — big-endian u64 at offset 8)
    buf[14] = 0x01;
    buf[15] = 0x00;
    // versionnum = 5 at offset 104
    buf[104] = 0x00; buf[105] = 0x05;
    // sectsize = 512 at offset 106
    buf[106] = 0x02; buf[107] = 0x00;
    // inodesize = 512 at offset 108
    buf[108] = 0x02; buf[109] = 0x00;
    // agcount = 1 at offset 84 (big-endian u32)
    buf[84] = 0x00; buf[85] = 0x00; buf[86] = 0x00; buf[87] = 0x01;
    // agblocks = 256
    buf[80] = 0x00; buf[81] = 0x00; buf[82] = 0x01; buf[83] = 0x00;
    buf
}

pub fn xfs_minimal_expectation() -> FixtureExpectation {
    FixtureExpectation {
        filesystem_type: "XFS".into(),
        total_objects: 0,
        deleted_objects: 0,
        recoverable_files: 0,
        sha256_of_image: String::new(), // computed at generation time
    }
}

/// Btrfs fixture: minimal image with primary superblock magic.
pub fn btrfs_minimal_superblock() -> Vec<u8> {
    let mut buf = vec![0u8; 0x11000];
    // Primary superblock at 0x10000, magic at offset +0x40
    buf[0x10040] = b'_';
    buf[0x10041] = b'B';
    buf[0x10042] = b'H';
    buf[0x10043] = b'R';
    buf[0x10044] = b'f';
    buf[0x10045] = b'S';
    buf[0x10046] = b'_';
    buf[0x10047] = b'M';
    // sectorsize at 0x10000 + 0xbc = 0x100bc: 4096 little-endian
    buf[0x100bc] = 0x00; buf[0x100bd] = 0x10; buf[0x100be] = 0x00; buf[0x100bf] = 0x00;
    buf
}

pub fn btrfs_minimal_expectation() -> FixtureExpectation {
    FixtureExpectation {
        filesystem_type: "Btrfs".into(),
        total_objects: 0,
        deleted_objects: 0,
        recoverable_files: 0,
        sha256_of_image: String::new(),
    }
}

/// A fixture containing embedded JPEG data for carver testing.
pub fn image_with_embedded_jpeg(jpeg_offset: usize) -> Vec<u8> {
    let mut buf = vec![0u8; 65536];
    if jpeg_offset + 6 < buf.len() {
        buf[jpeg_offset] = 0xFF;
        buf[jpeg_offset + 1] = 0xD8;
        buf[jpeg_offset + 2] = 0xFF;
        buf[jpeg_offset + 3] = 0xE0;
        // EOI at jpeg_offset + 1000
        let eoi = jpeg_offset + 1000;
        if eoi + 1 < buf.len() {
            buf[eoi] = 0xFF;
            buf[eoi + 1] = 0xD9;
        }
    }
    buf
}

/// A fixture containing embedded PDF data.
pub fn image_with_embedded_pdf(pdf_offset: usize) -> Vec<u8> {
    let mut buf = vec![0u8; 65536];
    let header = b"%PDF-1.7\n";
    let footer = b"%%EOF";
    if pdf_offset + header.len() < buf.len() {
        buf[pdf_offset..pdf_offset + header.len()].copy_from_slice(header);
    }
    let eoi = pdf_offset + 500;
    if eoi + footer.len() < buf.len() {
        buf[eoi..eoi + footer.len()].copy_from_slice(footer);
    }
    buf
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xfs_fixture_has_magic() {
        let buf = xfs_minimal_superblock();
        assert_eq!(&buf[0..4], &[0x58, 0x46, 0x53, 0x42]);
    }

    #[test]
    fn btrfs_fixture_has_magic() {
        let buf = btrfs_minimal_superblock();
        assert_eq!(&buf[0x10040..0x10048], b"_BHRfS_M");
    }

    #[test]
    fn jpeg_fixture_has_magic() {
        let buf = image_with_embedded_jpeg(100);
        assert_eq!(buf[100], 0xFF);
        assert_eq!(buf[101], 0xD8);
        assert_eq!(buf[102], 0xFF);
    }

    #[test]
    fn pdf_fixture_has_magic() {
        let buf = image_with_embedded_pdf(200);
        assert_eq!(&buf[200..205], b"%PDF-");
    }
}
