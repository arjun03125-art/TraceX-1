// Forensic TypeScript types — mirrors the Rust data model.

export type MetadataSource = 'RECOVERED' | 'INFERRED' | 'DERIVED' | 'UNKNOWN';

export interface MetaField<T> {
  value: T | null;
  source: MetadataSource;
  note: string | null;
}

export type RecoveryStatus =
  | 'CONFIRMED'
  | 'PROBABLE'
  | 'PARTIAL'
  | 'CARVED'
  | 'UNRECOVERABLE'
  | 'UNKNOWN';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type FilesystemType = 'XFS' | 'BTRFS' | 'EXT4' | 'NTFS' | 'APFS' | 'UNKNOWN';

export type EventType =
  | 'CREATED'
  | 'MODIFIED'
  | 'ACCESSED'
  | 'METADATA_CHANGED'
  | 'DELETED'
  | 'RECOVERED'
  | 'CARVED'
  | 'HASHED'
  | 'VALIDATED'
  | 'ANALYZED';

export type CaseStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type CasePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// ─── Case Management ────────────────────────────────────────────────────────

export interface Case {
  case_id: string;
  case_number: string;
  case_title: string;
  investigator: string;
  organization: string | null;
  description: string | null;
  status: CaseStatus;
  priority: CasePriority;
  notes: string | null;
  created_at: string;
  updated_at: string;
  recovery_progress?: number;
  recovery_state?: 'RETRIEVED' | 'PARTIAL_70' | 'PENDING' | string;
}

// ─── Authentication & RBAC ─────────────────────────────────────────────────

export type UserRole = 'INVESTIGATOR' | 'ADMINISTRATOR';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  organization: string;
  badge: string;
  email: string;
}

// ─── Investigator ───────────────────────────────────────────────────────────

