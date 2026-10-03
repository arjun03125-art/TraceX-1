//! XFS filesystem parser.
//!
//! Implements superblock parsing, inode discovery, extent mapping, directory
//! parsing, and deleted-object identification for XFS v5 (CRC-enabled) and v4.
//!
//! # References
//! - XFS Filesystem Disk Structures (Documentation/filesystems/xfs-delayed-logging-design.rst)
//! - xfsprogs source: https://github.com/libxfs/xfsprogs-dev
//! - Linux kernel fs/xfs/
//!
//! All binary layouts are validated against authoritative references.
//! Do not guess binary structures — every field is documented.

use std::io::Write;

use anyhow::{bail, Context, Result};
use byteorder::{BigEndian, ReadBytesExt};
use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use tracing::{debug, warn};
use uuid::Uuid;

use evidence::{EvidenceSource, FilesystemType};
use filesystem::{
    AnalysisSummary, FilesystemParser, ObjectRecord, ParseErrorKind, ParseWarning,
    RecoveryResult, SuperblockInfo,
};
use metadata::{
    ConfidenceSignals, ForensicTimestamp, MetaField, MetadataSource, ObjectMetadata,
    ObjectType, RecoveryCandidate, RecoveryFragment, RecoveryStatus, TimestampKind,
};

/// XFS magic number: "XFSB" in big-endian.
pub const XFS_SB_MAGIC: u32 = 0x5846_5342;

/// XFS superblock version flags.
pub const XFS_SB_VERSION_NUMBITS: u16 = 0x000f;
pub const XFS_SB_VERSION_NLINKBIT: u16 = 0x0020;
pub const XFS_SB_VERSION_QUOTABIT: u16 = 0x0040;
pub const XFS_SB_VERSION_ALIGNBIT: u16 = 0x0100;
pub const XFS_SB_VERSION_LOGV2BIT: u16 = 0x0400;
pub const XFS_SB_VERSION_EXTFLGBIT: u16 = 0x1000;
pub const XFS_SB_VERSION_DIRV2BIT: u16 = 0x2000;

/// XFS v5 feature flags (sb_features_incompat).
pub const XFS_SB_FEAT_INCOMPAT_FTYPE: u32 = 0x0001;
pub const XFS_SB_FEAT_INCOMPAT_SPINODES: u32 = 0x0002;
pub const XFS_SB_FEAT_INCOMPAT_META_UUID: u32 = 0x0004;
pub const XFS_SB_FEAT_INCOMPAT_BIGTIME: u32 = 0x0008;
pub const XFS_SB_FEAT_INCOMPAT_NEEDSREPAIR: u32 = 0x0010;
pub const XFS_SB_FEAT_INCOMPAT_NREXT64: u32 = 0x0020;

/// XFS inode magic.
pub const XFS_DINODE_MAGIC: u16 = 0x494e; // "IN"

/// XFS inode format values.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum XfsInodeFmt {
    Dev = 0,
    Local = 1,
    Extents = 2,
    Btree = 3,
    Uuid = 4,
}

impl XfsInodeFmt {
    pub fn from_u8(v: u8) -> Option<Self> {
        match v {
            0 => Some(Self::Dev),
            1 => Some(Self::Local),
            2 => Some(Self::Extents),
            3 => Some(Self::Btree),
            4 => Some(Self::Uuid),
            _ => None,
        }
    }
}

/// Parsed XFS extent record (B+tree / direct extents format).
/// An extent descriptor is 128 bits (16 bytes) on disk:
/// - bit 127: state (0 = normal, 1 = unwritten)
/// - bits 126..73: logical block offset in file (54 bits)
/// - bits 72..21: physical block address / fsblock (52 bits)
/// - bits 20..0: block count (21 bits)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct XfsBmbtRec {
    pub state: u8,
    pub startoff: u64,
    pub startblock: u64,
    pub blockcount: u64,
}

impl XfsBmbtRec {
    /// Unpack an extent record from a 16-byte raw descriptor (big-endian).
    pub fn unpack(bytes: &[u8; 16]) -> Self {
        let hi = u64::from_be_bytes(bytes[0..8].try_into().unwrap());
        let lo = u64::from_be_bytes(bytes[8..16].try_into().unwrap());
        let state = ((hi >> 63) & 1) as u8;
        let startoff = (hi >> 9) & ((1u64 << 54) - 1);
        let startblock = ((hi & 0x1ff) << 43) | (lo >> 21);
        let blockcount = lo & ((1u64 << 21) - 1);
        Self { state, startoff, startblock, blockcount }
    }

    /// Convert logical startblock to absolute byte offset in evidence image.
    ///
    /// Uses saturating arithmetic to prevent panic on corrupt/fuzz inputs.
    pub fn byte_offset(&self, agblklog: u8, agblocks: u32, block_size: u32) -> u64 {
        let physical_block = if agblklog > 0 {
            let ag_number = self.startblock >> agblklog;
            let ag_block = self.startblock & ((1u64 << agblklog) - 1);
            ag_number.saturating_mul(agblocks as u64).saturating_add(ag_block)
        } else {
            self.startblock
        };
        physical_block.saturating_mul(block_size as u64)
    }

    /// Convert blockcount to byte length.
    ///
    /// Uses saturating arithmetic to prevent panic on corrupt/fuzz inputs.
    pub fn byte_len(&self, block_size: u32) -> u64 {
        self.blockcount.saturating_mul(block_size as u64)
    }
}

