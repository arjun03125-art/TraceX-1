//! Append-only audit log engine.
//!
//! Records every significant forensic operation with timestamps,
//! actor, action, and evidence references.  The log is append-only
//! from the application perspective — no deletion or modification.

use anyhow::Result;
use chrono::Utc;
use rusqlite::Connection;
use thiserror::Error;
use tracing::info;
use uuid::Uuid;

use database::AuditEvent;

/// Well-known audit action constants.
pub mod actions {
    pub const CASE_CREATED: &str = "CASE_CREATED";
    pub const EVIDENCE_ADDED: &str = "EVIDENCE_ADDED";
    pub const EVIDENCE_HASHED: &str = "EVIDENCE_HASHED";
    pub const EVIDENCE_VERIFIED: &str = "EVIDENCE_VERIFIED";
    pub const FILESYSTEM_IDENTIFIED: &str = "FILESYSTEM_IDENTIFIED";
    pub const SCAN_STARTED: &str = "SCAN_STARTED";
    pub const SCAN_COMPLETED: &str = "SCAN_COMPLETED";
    pub const RECOVERY_STARTED: &str = "RECOVERY_STARTED";
    pub const ARTIFACT_RECOVERED: &str = "ARTIFACT_RECOVERED";
    pub const ARTIFACT_HASHED: &str = "ARTIFACT_HASHED";
    pub const VALIDATION_COMPLETED: &str = "VALIDATION_COMPLETED";
    pub const REPORT_GENERATED: &str = "REPORT_GENERATED";
    pub const EXPORT_CREATED: &str = "EXPORT_CREATED";
    pub const CASE_EXPORTED: &str = "CASE_EXPORTED";
    pub const HASH_MISMATCH: &str = "HASH_MISMATCH";
}

#[derive(Debug, Error)]
pub enum AuditError {
    #[error("Failed to write audit event: {0}")]
    Write(#[from] database::DbError),
}

/// Audit logger — wraps the database and provides convenience methods.
pub struct AuditLogger {
    tool_version: String,
    default_actor: Option<String>,
}

impl AuditLogger {
    pub fn new(tool_version: impl Into<String>) -> Self {
        Self {
            tool_version: tool_version.into(),
            default_actor: None,
        }
    }

    pub fn with_actor(mut self, actor: impl Into<String>) -> Self {
        self.default_actor = Some(actor.into());
        self
    }

    /// Log an event to the database.
    pub fn log(
        &self,
        conn: &Connection,
        action: &str,
        case_id: Option<&str>,
        evidence_id: Option<&str>,
        artifact_id: Option<&str>,
        details: Option<String>,
    ) -> Result<(), AuditError> {
        let actor = self.default_actor.as_deref();
        let event = AuditEvent {
            event_id: Uuid::new_v4().to_string(),
            event_time: Utc::now().to_rfc3339(),
            actor: actor.map(str::to_string),
            action: action.to_string(),
            case_id: case_id.map(str::to_string),
            evidence_id: evidence_id.map(str::to_string),
            artifact_id: artifact_id.map(str::to_string),
            tool_version: Some(self.tool_version.clone()),
            details,
            event_hash: None,
            previous_event_hash: None,
        };
        info!(action = action, case_id = ?case_id, evidence_id = ?evidence_id, "Audit event");
        AuditEvent::log(conn, &event).map_err(AuditError::Write)
    }

    pub fn log_case_created(&self, conn: &Connection, case_id: &str, case_number: &str) -> Result<(), AuditError> {
        self.log(conn, actions::CASE_CREATED, Some(case_id), None, None,
            Some(format!("Case {} created", case_number)))
    }

    pub fn log_evidence_added(&self, conn: &Connection, case_id: &str, evidence_id: &str, path: &str) -> Result<(), AuditError> {
        self.log(conn, actions::EVIDENCE_ADDED, Some(case_id), Some(evidence_id), None,
            Some(format!("Evidence added: {}", path)))
    }

    pub fn log_evidence_hashed(&self, conn: &Connection, case_id: &str, evidence_id: &str, algorithm: &str, digest: &str) -> Result<(), AuditError> {
        self.log(conn, actions::EVIDENCE_HASHED, Some(case_id), Some(evidence_id), None,
            Some(format!("{}:{}", algorithm, &digest[..16])))
    }

    pub fn log_filesystem_identified(&self, conn: &Connection, case_id: &str, evidence_id: &str, fs_type: &str) -> Result<(), AuditError> {
        self.log(conn, actions::FILESYSTEM_IDENTIFIED, Some(case_id), Some(evidence_id), None,
            Some(format!("Filesystem type: {}", fs_type)))
    }

    pub fn log_scan_started(&self, conn: &Connection, case_id: &str, evidence_id: &str) -> Result<(), AuditError> {
        self.log(conn, actions::SCAN_STARTED, Some(case_id), Some(evidence_id), None, None)
    }

    pub fn log_scan_completed(&self, conn: &Connection, case_id: &str, evidence_id: &str, total: u64, deleted: u64) -> Result<(), AuditError> {
        self.log(conn, actions::SCAN_COMPLETED, Some(case_id), Some(evidence_id), None,
            Some(format!("total={} deleted={}", total, deleted)))
    }

    pub fn log_report_generated(&self, conn: &Connection, case_id: &str, format: &str, path: &str) -> Result<(), AuditError> {
        self.log(conn, actions::REPORT_GENERATED, Some(case_id), None, None,
            Some(format!("format={} path={}", format, path)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use database::{open_in_memory, Case, AuditEvent, EvidenceRecord};

    fn setup() -> (Connection, Case) {
        let conn = open_in_memory().unwrap();
        let case = Case::create(&conn, "C-001", "Test Case", "Alice", None, None).unwrap();
        (conn, case)
    }

    #[test]
    fn log_case_created() {
        let (conn, case) = setup();
        let logger = AuditLogger::new("0.1.0").with_actor("Alice");
        logger.log_case_created(&conn, &case.case_id, &case.case_number).unwrap();
        let events = AuditEvent::list_for_case(&conn, &case.case_id).unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].action, "CASE_CREATED");
    }

    #[test]
    fn audit_log_is_append_only_sequential() {
        let (conn, case) = setup();
        EvidenceRecord::create(&conn, &EvidenceRecord {
            evidence_id: "ev-001".into(),
            case_id: case.case_id.clone(),
            source_path: "/evidence/disk.img".into(),
            source_type: "RAW_IMAGE".into(),
            size_bytes: 1024 * 1024,
            filesystem_type: None,
            filesystem_uuid: None,
            volume_label: None,
            acquisition_hash: None,
            hash_algorithm: None,
            added_at: Utc::now().to_rfc3339(),
            added_by: "Alice".into(),
            description: None,
            analysis_status: "PENDING".into(),
        }).unwrap();
        let logger = AuditLogger::new("0.1.0");
        logger.log_case_created(&conn, &case.case_id, "C-001").unwrap();
        logger.log_evidence_added(&conn, &case.case_id, "ev-001", "/evidence/disk.img").unwrap();
        logger.log_evidence_hashed(&conn, &case.case_id, "ev-001", "SHA-256", "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890").unwrap();

        let events = AuditEvent::list_for_case(&conn, &case.case_id).unwrap();
        assert_eq!(events.len(), 3);
        // Verify ordering is chronological.
        for i in 1..events.len() {
            assert!(events[i].event_time >= events[i-1].event_time);
        }
    }
}
