//! forensic-recovery / tracex — CLI forensic analysis tool.
//!
//! Provides command-line access to the full forensic engine.
//! Uses the same core as the desktop GUI application.
//!
//! Usage:
//!   forensic-recovery inspect  <evidence>
//!   forensic-recovery scan     --input <evidence> [--filesystem auto|xfs|btrfs] [--read-only]
//!   forensic-recovery recover  --evidence <evidence> --output <dir> [--case-id <id>]
//!   forensic-recovery validate --input <file> [--expected-hash <sha256>]
//!   forensic-recovery audit    --case-id <case-id> [--verify-chain]
//!   forensic-recovery hash     --input <path>
//!   forensic-recovery report   --case <case-id> --format [html|json|csv|pdf]
//!   forensic-recovery timeline --case <case-id> --format [json|csv]

use std::path::PathBuf;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use tracing_subscriber::EnvFilter;

use audit::AuditLogger;
use database::{open_database, AuditEvent, Case};
use evidence::{detect_filesystem, EvidenceSource, FilesystemType, SourceType};
use filesystem::FilesystemParser;
use hashing::{HashAlgorithm, Hasher, FORENSIC_ALGORITHMS};
use reporting::{ForensicReport, ReportFormat};
use uuid::Uuid;

const TOOL_VERSION: &str = env!("CARGO_PKG_VERSION");
const TOOL_NAME: &str = "forensic-recovery";

#[derive(Parser, Debug)]
#[command(
    name = TOOL_NAME,
    version = TOOL_VERSION,
    about = "Forensic recovery tool for XFS and Btrfs filesystem images",
    long_about = "A forensic-grade tool for recovering deleted files and metadata from XFS and Btrfs filesystem images. \
                  Operates in read-only mode. Never modifies evidence."
)]
struct Cli {
    /// Verbosity level (repeat for more: -v, -vv, -vvv)
    #[arg(short, long, action = clap::ArgAction::Count)]
    verbose: u8,

    /// Output machine-readable JSON format
    #[arg(long, global = true)]
    json: bool,

    /// Path to the case database (default: ./forensic-case.db)
    #[arg(long, default_value = "./forensic-case.db")]
    db: PathBuf,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Inspect a forensic evidence image: show filesystem info, hashes, geometry.
    Inspect {
        /// Path to the evidence image or block device.
        evidence: PathBuf,
    },

    /// Scan evidence for deleted files and recovery candidates.
    Scan {
        /// Input evidence image.
        #[arg(long, short)]
        input: PathBuf,

        /// Filesystem type (auto, xfs, btrfs).
        #[arg(long, default_value = "auto")]
        filesystem: String,

        /// Enforce read-only mode (always true, flag is a safety reminder).
        #[arg(long, default_value = "true")]
        read_only: bool,

        /// Case ID to associate with this scan.
        #[arg(long)]
        case_id: Option<String>,
    },

    /// Recover deleted files and carved artifacts from evidence to an output directory.
    Recover {
        /// Path to the evidence image.
        #[arg(long, short)]
        evidence: PathBuf,

        /// Output directory where recovered files will be stored.
        #[arg(long, short)]
        output: PathBuf,

        /// Filesystem type (auto, xfs, btrfs).
        #[arg(long, default_value = "auto")]
        filesystem: String,

        /// Case ID to associate with this recovery.
        #[arg(long)]
        case_id: Option<String>,
    },

    /// Validate a recovered file or evidence artifact.
    Validate {
        /// Path to the file to validate.
        #[arg(long, short)]
        input: PathBuf,

        /// Optional expected SHA-256 digest to verify against.
        #[arg(long)]
        expected_hash: Option<String>,
    },

    /// View or verify cryptographic audit log for a case.
    Audit {
        /// Case ID to view audit log for.
        #[arg(long)]
        case_id: String,

        /// Verify cryptographic hash chaining integrity of the audit log.
        #[arg(long)]
        verify_chain: bool,
    },

    /// Create a new case.
    CreateCase {
        /// Case number (e.g. CASE-2026-001).
        #[arg(long)]
        case_number: String,

        /// Case title.
        #[arg(long)]
        title: String,

        /// Investigator name.
        #[arg(long)]
        investigator: String,

        /// Organization name.
        #[arg(long)]
        organization: Option<String>,
    },