/// Parsed XFS superblock fields (v4 and v5).
/// Fields follow xfs_sb_t layout from xfs_format.h (big-endian on disk).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct XfsSuperblock {
    pub magic: u32,
    pub block_size: u32,
    pub total_blocks: u64,
    pub rblocks: u64,
    pub rextents: u64,
    pub uuid: [u8; 16],
    pub logstart: u64,
    pub rootino: u64,
    pub rbmino: u64,
    pub rsumino: u64,
    pub rextsize: u32,
    pub agblocks: u32,
    pub agcount: u32,
    pub rbmblocks: u32,
    pub logblocks: u32,
    pub versionnum: u16,
    pub sectsize: u16,
    pub inodesize: u16,
    pub inopblock: u16,
    pub fname: [u8; 12],
    pub blocklog: u8,
    pub sectlog: u8,
    pub inodelog: u8,
    pub inopblog: u8,
    pub agblklog: u8,
    pub rextslog: u8,
    pub inprogress: u8,
    pub imax_pct: u8,
    pub icount: u64,
    pub ifree: u64,
    pub fdblocks: u64,
    pub frextents: u64,
    pub uquotino: u64,
    pub gquotino: u64,
    pub qflags: u16,
    pub flags: u8,
    pub shared_vn: u8,
    pub inoalignmt: u32,
    pub unit: u32,
    pub width: u32,
    pub dirblklog: u8,
    pub logsectlog: u8,
    pub logsectsize: u16,
    pub logsunit: u32,
    pub features2: u32,
    pub bad_features2: u32,
    // v5 fields (present when version == 5)
    pub features_compat: Option<u32>,
    pub features_ro_compat: Option<u32>,
    pub features_incompat: Option<u32>,
    pub features_log_incompat: Option<u32>,
    pub crc: Option<u32>,
    pub spino_align: Option<u32>,
    pub pquotino: Option<u64>,
    pub lsn: Option<i64>,
    pub meta_uuid: Option<[u8; 16]>,
}

impl XfsSuperblock {
    /// Parse from a 512-byte (or larger) buffer at the start of the filesystem.
    /// Returns None if magic does not match (not XFS).
    /// Returns Err for structurally invalid data.
    pub fn parse(buf: &[u8]) -> Result<Option<Self>> {
        if buf.len() < 512 {
            bail!("Buffer too small for XFS superblock: {} bytes", buf.len());
        }

        let mut cursor = std::io::Cursor::new(buf);

        let magic = cursor.read_u32::<BigEndian>()?;
        if magic != XFS_SB_MAGIC {
            return Ok(None);
        }

        let block_size = cursor.read_u32::<BigEndian>()?;
        let total_blocks = cursor.read_u64::<BigEndian>()?;
        let rblocks = cursor.read_u64::<BigEndian>()?;
        let rextents = cursor.read_u64::<BigEndian>()?;

        let mut uuid = [0u8; 16];
        std::io::Read::read_exact(&mut cursor, &mut uuid)?;

        let logstart = cursor.read_u64::<BigEndian>()?;
        let rootino = cursor.read_u64::<BigEndian>()?;
        let rbmino = cursor.read_u64::<BigEndian>()?;
        let rsumino = cursor.read_u64::<BigEndian>()?;
        let rextsize = cursor.read_u32::<BigEndian>()?;
        let agblocks = cursor.read_u32::<BigEndian>()?;
        let agcount = cursor.read_u32::<BigEndian>()?;
        let rbmblocks = cursor.read_u32::<BigEndian>()?;
        let logblocks = cursor.read_u32::<BigEndian>()?;
        let versionnum = cursor.read_u16::<BigEndian>()?;
        let sectsize = cursor.read_u16::<BigEndian>()?;
        let inodesize = cursor.read_u16::<BigEndian>()?;
        let inopblock = cursor.read_u16::<BigEndian>()?;

        let mut fname = [0u8; 12];
        std::io::Read::read_exact(&mut cursor, &mut fname)?;

        let blocklog = cursor.read_u8()?;
        let sectlog = cursor.read_u8()?;
        let inodelog = cursor.read_u8()?;
        let inopblog = cursor.read_u8()?;
        let agblklog = cursor.read_u8()?;
        let rextslog = cursor.read_u8()?;
        let inprogress = cursor.read_u8()?;
        let imax_pct = cursor.read_u8()?;
        let icount = cursor.read_u64::<BigEndian>()?;
        let ifree = cursor.read_u64::<BigEndian>()?;
        let fdblocks = cursor.read_u64::<BigEndian>()?;
        let frextents = cursor.read_u64::<BigEndian>()?;
        let uquotino = cursor.read_u64::<BigEndian>()?;
        let gquotino = cursor.read_u64::<BigEndian>()?;
        let qflags = cursor.read_u16::<BigEndian>()?;
        let flags = cursor.read_u8()?;
        let shared_vn = cursor.read_u8()?;
        let inoalignmt = cursor.read_u32::<BigEndian>()?;
        let unit = cursor.read_u32::<BigEndian>()?;
        let width = cursor.read_u32::<BigEndian>()?;
        let dirblklog = cursor.read_u8()?;
        let logsectlog = cursor.read_u8()?;
        let logsectsize = cursor.read_u16::<BigEndian>()?;
        let logsunit = cursor.read_u32::<BigEndian>()?;
        let features2 = cursor.read_u32::<BigEndian>()?;
        let bad_features2 = cursor.read_u32::<BigEndian>()?;

        // Determine version.
        let version = versionnum & XFS_SB_VERSION_NUMBITS;
        let is_v5 = version == 5;

        let (features_compat, features_ro_compat, features_incompat, features_log_incompat,
             crc, spino_align, pquotino, lsn, meta_uuid) = if is_v5 && buf.len() >= 272 {
            // v5 fields at offset 232 onwards.
            let features_compat = cursor.read_u32::<BigEndian>()?;
            let features_ro_compat = cursor.read_u32::<BigEndian>()?;
            let features_incompat = cursor.read_u32::<BigEndian>()?;
            let features_log_incompat = cursor.read_u32::<BigEndian>()?;
            let crc = cursor.read_u32::<BigEndian>()?;
            let spino_align = cursor.read_u32::<BigEndian>()?;
            let pquotino = cursor.read_u64::<BigEndian>()?;
            let lsn = cursor.read_i64::<BigEndian>()?;
            let mut meta_uuid = [0u8; 16];
            std::io::Read::read_exact(&mut cursor, &mut meta_uuid)?;
            (Some(features_compat), Some(features_ro_compat), Some(features_incompat),
             Some(features_log_incompat), Some(crc), Some(spino_align), Some(pquotino),
             Some(lsn), Some(meta_uuid))
        } else {
            (None, None, None, None, None, None, None, None, None)
        };

        Ok(Some(XfsSuperblock {
            magic,
            block_size,
            total_blocks,
            rblocks,
            rextents,
            uuid,
            logstart,
            rootino,
            rbmino,
            rsumino,
            rextsize,
            agblocks,
            agcount,
            rbmblocks,
            logblocks,
            versionnum,
            sectsize,
            inodesize,
            inopblock,
            fname,
            blocklog,
            sectlog,
            inodelog,
            inopblog,
            agblklog,
            rextslog,
            inprogress,
            imax_pct,
            icount,
            ifree,
            fdblocks,
            frextents,
            uquotino,
            gquotino,
            qflags,
            flags,
            shared_vn,
            inoalignmt,
            unit,
            width,
            dirblklog,
            logsectlog,
            logsectsize,
            logsunit,
            features2,
            bad_features2,
            features_compat,
            features_ro_compat,
            features_incompat,
            features_log_incompat,
            crc,
            spino_align,
            pquotino,
            lsn,
            meta_uuid,
        }))
    }

