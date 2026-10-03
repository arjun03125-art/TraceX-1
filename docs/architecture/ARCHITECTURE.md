# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                React Investigator UI                │
│  (Dashboard, Cases, Evidence, Deleted Files, ...)   │
├─────────────────────────────────────────────────────┤
│                  Tauri Commands                     │
│         (Strict allowlists, sandboxed IPC)          │
├─────────────────────────────────────────────────────┤
│                  Rust Core API                      │
│            (forensic-core orchestration)            │
├─────────────────────────────────────────────────────┤
│             Forensic Analysis Engine                │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  XFS Engine  │  │ Btrfs Engine │                │
│  └──────────────┘  └──────────────┘                │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Block Scan   │  │ File Carver  │                │
│  └──────────────┘  └──────────────┘                │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  Metadata    │  │ Hash Engine  │                │
│  └──────────────┘  └──────────────┘                │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  Validation  │  │  Timeline    │                │
│  └──────────────┘  └──────────────┘                │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  Reporting   │  │  Audit Log   │                │
│  └──────────────┘  └──────────────┘                │
├─────────────────────────────────────────────────────┤
│               SQLite Case Database                  │
├─────────────────────────────────────────────────────┤
│                  Evidence Layer                     │
│    Disk Images / Block Devices / Partition Images   │
└─────────────────────────────────────────────────────┘
```

## Forensic Workflow

```
Evidence Intake
     ↓
Source Identification (magic, partition table)
     ↓
Hash Acquisition (SHA-256, SHA-512, BLAKE3)
     ↓
Hash Verification (optional: compare to expected)
     ↓
Filesystem Detection (XFS / Btrfs / unknown)
     ↓
Superblock Parsing
     ↓
Structure Analysis
  ├── Metadata enumeration (inodes, objects)
  ├── Deleted candidate identification
  │     ├── Zero-link-count inodes (XFS)
  │     ├── Unreferenced objects (Btrfs)
  │     └── Historical tree analysis (Btrfs snapshots)
  └── Block-level scanning (unallocated regions)
        └── File carving (JPEG, PNG, PDF, ELF, ZIP, SQLite)
     ↓
Recovery Engine
  ├── Extent reconstruction
  ├── Fragment detection and ordering
  └── Partial recovery handling
     ↓
Validation
  ├── Structural validation
  ├── Content validation
  └── Cryptographic hash verification
     ↓
Timeline Construction
     ↓
Report Generation
     ↓
Audit Trail (append-only)
```

## Crate Dependency Graph

```
forensic-core (CLI binary)
    ├── evidence
    │     └── hashing
    ├── filesystem (traits)
    ├── xfs-parser
    │     ├── evidence
    │     ├── filesystem
    │     └── metadata
    ├── btrfs-parser
    │     ├── evidence
    │     ├── filesystem
    │     └── metadata
    ├── block-scanner
    │     └── file-carver
    │           ├── evidence
    │           └── metadata
    ├── metadata (standalone)
    ├── hashing (standalone)
    ├── validation
    │     └── hashing
    ├── timeline
    │     └── metadata
    ├── reporting
    │     ├── database
    │     ├── metadata
    │     ├── timeline
    │     └── audit
    ├── database (standalone)
    ├── audit
    │     └── database
    └── test-fixtures (dev/test only)
```

## Key Design Decisions

### 1. Read-Only Evidence Access
All evidence sources are opened with `O_RDONLY`. The `EvidenceSource` struct wraps a `File` and
provides only `read_at()`, `read_sector()`, and `read_block()` — no write methods exist.

### 2. Explicit Metadata Provenance
Every metadata field is wrapped in `MetaField<T>` which carries a `MetadataSource` enum:
`RECOVERED | INFERRED | DERIVED | UNKNOWN`. Reports always show this provenance.

### 3. Separated Concerns
- Filesystem parsing (`xfs-parser`, `btrfs-parser`) is completely separate from recovery policy.
- Recovery is separate from presentation (UI/CLI).
- Evidence handling is separate from recovered-output handling.

### 4. Confidence Transparency
The `ConfidenceSignals` struct exposes individual boolean signals, not a single opaque score.
Investigators can see exactly which signals contributed to `HIGH / MEDIUM / LOW / UNKNOWN`.

### 5. Plugin Architecture
The `FilesystemParser` trait allows future addition of ext4, NTFS, APFS parsers without
modifying the core recovery engine. The `FileCarver` trait allows adding new file type carvers.

### 6. Append-Only Audit
Audit events are written through the `AuditLogger` into a dedicated SQLite table.
No `DELETE` or `UPDATE` operations are performed on audit rows.

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Desktop shell | Tauri | 2.12+ |
| Forensic engine | Rust | 1.82 stable |
| Frontend | React + TypeScript | 19.3 / 5.x |
| Build tool | Vite | 6.x |
| Styling | Tailwind CSS | 3.x |
| Database | SQLite (rusqlite) | bundled 3.x |
| Async | Tokio | 1.40 |
| Binary parsing | byteorder + nom | 1.5 / 7.1 |
| Hashing | sha2, blake3 | 0.10 / 1.5 |
| Serialization | serde_json, csv | 1.0 / 1.3 |
| Logging | tracing | 0.1 |
| CLI | clap | 4.5 |