    /// Hash evidence files.
    Hash {
        /// Input file to hash.
        #[arg(long, short)]
        input: PathBuf,

        /// Include legacy MD5 and SHA-1 (not recommended).
        #[arg(long)]
        include_legacy: bool,
    },

    /// Generate a forensic report for a case.
    Report {
        /// Case ID.
        #[arg(long)]
        case_id: String,

        /// Output format: html, json, csv, pdf.
        #[arg(long, default_value = "html")]
        format: String,

        /// Output file path.
        #[arg(long, short)]
        output: Option<PathBuf>,
    },

    /// Export the forensic timeline for a case.
    Timeline {
        /// Case ID.
        #[arg(long)]
        case_id: String,

        /// Export format: json or csv.
        #[arg(long, default_value = "json")]
        format: String,

        /// Output file path.
        #[arg(long, short)]
        output: Option<PathBuf>,
    },

    /// List all cases in the database.
    ListCases,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    // Configure structured logging.
    let filter = match cli.verbose {
        0 => "warn",
        1 => "info",
        2 => "debug",
        _ => "trace",
    };
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::new(filter))
        .with_target(false)
        .compact()
        .init();

    // Open case database.
    let conn = open_database(&cli.db)
        .with_context(|| format!("Failed to open database: {}", cli.db.display()))?;

    let audit = AuditLogger::new(TOOL_VERSION);
    let is_json = cli.json;

    match cli.command {
        Commands::Inspect { evidence } => cmd_inspect(&evidence, is_json),

        Commands::Scan { input, filesystem, read_only: _, case_id } => {
            cmd_scan(&conn, &audit, &input, &filesystem, case_id.as_deref(), is_json)
        }

        Commands::Recover { evidence, output, filesystem, case_id } => {
            cmd_recover(&conn, &audit, &evidence, &output, &filesystem, case_id.as_deref(), is_json)
        }

        Commands::Validate { input, expected_hash } => {
            cmd_validate(&input, expected_hash.as_deref(), is_json)
        }

        Commands::Audit { case_id, verify_chain } => {
            cmd_audit(&conn, &case_id, verify_chain, is_json)
        }

        Commands::CreateCase { case_number, title, investigator, organization } => {
            let case = Case::create(
                &conn,
                &case_number,
                &title,
                &investigator,
                organization,
                None,
            )?;
            audit.log_case_created(&conn, &case.case_id, &case.case_number)?;
            if is_json {
                println!("{}", serde_json::to_string_pretty(&case)?);
            } else {
                println!("✓ Case created");
                println!("  ID:     {}", case.case_id);
                println!("  Number: {}", case.case_number);
                println!("  Title:  {}", case.case_title);
            }
            Ok(())
        }

        Commands::Hash { input, include_legacy } => cmd_hash(&input, include_legacy, is_json),

        Commands::Report { case_id, format, output } => {
            cmd_report(&conn, &case_id, &format, output.as_deref())
        }

        Commands::Timeline { case_id, format, output } => {
            cmd_timeline(&conn, &case_id, &format, output.as_deref())
        }

        Commands::ListCases => {
            let cases = Case::list_all(&conn)?;
            if is_json {
                println!("{}", serde_json::to_string_pretty(&cases)?);
            } else if cases.is_empty() {
                println!("No cases in database.");
            } else {
                println!("{:<36}  {:<20}  {:<30}  {}", "ID", "Number", "Title", "Investigator");
                println!("{}", "-".repeat(100));
                for c in cases {
                    println!("{:<36}  {:<20}  {:<30}  {}", c.case_id, c.case_number, c.case_title, c.investigator);
                }
            }
            Ok(())
        }
    }
}