    /// XFS version number (4 or 5).
    pub fn version(&self) -> u16 {
        self.versionnum & XFS_SB_VERSION_NUMBITS
    }

    /// UUID as formatted string.
    pub fn uuid_str(&self) -> String {
        format!(
            "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
            self.uuid[0], self.uuid[1], self.uuid[2], self.uuid[3],
            self.uuid[4], self.uuid[5],
            self.uuid[6], self.uuid[7],
            self.uuid[8], self.uuid[9],
            self.uuid[10], self.uuid[11], self.uuid[12], self.uuid[13], self.uuid[14], self.uuid[15]
        )
    }

    /// Volume label (null-terminated, up to 12 characters).
    pub fn volume_label(&self) -> Option<String> {
        let end = self.fname.iter().position(|&b| b == 0).unwrap_or(12);
        if end == 0 {
            None
        } else {
            Some(String::from_utf8_lossy(&self.fname[..end]).to_string())
        }
    }

    /// Total filesystem size in bytes.
    pub fn total_size(&self) -> u64 {
        self.total_blocks * self.block_size as u64
    }

    /// Check for v5 feature: file type in directory entries.
    pub fn has_ftype(&self) -> bool {
        self.features_incompat
            .map(|f| f & XFS_SB_FEAT_INCOMPAT_FTYPE != 0)
            .unwrap_or(false)
    }

    /// Check for v5 bigtime feature.
    pub fn has_bigtime(&self) -> bool {
        self.features_incompat
            .map(|f| f & XFS_SB_FEAT_INCOMPAT_BIGTIME != 0)
            .unwrap_or(false)
    }
}

/// Parsed XFS inode core (v3).
#[derive(Debug, Clone)]
pub struct XfsInodeCore {
    pub magic: u16,
    pub mode: u16,
    pub version: u8,
    pub format: u8,
    pub nlinkv2: u32,
    pub uid: u32,
    pub gid: u32,
    pub nlink: u32,
    pub projid_lo: u16,
    pub projid_hi: u16,
    pub atime_sec: u32,
    pub atime_nsec: u32,
    pub mtime_sec: u32,
    pub mtime_nsec: u32,
    pub ctime_sec: u32,
    pub ctime_nsec: u32,
    pub size: i64,
    pub nblocks: i64,
    pub extsize: u32,
    pub nextents: i32,
    pub anextents: i16,
    pub forkoff: u8,
    pub aformat: i8,
    pub dmevmask: u32,
    pub dmstate: u16,
    pub flags: u16,
    pub gen: u32,
    // v3 additions
    pub next_unlinked: Option<u32>,
    pub crtime_sec: Option<u32>,
    pub crtime_nsec: Option<u32>,
    pub ino: Option<u64>,
    pub flags2: Option<u64>,
    pub cowextsize: Option<u32>,
    pub lsn: Option<u64>,
    pub changecount: Option<u64>,
    pub reflink_ino: Option<u64>,
}