export type InvestigatorStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Investigator {
  investigator_id: string;
  name: string;
  role: string;
  organization: string | null;
  email: string | null;
  operator_id: string | null;
  status: InvestigatorStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Evidence ───────────────────────────────────────────────────────────────

export type EvidenceSourceType = 'RAW_IMAGE' | 'BLOCK_DEVICE' | 'PARTITION_IMAGE' | 'E01' | 'AFF4';
export type EvidenceAnalysisStatus = 'PENDING' | 'HASHING' | 'SCANNING' | 'COMPLETE' | 'ERROR';
export type EvidenceFormat = 'RAW' | 'E01' | 'VMDK' | 'VHD' | 'PHYSICAL_DRIVE' | 'BLOCK_DEVICE' | 'PARTITION_IMAGE' | 'AFF4';
export type EvidenceStatus = 'READY' | 'INGESTING' | 'ANALYZING' | 'ERROR' | 'COMPLETE' | 'PENDING';

export interface Evidence {
  evidence_id: string;
  case_id: string;
  name: string;
  source_path: string;
  source_type: EvidenceSourceType;
  format?: EvidenceFormat | string;
  status?: EvidenceStatus | string;
  detected_fs?: string | null;
  hash_sha256?: string | null;
  size_bytes: number | null;
  filesystem_type: FilesystemType | null;
  filesystem_uuid: string | null;
  volume_label: string | null;
  acquisition_hash: string | null;
  hash_algorithm: string | null;
  added_at: string;
  added_by: string | null;
  description: string | null;
  analysis_status: EvidenceAnalysisStatus;
  read_only_verified?: boolean;
  notes: string | null;
}

// ─── Report ─────────────────────────────────────────────────────────────────

export type ReportStatus = 'DRAFT' | 'FINAL' | 'ARCHIVED';
export type ReportFormat = 'HTML' | 'PDF' | 'JSON' | 'CSV';
export type ReportType = 'COMPREHENSIVE' | 'TIMELINE' | 'EVIDENCE_SUMMARY' | 'CHAIN_OF_CUSTODY' | string;

export interface Report {
  report_id: string;
  case_id: string;
  title: string;
  description: string | null;
  summary?: string | null;
  format: ReportFormat;
  status: ReportStatus;
  report_type?: ReportType;
  author?: string;
  classification?: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  notes: string | null;
  evidence_id?: string;
  evidence_source?: string;
  filesystem?: string;
  hash_sha256?: string;
  total_artifacts?: number;
  recovered_artifacts?: number;
  partial_artifacts?: number;
  validation_result?: string;
  recovered_files?: Array<{
    name: string;
    type: string;
    path: string;
    size: string;
    status: string;
    recovery: string;
    inode: string;
    mtime: string;
    sha256: string;
    metadata: string;
  }>;
}

// ─── Audit ──────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'CASE_CREATED'
  | 'CASE_UPDATED'
  | 'CASE_DELETED'
  | 'CASE_ARCHIVED'
  | 'INVESTIGATOR_CREATED'
  | 'INVESTIGATOR_UPDATED'
  | 'INVESTIGATOR_DELETED'
  | 'EVIDENCE_ADDED'
  | 'EVIDENCE_UPDATED'
  | 'EVIDENCE_DELETED'
  | 'EVIDENCE_HASHED'
  | 'EVIDENCE_VERIFIED'
  | 'FILESYSTEM_IDENTIFIED'
  | 'FILESYSTEM_ANALYZED'
  | 'METADATA_EXTRACTED'
  | 'DELETED_ARTIFACT_DISCOVERED'
  | 'RECOVERY_STARTED'
  | 'RECOVERY_COMPLETED'
  | 'RECOVERY_VALIDATED'
  | 'REPORT_GENERATED'
  | 'REPORT_CREATED'
  | 'REPORT_UPDATED'
  | 'REPORT_DELETED'
  | 'SETTINGS_UPDATED'
  | 'DASHBOARD_LAYOUT_UPDATED'
  | string;

export interface AuditEvent {
  id: number;
  event_id: string;
  event_time: string;
  actor: string | null;
  action: AuditAction | string;
  case_id: string | null;
  evidence_id: string | null;
  artifact_id: string | null;
  target?: string | null;
  status?: string | null;
  description?: string | null;
  hash_reference?: string | null;
  tool_version: string | null;
  details: string | null;
}

export type AuditEntry = AuditEvent;

// ─── App Settings ───────────────────────────────────────────────────────────

export interface AppSettings {
  general: {
    applicationName: string;
    defaultInvestigator: string;
    defaultOrganization: string;
  };
  engine: {
    workerThreads: number;
    chunkSize: string;
    exportPath: string;
  };
  security: {
    readOnlyEnforced: boolean;
    execBitNeutralization: boolean;
  };
  evidence: {
    defaultHashAlgorithm: string;
    autoVerifyOnAdd: boolean;
  };
  audit: {
    enabled: boolean;
    retentionDays: number;
  };
  appearance: {
    theme: 'dark';
    compactMode: boolean;
  };
}

// ─── Dashboard Layout ───────────────────────────────────────────────────────

export type WidgetType =
  | 'case_summary'
  | 'evidence_summary'
  | 'recent_activity'
  | 'reports'
  | 'audit'
  | 'system_status'
  | 'timeline';

export interface DashboardWidget {
  id: WidgetType;
  label: string;
  visible: boolean;
  order: number;
}

export interface DashboardLayout {
  widgets: DashboardWidget[];
}

// ─── Superblock / Filesystem Info ────────────────────────────────────────────

export interface SuperblockInfo {
  filesystem_type: FilesystemType;
  uuid: string | null;
  volume_label: string | null;
  total_size: number;
  block_size: number;
  sector_size: number;
  total_blocks: number;
  free_blocks: number | null;
  inode_count: number | null;
  free_inodes: number | null;
  features: string[];
  has_journal: boolean;
  extended: Record<string, unknown>;
}

// ─── Artifacts / Recovery Candidates ─────────────────────────────────────────

export interface ConfidenceSignals {
  metadata_validity: boolean | null;
  extent_validity: boolean | null;
  signature_validity: boolean | null;
  content_validation: boolean | null;
  checksum_validation: boolean | null;
  directory_relationship: boolean | null;
  timestamp_confidence: boolean | null;
  fragmentation_penalty: boolean;
  reasons: string[];
}

export interface RecoveryFragment {
  fragment_index: number;
  source_offset: number;
  length: number;
  logical_offset: number;
  confidence: ConfidenceLevel;
}

export interface ForensicTimestamp {
  kind: 'CREATED' | 'MODIFIED' | 'METADATA_CHANGED' | 'ACCESSED' | 'DELETED' | 'TRANSACTION_TIME';
  value: string | null;
  source: MetadataSource;
  note: string | null;
}

export interface ObjectMetadata {
  metadata_id: string;
  evidence_id: string;
  object_id: MetaField<number>;
  parent_id: MetaField<number>;
  filename: MetaField<string>;
  path: MetaField<string>;
  object_type: MetaField<string>;
  permissions: MetaField<number>;
  uid: MetaField<number>;
  gid: MetaField<number>;
  link_count: MetaField<number>;
  size: MetaField<number>;
  allocated_size: MetaField<number>;
  extent_count: MetaField<number>;
  flags: MetaField<number>;
  has_xattrs: MetaField<boolean>;
  timestamps: ForensicTimestamp[];
  symlink_target: MetaField<string>;
}

export interface RecoveryCandidate {
  candidate_id: string;
  evidence_id: string;
  status: RecoveryStatus;
  confidence: ConfidenceSignals;
  overall_confidence: ConfidenceLevel;
  metadata: ObjectMetadata | null;
  logical_size: number | null;
  recovered_size: number;
  missing_bytes: number;
  fragments: RecoveryFragment[];
  recovery_method: string;
  sha256: string | null;
  blake3: string | null;
  discovered_at: string;
  reconstruction_pct: number | null;
}

// ─── Hashes ──────────────────────────────────────────────────────────────────

export interface HashResult {
  result_id: string;
  algorithm: 'SHA-256' | 'SHA-512' | 'BLAKE3' | 'MD5_LEGACY' | 'SHA1_LEGACY';
  digest: string;
  bytes_hashed: number;
  duration_ms: number;
  calculated_at: string;
  source: string;
  tool_version: string;
  is_legacy: boolean;
}

// ─── Validation ──────────────────────────────────────────────────────────────

export type ValidationStatus = 'VALID' | 'PARTIALLY_VALID' | 'INVALID' | 'UNVERIFIED';

export interface ValidationReport {
  artifact_id: string;
  status: ValidationStatus;
  structural_valid: boolean | null;
  hash_valid: boolean | null;
  content_parseable: boolean | null;
  reasons: string[];
  sha256: string | null;
  blake3: string | null;
  validated_at: string;
}

// ─── Timeline ────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  event_id: string;
  timestamp: string;
  event_time?: string;
  case_id?: string;
  event_type: EventType;
  source: string;
  object_id: number | null;
  path: string | null;
  description: string;
  confidence: ConfidenceLevel;
  evidence_id: string | null;
  artifact_id: string | null;
}