/// Inspect a forensic image: show hashes, filesystem type, geometry.
fn cmd_inspect(evidence: &PathBuf, is_json: bool) -> Result<()> {
    let mut src = EvidenceSource::open(evidence, SourceType::RawImage, None, "cli", None)
        .with_context(|| format!("Cannot open evidence: {}", evidence.display()))?;

    let size_bytes = src.info.size;
    let hashes = src.acquire_hashes(TOOL_VERSION)?.to_vec();
    let fs_type = detect_filesystem(&mut src, 0)?;

    let sb_info = match fs_type {
        FilesystemType::Xfs => {
            let parser = xfs_parser::XfsParser::new();
            parser.parse_superblock(&mut src).ok()
        }
        FilesystemType::Btrfs => {
            let parser = btrfs_parser::BtrfsParser::new();
            parser.parse_superblock(&mut src).ok()
        }
        _ => None,
    };

    if is_json {
        let inspect_json = serde_json::json!({
            "source": evidence.display().to_string(),
            "size_bytes": size_bytes,
            "filesystem": fs_type.name(),
            "filesystem_supported": fs_type.is_supported(),
            "hashes": hashes.iter().map(|h| serde_json::json!({
                "algorithm": h.algorithm.name(),
                "digest": h.digest,
                "is_legacy": h.is_legacy
            })).collect::<Vec<_>>(),
            "superblock": sb_info,
        });
        println!("{}", serde_json::to_string_pretty(&inspect_json)?);
        return Ok(());
    }

    println!("━━━ Evidence Inspection ━━━");
    println!("Source: {}", evidence.display());
    println!("Size:   {} bytes ({:.2} GB)", size_bytes,
        size_bytes as f64 / (1024.0 * 1024.0 * 1024.0));

    println!("\nComputing acquisition hashes...");
    for h in &hashes {
        let label = if h.is_legacy { " [LEGACY — non-preferred]" } else { "" };
        println!("  {}:{}{}", h.algorithm.name(), h.digest, label);
    }

    println!("\nFilesystem: {}", fs_type.name());
    if !fs_type.is_supported() {
        println!("  ⚠ Filesystem is not supported for forensic analysis in this version.");
        return Ok(());
    }

    if let Some(sb) = sb_info {
        print_superblock_info(&sb);
    }

    Ok(())
}

fn print_superblock_info(sb: &filesystem::SuperblockInfo) {
    println!("  UUID:          {}", sb.uuid.as_deref().unwrap_or("—"));
    println!("  Label:         {}", sb.volume_label.as_deref().unwrap_or("—"));
    println!("  Total Size:    {} bytes", sb.total_size);
    println!("  Block Size:    {} bytes", sb.block_size);
    println!("  Total Blocks:  {}", sb.total_blocks);
    println!("  Free Blocks:   {}", sb.free_blocks.map(|b| b.to_string()).unwrap_or("—".into()));
    println!("  Inode Count:   {}", sb.inode_count.map(|i| i.to_string()).unwrap_or("—".into()));
    println!("  Features:      {}", sb.features.join(", "));
    println!("  Journal:       {}", if sb.has_journal { "yes" } else { "no" });
}

