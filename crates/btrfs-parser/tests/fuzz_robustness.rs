use proptest::prelude::*;
use btrfs_parser::BtrfsSuperblock;

proptest! {
    /// Fuzz test: BtrfsSuperblock::parse must never panic on arbitrary byte inputs.
    #[test]
    fn fuzz_btrfs_superblock_parse(data in proptest::collection::vec(any::<u8>(), 0..4096)) {
        let _ = BtrfsSuperblock::parse(&data);
    }
}
