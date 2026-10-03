//! Cryptographic hashing engine for forensic artifacts.
//!
//! Implements SHA-256, SHA-512, and BLAKE3 for evidence and artifact integrity.
//! MD5 and SHA-1 are supported as legacy-only and clearly marked non-preferred.

use std::io::{self, Read};
use std::path::Path;
use std::time::Instant;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest as Sha2Digest, Sha256, Sha512};
use thiserror::Error;
use uuid::Uuid;

/// Supported hashing algorithms.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum HashAlgorithm {
    Sha256,
    Sha512,
    Blake3,
    /// Non-preferred — for legacy compatibility only.
    #[serde(rename = "MD5_LEGACY")]
    Md5Legacy,
    /// Non-preferred — for legacy compatibility only.
    #[serde(rename = "SHA1_LEGACY")]
    Sha1Legacy,
}

impl HashAlgorithm {
    /// Returns true if this algorithm is considered non-preferred for
    /// new forensic work (cryptographically weak algorithms).
    pub fn is_legacy(&self) -> bool {
        matches!(self, HashAlgorithm::Md5Legacy | HashAlgorithm::Sha1Legacy)
    }

    pub fn name(&self) -> &'static str {
        match self {
            HashAlgorithm::Sha256 => "SHA-256",
            HashAlgorithm::Sha512 => "SHA-512",
            HashAlgorithm::Blake3 => "BLAKE3",
            HashAlgorithm::Md5Legacy => "MD5 (LEGACY — non-preferred)",
            HashAlgorithm::Sha1Legacy => "SHA-1 (LEGACY — non-preferred)",
        }
    }
}

/// A computed cryptographic digest with provenance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HashResult {
    pub result_id: Uuid,
    pub algorithm: HashAlgorithm,
    /// Hex-encoded digest.
    pub digest: String,
    /// Total bytes hashed.
    pub bytes_hashed: u64,
    /// Wall-clock duration in milliseconds.
    pub duration_ms: u64,
    pub calculated_at: DateTime<Utc>,
    /// Source description (path, evidence ID, etc.)
    pub source: String,
    /// Application version that produced this hash.
    pub tool_version: String,
    /// Whether this algorithm is considered non-preferred.
    pub is_legacy: bool,
}

impl HashResult {
    pub fn verify_against(&self, expected_hex: &str) -> bool {
        self.digest.eq_ignore_ascii_case(expected_hex)
    }
}

/// Errors specific to the hashing engine.
#[derive(Debug, Error)]
pub enum HashError {
    #[error("I/O error during hashing: {0}")]
    Io(#[from] io::Error),
    #[error("Unsupported algorithm: {0:?}")]
    UnsupportedAlgorithm(HashAlgorithm),
}

/// Hash engine — stateless, safe, deterministic.
pub struct Hasher {
    tool_version: String,
}

impl Hasher {
    pub fn new(tool_version: impl Into<String>) -> Self {
        Self {
            tool_version: tool_version.into(),
        }
    }

    /// Hash the contents of a file at `path` using `algorithm`.
    pub fn hash_file(
        &self,
        path: &Path,
        algorithm: HashAlgorithm,
    ) -> Result<HashResult, HashError> {
        let file = std::fs::File::open(path)?;
        let source = path.display().to_string();
        self.hash_reader(file, algorithm, source)
    }

    /// Hash a byte slice using `algorithm`.
    pub fn hash_bytes(&self, data: &[u8], algorithm: HashAlgorithm, source: impl Into<String>) -> Result<HashResult, HashError> {
        let start = Instant::now();
        let digest = compute_digest_bytes(data, algorithm)?;
        let duration_ms = start.elapsed().as_millis() as u64;
        Ok(HashResult {
            result_id: Uuid::new_v4(),
            algorithm,
            digest,
            bytes_hashed: data.len() as u64,
            duration_ms,
            calculated_at: Utc::now(),
            source: source.into(),
            tool_version: self.tool_version.clone(),
            is_legacy: algorithm.is_legacy(),
        })
    }

    /// Hash an arbitrary reader (streaming, bounded memory).
    pub fn hash_reader<R: Read>(
        &self,
        reader: R,
        algorithm: HashAlgorithm,
        source: impl Into<String>,
    ) -> Result<HashResult, HashError> {
        let start = Instant::now();
        let (digest, bytes_hashed) = compute_digest_reader(reader, algorithm)?;
        let duration_ms = start.elapsed().as_millis() as u64;

        Ok(HashResult {
            result_id: Uuid::new_v4(),
            algorithm,
            digest,
            bytes_hashed,
            duration_ms,
            calculated_at: Utc::now(),
            source: source.into(),
            tool_version: self.tool_version.clone(),
            is_legacy: algorithm.is_legacy(),
        })
    }

