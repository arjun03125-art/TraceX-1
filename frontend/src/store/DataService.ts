/**
 * DataService — localStorage-backed persistence layer for TRACE X.
 * 
 * Single source of truth for all application data.
 * Designed to be replaceable with Tauri IPC / SQLite API in the future.
 */

import type {
  Case, Evidence, Investigator, Report, Artifact, AuditEvent, AuditAction,
  AppSettings, DashboardLayout, DashboardWidget,
  CreateCaseRequest, UpdateCaseRequest,
  CreateInvestigatorRequest, UpdateInvestigatorRequest,
  CreateEvidenceRequest, UpdateEvidenceRequest,
  CreateReportRequest, UpdateReportRequest,
} from '../types/forensic';
import {
  INITIAL_CASES,
  INITIAL_EVIDENCE,
  INITIAL_ARTIFACTS,
  INITIAL_AUDIT,
  INITIAL_INVESTIGATORS,
  INITIAL_REPORTS
} from './forensicStore';

// ─── Storage Keys ───────────────────────────────────────────────────────────

const KEYS = {
  cases: 'tracex_cases',
  investigators: 'tracex_investigators',
  evidence: 'tracex_evidence',
  reports: 'tracex_reports',
  artifacts: 'tracex_artifacts',
  audit: 'tracex_audit',
  settings: 'tracex_settings',
  dashboardLayout: 'tracex_dashboard_layout',
  auditCounter: 'tracex_audit_counter',
} as const;

// ─── ID Generation ──────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}-${ts}-${rand}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ─── Default Settings ───────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  general: {
    applicationName: 'Trace X',
    defaultInvestigator: '',
    defaultOrganization: '',
  },
  engine: {
    workerThreads: 8,
    chunkSize: '4MB',
    exportPath: '/forensic/recovered',
  },
  security: {
    readOnlyEnforced: true,
    execBitNeutralization: true,
  },
  evidence: {
    defaultHashAlgorithm: 'SHA-256',
    autoVerifyOnAdd: false,
  },
  audit: {
    enabled: true,
    retentionDays: 365,
  },
  appearance: {
    theme: 'dark',
    compactMode: false,
  },
};

const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  widgets: [
    { id: 'case_summary', label: 'Case Summary', visible: true, order: 0 },
    { id: 'evidence_summary', label: 'Evidence Summary', visible: true, order: 1 },
    { id: 'recent_activity', label: 'Recent Activity', visible: true, order: 2 },
    { id: 'reports', label: 'Reports', visible: true, order: 3 },
    { id: 'audit', label: 'Audit', visible: true, order: 4 },
    { id: 'system_status', label: 'System Status', visible: true, order: 5 },
    { id: 'timeline', label: 'Timeline', visible: false, order: 6 },
  ],
};

// ─── Generic CRUD Helpers ───────────────────────────────────────────────────

function getAll<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

function getOne<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setOne<T>(key: string, item: T): void {
  localStorage.setItem(key, JSON.stringify(item));
}

// ─── Audit Event Logging ────────────────────────────────────────────────────

function getNextAuditId(): number {
  const current = parseInt(localStorage.getItem(KEYS.auditCounter) || '0', 10);
  const next = current + 1;
  localStorage.setItem(KEYS.auditCounter, next.toString());
  return next;
}

