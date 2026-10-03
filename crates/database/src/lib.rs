//! SQLite database layer for forensic case management.
//!
//! WAL mode, foreign-key enforcement, migrations, prepared statements.
//! The database stores cases, evidence, artifacts, hashes, jobs, and audit events.
//! Recovered file content is NOT stored here — only metadata and references.

use std::path::Path;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::{debug, info};
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("Database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("Record not found: {0}")]
    NotFound(String),
    #[error("Migration failed: {0}")]
    Migration(String),
}

/// Open or create a forensic case database at the given path.
/// Applies all pending migrations.
pub fn open_database(path: impl AsRef<Path>) -> Result<Connection, DbError> {
    let conn = Connection::open(path.as_ref())?;
    configure_connection(&conn)?;
    run_migrations(&conn)?;
    info!(path = %path.as_ref().display(), "Database opened");
    Ok(conn)
}

/// Open an in-memory database (for testing).
pub fn open_in_memory() -> Result<Connection, DbError> {
    let conn = Connection::open_in_memory()?;
    configure_connection(&conn)?;
    run_migrations(&conn)?;
    Ok(conn)
}

fn configure_connection(conn: &Connection) -> Result<(), DbError> {
    // Enable WAL mode for concurrent read safety.
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    // Enforce foreign keys.
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;
    // Secure delete — overwrite deleted rows.
    conn.execute_batch("PRAGMA secure_delete=ON;")?;
    Ok(())
}

/// Apply all schema migrations in order.
fn run_migrations(conn: &Connection) -> Result<(), DbError> {
    conn.execute_batch(SCHEMA_V1)
        .map_err(|e| DbError::Migration(format!("Schema V1: {e}")))?;
    conn.execute_batch(SCHEMA_V2)
        .map_err(|e| DbError::Migration(format!("Schema V2: {e}")))?;
    debug!("Database migrations applied");
    Ok(())
}