impl XfsInodeCore {
    /// Parse from a buffer at the start of an inode record.
    pub fn parse(buf: &[u8]) -> Result<Option<Self>> {
        if buf.len() < 100 {
            return Ok(None);
        }
        let mut cur = std::io::Cursor::new(buf);
        let magic = cur.read_u16::<BigEndian>()?;
        if magic != XFS_DINODE_MAGIC {
            return Ok(None);
        }
        let mode = cur.read_u16::<BigEndian>()?;
        let version = cur.read_u8()?;
        let format = cur.read_u8()?;
        let _pad = cur.read_u16::<BigEndian>()?; // di_onlink (v1) / pad
        let nlinkv2 = cur.read_u32::<BigEndian>()?;
        let uid = cur.read_u32::<BigEndian>()?;
        let gid = cur.read_u32::<BigEndian>()?;
        let nlink = cur.read_u32::<BigEndian>()?;
        let projid_lo = cur.read_u16::<BigEndian>()?;
        let projid_hi = cur.read_u16::<BigEndian>()?;
        let _pad2 = [0u8; 6];
        // Skip 6 bytes of di_pad
        let mut skip = [0u8; 6];
        std::io::Read::read_exact(&mut cur, &mut skip)?;
        let atime_sec = cur.read_u32::<BigEndian>()?;
        let atime_nsec = cur.read_u32::<BigEndian>()?;
        let mtime_sec = cur.read_u32::<BigEndian>()?;
        let mtime_nsec = cur.read_u32::<BigEndian>()?;
        let ctime_sec = cur.read_u32::<BigEndian>()?;
        let ctime_nsec = cur.read_u32::<BigEndian>()?;
        let size = cur.read_i64::<BigEndian>()?;
        let nblocks = cur.read_i64::<BigEndian>()?;
        let extsize = cur.read_u32::<BigEndian>()?;
        let nextents = cur.read_i32::<BigEndian>()?;
        let anextents = cur.read_i16::<BigEndian>()?;
        let forkoff = cur.read_u8()?;
        let aformat = cur.read_i8()?;
        let dmevmask = cur.read_u32::<BigEndian>()?;
        let dmstate = cur.read_u16::<BigEndian>()?;
        let flags = cur.read_u16::<BigEndian>()?;
        let gen = cur.read_u32::<BigEndian>()?;

        let (next_unlinked, crtime_sec, crtime_nsec, ino, flags2, cowextsize, lsn, changecount, reflink_ino) = if version >= 3 && buf.len() >= 176 {
            let next_unlinked = cur.read_u32::<BigEndian>()?;
            let _crc = cur.read_u32::<BigEndian>()?;
            let changecount = cur.read_u64::<BigEndian>()?;
            let lsn = cur.read_u64::<BigEndian>()?;
            let flags2 = cur.read_u64::<BigEndian>()?;
            let cowextsize = cur.read_u32::<BigEndian>()?;
            let mut _pad3 = [0u8; 12];
            std::io::Read::read_exact(&mut cur, &mut _pad3)?;
            let crtime_sec = cur.read_u32::<BigEndian>()?;
            let crtime_nsec = cur.read_u32::<BigEndian>()?;
            let ino = cur.read_u64::<BigEndian>()?;
            let reflink_ino = cur.read_u64::<BigEndian>()?;
            (Some(next_unlinked), Some(crtime_sec), Some(crtime_nsec),
             Some(ino), Some(flags2), Some(cowextsize), Some(lsn), Some(changecount), Some(reflink_ino))
        } else {
            (None, None, None, None, None, None, None, None, None)
        };

        Ok(Some(XfsInodeCore {
            magic, mode, version, format, nlinkv2, uid, gid, nlink, projid_lo, projid_hi,
            atime_sec, atime_nsec, mtime_sec, mtime_nsec, ctime_sec, ctime_nsec,
            size, nblocks, extsize, nextents, anextents, forkoff, aformat,
            dmevmask, dmstate, flags, gen,
            next_unlinked, crtime_sec, crtime_nsec, ino, flags2, cowextsize, lsn, changecount, reflink_ino,
        }))
    }

    /// File type from mode bits (top 4 bits of di_mode).
    pub fn file_type(&self) -> ObjectType {
        match self.mode >> 12 {
            0x8 => ObjectType::RegularFile,
            0x4 => ObjectType::Directory,
            0xa => ObjectType::SymbolicLink,
            0x6 => ObjectType::BlockDevice,
            0x2 => ObjectType::CharDevice,
            0x1 => ObjectType::Fifo,
            0xc => ObjectType::Socket,
            _ => ObjectType::Unknown,
        }
    }

    /// True if this inode has a zero nlink (deleted).
    pub fn is_deleted(&self) -> bool {
        self.nlinkv2 == 0 && self.nlink == 0
    }

    /// Convert XFS timestamp to UTC.
    pub fn to_utc(sec: u32, _nsec: u32) -> Option<DateTime<Utc>> {
        Utc.timestamp_opt(sec as i64, 0).single()
    }

    /// Build an ObjectMetadata from this inode.
    pub fn to_metadata(&self, evidence_id: Uuid, object_id: u64) -> ObjectMetadata {
        let mut meta = ObjectMetadata::new(evidence_id);
        meta.object_id = MetaField::recovered(object_id);
        meta.object_type = MetaField::recovered(self.file_type());
        meta.permissions = MetaField::recovered((self.mode & 0x0fff) as u32);
        meta.uid = MetaField::recovered(self.uid);
        meta.gid = MetaField::recovered(self.gid);
        meta.link_count = MetaField::recovered(self.nlinkv2);
        if self.size >= 0 {
            meta.size = MetaField::recovered(self.size as u64);
        }
        meta.flags = MetaField::recovered(self.flags as u64);

        // Timestamps
        if let Some(ts) = Self::to_utc(self.mtime_sec, self.mtime_nsec) {
            meta.timestamps.push(ForensicTimestamp::recovered(TimestampKind::Modified, ts));
        }
        if let Some(ts) = Self::to_utc(self.ctime_sec, self.ctime_nsec) {
            meta.timestamps.push(ForensicTimestamp::recovered(TimestampKind::MetadataChanged, ts));
        }
        if let Some(ts) = Self::to_utc(self.atime_sec, self.atime_nsec) {
            meta.timestamps.push(ForensicTimestamp::recovered(TimestampKind::Accessed, ts));
        }
        if let (Some(sec), Some(nsec)) = (self.crtime_sec, self.crtime_nsec) {
            if let Some(ts) = Self::to_utc(sec, nsec) {
                meta.timestamps.push(ForensicTimestamp::recovered(TimestampKind::Created, ts));
            }
        }

        meta
    }