/// Scan evidence for deleted files and recovery candidates.
fn cmd_scan(
    conn: &rusqlite::Connection,
    audit: &AuditLogger,
    input: &PathBuf,
    filesystem: &str,
    case_id: Option<&str>,
    is_json: bool,
) -> Result<()> {
    let mut src = EvidenceSource::open(input, SourceType::RawImage, None, "cli", None)
        .with_context(|| format!("Cannot open evidence: {}", input.display()))?;

    let evidence_id_str = src.info.evidence_id.to_string();
    let hashes = src.acquire_hashes(TOOL_VERSION)?.to_vec();
    let fs_type = if filesystem == "auto" {
        detect_filesystem(&mut src, 0)?
    } else if filesystem == "xfs" {
        FilesystemType::Xfs
    } else if filesystem == "btrfs" {
        FilesystemType::Btrfs
    } else {
        detect_filesystem(&mut src, 0)?
    };

    if let Some(cid) = case_id {
        audit.log_scan_started(conn, cid, &evidence_id_str)?;
    }

    let summary = match fs_type {
        FilesystemType::Xfs => {
            let parser = xfs_parser::XfsParser::new();
            let sb = parser.parse_superblock(&mut src)?;
            let mut count = 0u64;
            let summary = parser.enumerate_objects(&mut src, &sb, &mut |_obj| {
                count += 1;
            })?;
            summary
        }
        FilesystemType::Btrfs => {
            let parser = btrfs_parser::BtrfsParser::new();
            let sb = parser.parse_superblock(&mut src)?;
            let mut count = 0u64;
            let summary = parser.enumerate_objects(&mut src, &sb, &mut |_obj| {
                count += 1;
            })?;
            summary
        }
        _ => {
            let scanner = block_scanner::BlockScanner::new();
            let candidates = scanner.scan(&mut src)?;
            if is_json {
                println!("{}", serde_json::to_string_pretty(&serde_json::json!({
                    "evidence": input.display().to_string(),
                    "filesystem": "Unsupported",
                    "carved_candidates": candidates.len(),
                }))?);
            } else {
                println!("  Carved candidates: {}", candidates.len());
            }
            return Ok(());
        }
    };

    if let Some(cid) = case_id {
        audit.log_scan_completed(conn, cid, &evidence_id_str,
            summary.total_objects, summary.deleted_candidates)?;
    }

    if is_json {
        println!("{}", serde_json::to_string_pretty(&serde_json::json!({
            "evidence": input.display().to_string(),
            "filesystem": fs_type.name(),
            "hashes": hashes.iter().map(|h| serde_json::json!({
                "algorithm": h.algorithm.name(),
                "digest": h.digest,
            })).collect::<Vec<_>>(),
            "summary": summary,
        }))?);
        return Ok(());
    }

    println!("━━━ Forensic Scan ━━━");
    println!("Evidence: {}", input.display());
    println!("Mode:     READ-ONLY");
    println!("Acquiring evidence hashes...");
    for h in &hashes {
        println!("  {}: {}", h.algorithm.name(), &h.digest[..16]);
    }
    println!("Filesystem: {}", fs_type.name());

    println!("\n━━━ Scan Results ━━━");
    println!("  Total Objects:      {}", summary.total_objects);
    println!("  Deleted Candidates: {}", summary.deleted_candidates);
    println!("  Recoverable:        {}", summary.recoverable);
    println!("  Warnings:           {}", summary.warnings.len());

    for w in &summary.warnings[..summary.warnings.len().min(5)] {
        println!("  ⚠ {:?}: {}", w.kind, w.message);
    }

    Ok(())
}

