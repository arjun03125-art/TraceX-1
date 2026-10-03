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
    // block_size = 4096 (bytes 4..8)
    buf[4] = 0x00; buf[5] = 0x00; buf[6] = 0x10; buf[7] = 0x00;
    // total_blocks = 256 (bytes 8..16)
    buf[14] = 0x01; buf[15] = 0x00;
    // agblocks = 256 (bytes 84..88)
    buf[86] = 0x01; buf[87] = 0x00;
    // agcount = 1 (bytes 88..92)
    buf[91] = 0x01;
    // versionnum = 5 at offset 100 (bytes 100..102)
    buf[100] = 0x00; buf[101] = 0x05;
    // sectsize = 512 at offset 102 (bytes 102..104)
    buf[102] = 0x02; buf[103] = 0x00;
    // inodesize = 512 at offset 104 (bytes 104..106)
    buf[104] = 0x02; buf[105] = 0x00;
    // inopblock = 8 at offset 106 (bytes 106..108)
    buf[106] = 0x00; buf[107] = 0x08;
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

/// Complete synthetic XFS demo image containing known deleted files:
/// - evidence.jpg (carved + inode extent mapped)
/// - report.pdf (carved + inode extent mapped)
/// - system.log (inode inline recovered)
pub fn generate_xfs_demo_image() -> Vec<u8> {
    let mut buf = vec![0u8; 524288]; // 512 KiB image

    // 1. Superblock at offset 0
    buf[0] = 0x58; buf[1] = 0x46; buf[2] = 0x53; buf[3] = 0x42; // "XFSB"
    buf[4] = 0x00; buf[5] = 0x00; buf[6] = 0x10; buf[7] = 0x00; // block_size = 4096
    buf[14] = 0x00; buf[15] = 0x80; // total_blocks = 128
    buf[86] = 0x00; buf[87] = 0x80; // agblocks = 128
    buf[91] = 0x01; // agcount = 1
    buf[100] = 0x00; buf[101] = 0x05; // versionnum = 5
    buf[102] = 0x02; buf[103] = 0x00; // sectsize = 512
    buf[104] = 0x02; buf[105] = 0x00; // inodesize = 512
    buf[106] = 0x00; buf[107] = 0x08; // inopblock = 8

    // Helper to write big-endian values
    fn write_u16(b: &mut [u8], off: usize, v: u16) {
        b[off..off+2].copy_from_slice(&v.to_be_bytes());
    }
    fn write_u32(b: &mut [u8], off: usize, v: u32) {
        b[off..off+4].copy_from_slice(&v.to_be_bytes());
    }
    fn write_i64(b: &mut [u8], off: usize, v: i64) {
        b[off..off+8].copy_from_slice(&v.to_be_bytes());
    }

    // 2. Inode 1: evidence.jpg at offset 4096 (Deleted: nlink = 0, format = 2 Extents)
    let ino1 = 4096;
    write_u16(&mut buf, ino1, 0x494e); // 'IN'
    write_u16(&mut buf, ino1 + 2, 0x81a4); // regular file 0644
    buf[ino1 + 4] = 2; // version 2
    buf[ino1 + 5] = 2; // format 2 (Extents)
    write_u32(&mut buf, ino1 + 8, 0); // nlinkv2 = 0 (DELETED)
    write_u32(&mut buf, ino1 + 12, 1000); // uid
    write_u32(&mut buf, ino1 + 16, 1000); // gid
    write_u32(&mut buf, ino1 + 20, 0); // nlink = 0 (DELETED)
    write_u32(&mut buf, ino1 + 34, 1759320000); // atime
    write_u32(&mut buf, ino1 + 42, 1759320000); // mtime
    write_u32(&mut buf, ino1 + 50, 1759320000); // ctime
    write_i64(&mut buf, ino1 + 58, 1024); // size = 1024 bytes
    write_i64(&mut buf, ino1 + 66, 2); // nblocks = 2 (512-byte blocks)
    write_u32(&mut buf, ino1 + 78, 1); // nextents = 1
    // Extent descriptor at ino1 + 100 (points to block 16 = offset 65536, count = 1 block)
    // hi = 0, lo = (16 << 21) | 1 = (16 << 21) + 1 = 33554433
    let lo1: u64 = (16 << 21) | 1;
    buf[ino1 + 100..ino1 + 108].copy_from_slice(&0u64.to_be_bytes());
    buf[ino1 + 108..ino1 + 116].copy_from_slice(&lo1.to_be_bytes());

    // 3. Inode 2: report.pdf at offset 4608 (Deleted: nlink = 0, format = 2 Extents)
    let ino2 = 4608;
    write_u16(&mut buf, ino2, 0x494e); // 'IN'
    write_u16(&mut buf, ino2 + 2, 0x81a4);
    buf[ino2 + 4] = 2;
    buf[ino2 + 5] = 2; // Extents
    write_u32(&mut buf, ino2 + 8, 0); // DELETED
    write_u32(&mut buf, ino2 + 12, 1000);
    write_u32(&mut buf, ino2 + 16, 1000);
    write_u32(&mut buf, ino2 + 20, 0); // DELETED
    write_u32(&mut buf, ino2 + 34, 1759320500);
    write_u32(&mut buf, ino2 + 42, 1759320500);
    write_u32(&mut buf, ino2 + 50, 1759320500);
    write_i64(&mut buf, ino2 + 58, 2048); // size = 2048 bytes
    write_i64(&mut buf, ino2 + 66, 4);
    write_u32(&mut buf, ino2 + 78, 1);
    // Extent descriptor points to block 20 (offset 81920)
    let lo2: u64 = (20 << 21) | 1;
    buf[ino2 + 100..ino2 + 108].copy_from_slice(&0u64.to_be_bytes());
    buf[ino2 + 108..ino2 + 116].copy_from_slice(&lo2.to_be_bytes());

    // 4. Inode 3: system.log at offset 5120 (Deleted: nlink = 0, format = 1 Local Inline)
    let ino3 = 5120;
    let log_content = b"[2026-10-01 04:12:00] CRITICAL: Unauthorized access attempt detected on /dev/sdc1\n[2026-10-01 04:12:05] WARNING: Inode table unlinked for partition 2\n[2026-10-01 04:12:10] INFO: Evidence artifact flushed to unallocated sectors\n";
    write_u16(&mut buf, ino3, 0x494e);
    write_u16(&mut buf, ino3 + 2, 0x81a4);
    buf[ino3 + 4] = 2;
    buf[ino3 + 5] = 1; // Local inline data
    write_u32(&mut buf, ino3 + 8, 0); // DELETED
    write_u32(&mut buf, ino3 + 12, 0); // root
    write_u32(&mut buf, ino3 + 16, 0);
    write_u32(&mut buf, ino3 + 20, 0); // DELETED
    write_u32(&mut buf, ino3 + 34, 1759321000);
    write_u32(&mut buf, ino3 + 42, 1759321000);
    write_u32(&mut buf, ino3 + 50, 1759321000);
    write_i64(&mut buf, ino3 + 58, log_content.len() as i64);
    buf[ino3 + 100..ino3 + 100 + log_content.len()].copy_from_slice(log_content);

    // 5. Data Block 16 (offset 65536): JPEG payload (evidence.jpg)
    let jpeg_off = 65536;
    buf[jpeg_off] = 0xFF; buf[jpeg_off + 1] = 0xD8; buf[jpeg_off + 2] = 0xFF; buf[jpeg_off + 3] = 0xE0;
    buf[jpeg_off + 4..jpeg_off + 10].copy_from_slice(b"\x00\x10JFIF");
    // fill payload pattern
    for i in 10..1022 {
        buf[jpeg_off + i] = ((i * 7) % 251) as u8;
    }
    buf[jpeg_off + 1022] = 0xFF;
    buf[jpeg_off + 1023] = 0xD9; // EOI

    // 6. Data Block 20 (offset 81920): PDF payload (report.pdf)
    let pdf_off = 81920;
    let pdf_data = b"%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n168\n%%EOF\n";
    buf[pdf_off..pdf_off + pdf_data.len()].copy_from_slice(pdf_data);

    buf
}