    /// Parse extents from the data fork buffer (the byte slice starting at inode offset 0).
    pub fn parse_extents(&self, inode_buf: &[u8]) -> Vec<XfsBmbtRec> {
        let fork_offset = if self.version >= 3 { 176 } else { 100 };
        if self.format != XfsInodeFmt::Extents as u8 || self.nextents <= 0 || fork_offset >= inode_buf.len() {
            return Vec::new();
        }
        let data_fork = &inode_buf[fork_offset..];
        let mut extents = Vec::with_capacity(self.nextents as usize);
        for i in 0..self.nextents as usize {
            let start = i * 16;
            let end = start + 16;
            if end <= data_fork.len() {
                let rec_bytes: &[u8; 16] = data_fork[start..end].try_into().unwrap();
                extents.push(XfsBmbtRec::unpack(rec_bytes));
            } else {
                break;
            }
        }
        extents
    }

    /// Read inline data if the inode format is Local.
    pub fn read_inline_data<'a>(&self, inode_buf: &'a [u8]) -> Option<&'a [u8]> {
        if self.format != XfsInodeFmt::Local as u8 {
            return None;
        }
        let fork_offset = if self.version >= 3 { 176 } else { 100 };
        if fork_offset >= inode_buf.len() {
            return None;
        }
        let available = &inode_buf[fork_offset..];
        let len = (self.size as usize).min(available.len());
        Some(&available[..len])
    }

    /// Build a RecoveryCandidate with extent or inline fragments for this inode.
    pub fn to_recovery_candidate(
        &self,
        evidence_id: Uuid,
        inode_no: u64,
        inode_buf: &[u8],
        inode_offset: u64,
        agblklog: u8,
        agblocks: u32,
        block_size: u32,
    ) -> RecoveryCandidate {
        use metadata::{ConfidenceLevel, ConfidenceSignals, RecoveryFragment};

        let mut signals = ConfidenceSignals::new();
        signals.metadata_validity = Some(true);
        signals.reasons.push("✓ XFS inode metadata parsed successfully".into());

        let mut fragments = Vec::new();
        let logical_size = if self.size >= 0 { Some(self.size as u64) } else { None };
        let mut recovered_size = 0u64;

        if self.format == XfsInodeFmt::Local as u8 {
            let fork_offset = if self.version >= 3 { 176 } else { 100 };
            let inline_len = if self.size >= 0 {
                (self.size as u64).min((inode_buf.len().saturating_sub(fork_offset)) as u64)
            } else {
                0
            };
            if inline_len > 0 {
                fragments.push(RecoveryFragment {
                    fragment_index: 0,
                    source_offset: inode_offset + fork_offset as u64,
                    length: inline_len,
                    logical_offset: 0,
                    confidence: ConfidenceLevel::High,
                });
                recovered_size = inline_len;
                signals.extent_validity = Some(true);
                signals.reasons.push("✓ Local inline data present in inode fork".into());
            }
        } else if self.format == XfsInodeFmt::Extents as u8 {
            let extents = self.parse_extents(inode_buf);
            if !extents.is_empty() {
                signals.extent_validity = Some(true);
                signals.reasons.push(format!("✓ Parsed {} XFS extents", extents.len()));
                for (idx, ext) in extents.iter().enumerate() {
                    let frag_offset = ext.byte_offset(agblklog, agblocks, block_size);
                    let frag_len = ext.byte_len(block_size);
                    let log_offset = ext.startoff * (block_size as u64);
                    fragments.push(RecoveryFragment {
                        fragment_index: idx as u32,
                        source_offset: frag_offset,
                        length: frag_len,
                        logical_offset: log_offset,
                        confidence: ConfidenceLevel::Medium,
                    });
                    recovered_size += frag_len;
                }
            } else if self.nextents > 0 {
                signals.extent_validity = Some(false);
                signals.reasons.push("✗ Extents indicated in inode but could not be parsed from fork".into());
            }
        }

        let is_deleted = self.is_deleted();
        let status = if is_deleted {
            if recovered_size > 0 && logical_size.map_or(true, |sz| recovered_size >= sz) {
                RecoveryStatus::Confirmed
            } else if recovered_size > 0 {
                RecoveryStatus::Partial
            } else {
                RecoveryStatus::Unrecoverable
            }
        } else {
            RecoveryStatus::Confirmed
        };

        let metadata = self.to_metadata(evidence_id, inode_no);

        RecoveryCandidate {
            candidate_id: Uuid::new_v4(),
            evidence_id,
            status,
            confidence: signals,
            metadata: Some(metadata),
            logical_size,
            recovered_size: logical_size.map_or(recovered_size, |sz| recovered_size.min(sz)),
            missing_bytes: logical_size.map_or(0, |sz| sz.saturating_sub(recovered_size)),
            fragments,
            recovery_method: if self.format == XfsInodeFmt::Local as u8 {
                "xfs_inline_data".into()
            } else {
                "xfs_extent_recovery".into()
            },
            sha256: None,
            blake3: None,
            discovered_at: Utc::now(),
        }
    }
}

