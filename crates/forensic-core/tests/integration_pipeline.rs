use anyhow::Result;
use chrono::Utc;
use std::io::Write;
use tempfile::NamedTempFile;

use audit::AuditLogger;
use database::{open_in_memory, AuditEvent, Case, EvidenceRecord};
use evidence::{EvidenceSource, SourceType, FilesystemType};
use file_carver::{default_carvers, ValidationResult};
use filesystem::FilesystemParser;
use hashing::{HashAlgorithm, Hasher};
use reporting::{ForensicReport, ReportFormat, FindingSummary, AuditSummary, METHODOLOGY_TEXT, LIMITATIONS_TEXT};
use test_fixtures::{image_with_embedded_jpeg, xfs_minimal_superblock};
use timeline::{Timeline, TimelineEvent, EventType};
use xfs_parser::XfsParser;
use metadata::ConfidenceLevel;

#[test]
fn test_end_to_end_forensic_pipeline() -> Result<()> {
    // 1. Initialize DB and Case
    let conn = open_in_memory()?;
    let case = Case::create(
        &conn,
        "CR-2026-TEST",
        "E2E Automated Pipeline Test",
        "Special Agent QA",
        Some("Forensic Testing Lab".into()),
        Some("Automated integration test verification".into()),
    )?;
    assert_eq!(case.case_number, "CR-2026-TEST");

    // 2. Audit Case Creation
    let logger = AuditLogger::new("0.1.0").with_actor("Special Agent QA");
    logger.log_case_created(&conn, &case.case_id, &case.case_number)?;

    // 3. Create Deterministic XFS Fixture on Disk
    let xfs_bytes = xfs_minimal_superblock();
    let mut tmp_xfs = NamedTempFile::new()?;
    tmp_xfs.write_all(&xfs_bytes)?;
    tmp_xfs.flush()?;

    // 4. Ingest and Hash Evidence Source (Read-Only)
    let hasher = Hasher::new("0.1.0");
    let hash_res = hasher.hash_bytes(&xfs_bytes, HashAlgorithm::Sha256, "xfs_fixture")?;
    let mut src = EvidenceSource::open(
        tmp_xfs.path(),
        SourceType::RawImage,
        None,
        "Special Agent QA",
        None,
    )?;

    // 5. Detect Filesystem
    let xfs_parser = XfsParser::new();
    assert!(xfs_parser.detect(&mut src)?);
    let sb_info = xfs_parser.parse_superblock(&mut src)?;
    assert_eq!(sb_info.filesystem_type, FilesystemType::Xfs);
    assert_eq!(sb_info.block_size, 4096);

    // 6. Record Evidence in Database & Audit
    let ev_rec = EvidenceRecord {
        evidence_id: "ev-test-01".into(),
        case_id: case.case_id.clone(),
        source_path: tmp_xfs.path().to_string_lossy().to_string(),
        source_type: "RAW_IMAGE".into(),
        size_bytes: xfs_bytes.len() as i64,
        filesystem_type: Some("XFS".into()),
        filesystem_uuid: None,
        volume_label: None,
        acquisition_hash: Some(hash_res.digest.clone()),
        hash_algorithm: Some("SHA-256".into()),
        added_at: Utc::now().to_rfc3339(),
        added_by: "Special Agent QA".into(),
        description: Some("Deterministic XFS fixture".into()),
        analysis_status: "ANALYZED".into(),
    };
    EvidenceRecord::create(&conn, &ev_rec)?;
    logger.log_evidence_added(&conn, &case.case_id, &ev_rec.evidence_id, &ev_rec.source_path)?;

    // 7. Carver Integration: Carve JPEG from unallocated space
    let img_with_jpeg = image_with_embedded_jpeg(2048);
    let carvers = default_carvers();
    let jpeg_carver = carvers.iter().find(|c| c.extension() == "jpg").expect("JPEG carver exists");
    let val_res = jpeg_carver.validate(&img_with_jpeg[2048..2048 + 1002]);
    assert!(matches!(val_res, ValidationResult::Valid));

    // 8. Timeline Synthesis
    let mut timeline = Timeline::new();
    timeline.add(
        TimelineEvent::new(
            Utc::now(),
            EventType::Deleted,
            "XFS_INODE_UNLINK",
            "File unlinked from directory",
            ConfidenceLevel::High,
        )
        .with_path("/test/path/carved_evidence.jpg")
        .with_object_id(134217728),
    );
    timeline.sort();
    let mut json_buf = Vec::new();
    timeline.export_json(&mut json_buf)?;
    let json_timeline = String::from_utf8(json_buf)?;
    assert!(json_timeline.contains("carved_evidence.jpg"));

    // 9. Generate Forensic Report (JSON & HTML)
    let audit_events = AuditEvent::list_for_case(&conn, &case.case_id)?;
    assert!(audit_events.len() >= 2);
    let report = ForensicReport {
        report_id: "REP-001".into(),
        generated_at: Utc::now().to_rfc3339(),
        tool_name: "forensic-recovery".into(),
        tool_version: "0.1.0".into(),
        case_number: case.case_number,
        case_title: case.case_title,
        investigator: case.investigator,
        organization: case.organization,
        evidence_path: ev_rec.source_path,
        evidence_hash_sha256: Some(hash_res.digest.clone()),
        filesystem_type: Some("XFS".into()),
        filesystem_uuid: None,
        total_objects: 1,
        deleted_candidates: 1,
        confirmed_recovered: 1,
        partial_recovered: 0,
        carved: 0,
        unrecoverable: 0,
        methodology: METHODOLOGY_TEXT.into(),
        limitations: LIMITATIONS_TEXT.into(),
        findings: vec![FindingSummary {
            artifact_id: "art-test-01".into(),
            filename: Some("carved_evidence.jpg".into()),
            path: Some("/test/path/carved_evidence.jpg".into()),
            status: "CONFIRMED".into(),
            confidence: "HIGH".into(),
            size_bytes: Some(1002),
            sha256: Some("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".into()),
            mtime: Some("2026-09-30T10:00:00Z".into()),
            recovery_method: "CARVER".into(),
        }],
        audit_events: vec![AuditSummary {
            timestamp: Utc::now().to_rfc3339(),
            action: "CASE_CREATED".into(),
            actor: Some("Special Agent QA".into()),
            details: Some("Case CR-2026-TEST created".into()),
        }],
    };

    let mut html_buf = Vec::new();
    report.write(ReportFormat::Html, &mut html_buf)?;
    let html_report = String::from_utf8(html_buf)?;
    assert!(html_report.contains("Forensic Recovery Report"));
    assert!(html_report.contains("CR-2026-TEST"));

    Ok(())
}
