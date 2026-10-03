use std::fs;
use std::path::Path;
use test_fixtures::{generate_xfs_demo_image, generate_btrfs_demo_image};

fn main() -> anyhow::Result<()> {
    let out_dir = Path::new("fixtures");
    fs::create_dir_all(out_dir)?;

    let xfs_bytes = generate_xfs_demo_image();
    let xfs_path = out_dir.join("xfs_deleted_demo.img");
    fs::write(&xfs_path, &xfs_bytes)?;
    println!("✓ Generated XFS synthetic fixture: {} ({} bytes)", xfs_path.display(), xfs_bytes.len());

    let btrfs_bytes = generate_btrfs_demo_image();
    let btrfs_path = out_dir.join("btrfs_deleted_demo.img");
    fs::write(&btrfs_path, &btrfs_bytes)?;
    println!("✓ Generated Btrfs synthetic fixture: {} ({} bytes)", btrfs_path.display(), btrfs_bytes.len());

    Ok(())
}