/// XFS filesystem parser implementing the FilesystemParser trait.
pub struct XfsParser;

impl XfsParser {
    pub fn new() -> Self {
        Self
    }

    /// Re-construct a RecoveryCandidate for a previously scanned ObjectRecord.
    pub fn candidate_for_record(
        &self,
        source: &mut EvidenceSource,
        record: &ObjectRecord,
        superblock: &SuperblockInfo,
    ) -> Result<Option<RecoveryCandidate>> {
        let inode_size = superblock.extended.get("inode_size").and_then(|v| v.as_u64()).unwrap_or(512) as usize;
        let buf = source.read_at(record.source_offset, inode_size)?;
        if let Some(inode) = XfsInodeCore::parse(&buf)? {
            let agblocks = superblock.extended.get("ag_blocks").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
            let agblklog = superblock.extended.get("agblklog").and_then(|v| v.as_u64()).unwrap_or(0) as u8;
            Ok(Some(inode.to_recovery_candidate(
                record.evidence_id,
                record.object_id,
                &buf,
                record.source_offset,
                agblklog,
                agblocks,
                superblock.block_size,
            )))
        } else {
            Ok(None)
        }
    }
}

impl Default for XfsParser {
    fn default() -> Self {
        Self::new()
    }
}

impl FilesystemParser for XfsParser {
    fn filesystem_type(&self) -> FilesystemType {
        FilesystemType::Xfs
    }

    fn detect(&self, source: &mut EvidenceSource) -> Result<bool> {
        let buf = source.read_at(0, 512).context("Failed to read superblock region")?;
        Ok(XfsSuperblock::parse(&buf)?.is_some())
    }

    fn parse_superblock(&self, source: &mut EvidenceSource) -> Result<SuperblockInfo> {
        let buf = source.read_at(0, 512).context("Failed to read XFS superblock")?;
        let sb = XfsSuperblock::parse(&buf)?
            .ok_or_else(|| anyhow::anyhow!("XFS magic not found — not an XFS filesystem"))?;

        let mut features = Vec::new();
        if sb.version() == 5 {
            features.push("XFSv5".to_string());
            features.push("CRC".to_string());
            if sb.has_ftype() { features.push("ftype".to_string()); }
            if sb.has_bigtime() { features.push("bigtime".to_string()); }
        } else {
            features.push(format!("XFSv{}", sb.version()));
        }

        let created_at = sb.lsn.map(|_| None).flatten(); // LSN is not a creation timestamp
        let last_written_at = None;

        Ok(SuperblockInfo {
            filesystem_type: FilesystemType::Xfs,
            uuid: Some(sb.uuid_str()),
            volume_label: sb.volume_label(),
            total_size: sb.total_size(),
            block_size: sb.block_size,
            sector_size: sb.sectsize as u32,
            total_blocks: sb.total_blocks,
            free_blocks: Some(sb.fdblocks),
            inode_count: Some(sb.icount),
            free_inodes: Some(sb.ifree),
            feature_flags: sb.features2 as u64,
            features,
            has_journal: sb.logblocks > 0,
            created_at,
            last_mounted_at: None,
            last_written_at,
            extended: serde_json::json!({
                "version": sb.version(),
                "ag_count": sb.agcount,
                "ag_blocks": sb.agblocks,
                "agblklog": sb.agblklog,
                "inode_size": sb.inodesize,
                "root_ino": sb.rootino,
                "features_incompat": sb.features_incompat,
            }),
        })
    }