/// Recover deleted files and carved artifacts to an output directory.
fn cmd_recover(
    conn: &rusqlite::Connection,
    audit: &AuditLogger,
    evidence: &PathBuf,
    output: &PathBuf,
    filesystem: &str,
    case_id: Option<&str>,
    is_json: bool,
) -> Result<()> {
    std::fs::create_dir_all(output)
        .with_context(|| format!("Failed to create output directory: {}", output.display()))?;

    let mut src = EvidenceSource::open(evidence, SourceType::RawImage, None, "cli", None)
        .with_context(|| format!("Cannot open evidence: {}", evidence.display()))?;

    let evidence_id_str = src.info.evidence_id.to_string();
    let fs_type = if filesystem == "auto" {
        detect_filesystem(&mut src, 0)?
    } else if filesystem == "xfs" {
        FilesystemType::Xfs
    } else if filesystem == "btrfs" {
        FilesystemType::Btrfs
    } else {
        detect_filesystem(&mut src, 0)?
    };

    if let Some(cid) = case_id {
        audit.log(conn, audit::actions::RECOVERY_STARTED, Some(cid), Some(&evidence_id_str), None,
            Some(format!("Recovery started from {} to {}", evidence.display(), output.display())))?;
    }

    let mut recovered_items: Vec<serde_json::Value> = Vec::new();
    let mut total_bytes = 0u64;

    match fs_type {
        FilesystemType::Xfs => {
            let parser = xfs_parser::XfsParser::new();
            let sb = parser.parse_superblock(&mut src)?;

            let mut records: Vec<filesystem::ObjectRecord> = Vec::new();
            parser.enumerate_objects(&mut src, &sb, &mut |rec| {
                if rec.status != metadata::RecoveryStatus::Unrecoverable {
                    records.push(rec);
                }
            })?;

            let mut candidates: Vec<metadata::RecoveryCandidate> = Vec::new();
            for rec in &records {
                if let Ok(Some(cand)) = parser.candidate_for_record(&mut src, rec, &sb) {
                    if cand.recovered_size > 0 || !cand.fragments.is_empty() {
                        candidates.push(cand);
                    }
                }
            }

            for (idx, cand) in candidates.iter().enumerate() {
                let filename = format!("xfs_recovered_{:05}.bin", idx + 1);
                let out_path = output.join(&filename);
                let mut out_file = std::fs::File::create(&out_path)?;
                let res = parser.recover_content(&mut src, cand, &mut out_file)?;
                total_bytes += res.bytes_written;

                recovered_items.push(serde_json::json!({
                    "filename": filename,
                    "path": out_path.display().to_string(),
                    "bytes_written": res.bytes_written,
                    "status": format!("{:?}", res.status),
                    "sha256": res.sha256,
                    "blake3": res.blake3,
                    "method": cand.recovery_method,
                }));

                if let Some(cid) = case_id {
                    let sha_short = res.sha256.as_deref().unwrap_or("none");
                    audit.log(conn, audit::actions::ARTIFACT_RECOVERED, Some(cid), Some(&evidence_id_str), None,
                        Some(format!("Recovered {} ({} bytes, sha256:{})", filename, res.bytes_written, &sha_short[..sha_short.len().min(16)])))?;
                }
            }
        }
        FilesystemType::Btrfs => {
            let parser = btrfs_parser::BtrfsParser::new();
            let _sb = parser.parse_superblock(&mut src)?;
            let carver = block_scanner::BlockScanner::new();
            let candidates = carver.scan(&mut src)?;
            for (idx, cand) in candidates.iter().enumerate() {
                let filename = format!("btrfs_carved_{:05}.bin", idx + 1);
                let out_path = output.join(&filename);
                let mut out_file = std::fs::File::create(&out_path)?;
                let res = parser.recover_content(&mut src, cand, &mut out_file)?;
                total_bytes += res.bytes_written;

                recovered_items.push(serde_json::json!({
                    "filename": filename,
                    "path": out_path.display().to_string(),
                    "bytes_written": res.bytes_written,
                    "status": format!("{:?}", res.status),
                    "sha256": res.sha256,
                    "blake3": res.blake3,
                    "method": cand.recovery_method,
                }));
            }
        }
        _ => {
            let scanner = block_scanner::BlockScanner::new();
            let candidates = scanner.scan(&mut src)?;
            let xfs_p = xfs_parser::XfsParser::new();
            for (idx, cand) in candidates.iter().enumerate() {
                let filename = format!("carved_{:05}.bin", idx + 1);
                let out_path = output.join(&filename);
                let mut out_file = std::fs::File::create(&out_path)?;
                let res = xfs_p.recover_content(&mut src, cand, &mut out_file)?;
                total_bytes += res.bytes_written;

                recovered_items.push(serde_json::json!({
                    "filename": filename,
                    "path": out_path.display().to_string(),
                    "bytes_written": res.bytes_written,
                    "status": format!("{:?}", res.status),
                    "sha256": res.sha256,
                    "blake3": res.blake3,
                    "method": cand.recovery_method,
                }));
            }
        }
    }

    let manifest = serde_json::json!({
        "tool_version": TOOL_VERSION,
        "evidence": evidence.display().to_string(),
        "output_directory": output.display().to_string(),
        "filesystem": fs_type.name(),
        "total_files_recovered": recovered_items.len(),
        "total_bytes_recovered": total_bytes,
        "artifacts": recovered_items,
    });
    let manifest_path = output.join("recovery_manifest.json");
    std::fs::write(&manifest_path, serde_json::to_string_pretty(&manifest)?)?;

    if is_json {
        println!("{}", serde_json::to_string_pretty(&manifest)?);
    } else {
        println!("━━━ Recovery Summary ━━━");
        println!("Evidence:         {}", evidence.display());
        println!("Output:           {}", output.display());
        println!("Filesystem:       {}", fs_type.name());
        println!("Files Recovered:  {}", recovered_items.len());
        println!("Bytes Recovered:  {} bytes", total_bytes);
        println!("Manifest:         {}", manifest_path.display());
        if !recovered_items.is_empty() {
            println!("\n{:<25} {:<15} {:<15} {}", "File", "Bytes", "Status", "SHA-256");
            println!("{}", "-".repeat(90));
            for item in &recovered_items[..recovered_items.len().min(10)] {
                let name = item["filename"].as_str().unwrap_or("");
                let bytes = item["bytes_written"].as_u64().unwrap_or(0);
                let status = item["status"].as_str().unwrap_or("");
                let sha = item["sha256"].as_str().unwrap_or("—");
                let sha_short = if sha.len() > 16 { &sha[..16] } else { sha };
                println!("{:<25} {:<15} {:<15} {}", name, bytes, status, sha_short);
            }
        }
    }

    Ok(())
}