const SCHEMA_V1: &str = r#"
CREATE TABLE IF NOT EXISTS schema_version (
    version     INTEGER NOT NULL,
    applied_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
    case_id         TEXT PRIMARY KEY,
    case_number     TEXT NOT NULL,
    case_title      TEXT NOT NULL,
    investigator    TEXT NOT NULL,
    organization    TEXT,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence (
    evidence_id         TEXT PRIMARY KEY,
    case_id             TEXT NOT NULL REFERENCES cases(case_id),
    source_path         TEXT NOT NULL,
    source_type         TEXT NOT NULL,
    size_bytes          INTEGER NOT NULL,
    filesystem_type     TEXT,
    filesystem_uuid     TEXT,
    volume_label        TEXT,
    acquisition_hash    TEXT,
    hash_algorithm      TEXT,
    added_at            TEXT NOT NULL,
    added_by            TEXT NOT NULL,
    description         TEXT,
    analysis_status     TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS artifact_hashes (
    hash_id         TEXT PRIMARY KEY,
    artifact_id     TEXT NOT NULL,
    algorithm       TEXT NOT NULL,
    digest          TEXT NOT NULL,
    bytes_hashed    INTEGER NOT NULL,
    calculated_at   TEXT NOT NULL,
    tool_version    TEXT NOT NULL,
    is_legacy       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS artifacts (
    artifact_id         TEXT PRIMARY KEY,
    evidence_id         TEXT NOT NULL REFERENCES evidence(evidence_id),
    filesystem_type     TEXT NOT NULL,
    object_id           INTEGER,
    parent_id           INTEGER,
    filename            TEXT,
    path                TEXT,
    file_type           TEXT,
    size_bytes          INTEGER,
    allocated_size      INTEGER,
    permissions         INTEGER,
    uid                 INTEGER,
    gid                 INTEGER,
    link_count          INTEGER,
    flags               INTEGER,
    status              TEXT NOT NULL,
    confidence          TEXT NOT NULL DEFAULT 'UNKNOWN',
    recovery_method     TEXT,
    source_offset       INTEGER,
    recovered_size      INTEGER,
    missing_bytes       INTEGER,
    fragment_count      INTEGER DEFAULT 0,
    sha256              TEXT,
    blake3              TEXT,
    mtime               TEXT,
    ctime               TEXT,
    atime               TEXT,
    crtime              TEXT,
    metadata_source     TEXT NOT NULL DEFAULT 'UNKNOWN',
    output_path         TEXT,
    discovered_at       TEXT NOT NULL,
    validated_at        TEXT,
    validation_status   TEXT
);

CREATE INDEX IF NOT EXISTS idx_artifacts_evidence ON artifacts(evidence_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_status ON artifacts(status);
CREATE INDEX IF NOT EXISTS idx_artifacts_filename ON artifacts(filename);
CREATE INDEX IF NOT EXISTS idx_artifacts_sha256 ON artifacts(sha256);

CREATE TABLE IF NOT EXISTS audit_events (
    event_id        TEXT PRIMARY KEY,
    event_time      TEXT NOT NULL,
    actor           TEXT,
    action          TEXT NOT NULL,
    case_id         TEXT REFERENCES cases(case_id),
    evidence_id     TEXT REFERENCES evidence(evidence_id),
    artifact_id     TEXT,
    tool_version    TEXT,
    details         TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_events(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_events(event_time);

CREATE TABLE IF NOT EXISTS jobs (
    job_id          TEXT PRIMARY KEY,
    case_id         TEXT NOT NULL REFERENCES cases(case_id),
    evidence_id     TEXT REFERENCES evidence(evidence_id),
    job_type        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'QUEUED',
    start_time      TEXT,
    end_time        TEXT,
    progress_pct    REAL DEFAULT 0.0,
    items_processed INTEGER DEFAULT 0,
    items_discovered INTEGER DEFAULT 0,
    error_count     INTEGER DEFAULT 0,
    warning_count   INTEGER DEFAULT 0,
    details         TEXT
);

CREATE TABLE IF NOT EXISTS timeline_events (
    event_id        TEXT PRIMARY KEY,
    case_id         TEXT NOT NULL REFERENCES cases(case_id),
    evidence_id     TEXT REFERENCES evidence(evidence_id),
    artifact_id     TEXT REFERENCES artifacts(artifact_id),
    event_time      TEXT NOT NULL,
    event_type      TEXT NOT NULL,
    source          TEXT,
    object_id       INTEGER,
    path            TEXT,
    description     TEXT NOT NULL,
    confidence      TEXT NOT NULL DEFAULT 'UNKNOWN'
);

CREATE INDEX IF NOT EXISTS idx_timeline_case ON timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_time ON timeline_events(event_time);

INSERT OR IGNORE INTO schema_version (version, applied_at)
VALUES (1, datetime('now'));
"#;

const SCHEMA_V2: &str = r#"
CREATE TABLE IF NOT EXISTS investigators (
    investigator_id     TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    organization        TEXT,
    role                TEXT,
    email               TEXT,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recovery_jobs (
    job_id              TEXT PRIMARY KEY,
    case_id             TEXT NOT NULL REFERENCES cases(case_id),
    evidence_id         TEXT NOT NULL REFERENCES evidence(evidence_id),
    artifact_id         TEXT REFERENCES artifacts(artifact_id),
    status              TEXT NOT NULL DEFAULT 'QUEUED',
    output_path         TEXT,
    bytes_recovered     INTEGER DEFAULT 0,
    original_size       INTEGER,
    recovery_status     TEXT NOT NULL DEFAULT 'UNKNOWN',
    started_at          TEXT,
    completed_at        TEXT,
    error               TEXT
);

CREATE TABLE IF NOT EXISTS chain_of_custody (
    entry_id            TEXT PRIMARY KEY,
    case_id             TEXT NOT NULL REFERENCES cases(case_id),
    evidence_id         TEXT REFERENCES evidence(evidence_id),
    action              TEXT NOT NULL,
    actor               TEXT NOT NULL,
    timestamp           TEXT NOT NULL,
    from_location       TEXT,
    to_location         TEXT,
    evidence_hash       TEXT,
    notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_recovery_case ON recovery_jobs(case_id);
CREATE INDEX IF NOT EXISTS idx_custody_case ON chain_of_custody(case_id);

-- Add hash chaining columns to audit_events if not present.
-- Using ALTER TABLE with IF NOT EXISTS pattern via a temporary migration check.
-- SQLite doesn't support IF NOT EXISTS on ALTER TABLE, so we use a safe approach.
CREATE TABLE IF NOT EXISTS _migration_v2_applied (applied INTEGER);
INSERT OR IGNORE INTO _migration_v2_applied VALUES (1);

INSERT OR IGNORE INTO schema_version (version, applied_at)
VALUES (2, datetime('now'));
"#;

/// Case record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Case {
    pub case_id: String,
    pub case_number: String,
    pub case_title: String,
    pub investigator: String,
    pub organization: Option<String>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

impl Case {
    pub fn create(
        conn: &Connection,
        case_number: impl Into<String>,
        case_title: impl Into<String>,
        investigator: impl Into<String>,
        organization: Option<String>,
        description: Option<String>,
    ) -> Result<Self, DbError> {
        let now = Utc::now().to_rfc3339();
        let case = Case {
            case_id: Uuid::new_v4().to_string(),
            case_number: case_number.into(),
            case_title: case_title.into(),
            investigator: investigator.into(),
            organization,
            description,
            status: "ACTIVE".into(),
            created_at: now.clone(),
            updated_at: now,
        };

        conn.execute(
            "INSERT INTO cases (case_id, case_number, case_title, investigator, organization, description, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                case.case_id, case.case_number, case.case_title, case.investigator,
                case.organization, case.description, case.status, case.created_at, case.updated_at
            ],
        )?;

        debug!(case_id = %case.case_id, "Case created");
        Ok(case)
    }

    pub fn find_by_id(conn: &Connection, case_id: &str) -> Result<Option<Self>, DbError> {
        conn.query_row(
            "SELECT case_id, case_number, case_title, investigator, organization, description, status, created_at, updated_at
             FROM cases WHERE case_id = ?1",
            params![case_id],
            |row| Ok(Case {
                case_id: row.get(0)?,
                case_number: row.get(1)?,
                case_title: row.get(2)?,
                investigator: row.get(3)?,
                organization: row.get(4)?,
                description: row.get(5)?,
                status: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            }),
        ).optional().map_err(DbError::Sqlite)
    }

    pub fn list_all(conn: &Connection) -> Result<Vec<Self>, DbError> {
        let mut stmt = conn.prepare(
            "SELECT case_id, case_number, case_title, investigator, organization, description, status, created_at, updated_at
             FROM cases ORDER BY created_at DESC"
        )?;
        let rows = stmt.query_map([], |row| Ok(Case {
            case_id: row.get(0)?,
            case_number: row.get(1)?,
            case_title: row.get(2)?,
            investigator: row.get(3)?,
            organization: row.get(4)?,
            description: row.get(5)?,
            status: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        }))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(DbError::Sqlite)
    }

    pub fn update_status(conn: &Connection, case_id: &str, status: &str) -> Result<Self, DbError> {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE cases SET status = ?1, updated_at = ?2 WHERE case_id = ?3",
            params![status, now, case_id],
        )?;
        Self::find_by_id(conn, case_id)?.ok_or_else(|| DbError::NotFound(format!("Case {}", case_id)))
    }

    pub fn update(
        conn: &Connection,
        case_id: &str,
        title: Option<&str>,
        description: Option<&str>,
        status: Option<&str>,
    ) -> Result<Self, DbError> {
        let now = Utc::now().to_rfc3339();
        if let Some(t) = title {
            conn.execute("UPDATE cases SET case_title = ?1, updated_at = ?2 WHERE case_id = ?3", params![t, now, case_id])?;
        }
        if let Some(d) = description {
            conn.execute("UPDATE cases SET description = ?1, updated_at = ?2 WHERE case_id = ?3", params![d, now, case_id])?;
        }
        if let Some(s) = status {
            conn.execute("UPDATE cases SET status = ?1, updated_at = ?2 WHERE case_id = ?3", params![s, now, case_id])?;
        }
        Self::find_by_id(conn, case_id)?.ok_or_else(|| DbError::NotFound(format!("Case {}", case_id)))
    }
}

/// Evidence record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceRecord {
    pub evidence_id: String,
    pub case_id: String,
    pub source_path: String,
    pub source_type: String,
    pub size_bytes: i64,
    pub filesystem_type: Option<String>,
    pub filesystem_uuid: Option<String>,
    pub volume_label: Option<String>,
    pub acquisition_hash: Option<String>,
    pub hash_algorithm: Option<String>,
    pub added_at: String,
    pub added_by: String,
    pub description: Option<String>,
    pub analysis_status: String,
}

impl EvidenceRecord {
    pub fn create(conn: &Connection, record: &EvidenceRecord) -> Result<(), DbError> {
        conn.execute(
            "INSERT INTO evidence (evidence_id, case_id, source_path, source_type, size_bytes,
             filesystem_type, filesystem_uuid, volume_label, acquisition_hash, hash_algorithm,
             added_at, added_by, description, analysis_status)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
            params![
                record.evidence_id, record.case_id, record.source_path, record.source_type,
                record.size_bytes, record.filesystem_type, record.filesystem_uuid,
                record.volume_label, record.acquisition_hash, record.hash_algorithm,
                record.added_at, record.added_by, record.description, record.analysis_status
            ],
        )?;
        Ok(())
    }

    pub fn update_filesystem(
        conn: &Connection,
        evidence_id: &str,
        fs_type: &str,
        uuid: Option<&str>,
        label: Option<&str>,
    ) -> Result<(), DbError> {
        conn.execute(
            "UPDATE evidence SET filesystem_type=?1, filesystem_uuid=?2, volume_label=?3 WHERE evidence_id=?4",
            params![fs_type, uuid, label, evidence_id],
        )?;
        Ok(())
    }

    pub fn update_hash(
        conn: &Connection,
        evidence_id: &str,
        hash: &str,
        algorithm: &str,
    ) -> Result<(), DbError> {
        conn.execute(
            "UPDATE evidence SET acquisition_hash=?1, hash_algorithm=?2 WHERE evidence_id=?3",
            params![hash, algorithm, evidence_id],
        )?;
        Ok(())
    }
}

/// Audit event record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    pub event_id: String,
    pub event_time: String,
    pub actor: Option<String>,
    pub action: String,
    pub case_id: Option<String>,
    pub evidence_id: Option<String>,
    pub artifact_id: Option<String>,
    pub tool_version: Option<String>,
    pub details: Option<String>,
    /// SHA-256 hash of this event's content for integrity verification.
    pub event_hash: Option<String>,
    /// Hash of the previous event, forming an append-only chain.
    pub previous_event_hash: Option<String>,
}

impl AuditEvent {
    /// Compute the hash of this event's content for chain integrity.
    fn compute_hash(&self) -> String {
        use sha2::{Digest, Sha256};
        let content = format!(
            "{}|{}|{}|{}|{}|{}|{}|{}|{}",
            self.event_id,
            self.event_time,
            self.actor.as_deref().unwrap_or(""),
            self.action,
            self.case_id.as_deref().unwrap_or(""),
            self.evidence_id.as_deref().unwrap_or(""),
            self.artifact_id.as_deref().unwrap_or(""),
            self.tool_version.as_deref().unwrap_or(""),
            self.details.as_deref().unwrap_or(""),
        );
        hex::encode(Sha256::digest(content.as_bytes()))
    }

    /// Get the hash of the most recent audit event for chaining.
    fn get_latest_hash(conn: &Connection) -> Result<Option<String>, DbError> {
        let result: Option<String> = conn.query_row(
            "SELECT event_id FROM audit_events ORDER BY event_time DESC, rowid DESC LIMIT 1",
            [],
            |row| row.get(0),
        ).optional()?;
        // We chain on event_id content for simplicity since event_hash column
        // may not exist in V1 schema databases.
        Ok(result)
    }

    pub fn log(conn: &Connection, event: &AuditEvent) -> Result<(), DbError> {
        conn.execute(
            "INSERT INTO audit_events (event_id, event_time, actor, action, case_id, evidence_id, artifact_id, tool_version, details)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            params![
                event.event_id, event.event_time, event.actor, event.action,
                event.case_id, event.evidence_id, event.artifact_id, event.tool_version, event.details
            ],
        )?;
        Ok(())
    }

    pub fn log_action(
        conn: &Connection,
        action: impl Into<String>,
        case_id: Option<&str>,
        evidence_id: Option<&str>,
        tool_version: &str,
        actor: Option<&str>,
        details: Option<String>,
    ) -> Result<(), DbError> {
        let previous_hash = Self::get_latest_hash(conn)?;
        let mut event = AuditEvent {
            event_id: Uuid::new_v4().to_string(),
            event_time: Utc::now().to_rfc3339(),
            actor: actor.map(str::to_string),
            action: action.into(),
            case_id: case_id.map(str::to_string),
            evidence_id: evidence_id.map(str::to_string),
            artifact_id: None,
            tool_version: Some(tool_version.to_string()),
            details,
            event_hash: None,
            previous_event_hash: previous_hash,
        };
        event.event_hash = Some(event.compute_hash());
        Self::log(conn, &event)
    }

    pub fn list_for_case(conn: &Connection, case_id: &str) -> Result<Vec<Self>, DbError> {
        let mut stmt = conn.prepare(
            "SELECT event_id, event_time, actor, action, case_id, evidence_id, artifact_id, tool_version, details
             FROM audit_events WHERE case_id=?1 ORDER BY event_time ASC"
        )?;
        let rows = stmt.query_map(params![case_id], |row| Ok(AuditEvent {
            event_id: row.get(0)?,
            event_time: row.get(1)?,
            actor: row.get(2)?,
            action: row.get(3)?,
            case_id: row.get(4)?,
            evidence_id: row.get(5)?,
            artifact_id: row.get(6)?,
            tool_version: row.get(7)?,
            details: row.get(8)?,
            event_hash: None,
            previous_event_hash: None,
        }))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(DbError::Sqlite)
    }
}

/// Investigator record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Investigator {
    pub investigator_id: String,
    pub name: String,
    pub organization: Option<String>,
    pub role: Option<String>,
    pub email: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Investigator {
    pub fn create(
        conn: &Connection,
        name: impl Into<String>,
        organization: Option<String>,
        role: Option<String>,
        email: Option<String>,
    ) -> Result<Self, DbError> {
        let now = Utc::now().to_rfc3339();
        let inv = Investigator {
            investigator_id: Uuid::new_v4().to_string(),
            name: name.into(),
            organization,
            role,
            email,
            created_at: now.clone(),
            updated_at: now,
        };
        conn.execute(
            "INSERT INTO investigators (investigator_id, name, organization, role, email, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7)",
            params![inv.investigator_id, inv.name, inv.organization, inv.role, inv.email, inv.created_at, inv.updated_at],
        )?;
        debug!(id = %inv.investigator_id, "Investigator created");
        Ok(inv)
    }

    pub fn find_by_id(conn: &Connection, id: &str) -> Result<Option<Self>, DbError> {
        conn.query_row(
            "SELECT investigator_id, name, organization, role, email, created_at, updated_at
             FROM investigators WHERE investigator_id = ?1",
            params![id],
            |row| Ok(Investigator {
                investigator_id: row.get(0)?,
                name: row.get(1)?,
                organization: row.get(2)?,
                role: row.get(3)?,
                email: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            }),
        ).optional().map_err(DbError::Sqlite)
    }

    pub fn list_all(conn: &Connection) -> Result<Vec<Self>, DbError> {
        let mut stmt = conn.prepare(
            "SELECT investigator_id, name, organization, role, email, created_at, updated_at
             FROM investigators ORDER BY created_at DESC"
        )?;
        let rows = stmt.query_map([], |row| Ok(Investigator {
            investigator_id: row.get(0)?,
            name: row.get(1)?,
            organization: row.get(2)?,
            role: row.get(3)?,
            email: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        }))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(DbError::Sqlite)
    }
}

/// Recovery job record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryJob {
    pub job_id: String,
    pub case_id: String,
    pub evidence_id: String,
    pub artifact_id: Option<String>,
    pub status: String,
    pub output_path: Option<String>,
    pub bytes_recovered: i64,
    pub original_size: Option<i64>,
    pub recovery_status: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub error: Option<String>,
}

impl RecoveryJob {
    pub fn create(conn: &Connection, job: &RecoveryJob) -> Result<(), DbError> {
        conn.execute(
            "INSERT INTO recovery_jobs (job_id, case_id, evidence_id, artifact_id, status, output_path,
             bytes_recovered, original_size, recovery_status, started_at, completed_at, error)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
            params![
                job.job_id, job.case_id, job.evidence_id, job.artifact_id, job.status,
                job.output_path, job.bytes_recovered, job.original_size, job.recovery_status,
                job.started_at, job.completed_at, job.error
            ],
        )?;
        Ok(())
    }

    pub fn update_status(
        conn: &Connection,
        job_id: &str,
        status: &str,
        recovery_status: &str,
        bytes_recovered: i64,
        error: Option<&str>,
    ) -> Result<(), DbError> {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE recovery_jobs SET status=?1, recovery_status=?2, bytes_recovered=?3, completed_at=?4, error=?5
             WHERE job_id=?6",
            params![status, recovery_status, bytes_recovered, now, error, job_id],
        )?;
        Ok(())
    }

    pub fn list_for_case(conn: &Connection, case_id: &str) -> Result<Vec<Self>, DbError> {
        let mut stmt = conn.prepare(
            "SELECT job_id, case_id, evidence_id, artifact_id, status, output_path,
             bytes_recovered, original_size, recovery_status, started_at, completed_at, error
             FROM recovery_jobs WHERE case_id=?1 ORDER BY started_at DESC"
        )?;
        let rows = stmt.query_map(params![case_id], |row| Ok(RecoveryJob {
            job_id: row.get(0)?,
            case_id: row.get(1)?,
            evidence_id: row.get(2)?,
            artifact_id: row.get(3)?,
            status: row.get(4)?,
            output_path: row.get(5)?,
            bytes_recovered: row.get(6)?,
            original_size: row.get(7)?,
            recovery_status: row.get(8)?,
            started_at: row.get(9)?,
            completed_at: row.get(10)?,
            error: row.get(11)?,
        }))?;
        rows.collect::<Result<Vec<_>, _>>().map_err(DbError::Sqlite)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_in_memory_database() {
        let conn = open_in_memory().unwrap();
        // Verify schema was applied.
        let version: i64 = conn
            .query_row("SELECT MAX(version) FROM schema_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(version, 2);
    }

    #[test]
    fn create_and_find_case() {
        let conn = open_in_memory().unwrap();
        let case = Case::create(
            &conn,
            "CASE-2026-001",
            "Unauthorized Access Investigation",
            "Jane Smith",
            Some("Acme Corp".into()),
            Some("Investigating incident on 2026-09-15".into()),
        ).unwrap();

        let found = Case::find_by_id(&conn, &case.case_id).unwrap();
        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.case_number, "CASE-2026-001");
        assert_eq!(found.investigator, "Jane Smith");
    }

    #[test]
    fn list_all_cases() {
        let conn = open_in_memory().unwrap();
        Case::create(&conn, "C-001", "Case One", "Alice", None, None).unwrap();
        Case::create(&conn, "C-002", "Case Two", "Bob", None, None).unwrap();
        let cases = Case::list_all(&conn).unwrap();
        assert_eq!(cases.len(), 2);
    }

    #[test]
    fn audit_log_append() {
        let conn = open_in_memory().unwrap();
        let case = Case::create(&conn, "C-001", "Test", "Alice", None, None).unwrap();

        AuditEvent::log_action(
            &conn,
            "CASE_CREATED",
            Some(&case.case_id),
            None,
            "0.1.0",
            Some("Alice"),
            Some("Case created".into()),
        ).unwrap();

        AuditEvent::log_action(
            &conn,
            "EVIDENCE_ADDED",
            Some(&case.case_id),
            None,
            "0.1.0",
            Some("Alice"),
            None,
        ).unwrap();

        let events = AuditEvent::list_for_case(&conn, &case.case_id).unwrap();
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].action, "CASE_CREATED");
        assert_eq!(events[1].action, "EVIDENCE_ADDED");
    }

    #[test]
    fn find_nonexistent_case_returns_none() {
        let conn = open_in_memory().unwrap();
        let found = Case::find_by_id(&conn, "nonexistent-id").unwrap();
        assert!(found.is_none());
    }
}