    /// Compute multiple hashes of a file in a single pass.
    /// Returns results for all requested algorithms.
    pub fn hash_file_multi(
        &self,
        path: &Path,
        algorithms: &[HashAlgorithm],
    ) -> Result<Vec<HashResult>> {
        let source = path.display().to_string();
        let data = std::fs::read(path)
            .with_context(|| format!("Failed to read {}", source))?;

        algorithms
            .iter()
            .map(|&alg| {
                self.hash_bytes(&data, alg, source.clone())
                    .with_context(|| format!("Hashing with {:?} failed", alg))
            })
            .collect()
    }
}

/// Compute the digest of a reader, returning (hex_digest, bytes_read).
fn compute_digest_reader<R: Read>(
    mut reader: R,
    algorithm: HashAlgorithm,
) -> Result<(String, u64), HashError> {
    const BUF_SIZE: usize = 64 * 1024; // 64 KiB
    let mut buf = vec![0u8; BUF_SIZE];
    let mut bytes_total: u64 = 0;

    match algorithm {
        HashAlgorithm::Sha256 => {
            let mut hasher = Sha256::new();
            loop {
                let n = reader.read(&mut buf)?;
                if n == 0 { break; }
                sha2::Digest::update(&mut hasher, &buf[..n]);
                bytes_total += n as u64;
            }
            let digest = hex::encode(sha2::Digest::finalize(hasher));
            Ok((digest, bytes_total))
        }
        HashAlgorithm::Sha512 => {
            let mut hasher = Sha512::new();
            loop {
                let n = reader.read(&mut buf)?;
                if n == 0 { break; }
                sha2::Digest::update(&mut hasher, &buf[..n]);
                bytes_total += n as u64;
            }
            let digest = hex::encode(sha2::Digest::finalize(hasher));
            Ok((digest, bytes_total))
        }
        HashAlgorithm::Blake3 => {
            let mut hasher = blake3::Hasher::new();
            loop {
                let n = reader.read(&mut buf)?;
                if n == 0 { break; }
                hasher.update(&buf[..n]);
                bytes_total += n as u64;
            }
            let digest = hasher.finalize().to_hex().to_string();
            Ok((digest, bytes_total))
        }
        HashAlgorithm::Md5Legacy => {
            let mut hasher = md5::Md5::new();
            loop {
                let n = reader.read(&mut buf)?;
                if n == 0 { break; }
                md5::Digest::update(&mut hasher, &buf[..n]);
                bytes_total += n as u64;
            }
            let digest = hex::encode(md5::Digest::finalize(hasher));
            Ok((digest, bytes_total))
        }
        HashAlgorithm::Sha1Legacy => {
            let mut hasher = sha1::Sha1::new();
            loop {
                let n = reader.read(&mut buf)?;
                if n == 0 { break; }
                sha1::Digest::update(&mut hasher, &buf[..n]);
                bytes_total += n as u64;
            }
            let digest = hex::encode(sha1::Digest::finalize(hasher));
            Ok((digest, bytes_total))
        }
    }
}

/// Compute the digest of a byte slice.
fn compute_digest_bytes(data: &[u8], algorithm: HashAlgorithm) -> Result<String, HashError> {
    let digest = match algorithm {
        HashAlgorithm::Sha256 => {
            hex::encode(Sha256::digest(data))
        }
        HashAlgorithm::Sha512 => {
            hex::encode(Sha512::digest(data))
        }
        HashAlgorithm::Blake3 => {
            blake3::hash(data).to_hex().to_string()
        }
        HashAlgorithm::Md5Legacy => {
            hex::encode(md5::Md5::digest(data))
        }
        HashAlgorithm::Sha1Legacy => {
            hex::encode(sha1::Sha1::digest(data))
        }
    };
    Ok(digest)
}

/// Standard set of algorithms for forensic use.
pub const FORENSIC_ALGORITHMS: &[HashAlgorithm] = &[
    HashAlgorithm::Sha256,
    HashAlgorithm::Sha512,
    HashAlgorithm::Blake3,
];

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    fn hasher() -> Hasher {
        Hasher::new("test-0.1.0")
    }

    #[test]
    fn sha256_empty() {
        let h = hasher();
        let result = h.hash_reader(Cursor::new(b""), HashAlgorithm::Sha256, "empty").unwrap();
        // SHA-256 of empty string is well-known
        assert_eq!(
            result.digest,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn sha256_known_value() {
        let h = hasher();
        let result = h.hash_bytes(b"hello world", HashAlgorithm::Sha256, "test").unwrap();
        assert_eq!(
            result.digest,
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
    }

    #[test]
    fn blake3_deterministic() {
        let h = hasher();
        let r1 = h.hash_bytes(b"forensic", HashAlgorithm::Blake3, "test").unwrap();
        let r2 = h.hash_bytes(b"forensic", HashAlgorithm::Blake3, "test").unwrap();
        assert_eq!(r1.digest, r2.digest);
    }

    #[test]
    fn sha512_known_value() {
        let h = hasher();
        let result = h.hash_bytes(b"", HashAlgorithm::Sha512, "test").unwrap();
        assert_eq!(
            result.digest,
            "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e"
        );
    }

    #[test]
    fn md5_is_marked_legacy() {
        let h = hasher();
        let result = h.hash_bytes(b"test", HashAlgorithm::Md5Legacy, "test").unwrap();
        assert!(result.is_legacy);
    }

    #[test]
    fn sha1_is_marked_legacy() {
        let h = hasher();
        let result = h.hash_bytes(b"test", HashAlgorithm::Sha1Legacy, "test").unwrap();
        assert!(result.is_legacy);
    }

    #[test]
    fn sha256_is_not_legacy() {
        let h = hasher();
        let result = h.hash_bytes(b"test", HashAlgorithm::Sha256, "test").unwrap();
        assert!(!result.is_legacy);
    }

    #[test]
    fn verify_against_expected() {
        let h = hasher();
        let result = h.hash_bytes(b"hello world", HashAlgorithm::Sha256, "test").unwrap();
        assert!(result.verify_against(&result.digest.clone()));
        assert!(!result.verify_against("0000000000000000000000000000000000000000000000000000000000000000"));
    }
}