/// Validate a recovered file using signatures and hashes.
fn cmd_validate(input: &PathBuf, expected_hash: Option<&str>, is_json: bool) -> Result<()> {
    let validator = validation::Validator::new(TOOL_VERSION);
    let report = validator.validate_file(input, expected_hash)?;

    if is_json {
        println!("{}", serde_json::to_string_pretty(&report)?);
    } else {
        println!("━━━ Artifact Validation ━━━");
        println!("File:     {}", input.display());
        println!("Status:   {:?}", report.status);
        println!("SHA-256:  {}", report.sha256.as_deref().unwrap_or("—"));
        println!("BLAKE3:   {}", report.blake3.as_deref().unwrap_or("—"));
        println!("Checks:");
        for r in &report.reasons {
            println!("  {}", r);
        }
    }
    Ok(())
}

/// View or verify cryptographic audit trail.
fn cmd_audit(conn: &rusqlite::Connection, case_id: &str, verify_chain: bool, is_json: bool) -> Result<()> {
    let events = AuditEvent::list_for_case(conn, case_id)?;

    if verify_chain {
        let mut broken = false;
        println!("Verifying cryptographic audit chain for case {} ({} events)...", case_id, events.len());
        for (i, ev) in events.iter().enumerate() {
            if let Some(prev) = &ev.previous_event_hash {
                if i > 0 {
                    let expected_prev = &events[i - 1].event_id;
                    if prev != expected_prev {
                        println!("  ✗ Chain broken at event {}: expected previous {}, got {}", ev.event_id, expected_prev, prev);
                        broken = true;
                    }
                }
            }
        }
        if !broken {
            println!("✓ Audit trail cryptographic integrity VERIFIED (no tampering detected).");
        }
    }

    if is_json {
        println!("{}", serde_json::to_string_pretty(&events)?);
    } else {
        println!("━━━ Audit Log ({}) ━━━", case_id);
        println!("{:<24} {:<22} {:<15} {}", "Timestamp", "Action", "Actor", "Details");
        println!("{}", "-".repeat(100));
        for ev in &events {
            println!(
                "{:<24} {:<22} {:<15} {}",
                &ev.event_time[..ev.event_time.len().min(24)],
                ev.action,
                ev.actor.as_deref().unwrap_or("system"),
                ev.details.as_deref().unwrap_or("—")
            );
        }
    }
    Ok(())
}

/// Hash a file with all forensic algorithms.
fn cmd_hash(input: &PathBuf, include_legacy: bool, is_json: bool) -> Result<()> {
    let hasher = Hasher::new(TOOL_VERSION);
    let mut algorithms = FORENSIC_ALGORITHMS.to_vec();
    if include_legacy {
        algorithms.push(HashAlgorithm::Md5Legacy);
        algorithms.push(HashAlgorithm::Sha1Legacy);
    }

    let results = hasher.hash_file_multi(input, &algorithms)?;

    if is_json {
        println!("{}", serde_json::to_string_pretty(&results)?);
        return Ok(());
    }

    println!("━━━ Hash Computation ━━━");
    println!("Input: {}", input.display());
    for r in &results {
        let label = if r.is_legacy { " ⚠ LEGACY — non-preferred" } else { "" };
        println!("  {:<30} {}{}", r.algorithm.name(), r.digest, label);
    }
    println!("  {} bytes | {} ms", results[0].bytes_hashed, results[0].duration_ms);
    Ok(())
}

