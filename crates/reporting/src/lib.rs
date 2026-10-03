//! Reporting engine — generates professional forensic reports.
//!
//! Formats: HTML, JSON, CSV, PDF (basic).
//! Every report includes methodology and limitations sections.
//! Uses precise forensic language — never overstates recovery certainty.

use std::io::Write;
use anyhow::Result;
use chrono::Utc;
use serde::{Deserialize, Serialize};

/// Report format options.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReportFormat {
    Html,
    Json,
    Csv,
    Pdf,
}

/// Top-level report data structure.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForensicReport {
    pub report_id: String,
    pub generated_at: String,
    pub tool_name: String,
    pub tool_version: String,
    pub case_number: String,
    pub case_title: String,
    pub investigator: String,
    pub organization: Option<String>,
    pub evidence_path: String,
    pub evidence_hash_sha256: Option<String>,
    pub filesystem_type: Option<String>,
    pub filesystem_uuid: Option<String>,
    pub total_objects: u64,
    pub deleted_candidates: u64,
    pub confirmed_recovered: u64,
    pub partial_recovered: u64,
    pub carved: u64,
    pub unrecoverable: u64,
    pub methodology: String,
    pub limitations: String,
    pub findings: Vec<FindingSummary>,
    pub audit_events: Vec<AuditSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FindingSummary {
    pub artifact_id: String,
    pub filename: Option<String>,
    pub path: Option<String>,
    pub status: String,
    pub confidence: String,
    pub size_bytes: Option<u64>,
    pub sha256: Option<String>,
    pub mtime: Option<String>,
    pub recovery_method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditSummary {
    pub timestamp: String,
    pub action: String,
    pub actor: Option<String>,
    pub details: Option<String>,
}

/// Standard methodology text used in all reports.
pub const METHODOLOGY_TEXT: &str = r#"
This forensic analysis was performed following the Acquire → Verify → Analyze → Recover →
Validate → Document → Report workflow.

The evidence source was opened in strict read-only mode.  No modification of the original
evidence was performed at any stage.

Filesystem structures were parsed using purpose-built parsers validated against authoritative
technical references (Linux kernel filesystem documentation, xfsprogs, btrfs-progs).

Deleted file candidates were identified through:
  - Analysis of filesystem metadata (inode/object records with zero link count)
  - Allocation state analysis (unreferenced extents)
  - Historical structure analysis where supported by the filesystem
  - Block-level signature scanning of unallocated regions (file carving)

Recovery confidence is reported per-artifact using explicit signals:
  metadata_validity, extent_validity, signature_validity, content_validation,
  checksum_validation, directory_relationship, timestamp_confidence.

Cryptographic hashes (SHA-256, SHA-512, BLAKE3) were computed for all recovered artifacts.
"#;

/// Standard limitations text used in all reports.
pub const LIMITATIONS_TEXT: &str = r#"
The following limitations apply to this forensic analysis:

1. RECOVERABILITY: Deletion does not guarantee recoverability.  File content may be
   partially or completely overwritten by subsequent filesystem activity.

2. BLOCK REUSE: On XFS, extents from deleted files may be reallocated to new files.
   Where block reuse is detected, recovery is classified as UNRECOVERABLE or PARTIAL.

3. COPY-ON-WRITE (Btrfs): Btrfs uses copy-on-write semantics.  Deletion behavior
   differs from traditional filesystems.  Historical data may persist in snapshots;
   however, snapshot availability is not guaranteed.

4. TRIM/DISCARD: On SSD storage, TRIM commands may cause immediate content erasure
   upon deletion.  This tool cannot reverse TRIM-zeroed blocks.

5. FRAGMENTATION: Fragmented files may not be fully reconstructable if fragment
   ordering cannot be determined with confidence.

6. ENCRYPTION: Encrypted content cannot be decrypted by this tool.

7. COMPRESSION: Compressed extents require decompression; partial compressed data
   may not be recoverable.

8. TIMESTAMPS: All timestamps represent values recovered from filesystem structures.
   They may be inaccurate due to filesystem bugs, manipulation, or partial metadata
   recovery.  Timestamps are not presented as proof of file creation or modification.

9. FILE CARVING: Carved files lack filesystem metadata.  Attribution of carved files
   to specific filesystem objects is not possible without independent corroboration.

10. INFERRED INFORMATION: Any field marked INFERRED or DERIVED was not directly
    read from filesystem structures and should not be treated as confirmed metadata.

This report does not constitute an expert opinion.  Findings should be reviewed by
a qualified forensic examiner before use in legal proceedings.
"#;

impl ForensicReport {
    /// Write this report in the requested format.
    pub fn write(&self, format: ReportFormat, writer: &mut impl Write) -> Result<()> {
        match format {
            ReportFormat::Json => self.write_json(writer),
            ReportFormat::Html => self.write_html(writer),
            ReportFormat::Csv => self.write_csv(writer),
            ReportFormat::Pdf => self.write_pdf_placeholder(writer),
        }
    }

    fn write_json(&self, writer: &mut impl Write) -> Result<()> {
        serde_json::to_writer_pretty(writer, self)?;
        Ok(())
    }

    fn write_csv(&self, writer: &mut impl Write) -> Result<()> {
        let mut wtr = csv::Writer::from_writer(writer);
        wtr.write_record(&[
            "artifact_id", "filename", "path", "status", "confidence",
            "size_bytes", "sha256", "mtime", "recovery_method"
        ])?;
        for f in &self.findings {
            wtr.write_record(&[
                f.artifact_id.as_str(),
                f.filename.as_deref().unwrap_or(""),
                f.path.as_deref().unwrap_or(""),
                f.status.as_str(),
                f.confidence.as_str(),
                &f.size_bytes.map(|s| s.to_string()).unwrap_or_default(),
                f.sha256.as_deref().unwrap_or(""),
                f.mtime.as_deref().unwrap_or(""),
                f.recovery_method.as_str(),
            ])?;
        }
        wtr.flush()?;
        Ok(())
    }

    fn write_html(&self, writer: &mut impl Write) -> Result<()> {
        write!(writer, r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Forensic Report — {case_title}</title>
<style>
body {{ font-family: 'Courier New', monospace; background: #0d1117; color: #c9d1d9; margin: 2em; }}
h1, h2, h3 {{ color: #58a6ff; }}
table {{ border-collapse: collapse; width: 100%; margin: 1em 0; }}
th, td {{ border: 1px solid #30363d; padding: 8px 12px; text-align: left; font-size: 0.85em; }}
th {{ background: #161b22; color: #58a6ff; }}
tr:nth-child(even) {{ background: #0d1117; }}
.badge-confirmed {{ color: #3fb950; }} .badge-partial {{ color: #d29922; }}
.badge-carved {{ color: #79c0ff; }} .badge-unrecoverable {{ color: #f85149; }}
.badge-unknown {{ color: #8b949e; }}
pre {{ background: #161b22; padding: 1em; border-radius: 6px; font-size: 0.8em; white-space: pre-wrap; }}
.meta {{ color: #8b949e; font-size: 0.8em; }}
</style>
</head>
<body>
<h1>🔍 Forensic Recovery Report</h1>
<p class="meta">Generated: {generated_at} | Tool: {tool_name} v{tool_version}</p>

<h2>1. Case Information</h2>
<table>
<tr><th>Case Number</th><td>{case_number}</td></tr>
<tr><th>Case Title</th><td>{case_title}</td></tr>
<tr><th>Investigator</th><td>{investigator}</td></tr>
<tr><th>Organization</th><td>{organization}</td></tr>
</table>

<h2>2. Evidence</h2>
<table>
<tr><th>Source Path</th><td>{evidence_path}</td></tr>
<tr><th>Filesystem</th><td>{filesystem_type}</td></tr>
<tr><th>UUID</th><td>{filesystem_uuid}</td></tr>
<tr><th>SHA-256</th><td class="meta">{evidence_hash}</td></tr>
</table>

<h2>3. Summary Statistics</h2>
<table>
<tr><th>Total Objects</th><td>{total_objects}</td></tr>
<tr><th>Deleted Candidates</th><td>{deleted_candidates}</td></tr>
<tr><th>Confirmed Recovered</th><td class="badge-confirmed">{confirmed_recovered}</td></tr>
<tr><th>Partial Recovery</th><td class="badge-partial">{partial_recovered}</td></tr>
<tr><th>Carved (no metadata)</th><td class="badge-carved">{carved}</td></tr>
<tr><th>Unrecoverable</th><td class="badge-unrecoverable">{unrecoverable}</td></tr>
</table>

<h2>4. Findings</h2>
<table>
<tr><th>Status</th><th>Filename</th><th>Path</th><th>Confidence</th><th>Size</th><th>SHA-256</th><th>Modified</th><th>Method</th></tr>
"#,
            case_title = self.case_title,
            generated_at = self.generated_at,
            tool_name = self.tool_name,
            tool_version = self.tool_version,
            case_number = self.case_number,
            investigator = self.investigator,
            organization = self.organization.as_deref().unwrap_or("—"),
            evidence_path = self.evidence_path,
            filesystem_type = self.filesystem_type.as_deref().unwrap_or("Unknown"),
            filesystem_uuid = self.filesystem_uuid.as_deref().unwrap_or("—"),
            evidence_hash = self.evidence_hash_sha256.as_deref().unwrap_or("Not computed"),
            total_objects = self.total_objects,
            deleted_candidates = self.deleted_candidates,
            confirmed_recovered = self.confirmed_recovered,
            partial_recovered = self.partial_recovered,
            carved = self.carved,
            unrecoverable = self.unrecoverable,
        )?;

        for f in &self.findings {
            let badge = match f.status.as_str() {
                "CONFIRMED" => "badge-confirmed",
                "PARTIAL" => "badge-partial",
                "CARVED" => "badge-carved",
                "UNRECOVERABLE" => "badge-unrecoverable",
                _ => "badge-unknown",
            };
            write!(writer,
                "<tr><td class=\"{badge}\">{status}</td><td>{filename}</td><td class=\"meta\">{path}</td><td>{confidence}</td><td>{size}</td><td class=\"meta\">{sha256}</td><td>{mtime}</td><td>{method}</td></tr>\n",
                badge = badge,
                status = f.status,
                filename = f.filename.as_deref().unwrap_or("—"),
                path = f.path.as_deref().unwrap_or("—"),
                confidence = f.confidence,
                size = f.size_bytes.map(|s| format!("{}", s)).unwrap_or("—".into()),
                sha256 = f.sha256.as_deref().map(|h| &h[..16]).unwrap_or("—"),
                mtime = f.mtime.as_deref().unwrap_or("—"),
                method = f.recovery_method,
            )?;
        }

        write!(writer, r#"</table>

<h2>5. Methodology</h2>
<pre>{methodology}</pre>

<h2>6. Limitations</h2>
<pre>{limitations}</pre>

<h2>7. Audit Trail</h2>
<table>
<tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Details</th></tr>
"#,
            methodology = METHODOLOGY_TEXT,
            limitations = LIMITATIONS_TEXT,
        )?;

        for e in &self.audit_events {
            write!(writer,
                "<tr><td class=\"meta\">{ts}</td><td>{action}</td><td>{actor}</td><td class=\"meta\">{details}</td></tr>\n",
                ts = e.timestamp,
                action = e.action,
                actor = e.actor.as_deref().unwrap_or("—"),
                details = e.details.as_deref().unwrap_or(""),
            )?;
        }

        write!(writer, "</table>\n</body>\n</html>\n")?;
        Ok(())
    }

    fn write_pdf_placeholder(&self, writer: &mut impl Write) -> Result<()> {
        // PDF generation via printpdf requires page layout work.
        // Phase 6 will implement full PDF output.
        // For MVP, emit the HTML version into the PDF writer as a placeholder.
        writeln!(writer, "PDF output not yet implemented — please use HTML format.")?;
        self.write_html(writer)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn sample_report() -> ForensicReport {
        ForensicReport {
            report_id: Uuid::new_v4().to_string(),
            generated_at: Utc::now().to_rfc3339(),
            tool_name: "forensic-recovery".into(),
            tool_version: "0.1.0".into(),
            case_number: "CASE-001".into(),
            case_title: "Test Investigation".into(),
            investigator: "Alice Smith".into(),
            organization: Some("Forensics Lab".into()),
            evidence_path: "/evidence/disk.img".into(),
            evidence_hash_sha256: Some("abc123".into()),
            filesystem_type: Some("XFS".into()),
            filesystem_uuid: Some("test-uuid".into()),
            total_objects: 1000,
            deleted_candidates: 42,
            confirmed_recovered: 20,
            partial_recovered: 10,
            carved: 5,
            unrecoverable: 7,
            methodology: METHODOLOGY_TEXT.into(),
            limitations: LIMITATIONS_TEXT.into(),
            findings: vec![FindingSummary {
                artifact_id: Uuid::new_v4().to_string(),
                filename: Some("secret.pdf".into()),
                path: Some("/home/user/secret.pdf".into()),
                status: "CONFIRMED".into(),
                confidence: "HIGH".into(),
                size_bytes: Some(12345),
                sha256: Some("abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890".into()),
                mtime: Some("2026-09-15T10:31:00Z".into()),
                recovery_method: "extent reconstruction".into(),
            }],
            audit_events: vec![],
        }
    }

    #[test]
    fn json_report_roundtrip() {
        let report = sample_report();
        let mut buf = Vec::new();
        report.write(ReportFormat::Json, &mut buf).unwrap();
        let parsed: serde_json::Value = serde_json::from_slice(&buf).unwrap();
        assert_eq!(parsed["case_number"], "CASE-001");
        assert_eq!(parsed["total_objects"], 1000);
    }

    #[test]
    fn html_report_contains_methodology() {
        let report = sample_report();
        let mut buf = Vec::new();
        report.write(ReportFormat::Html, &mut buf).unwrap();
        let html = String::from_utf8(buf).unwrap();
        assert!(html.contains("Methodology"));
        assert!(html.contains("Limitations"));
        assert!(html.contains("CASE-001"));
    }

    #[test]
    fn csv_report_has_header_and_data() {
        let report = sample_report();
        let mut buf = Vec::new();
        report.write(ReportFormat::Csv, &mut buf).unwrap();
        let s = String::from_utf8(buf).unwrap();
        assert!(s.contains("artifact_id"));
        assert!(s.contains("secret.pdf"));
    }
}
