//! Timeline engine — normalized forensic event model.
//!
//! Creates a structured timeline from filesystem metadata, recovery events,
//! and audit operations.  Supports CSV and JSON export.

use std::io::Write;

use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

use metadata::{ConfidenceLevel, TimestampKind};

/// Timeline event types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EventType {
    Created,
    Modified,
    Accessed,
    MetadataChanged,
    Deleted,
    Recovered,
    Carved,
    Hashed,
    Validated,
    Analyzed,
}

impl EventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            EventType::Created => "CREATED",
            EventType::Modified => "MODIFIED",
            EventType::Accessed => "ACCESSED",
            EventType::MetadataChanged => "METADATA_CHANGED",
            EventType::Deleted => "DELETED",
            EventType::Recovered => "RECOVERED",
            EventType::Carved => "CARVED",
            EventType::Hashed => "HASHED",
            EventType::Validated => "VALIDATED",
            EventType::Analyzed => "ANALYZED",
        }
    }
}

/// A single normalized timeline event.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineEvent {
    pub event_id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub event_type: EventType,
    /// Origin of the timestamp (filesystem metadata, audit log, etc.)
    pub source: String,
    /// Filesystem object/inode ID.
    pub object_id: Option<u64>,
    /// File path if known.
    pub path: Option<String>,
    /// Human-readable description.
    pub description: String,
    pub confidence: ConfidenceLevel,
    /// Reference to the evidence source.
    pub evidence_id: Option<Uuid>,
    /// Reference to the artifact if applicable.
    pub artifact_id: Option<Uuid>,
}

impl TimelineEvent {
    pub fn new(
        timestamp: DateTime<Utc>,
        event_type: EventType,
        source: impl Into<String>,
        description: impl Into<String>,
        confidence: ConfidenceLevel,
    ) -> Self {
        Self {
            event_id: Uuid::new_v4(),
            timestamp,
            event_type,
            source: source.into(),
            object_id: None,
            path: None,
            description: description.into(),
            confidence,
            evidence_id: None,
            artifact_id: None,
        }
    }

    pub fn with_path(mut self, path: impl Into<String>) -> Self {
        self.path = Some(path.into());
        self
    }

    pub fn with_object_id(mut self, id: u64) -> Self {
        self.object_id = Some(id);
        self
    }

    pub fn with_evidence(mut self, id: Uuid) -> Self {
        self.evidence_id = Some(id);
        self
    }

    pub fn with_artifact(mut self, id: Uuid) -> Self {
        self.artifact_id = Some(id);
        self
    }
}

/// Timeline — an ordered collection of events.
#[derive(Debug, Default)]
pub struct Timeline {
    events: Vec<TimelineEvent>,
}

impl Timeline {
    pub fn new() -> Self {
        Self { events: Vec::new() }
    }

    pub fn add(&mut self, event: TimelineEvent) {
        self.events.push(event);
    }

    /// Sort events chronologically (earliest first).
    pub fn sort(&mut self) {
        self.events.sort_by_key(|e| e.timestamp);
    }

    pub fn events(&self) -> &[TimelineEvent] {
        &self.events
    }

    /// Filter by event type.
    pub fn filter_by_type(&self, event_type: EventType) -> Vec<&TimelineEvent> {
        self.events.iter().filter(|e| e.event_type == event_type).collect()
    }

    /// Filter by time range.
    pub fn filter_by_range(&self, start: DateTime<Utc>, end: DateTime<Utc>) -> Vec<&TimelineEvent> {
        self.events.iter()
            .filter(|e| e.timestamp >= start && e.timestamp <= end)
            .collect()
    }

    /// Filter by path prefix.
    pub fn filter_by_path(&self, prefix: &str) -> Vec<&TimelineEvent> {
        self.events.iter()
            .filter(|e| e.path.as_deref().map(|p| p.starts_with(prefix)).unwrap_or(false))
            .collect()
    }

    /// Export to JSON.
    pub fn export_json(&self, writer: &mut impl Write) -> Result<()> {
        serde_json::to_writer_pretty(writer, &self.events)?;
        Ok(())
    }

    /// Export to CSV.
    pub fn export_csv(&self, writer: &mut impl Write) -> Result<()> {
        let mut wtr = csv::Writer::from_writer(writer);
        wtr.write_record(&["timestamp", "event_type", "source", "object_id", "path", "description", "confidence"])?;
        for e in &self.events {
            wtr.write_record(&[
                e.timestamp.to_rfc3339(),
                e.event_type.as_str().to_string(),
                e.source.clone(),
                e.object_id.map(|id| id.to_string()).unwrap_or_default(),
                e.path.clone().unwrap_or_default(),
                e.description.clone(),
                format!("{:?}", e.confidence),
            ])?;
        }
        wtr.flush()?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_event(ts: DateTime<Utc>, kind: EventType) -> TimelineEvent {
        TimelineEvent::new(ts, kind, "test", "test event", ConfidenceLevel::High)
    }

    #[test]
    fn timeline_sort() {
        let mut tl = Timeline::new();
        let t1 = "2026-01-03T00:00:00Z".parse::<DateTime<Utc>>().unwrap();
        let t2 = "2026-01-01T00:00:00Z".parse::<DateTime<Utc>>().unwrap();
        let t3 = "2026-01-02T00:00:00Z".parse::<DateTime<Utc>>().unwrap();

        tl.add(sample_event(t1, EventType::Modified));
        tl.add(sample_event(t2, EventType::Created));
        tl.add(sample_event(t3, EventType::Accessed));
        tl.sort();

        let events = tl.events();
        assert!(events[0].timestamp <= events[1].timestamp);
        assert!(events[1].timestamp <= events[2].timestamp);
        assert_eq!(events[0].event_type, EventType::Created);
    }

    #[test]
    fn filter_by_type() {
        let mut tl = Timeline::new();
        let now = Utc::now();
        tl.add(sample_event(now, EventType::Created));
        tl.add(sample_event(now, EventType::Modified));
        tl.add(sample_event(now, EventType::Deleted));
        tl.add(sample_event(now, EventType::Modified));

        let modified = tl.filter_by_type(EventType::Modified);
        assert_eq!(modified.len(), 2);
    }

    #[test]
    fn export_json_roundtrip() {
        let mut tl = Timeline::new();
        let now = Utc::now();
        tl.add(sample_event(now, EventType::Created));
        let mut buf = Vec::new();
        tl.export_json(&mut buf).unwrap();
        let parsed: serde_json::Value = serde_json::from_slice(&buf).unwrap();
        assert_eq!(parsed.as_array().unwrap().len(), 1);
    }

    #[test]
    fn export_csv_has_header() {
        let mut tl = Timeline::new();
        tl.add(sample_event(Utc::now(), EventType::Hashed)
            .with_path("/evidence/test.log"));
        let mut buf = Vec::new();
        tl.export_csv(&mut buf).unwrap();
        let s = String::from_utf8(buf).unwrap();
        assert!(s.contains("timestamp"));
        assert!(s.contains("event_type"));
        assert!(s.contains("HASHED"));
    }
}
