//! forensic-recovery — CLI forensic analysis tool.
//!
//! Provides command-line access to the full forensic engine.
//! Uses the same core as the desktop GUI application.
//!
//! Usage:
//!   forensic-recovery inspect  <evidence>
//!   forensic-recovery scan     --input <evidence> [--filesystem auto|xfs|btrfs] [--read-only]
//!   forensic-recovery recover  --case <case-id> --output <dir>
//!   forensic-recovery hash     --input <path>
//!   forensic-recovery report   --case <case-id> --format [html|json|csv|pdf]
//!   forensic-recovery timeline --case <case-id> --format [json|csv]

use std::path::PathBuf;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use tracing::{info, warn};
use tracing_subscriber::{fmt, EnvFilter};

use audit::AuditLogger;
use database::{open_database, open_in_memory, AuditEvent, Case, EvidenceRecord};
use evidence::{detect_filesystem, EvidenceSource, FilesystemType, SourceType};
use filesystem::FilesystemParser;
use hashing::{HashAlgorithm, Hasher, FORENSIC_ALGORITHMS};
use reporting::{FindingSummary, ForensicReport, ReportFormat};
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

    match cli.command {
        Commands::Inspect { evidence } => cmd_inspect(&evidence),

        Commands::Scan { input, filesystem, read_only: _, case_id } => {
            cmd_scan(&conn, &audit, &input, &filesystem, case_id.as_deref())
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
            println!("✓ Case created");
            println!("  ID:     {}", case.case_id);
            println!("  Number: {}", case.case_number);
            println!("  Title:  {}", case.case_title);
            Ok(())
        }

        Commands::Hash { input, include_legacy } => cmd_hash(&input, include_legacy),

        Commands::Report { case_id, format, output } => {
            cmd_report(&conn, &case_id, &format, output.as_deref())
        }

        Commands::Timeline { case_id, format, output } => {
            cmd_timeline(&conn, &case_id, &format, output.as_deref())
        }

        Commands::ListCases => {
            let cases = Case::list_all(&conn)?;
            if cases.is_empty() {
                println!("No cases in database.");
                return Ok(());
            }
            println!("{:<36}  {:<20}  {:<30}  {}", "ID", "Number", "Title", "Investigator");
            println!("{}", "-".repeat(100));
            for c in cases {
                println!("{:<36}  {:<20}  {:<30}  {}", c.case_id, c.case_number, c.case_title, c.investigator);
            }
            Ok(())
        }
    }
}

/// Inspect a forensic image: show hashes, filesystem type, geometry.
fn cmd_inspect(evidence: &PathBuf) -> Result<()> {
    println!("━━━ Evidence Inspection ━━━");
    println!("Source: {}", evidence.display());

    let mut src = EvidenceSource::open(evidence, SourceType::RawImage, None, "cli", None)
        .with_context(|| format!("Cannot open evidence: {}", evidence.display()))?;

    println!("Size:   {} bytes ({:.2} GB)", src.info.size,
        src.info.size as f64 / (1024.0 * 1024.0 * 1024.0));

    // Compute hashes.
    println!("\nComputing acquisition hashes...");
    let hashes = src.acquire_hashes(TOOL_VERSION)?;
    for h in hashes {
        let label = if h.is_legacy { " [LEGACY — non-preferred]" } else { "" };
        println!("  {}:{}{}", h.algorithm.name(), h.digest, label);
    }

    // Detect filesystem.
    let fs_type = detect_filesystem(&mut src, 0)?;
    println!("\nFilesystem: {}", fs_type.name());
    if !fs_type.is_supported() {
        println!("  ⚠ Filesystem is not supported for forensic analysis in this version.");
        return Ok(());
    }

    // Parse superblock.
    match fs_type {
        FilesystemType::Xfs => {
            let parser = xfs_parser::XfsParser::new();
            let sb = parser.parse_superblock(&mut src)?;
            print_superblock_info(&sb);
        }
        FilesystemType::Btrfs => {
            let parser = btrfs_parser::BtrfsParser::new();
            let sb = parser.parse_superblock(&mut src)?;
            print_superblock_info(&sb);
        }
        _ => {}
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
) -> Result<()> {
    println!("━━━ Forensic Scan ━━━");
    println!("Evidence: {}", input.display());
    println!("Mode:     READ-ONLY");

    let mut src = EvidenceSource::open(input, SourceType::RawImage, None, "cli", None)
        .with_context(|| format!("Cannot open evidence: {}", input.display()))?;

    // Acquire and display hashes.
    println!("Acquiring evidence hashes...");
    let hashes = src.acquire_hashes(TOOL_VERSION)?;
    for h in hashes {
        println!("  {}: {}", h.algorithm.name(), &h.digest[..16]);
    }

    // Detect filesystem.
    let fs_type = if filesystem == "auto" {
        detect_filesystem(&mut src, 0)?
    } else if filesystem == "xfs" {
        FilesystemType::Xfs
    } else if filesystem == "btrfs" {
        FilesystemType::Btrfs
    } else {
        detect_filesystem(&mut src, 0)?
    };

    println!("Filesystem: {}", fs_type.name());

    // Log to audit.
    if let Some(cid) = case_id {
        audit.log_scan_started(conn, cid, &src.info.evidence_id.to_string())?;
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
            warn!("Unsupported filesystem — running file carver only");
            let scanner = block_scanner::BlockScanner::new();
            let candidates = scanner.scan(&mut src)?;
            println!("  Carved candidates: {}", candidates.len());
            return Ok(());
        }
    };

    println!("\n━━━ Scan Results ━━━");
    println!("  Total Objects:      {}", summary.total_objects);
    println!("  Deleted Candidates: {}", summary.deleted_candidates);
    println!("  Recoverable:        {}", summary.recoverable);
    println!("  Warnings:           {}", summary.warnings.len());

    for w in &summary.warnings[..summary.warnings.len().min(5)] {
        println!("  ⚠ {:?}: {}", w.kind, w.message);
    }

    if let Some(cid) = case_id {
        audit.log_scan_completed(conn, cid, &src.info.evidence_id.to_string(),
            summary.total_objects, summary.deleted_candidates)?;
    }

    Ok(())
}

/// Hash a file with all forensic algorithms.
fn cmd_hash(input: &PathBuf, include_legacy: bool) -> Result<()> {
    println!("━━━ Hash Computation ━━━");
    println!("Input: {}", input.display());

    let hasher = Hasher::new(TOOL_VERSION);
    let mut algorithms = FORENSIC_ALGORITHMS.to_vec();
    if include_legacy {
        algorithms.push(HashAlgorithm::Md5Legacy);
        algorithms.push(HashAlgorithm::Sha1Legacy);
    }

    let results = hasher.hash_file_multi(input, &algorithms)?;
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

/// Export timeline.
fn cmd_timeline(
    conn: &rusqlite::Connection,
    case_id: &str,
    format: &str,
    output: Option<&std::path::Path>,
) -> Result<()> {
    // Timeline export — Phase 5 will populate this from the database.
    println!("Timeline export for case {} (format: {})", case_id, format);
    println!("Note: Full timeline population implemented in Phase 5.");
    Ok(())
}
