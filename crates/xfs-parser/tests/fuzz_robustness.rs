use proptest::prelude::*;
use xfs_parser::{XfsBmbtRec, XfsInodeCore, XfsSuperblock};

proptest! {
    /// Fuzz test: XfsSuperblock::parse must never panic on arbitrary byte inputs.
    #[test]
    fn fuzz_xfs_superblock_parse(data in proptest::collection::vec(any::<u8>(), 0..2048)) {
        let _ = XfsSuperblock::parse(&data);
    }

    /// Fuzz test: XfsInodeCore::parse must never panic on arbitrary byte inputs.
    #[test]
    fn fuzz_xfs_inode_parse(data in proptest::collection::vec(any::<u8>(), 0..1024)) {
        let _ = XfsInodeCore::parse(&data);
    }

    /// Fuzz test: XfsBmbtRec::unpack must never panic on arbitrary 16-byte buffers.
    #[test]
    fn fuzz_xfs_bmbt_unpack(data in proptest::array::uniform16(any::<u8>())) {
        let rec = XfsBmbtRec::unpack(&data);
        let _ = rec.byte_offset(9, 4096, 4096);
        let _ = rec.byte_len(4096);
    }
}