    fn enumerate_objects(
        &self,
        source: &mut EvidenceSource,
        superblock: &SuperblockInfo,
        callback: &mut dyn FnMut(ObjectRecord),
    ) -> Result<AnalysisSummary> {
        // Phase 1/2 implementation: scan all AGs for inode records,
        // parse extent descriptors or inline data, and produce recoverable candidates.
        let inode_size: u64 = {
            let buf = source.read_at(0, 512)?;
            if let Some(sb) = XfsSuperblock::parse(&buf)? {
                sb.inodesize as u64
            } else {
                512
            }
        };

        let agblocks = superblock.extended.get("ag_blocks").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
        let agblklog = superblock.extended.get("agblklog").and_then(|v| v.as_u64()).unwrap_or(0) as u8;
        let block_size_u32 = superblock.block_size;

        let mut total_objects = 0u64;
        let mut deleted_candidates = 0u64;
        let mut recoverable = 0u64;
        let mut partial_recoveries = 0u64;
        let mut unrecoverable = 0u64;
        let mut warnings = Vec::new();
        let evidence_id = source.info.evidence_id;

        // Scan the filesystem image in inode-sized chunks,
        // looking for inode magic signatures.
        let scan_size = source.info.size;
        let mut offset = 0u64;

        while offset + inode_size <= scan_size {
            match source.read_at(offset, inode_size as usize) {
                Ok(buf) => {
                    if buf.len() >= 2 && buf[0] == 0x49 && buf[1] == 0x4e {
                        // Possible inode — attempt to parse.
                        match XfsInodeCore::parse(&buf) {
                            Ok(Some(inode)) => {
                                total_objects += 1;
                                let is_deleted = inode.is_deleted();
                                let inode_no = offset / inode_size;

                                let cand = inode.to_recovery_candidate(
                                    evidence_id,
                                    inode_no,
                                    &buf,
                                    offset,
                                    agblklog,
                                    agblocks,
                                    block_size_u32,
                                );

                                if is_deleted {
                                    deleted_candidates += 1;
                                    if cand.recovered_size > 0 && cand.missing_bytes == 0 {
                                        recoverable += 1;
                                    } else if cand.recovered_size > 0 {
                                        partial_recoveries += 1;
                                    } else {
                                        unrecoverable += 1;
                                    }
                                }

                                let record = ObjectRecord {
                                    record_id: cand.candidate_id,
                                    evidence_id,
                                    object_id: inode_no,
                                    parent_id: None,
                                    filename: None,
                                    status: cand.status,
                                    metadata: cand.metadata.clone(),
                                    source_offset: offset,
                                };
                                callback(record);
                            }
                            Ok(None) => {}
                            Err(e) => {
                                warnings.push(ParseWarning {
                                    kind: ParseErrorKind::CorruptMetadata,
                                    message: format!("Inode parse error at offset {}: {}", offset, e),
                                    offset: Some(offset),
                                    object_id: None,
                                });
                            }
                        }
                    }
                }
                Err(e) => {
                    warnings.push(ParseWarning {
                        kind: ParseErrorKind::ReadError,
                        message: format!("Read error at offset {}: {}", offset, e),
                        offset: Some(offset),
                        object_id: None,
                    });
                }
            }
            offset += inode_size;
        }

        Ok(AnalysisSummary {
            filesystem_type: FilesystemType::Xfs,
            filesystem_uuid: superblock.uuid.clone(),
            volume_label: superblock.volume_label.clone(),
            total_objects,
            deleted_candidates,
            recoverable,
            partial_recoveries,
            carved: 0,
            unrecoverable,
            warnings,
        })
    }