/// Complete synthetic Btrfs demo image containing known deleted/carvable files
pub fn generate_btrfs_demo_image() -> Vec<u8> {
    let mut buf = vec![0u8; 524288]; // 512 KiB image

    // 1. Primary superblock at offset 0x10000, magic at +0x40
    let sb_off = 0x10000;
    buf[sb_off + 0x40..sb_off + 0x48].copy_from_slice(b"_BHRfS_M");
    // sectorsize = 4096 at +0xbc
    buf[sb_off + 0xbc..sb_off + 0xc0].copy_from_slice(&4096u32.to_le_bytes());
    // nodesize = 4096 at +0xc0
    buf[sb_off + 0xc0..sb_off + 0xc4].copy_from_slice(&4096u32.to_le_bytes());
    // total_bytes = 524288 at +0x70
    buf[sb_off + 0x70..sb_off + 0x78].copy_from_slice(&524288u64.to_le_bytes());

    // 2. Embedded JPEG at offset 0x20000 (131072)
    let j_off = 131072;
    buf[j_off] = 0xFF; buf[j_off + 1] = 0xD8; buf[j_off + 2] = 0xFF; buf[j_off + 3] = 0xE0;
    buf[j_off + 4..j_off + 10].copy_from_slice(b"\x00\x10JFIF");
    for i in 10..800 {
        buf[j_off + i] = ((i * 13) % 249) as u8;
    }
    buf[j_off + 800] = 0xFF; buf[j_off + 801] = 0xD9;

    // 3. Embedded PDF at offset 0x30000 (196608)
    let p_off = 196608;
    let pdf_data = b"%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF";
    buf[p_off..p_off + pdf_data.len()].copy_from_slice(pdf_data);

    // 4. Embedded SQLite at offset 0x40000 (262144)
    let s_off = 262144;
    let sqlite_header = b"SQLite format 3\0";
    buf[s_off..s_off + sqlite_header.len()].copy_from_slice(sqlite_header);
    // page size 4096
    buf[s_off + 16] = 0x10; buf[s_off + 17] = 0x00;

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

    #[test]
    fn xfs_demo_image_structure() {
        let buf = generate_xfs_demo_image();
        assert_eq!(&buf[0..4], b"XFSB");
        assert_eq!(&buf[4096..4098], b"IN");
        assert_eq!(&buf[4608..4610], b"IN");
        assert_eq!(&buf[5120..5122], b"IN");
        assert_eq!(&buf[65536..65539], &[0xFF, 0xD8, 0xFF]);
        assert_eq!(&buf[81920..81925], b"%PDF-");
    }

    #[test]
    fn btrfs_demo_image_structure() {
        let buf = generate_btrfs_demo_image();
        assert_eq!(&buf[0x10040..0x10048], b"_BHRfS_M");
        assert_eq!(&buf[131072..131075], &[0xFF, 0xD8, 0xFF]);
        assert_eq!(&buf[196608..196613], b"%PDF-");
    }
}
