# forensic-recovery

**Production-grade forensic recovery platform for XFS and Btrfs filesystem images.**

> Suitable for authorized digital-forensics investigations, incident response, laboratory analysis, research, and forensic education.
> **Never modifies evidence. Read-only processing only.**

---

## Overview

`forensic-recovery` recovers deleted files and filesystem metadata from XFS and Btrfs forensic disk images. It provides:

- **XFS and Btrfs parser** — superblock, inode, extent, directory, snapshot analysis
- **Deleted file detection** — metadata, allocation-state, historical structure, and carving strategies  
- **File carver** — JPEG, PNG, PDF, ELF, ZIP, SQLite signature carving
- **Cryptographic hashing** — SHA-256, SHA-512, BLAKE3 (MD5/SHA-1 as legacy-only)
- **Validation engine** — structural, content, and hash verification
- **Timeline engine** — normalized forensic event model with JSON/CSV export
- **Case management** — SQLite-backed case/evidence/artifact/audit database
- **Report generation** — HTML, JSON, CSV, PDF forensic reports
- **CLI and GUI** — both use the same Rust core engine

---

## ⚠️ Safety and Forensic Principles

This tool follows: **Acquire → Verify → Analyze → Recover → Validate → Document → Report**

- Evidence is always opened **read-only**.
- Evidence is **never mounted, modified, repaired, or overwritten**.
- Recovered files are **never automatically executed**.
- The audit log is **append-only**.
- All metadata fields carry explicit **provenance** (RECOVERED / INFERRED / DERIVED / UNKNOWN).
- Recovery limitations are always disclosed.

---

## Project Structure

```
forensic-recovery/
├── crates/
│   ├── forensic-core/      # CLI binary + orchestration
│   ├── evidence/           # Read-only evidence abstraction, hashing, FS detection
│   ├── filesystem/         # FilesystemParser trait + shared types
│   ├── xfs-parser/         # XFS v4/v5 superblock, inode, extent parser
│   ├── btrfs-parser/       # Btrfs superblock, tree, inode parser
│   ├── block-scanner/      # Block-level signature scanning coordinator
│   ├── file-carver/        # JPEG, PNG, PDF, ELF, ZIP, SQLite carvers
│   ├── metadata/           # ObjectMetadata, RecoveryCandidate, confidence model
│   ├── hashing/            # SHA-256, SHA-512, BLAKE3, legacy MD5/SHA-1
│   ├── validation/         # Content, structural, hash validation
│   ├── timeline/           # Forensic event timeline
│   ├── reporting/          # HTML, JSON, CSV, PDF report generation
│   ├── database/           # SQLite schema, WAL, migrations, CRUD
│   ├── audit/              # Append-only audit log
│   └── test-fixtures/      # Deterministic synthetic evidence images
├── frontend/               # React + TypeScript + Tailwind UI
├── apps/desktop/           # Tauri desktop shell
├── docs/                   # Architecture, methodology, filesystem notes
└── tests/                  # Integration tests
```

---

## Quick Start

### Requirements

- Rust 1.82+ (stable)
- Node.js 18+
- (For desktop GUI) [Tauri prerequisites](https://tauri.app/start/prerequisites/)

### Build CLI

```bash
cargo build --release -p forensic-core
```

### Run Tests

```bash
cargo test --workspace
```

### CLI Usage

```bash
# Inspect a forensic image
./forensic-recovery inspect evidence.img

# Scan for deleted files
./forensic-recovery scan --input evidence.img --filesystem auto

# Create a case
./forensic-recovery create-case \
  --case-number CASE-2026-001 \
  --title "Unauthorized Access Investigation" \
  --investigator "Jane Smith" \
  --organization "Forensics Lab"

# Hash evidence
./forensic-recovery hash --input evidence.img

# Generate HTML report
./forensic-recovery report --case-id <UUID> --format html --output report.html

# List all cases
./forensic-recovery list-cases
```

---

## Supported Filesystems

| Filesystem | Detection | Superblock | Inodes | Extents | Directory | Carving |
|------------|-----------|------------|--------|---------|-----------|---------|
| XFS v4/v5  | ✅        | ✅         | ✅     | 🔄 Phase 2 | 🔄 Phase 2 | ✅ |
| Btrfs      | ✅        | ✅         | 🔄 Phase 3 | 🔄 Phase 3 | 🔄 Phase 3 | ✅ |
| ext4       | 🔍 Detection only | ❌ | ❌ | ❌ | ❌ | ✅ |
| NTFS       | 🔍 Detection only | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Recovery Status Model

| Status | Meaning |
|--------|---------|
| `CONFIRMED` | Full content and metadata recovered and validated |
| `PROBABLE` | Content recovered, validation incomplete |
| `PARTIAL` | Some content missing (fragmentation, block reuse) |
| `CARVED` | Signature-carved only — no filesystem metadata |
| `UNRECOVERABLE` | Evidence of deletion but content unavailable |
| `UNKNOWN` | Status not yet determined |

---

## Confidence Model

Confidence is computed from individual signals — never a single unexplained score:

```
metadata_validity      — Valid inode/object metadata found
extent_validity        — Extent map is structurally valid
signature_validity     — File type signature matches
content_validation     — File parsed successfully
checksum_validation    — Internal checksum verified
directory_relationship — Parent directory entry found
timestamp_confidence   — Timestamps are internally consistent
fragmentation_penalty  — Applied when fragmentation reduces confidence
```

Result: `HIGH | MEDIUM | LOW | UNKNOWN`

---

## Limitations

Recovery is not guaranteed. Content may be unrecoverable due to:

- Block reuse after deletion
- SSD TRIM/discard
- Btrfs copy-on-write garbage collection
- Fragmentation without recoverable fragment ordering
- Encryption
- Compression (partial data)
- Filesystem repair operations
- Overwritten metadata
- Damaged evidence

**This tool never promises complete recovery.**

---

## Security

- Filesystem structures are treated as **hostile input**
- All parsers bounds-check every offset and length
- Integer overflow detection on all size calculations
- Recursion limits on tree traversal
- No automatic execution of recovered files
- Sandboxed Tauri command allowlists
- Path traversal protection

---

## License

MIT — See [LICENSE](LICENSE)

---

## References

- [XFS Filesystem Disk Structures](https://www.kernel.org/doc/html/latest/filesystems/xfs.html)
- [Btrfs On-Disk Format](https://btrfs.readthedocs.io/en/latest/On-disk-format.html)
- [Linux kernel fs/xfs/](https://elixir.bootlin.com/linux/latest/source/fs/xfs)
- [Linux kernel fs/btrfs/](https://elixir.bootlin.com/linux/latest/source/fs/btrfs)
- [xfsprogs](https://github.com/libxfs/xfsprogs-dev)
- [btrfs-progs](https://github.com/kdave/btrfs-progs)