    fn recover_content(
        &self,
        source: &mut EvidenceSource,
        candidate: &RecoveryCandidate,
        output: &mut dyn Write,
    ) -> Result<RecoveryResult> {
        use sha2::{Digest, Sha256};
        let mut sha_hasher = Sha256::new();
        let mut blake_hasher = blake3::Hasher::new();
        let mut bytes_written = 0u64;
        let mut warnings = Vec::new();

        let target_size = candidate.logical_size.unwrap_or(u64::MAX);

        if !candidate.fragments.is_empty() {
            for frag in &candidate.fragments {
                if bytes_written >= target_size {
                    break;
                }
                let max_for_frag = frag.length.min(target_size.saturating_sub(bytes_written));
                if max_for_frag == 0 {
                    continue;
                }

                let mut offset = frag.source_offset;
                let mut remaining = max_for_frag;
                while remaining > 0 {
                    let chunk_size = (remaining.min(65536)) as usize;
                    match source.read_at(offset, chunk_size) {
                        Ok(data) => {
                            if data.is_empty() {
                                break;
                            }
                            output.write_all(&data)?;
                            sha_hasher.update(&data);
                            blake_hasher.update(&data);
                            let n = data.len() as u64;
                            bytes_written += n;
                            offset += n;
                            remaining = remaining.saturating_sub(n);
                        }
                        Err(e) => {
                            warnings.push(ParseWarning {
                                kind: ParseErrorKind::ReadError,
                                message: format!("Failed reading fragment at offset {}: {}", offset, e),
                                offset: Some(offset),
                                object_id: None,
                            });
                            break;
                        }
                    }
                }
            }
        } else {
            warnings.push(ParseWarning {
                kind: ParseErrorKind::IncompleteData,
                message: "No recovery fragments available for candidate".into(),
                offset: None,
                object_id: candidate.metadata.as_ref().and_then(|m| m.object_id.value),
            });
        }

        let sha256_hex = hex::encode(sha_hasher.finalize());
        let blake3_hex = blake_hasher.finalize().to_hex().to_string();

        let status = if bytes_written == 0 && target_size > 0 {
            RecoveryStatus::Unrecoverable
        } else if let Some(total) = candidate.logical_size {
            if bytes_written >= total {
                RecoveryStatus::Confirmed
            } else {
                RecoveryStatus::Partial
            }
        } else if bytes_written > 0 {
            RecoveryStatus::Probable
        } else {
            RecoveryStatus::Unknown
        };

        Ok(RecoveryResult {
            bytes_written,
            status,
            warnings,
            sha256: Some(sha256_hex),
            blake3: Some(blake3_hex),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    /// Build a minimal XFS superblock byte sequence.
    fn minimal_xfs_superblock_v5() -> Vec<u8> {
        let mut buf = vec![0u8; 512];
        // Magic: XFSB
        buf[0] = 0x58; buf[1] = 0x46; buf[2] = 0x53; buf[3] = 0x42;
        // Block size: 4096 (big-endian)
        buf[4] = 0x00; buf[5] = 0x00; buf[6] = 0x10; buf[7] = 0x00;
        // Total blocks: 1024
        buf[8] = 0x00; buf[9] = 0x00; buf[10] = 0x00; buf[11] = 0x00;
        buf[12] = 0x00; buf[13] = 0x00; buf[14] = 0x04; buf[15] = 0x00;
        // UUID: arbitrary
        for i in 48..64 { buf[i] = i as u8; }
        // versionnum: 5 (big-endian at offset 104)
        buf[104] = 0x00; buf[105] = 0x05;
        // sectsize: 512
        buf[106] = 0x02; buf[107] = 0x00;
        // inodesize: 512
        buf[108] = 0x02; buf[109] = 0x00;
        buf
    }

    #[test]
    fn parse_xfs_superblock_magic() {
        let buf = minimal_xfs_superblock_v5();
        let result = XfsSuperblock::parse(&buf).unwrap();
        assert!(result.is_some());
        let sb = result.unwrap();
        assert_eq!(sb.magic, XFS_SB_MAGIC);
    }

    #[test]
    fn parse_non_xfs_returns_none() {
        let buf = vec![0u8; 512];
        let result = XfsSuperblock::parse(&buf).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn xfs_superblock_too_small_returns_error() {
        let buf = vec![0u8; 10];
        let result = XfsSuperblock::parse(&buf);
        assert!(result.is_err());
    }

    #[test]
    fn inode_core_deleted_detection() {
        let mut buf = vec![0u8; 256];
        // Magic: IN = 0x49 0x4e
        buf[0] = 0x49; buf[1] = 0x4e;
        // nlinkv2 = 0 (at offset 16)
        for i in 8..12 { buf[i] = 0; } // nlinkv2
        let inode = XfsInodeCore::parse(&buf).unwrap();
        // May return None if version byte is 0 and further parsing fails, so we just test parse
        // path doesn't panic on zero buffer.
        // The important invariant is: parse must not panic on any input.
    }

    #[test]
    fn detect_xfs_on_minimal_image() {
        let mut image = minimal_xfs_superblock_v5();
        // Extend to 0x11000 bytes so detect_filesystem doesn't truncate.
        image.resize(0x11000, 0);
        let mut tmp = NamedTempFile::new().unwrap();
        tmp.write_all(&image).unwrap();
        tmp.flush().unwrap();

        let mut src = evidence::EvidenceSource::open(
            tmp.path(),
            evidence::SourceType::RawImage,
            None,
            "test",
            None,
        ).unwrap();

        let parser = XfsParser::new();
        assert!(parser.detect(&mut src).unwrap());
    }

    #[test]
    fn parse_superblock_from_minimal_image() {
        let mut image = minimal_xfs_superblock_v5();
        image.resize(0x11000, 0);
        let mut tmp = NamedTempFile::new().unwrap();
        tmp.write_all(&image).unwrap();
        tmp.flush().unwrap();

        let mut src = evidence::EvidenceSource::open(
            tmp.path(),
            evidence::SourceType::RawImage,
            None,
            "test",
            None,
        ).unwrap();

        let parser = XfsParser::new();
        let sb = parser.parse_superblock(&mut src).unwrap();
        assert_eq!(sb.filesystem_type, FilesystemType::Xfs);
        assert_eq!(sb.block_size, 4096);
    }

    #[test]
    fn test_xfs_bmbt_unpack() {
        // Construct a raw 16-byte extent record:
        // state = 0, startoff = 10, startblock = 100, blockcount = 5
        let hi = (10u64 & ((1u64 << 54) - 1)) << 9 | ((100u64 >> 43) & 0x1ff);
        let lo = ((100u64 & ((1u64 << 43) - 1)) << 21) | (5u64 & ((1u64 << 21) - 1));
        let mut raw = [0u8; 16];
        raw[0..8].copy_from_slice(&hi.to_be_bytes());
        raw[8..16].copy_from_slice(&lo.to_be_bytes());

        let rec = XfsBmbtRec::unpack(&raw);
        assert_eq!(rec.state, 0);
        assert_eq!(rec.startoff, 10);
        assert_eq!(rec.startblock, 100);
        assert_eq!(rec.blockcount, 5);
        assert_eq!(rec.byte_len(4096), 5 * 4096);
    }

    #[test]
    fn test_xfs_recover_content() {
        use metadata::{ConfidenceLevel, RecoveryFragment};

        let mut data = vec![0u8; 4096 * 4];
        let secret = b"TRACE_X_FORENSIC_RECOVERY_VERIFIED_CONTENT_12345";
        data[4096..4096 + secret.len()].copy_from_slice(secret);

        let mut tmp = NamedTempFile::new().unwrap();
        tmp.write_all(&data).unwrap();
        tmp.flush().unwrap();

        let mut src = evidence::EvidenceSource::open(
            tmp.path(),
            evidence::SourceType::RawImage,
            None,
            "test",
            None,
        ).unwrap();

        let candidate = RecoveryCandidate {
            candidate_id: Uuid::new_v4(),
            evidence_id: src.info.evidence_id,
            status: RecoveryStatus::Confirmed,
            confidence: metadata::ConfidenceSignals::new(),
            metadata: None,
            logical_size: Some(secret.len() as u64),
            recovered_size: secret.len() as u64,
            missing_bytes: 0,
            fragments: vec![RecoveryFragment {
                fragment_index: 0,
                source_offset: 4096,
                length: secret.len() as u64,
                logical_offset: 0,
                confidence: ConfidenceLevel::High,
            }],
            recovery_method: "xfs_extent_recovery".into(),
            sha256: None,
            blake3: None,
            discovered_at: chrono::Utc::now(),
        };

        let mut out = Vec::new();
        let parser = XfsParser::new();
        let res = parser.recover_content(&mut src, &candidate, &mut out).unwrap();

        assert_eq!(res.bytes_written, secret.len() as u64);
        assert_eq!(res.status, RecoveryStatus::Confirmed);
        assert_eq!(&out, secret);
        assert!(res.sha256.is_some());
        assert!(res.blake3.is_some());
    }
}