export interface Artifact {
  artifact_id: string;
  evidence_id: string;
  filesystem_type: FilesystemType;
  object_id: number | null;
  parent_id: number | null;
  filename: string;
  path: string | null;
  file_type: string;
  size_bytes: number;
  allocated_size: number;
  permissions: number;
  uid: number;
  gid: number;
  link_count: number;
  flags: number;
  status: RecoveryStatus;
  confidence: ConfidenceLevel;
  recovery_method: string;
  source_offset: number;
  recovered_size: number;
  missing_bytes: number;
  fragment_count: number;
  sha256: string | null;
  blake3: string | null;
  mtime: string | null;
  ctime: string | null;
  atime: string | null;
  crtime: string | null;
  deleted_at?: string | null;
  metadata_source: MetadataSource;
  output_path: string | null;
  discovered_at: string;
  validated_at: string | null;
  validation_status: ValidationStatus;
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export type JobStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'CANCELLED' | 'COMPLETED' | 'FAILED';

export interface Job {
  job_id: string;
  case_id: string;
  evidence_id: string | null;
  job_type: string;
  status: JobStatus;
  start_time: string | null;
  end_time: string | null;
  progress_pct: number;
  items_processed: number;
  items_discovered: number;
  error_count: number;
  warning_count: number;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  active_case: Case | null;
  evidence_count: number;
  filesystem_types: Record<string, number>;
  total_objects: number;
  deleted_candidates: number;
  confirmed_recovered: number;
  partial_recovered: number;
  carved: number;
  validation_failures: number;
  running_jobs: Job[];
}

// ─── Create/Update Request Types ────────────────────────────────────────────

export interface CreateCaseRequest {
  case_title: string;
  case_number: string;
  investigator: string;
  organization?: string;
  description?: string;
  priority?: CasePriority;
  notes?: string;
}

export interface UpdateCaseRequest extends Partial<CreateCaseRequest> {
  status?: CaseStatus;
}

export interface CreateInvestigatorRequest {
  name: string;
  role: string;
  organization?: string;
  email?: string;
  operator_id?: string;
  notes?: string;
}

export interface UpdateInvestigatorRequest extends Partial<CreateInvestigatorRequest> {
  status?: InvestigatorStatus;
}

export interface CreateEvidenceRequest {
  case_id: string;
  name: string;
  source_path?: string;
  source_type?: EvidenceSourceType;
  format?: EvidenceFormat | string;
  status?: EvidenceStatus | string;
  description?: string;
  evidence_type?: string;
  notes?: string;
  detected_fs?: string | null;
  hash_sha256?: string | null;
}

export interface UpdateEvidenceRequest extends Partial<CreateEvidenceRequest> {
  analysis_status?: EvidenceAnalysisStatus;
  status?: EvidenceStatus | string;
}

export interface CreateReportRequest {
  case_id: string;
  title: string;
  description?: string;
  summary?: string;
  format?: ReportFormat;
  report_type?: ReportType;
  author?: string;
  classification?: string;
  notes?: string;
}

export interface UpdateReportRequest extends Partial<CreateReportRequest> {
  status?: ReportStatus;
}