function logAuditEvent(
  action: AuditAction,
  details: Record<string, unknown>,
  refs?: {
    case_id?: string;
    evidence_id?: string;
    artifact_id?: string;
    actor?: string;
    target?: string;
    status?: string;
    description?: string;
    hash_reference?: string;
  }
): AuditEvent {
  const event: AuditEvent = {
    id: getNextAuditId(),
    event_id: generateId('aud'),
    event_time: nowISO(),
    actor: refs?.actor || 'Det. H. Vance',
    action,
    case_id: refs?.case_id || null,
    evidence_id: refs?.evidence_id || null,
    artifact_id: refs?.artifact_id || null,
    target: refs?.target || null,
    status: refs?.status || 'SUCCESS',
    description: refs?.description || null,
    hash_reference: refs?.hash_reference || null,
    tool_version: 'trace-x 0.1.0',
    details: JSON.stringify(details),
  };

  const events = getAll<AuditEvent>(KEYS.audit);
  events.push(event);
  setAll(KEYS.audit, events);
  return event;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export const DataService = {
  // ─── Cases ──────────────────────────────────────────────────────────────

  getCases(): Case[] {
    const stored = getAll<Case>(KEYS.cases);
    if (!stored || stored.length === 0) {
      setAll(KEYS.cases, INITIAL_CASES);
      return INITIAL_CASES;
    }
    const hasRetrieved = stored.some(c => c.case_id === 'case-retrieved-100' || c.case_number === 'CR-2026-RET-01');
    const hasPartial = stored.some(c => c.case_id === 'case-partial-70' || c.case_number === 'CR-2026-REC-70');
    if (!hasRetrieved || !hasPartial) {
      const merged = [...stored];
      if (!hasRetrieved) merged.unshift(INITIAL_CASES[0]);
      if (!hasPartial) merged.splice(1, 0, INITIAL_CASES[1]);
      setAll(KEYS.cases, merged);
      return merged;
    }
    return stored;
  },

  getCase(id: string): Case | undefined {
    return this.getCases().find(c => c.case_id === id);
  },

  createCase(req: CreateCaseRequest): Case {
    const now = nowISO();
    const newCase: Case = {
      case_id: generateId('case'),
      case_number: req.case_number,
      case_title: req.case_title,
      investigator: req.investigator,
      organization: req.organization || null,
      description: req.description || null,
      status: 'ACTIVE',
      priority: req.priority || 'MEDIUM',
      notes: req.notes || null,
      created_at: now,
      updated_at: now,
    };

    const cases = this.getCases();
    cases.push(newCase);
    setAll(KEYS.cases, cases);

    logAuditEvent('CASE_CREATED', {
      case_title: newCase.case_title,
      case_number: newCase.case_number,
    }, { case_id: newCase.case_id });

    return newCase;
  },

  updateCase(id: string, req: UpdateCaseRequest): Case | null {
    const cases = this.getCases();
    const idx = cases.findIndex(c => c.case_id === id);
    if (idx === -1) return null;

    const updated = {
      ...cases[idx],
      ...req,
      organization: req.organization !== undefined ? (req.organization || null) : cases[idx].organization,
      description: req.description !== undefined ? (req.description || null) : cases[idx].description,
      notes: req.notes !== undefined ? (req.notes || null) : cases[idx].notes,
      updated_at: nowISO(),
    };

    cases[idx] = updated;
    setAll(KEYS.cases, cases);

    logAuditEvent('CASE_UPDATED', {
      case_id: id,
      changes: Object.keys(req),
    }, { case_id: id });

    return updated;
  },

  deleteCase(id: string): boolean {
    const cases = this.getCases();
    const target = cases.find(c => c.case_id === id);
    if (!target) return false;

    setAll(KEYS.cases, cases.filter(c => c.case_id !== id));

    logAuditEvent('CASE_DELETED', {
      case_title: target.case_title,
      case_number: target.case_number,
    }, { case_id: id });

    return true;
  },

  archiveCase(id: string): Case | null {
    const result = this.updateCase(id, { status: 'ARCHIVED' });
    if (result) {
      logAuditEvent('CASE_ARCHIVED', { case_id: id }, { case_id: id });
    }
    return result;
  },

  // ─── Investigators ─────────────────────────────────────────────────────

  getInvestigators(): Investigator[] {
    const stored = getAll<Investigator>(KEYS.investigators);
    if (!stored || stored.length === 0) {
      setAll(KEYS.investigators, INITIAL_INVESTIGATORS);
      return INITIAL_INVESTIGATORS;
    }
    return stored;
  },

  getInvestigator(id: string): Investigator | undefined {
    return this.getInvestigators().find(i => i.investigator_id === id);
  },

  createInvestigator(req: CreateInvestigatorRequest): Investigator {
    const now = nowISO();
    const inv: Investigator = {
      investigator_id: generateId('inv'),
      name: req.name,
      role: req.role,
      organization: req.organization || null,
      email: req.email || null,
      operator_id: req.operator_id || null,
      status: 'ACTIVE',
      notes: req.notes || null,
      created_at: now,
      updated_at: now,
    };

    const list = this.getInvestigators();
    list.push(inv);
    setAll(KEYS.investigators, list);

    logAuditEvent('INVESTIGATOR_CREATED', {
      name: inv.name,
      role: inv.role,
    });

    return inv;
  },

  updateInvestigator(id: string, req: UpdateInvestigatorRequest): Investigator | null {
    const list = this.getInvestigators();
    const idx = list.findIndex(i => i.investigator_id === id);
    if (idx === -1) return null;

    const updated = {
      ...list[idx],
      ...req,
      organization: req.organization !== undefined ? (req.organization || null) : list[idx].organization,
      email: req.email !== undefined ? (req.email || null) : list[idx].email,
      operator_id: req.operator_id !== undefined ? (req.operator_id || null) : list[idx].operator_id,
      notes: req.notes !== undefined ? (req.notes || null) : list[idx].notes,
      updated_at: nowISO(),
    };

    list[idx] = updated;
    setAll(KEYS.investigators, list);

    logAuditEvent('INVESTIGATOR_UPDATED', {
      investigator_id: id,
      changes: Object.keys(req),
    });

    return updated;
  },

  deleteInvestigator(id: string): boolean {
    const list = this.getInvestigators();
    const target = list.find(i => i.investigator_id === id);
    if (!target) return false;

    setAll(KEYS.investigators, list.filter(i => i.investigator_id !== id));

    logAuditEvent('INVESTIGATOR_DELETED', {
      name: target.name,
    });

    return true;
  },

  // ─── Evidence ──────────────────────────────────────────────────────────

  getEvidence(): Evidence[] {
    const stored = getAll<Evidence>(KEYS.evidence);
    if (!stored || stored.length === 0) {
      setAll(KEYS.evidence, INITIAL_EVIDENCE);
      return INITIAL_EVIDENCE;
    }
    const hasXfsDemo = stored.some(e => e.name === 'DEMO_FORENSIC_IMAGE_XFS.E01');
    const hasBtrfsDemo = stored.some(e => e.name === 'DEMO_FORENSIC_IMAGE_BTRFS.E01');
    if (!hasXfsDemo || !hasBtrfsDemo) {
      setAll(KEYS.evidence, INITIAL_EVIDENCE);
      return INITIAL_EVIDENCE;
    }
    return stored;
  },

  getEvidenceItem(id: string): Evidence | undefined {
    return this.getEvidence().find(e => e.evidence_id === id);
  },

  getEvidenceByCase(caseId: string): Evidence[] {
    return this.getEvidence().filter(e => e.case_id === caseId);
  },

  createEvidence(req: CreateEvidenceRequest): Evidence {
    const now = nowISO();
    const ev: Evidence = {
      evidence_id: generateId('ev'),
      case_id: req.case_id,
      name: req.name,
      source_path: req.source_path || '',
      source_type: req.source_type || 'RAW_IMAGE',
      size_bytes: null,
      filesystem_type: null,
      filesystem_uuid: null,
      volume_label: null,
      acquisition_hash: null,
      hash_algorithm: null,
      added_at: now,
      added_by: null,
      description: req.description || null,
      analysis_status: 'PENDING',
      format: req.format || 'RAW',
      status: req.status || 'READY',
      detected_fs: req.detected_fs || null,
      hash_sha256: req.hash_sha256 || null,
      read_only_verified: false,
      notes: req.notes || null,
    };

    const list = this.getEvidence();
    list.push(ev);
    setAll(KEYS.evidence, list);

    logAuditEvent('EVIDENCE_ADDED', {
      name: ev.name,
      source_type: ev.source_type,
    }, { case_id: req.case_id, evidence_id: ev.evidence_id });

    return ev;
  },

  updateEvidence(id: string, req: UpdateEvidenceRequest): Evidence | null {
    const list = this.getEvidence();
    const idx = list.findIndex(e => e.evidence_id === id);
    if (idx === -1) return null;

    const updated = {
      ...list[idx],
      ...req,
      description: req.description !== undefined ? (req.description || null) : list[idx].description,
      notes: req.notes !== undefined ? (req.notes || null) : list[idx].notes,
    };

    list[idx] = updated;
    setAll(KEYS.evidence, list);

    logAuditEvent('EVIDENCE_UPDATED', {
      evidence_id: id,
      changes: Object.keys(req),
    }, { evidence_id: id, case_id: updated.case_id });

    return updated;
  },

  deleteEvidence(id: string): boolean {
    const list = this.getEvidence();
    const target = list.find(e => e.evidence_id === id);
    if (!target) return false;

    setAll(KEYS.evidence, list.filter(e => e.evidence_id !== id));

    logAuditEvent('EVIDENCE_DELETED', {
      name: target.name,
    }, { evidence_id: id, case_id: target.case_id });

    return true;
  },

  // ─── Reports ──────────────────────────────────────────────────────────

  getReports(): Report[] {
    const stored = getAll<Report>(KEYS.reports);
    if (!stored || stored.length === 0) {
      setAll(KEYS.reports, INITIAL_REPORTS);
      return INITIAL_REPORTS;
    }
    const hasInitial = stored.some(r => r.report_id === 'rep-ret-001');
    if (!hasInitial) {
      const merged = [...INITIAL_REPORTS, ...stored];
      setAll(KEYS.reports, merged);
      return merged;
    }
    return stored;
  },

  getReport(id: string): Report | undefined {
    return this.getReports().find(r => r.report_id === id);
  },

  getReportsByCase(caseId: string): Report[] {
    return this.getReports().filter(r => r.case_id === caseId);
  },

  createReport(req: CreateReportRequest & Partial<Report>): Report {
    const now = nowISO();
    const report: Report = {
      report_id: req.report_id || generateId('rpt'),
      case_id: req.case_id,
      title: req.title,
      description: req.description || null,
      summary: req.summary || null,
      report_type: req.report_type || 'COMPREHENSIVE',
      author: req.author || 'Det. H. Vance (Lead Forensic Analyst)',
      classification: req.classification || 'CONFIDENTIAL / COURT-ADMISSIBLE',
      format: req.format || 'HTML',
      status: req.status || 'FINAL',
      created_at: now,
      updated_at: now,
      created_by: req.created_by || 'Det. H. Vance',
      notes: req.notes || null,
      evidence_id: req.evidence_id || 'ev-ret-001',
      evidence_source: req.evidence_source || 'DEMO_FORENSIC_IMAGE_XFS.E01',
      filesystem: req.filesystem || 'XFS',
      hash_sha256: req.hash_sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      total_artifacts: req.total_artifacts ?? 3,
      recovered_artifacts: req.recovered_artifacts ?? 3,
      partial_artifacts: req.partial_artifacts ?? 0,
      validation_result: req.validation_result || 'INTEGRITY VERIFIED — 100% MATCH',
      recovered_files: req.recovered_files || [],
    };

    const list = this.getReports();
    list.unshift(report);
    setAll(KEYS.reports, list);

    logAuditEvent('REPORT_GENERATED', {
      title: report.title,
      evidence_source: report.evidence_source,
      validation_result: report.validation_result,
    }, {
      case_id: req.case_id,
      evidence_id: report.evidence_id,
      target: report.title,
      status: 'FINAL',
      description: `Report generated: ${report.title} (${report.evidence_source})`,
      hash_reference: report.hash_sha256 || undefined,
    });

    return report;
  },

  updateReport(id: string, req: UpdateReportRequest): Report | null {
    const list = this.getReports();
    const idx = list.findIndex(r => r.report_id === id);
    if (idx === -1) return null;

    const updated = {
      ...list[idx],
      ...req,
      description: req.description !== undefined ? (req.description || null) : list[idx].description,
      notes: req.notes !== undefined ? (req.notes || null) : list[idx].notes,
      updated_at: nowISO(),
    };

    list[idx] = updated;
    setAll(KEYS.reports, list);

    logAuditEvent('REPORT_UPDATED', {
      report_id: id,
      changes: Object.keys(req),
    });

    return updated;
  },

  deleteReport(id: string): boolean {
    const list = this.getReports();
    const target = list.find(r => r.report_id === id);
    if (!target) return false;

    setAll(KEYS.reports, list.filter(r => r.report_id !== id));

    logAuditEvent('REPORT_DELETED', {
      title: target.title,
    });

    return true;
  },

  // ─── Audit Events ──────────────────────────────────────────────────────

  getAuditEvents(): AuditEvent[] {
    const stored = getAll<AuditEvent>(KEYS.audit);
    if (!stored || stored.length === 0) {
      setAll(KEYS.audit, INITIAL_AUDIT);
      return INITIAL_AUDIT;
    }
    const hasInitialWorkflow = stored.some(e => e.action === 'REPORT_GENERATED');
    if (!hasInitialWorkflow) {
      const merged = [...INITIAL_AUDIT, ...stored.filter(s => !INITIAL_AUDIT.some(ia => ia.event_id === s.event_id))];
      setAll(KEYS.audit, merged);
      return merged;
    }
    return stored;
  },

  getAuditEventsByCase(caseId: string): AuditEvent[] {
    return this.getAuditEvents().filter(e => e.case_id === caseId);
  },

  logEvent(
    action: AuditAction,
    description: string,
    opts?: {
      case_id?: string;
      evidence_id?: string;
      artifact_id?: string;
      actor?: string;
      target?: string;
      status?: string;
      hash_reference?: string;
      details?: Record<string, unknown>;
    }
  ): AuditEvent {
    return logAuditEvent(action, opts?.details || { description }, {
      case_id: opts?.case_id,
      evidence_id: opts?.evidence_id,
      artifact_id: opts?.artifact_id,
      actor: opts?.actor,
      target: opts?.target,
      status: opts?.status,
      description,
      hash_reference: opts?.hash_reference,
    });
  },

  // ─── Artifacts (Recovered Files) ─────────────────────────────────────────

  getArtifacts(): Artifact[] {
    const stored = getAll<Artifact>(KEYS.artifacts);
    if (!stored || stored.length === 0) {
      setAll(KEYS.artifacts, INITIAL_ARTIFACTS);
      return INITIAL_ARTIFACTS;
    }
    const hasServerLog = stored.some(a => a.filename === 'server.log');
    if (!hasServerLog) {
      setAll(KEYS.artifacts, INITIAL_ARTIFACTS);
      return INITIAL_ARTIFACTS;
    }
    return stored;
  },

  getArtifact(id: string): Artifact | undefined {
    return this.getArtifacts().find(a => a.artifact_id === id);
  },

  createArtifact(artifact: Artifact): Artifact {
    const list = this.getArtifacts();
    list.unshift(artifact);
    setAll(KEYS.artifacts, list);

    logAuditEvent('RECOVERY_COMPLETED', {
      filename: artifact.filename,
      size_bytes: artifact.size_bytes,
      recovery_method: artifact.recovery_method,
      sha256: artifact.sha256,
    }, {
      evidence_id: artifact.evidence_id,
      artifact_id: artifact.artifact_id,
      target: artifact.filename,
      status: artifact.validation_status === 'VALID' ? 'SUCCESS' : 'PARTIAL',
      description: `Artifact recovered: ${artifact.filename} (${artifact.file_type})`,
      hash_reference: artifact.sha256 || undefined,
    });

    return artifact;
  },

  deleteArtifact(id: string): boolean {
    const list = this.getArtifacts();
    const target = list.find(a => a.artifact_id === id);
    if (!target) return false;

    setAll(KEYS.artifacts, list.filter(a => a.artifact_id !== id));
    return true;
  },

  // ─── Settings ──────────────────────────────────────────────────────────

  getSettings(): AppSettings {
    const stored = getOne<AppSettings>(KEYS.settings);
    return stored || { ...DEFAULT_SETTINGS };
  },

  updateSettings(settings: AppSettings): AppSettings {
    setOne(KEYS.settings, settings);

    logAuditEvent('SETTINGS_UPDATED', {
      sections: Object.keys(settings),
    });

    return settings;
  },

  // ─── Dashboard Layout ─────────────────────────────────────────────────

  getDashboardLayout(): DashboardLayout {
    const stored = getOne<DashboardLayout>(KEYS.dashboardLayout);
    return stored || { ...DEFAULT_DASHBOARD_LAYOUT };
  },

  updateDashboardLayout(layout: DashboardLayout): DashboardLayout {
    setOne(KEYS.dashboardLayout, layout);

    logAuditEvent('DASHBOARD_LAYOUT_UPDATED', {
      visible_widgets: layout.widgets.filter(w => w.visible).map(w => w.id),
    });

    return layout;
  },

  resetDashboardLayout(): DashboardLayout {
    const layout = { ...DEFAULT_DASHBOARD_LAYOUT };
    setOne(KEYS.dashboardLayout, layout);
    return layout;
  },

  // ─── Stats ─────────────────────────────────────────────────────────────

  getStats() {
    const cases = this.getCases();
    const evidence = this.getEvidence();
    const investigators = this.getInvestigators();
    const reports = this.getReports();
    const auditEvents = this.getAuditEvents();

    return {
      totalCases: cases.length,
      activeCases: cases.filter(c => c.status === 'ACTIVE').length,
      totalEvidence: evidence.length,
      totalInvestigators: investigators.length,
      activeInvestigators: investigators.filter(i => i.status === 'ACTIVE').length,
      totalReports: reports.length,
      totalAuditEvents: auditEvents.length,
      recentCases: cases.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
      recentEvidence: evidence.sort((a, b) => b.added_at.localeCompare(a.added_at)).slice(0, 5),
      recentAudit: auditEvents.sort((a, b) => b.event_time.localeCompare(a.event_time)).slice(0, 10),
    };
  },

  // ─── Clear All Data (for testing) ─────────────────────────────────────

  clearAll(): void {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  },
};

export default DataService;
