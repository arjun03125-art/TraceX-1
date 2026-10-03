//! Validation engine.
//!
//! Validates recovered artifacts through structural, content, and hash checks.
//! Produces explicit VALID / PARTIALLY_VALID / INVALID / UNVERIFIED results.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use hashing::{HashAlgorithm, Hasher, FORENSIC_ALGORITHMS};
use metadata::{ConfidenceLevel, ConfidenceSignals, RecoveryCandidate};

/// Result of a validation pass.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ValidationStatus {
    Valid,
    PartiallyValid,
    Invalid,
    Unverified,
}

/// Detailed validation report for a single artifact.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationReport {
    pub artifact_id: Uuid,
    pub status: ValidationStatus,
    pub structural_valid: Option<bool>,
    pub hash_valid: Option<bool>,
    pub content_parseable: Option<bool>,
    pub reasons: Vec<String>,
    pub sha256: Option<String>,
    pub blake3: Option<String>,
    pub validated_at: chrono::DateTime<chrono::Utc>,
}

/// Validate raw recovered bytes.
pub struct Validator {
    hasher: Hasher,
}

impl Validator {
    pub fn new(tool_version: impl Into<String>) -> Self {
        Self { hasher: Hasher::new(tool_version) }
    }

    /// Validate recovered data, computing hashes and structural checks.
    pub fn validate_bytes(
        &self,
        data: &[u8],
        artifact_id: Uuid,
        expected_sha256: Option<&str>,
    ) -> ValidationReport {
        let mut reasons = Vec::new();
        let mut sha256 = None;
        let mut blake3 = None;
        let mut hash_valid = None;

        // Compute SHA-256
        match self.hasher.hash_bytes(data, HashAlgorithm::Sha256, "validation") {
            Ok(r) => {
                sha256 = Some(r.digest.clone());
                if let Some(expected) = expected_sha256 {
                    let ok = r.verify_against(expected);
                    hash_valid = Some(ok);
                    if ok {
                        reasons.push("✓ SHA-256 matches expected".into());
                    } else {
                        reasons.push("✗ SHA-256 mismatch".into());
                    }
                } else {
                    reasons.push(format!("SHA-256 computed: {}", &r.digest[..16]));
                }
            }
            Err(e) => {
                reasons.push(format!("✗ SHA-256 computation failed: {}", e));
            }
        }

        // Compute BLAKE3
        match self.hasher.hash_bytes(data, HashAlgorithm::Blake3, "validation") {
            Ok(r) => {
                blake3 = Some(r.digest.clone());
            }
            Err(_) => {}
        }

        // Structural check: non-empty.
        let structural_valid = Some(!data.is_empty());
        if data.is_empty() {
            reasons.push("✗ Zero-length content — no data recovered".into());
        } else {
            reasons.push(format!("✓ {} bytes recovered", data.len()));
        }

        // Determine overall status.
        let status = match (structural_valid, hash_valid) {
            (Some(true), Some(true)) => {
                reasons.push("✓ All validation checks passed".into());
                ValidationStatus::Valid
            }
            (Some(false), _) => ValidationStatus::Invalid,
            (_, Some(false)) => ValidationStatus::Invalid,
            (Some(true), None) => ValidationStatus::PartiallyValid,
            _ => ValidationStatus::Unverified,
        };

        ValidationReport {
            artifact_id,
            status,
            structural_valid,
            hash_valid,
            content_parseable: None, // Format-specific parsers extend this
            reasons,
            sha256,
            blake3,
            validated_at: chrono::Utc::now(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn validator() -> Validator {
        Validator::new("0.1.0")
    }

    #[test]
    fn validate_empty_is_invalid() {
        let v = validator();
        let report = v.validate_bytes(&[], Uuid::new_v4(), None);
        assert_eq!(report.status, ValidationStatus::Invalid);
        assert_eq!(report.structural_valid, Some(false));
    }

    #[test]
    fn validate_bytes_computes_hash() {
        let v = validator();
        let report = v.validate_bytes(b"hello", Uuid::new_v4(), None);
        assert!(report.sha256.is_some());
        assert!(report.blake3.is_some());
    }

    #[test]
    fn validate_hash_mismatch_is_invalid() {
        let v = validator();
        let wrong_hash = "0000000000000000000000000000000000000000000000000000000000000000";
        let report = v.validate_bytes(b"test", Uuid::new_v4(), Some(wrong_hash));
        assert_eq!(report.status, ValidationStatus::Invalid);
        assert_eq!(report.hash_valid, Some(false));
    }

    #[test]
    fn validate_correct_hash_is_valid() {
        use sha2::{Digest, Sha256};
        let data = b"forensic evidence";
        let expected = hex::encode(Sha256::digest(data));
        let v = validator();
        let report = v.validate_bytes(data, Uuid::new_v4(), Some(&expected));
        assert_eq!(report.status, ValidationStatus::Valid);
        assert_eq!(report.hash_valid, Some(true));
    }
}