/// Generate a forensic report.
fn cmd_report(
    conn: &rusqlite::Connection,
    case_id: &str,
    format_str: &str,
    output: Option<&std::path::Path>,
) -> Result<()> {
    let case = Case::find_by_id(conn, case_id)?
        .ok_or_else(|| anyhow::anyhow!("Case not found: {}", case_id))?;

    let audit_events = AuditEvent::list_for_case(conn, case_id)?;

    let format = match format_str {
        "html" => ReportFormat::Html,
        "json" => ReportFormat::Json,
        "csv" => ReportFormat::Csv,
        "pdf" => ReportFormat::Pdf,
        _ => anyhow::bail!("Unknown format: {}. Use html, json, csv, or pdf.", format_str),
    };

    let report = ForensicReport {
        report_id: Uuid::new_v4().to_string(),
        generated_at: chrono::Utc::now().to_rfc3339(),
        tool_name: TOOL_NAME.into(),
        tool_version: TOOL_VERSION.into(),
        case_number: case.case_number.clone(),
        case_title: case.case_title.clone(),
        investigator: case.investigator.clone(),
        organization: case.organization.clone(),
        evidence_path: "—".into(),
        evidence_hash_sha256: None,
        filesystem_type: None,
        filesystem_uuid: None,
        total_objects: 0,
        deleted_candidates: 0,
        confirmed_recovered: 0,
        partial_recovered: 0,
        carved: 0,
        unrecoverable: 0,
        methodology: reporting::METHODOLOGY_TEXT.into(),
        limitations: reporting::LIMITATIONS_TEXT.into(),
        findings: vec![],
        audit_events: audit_events.iter().map(|e| reporting::AuditSummary {
            timestamp: e.event_time.clone(),
            action: e.action.clone(),
            actor: e.actor.clone(),
            details: e.details.clone(),
        }).collect(),
    };

    match output {
        Some(path) => {
            let mut file = std::fs::File::create(path)?;
            report.write(format, &mut file)?;
            println!("Report written to: {}", path.display());
        }
        None => {
            report.write(format, &mut std::io::stdout())?;
        }
    }
    Ok(())
}

/// Export timeline from SQLite audit events and case records.
fn cmd_timeline(
    conn: &rusqlite::Connection,
    case_id: &str,
    format_str: &str,
    output: Option<&std::path::Path>,
) -> Result<()> {
    let events = AuditEvent::list_for_case(conn, case_id)?;
    let mut tl = timeline::Timeline::new();

    for ev in events {
        let ts = chrono::DateTime::parse_from_rfc3339(&ev.event_time)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());

        let event_type = match ev.action.as_str() {
            audit::actions::CASE_CREATED => timeline::EventType::Created,
            audit::actions::EVIDENCE_ADDED => timeline::EventType::Analyzed,
            audit::actions::EVIDENCE_HASHED => timeline::EventType::Hashed,
            audit::actions::FILESYSTEM_IDENTIFIED => timeline::EventType::Analyzed,
            audit::actions::SCAN_STARTED => timeline::EventType::Analyzed,
            audit::actions::SCAN_COMPLETED => timeline::EventType::Analyzed,
            audit::actions::RECOVERY_STARTED => timeline::EventType::Recovered,
            audit::actions::ARTIFACT_RECOVERED => timeline::EventType::Recovered,
            audit::actions::ARTIFACT_HASHED => timeline::EventType::Hashed,
            audit::actions::VALIDATION_COMPLETED => timeline::EventType::Validated,
            audit::actions::REPORT_GENERATED => timeline::EventType::Analyzed,
            _ => timeline::EventType::Analyzed,
        };

        let desc = ev.details.unwrap_or_else(|| ev.action.clone());
        let tl_ev = timeline::TimelineEvent::new(
            ts,
            event_type,
            ev.actor.as_deref().unwrap_or("system"),
            desc,
            metadata::ConfidenceLevel::High,
        );
        tl.add(tl_ev);
    }

    tl.sort();

    match output {
        Some(path) => {
            let mut file = std::fs::File::create(path)?;
            if format_str == "csv" {
                tl.export_csv(&mut file)?;
            } else {
                tl.export_json(&mut file)?;
            }
            println!("Timeline written to: {}", path.display());
        }
        None => {
            if format_str == "csv" {
                tl.export_csv(&mut std::io::stdout())?;
            } else {
                tl.export_json(&mut std::io::stdout())?;
            }
        }
    }
    Ok(())
}
