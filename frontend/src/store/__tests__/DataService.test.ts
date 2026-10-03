import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import DataService from '../DataService';

// Polyfill localStorage for node test runner
const storage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, val: string) => { storage[key] = val; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
};

beforeAll(() => {
  // @ts-expect-error Mocking global localStorage
  globalThis.localStorage = mockLocalStorage;
});

describe('DataService Foundation & Real Persistence', () => {
  beforeEach(() => {
    DataService.clearAll();
  });

  it('starts with zero cases, zero evidence, and zero audit events', () => {
    const stats = DataService.getStats();
    expect(stats.totalCases).toBe(0);
    expect(stats.totalEvidence).toBe(0);
    expect(stats.totalInvestigators).toBe(0);
    expect(stats.totalReports).toBe(0);
    expect(stats.totalAuditEvents).toBe(0);
    expect(stats.recentCases).toEqual([]);
    expect(stats.recentEvidence).toEqual([]);
    expect(stats.recentAudit).toEqual([]);
  });

  it('creates and persists a case with real audit logging', () => {
    const newCase = DataService.createCase({
      case_number: 'CR-2026-TEST',
      case_title: 'Breach Investigation Test',
      investigator: 'Examiner Jane Doe',
      organization: 'Cyber Defense Unit',
      priority: 'HIGH',
      description: 'Test case for verification',
    });

    expect(newCase.case_id).toBeDefined();
    expect(newCase.case_number).toBe('CR-2026-TEST');
    expect(newCase.status).toBe('ACTIVE');

    // Verify persistence
    const cases = DataService.getCases();
    expect(cases.length).toBe(1);
    expect(cases[0].case_title).toBe('Breach Investigation Test');

    // Verify audit event was recorded only for real action
    const audit = DataService.getAuditEvents();
    expect(audit.length).toBe(1);
    expect(audit[0].action).toBe('CASE_CREATED');
    expect(audit[0].case_id).toBe(newCase.case_id);

    // Verify stats
    const stats = DataService.getStats();
    expect(stats.totalCases).toBe(1);
    expect(stats.activeCases).toBe(1);
  });

  it('updates a case and logs CASE_UPDATED', () => {
    const newCase = DataService.createCase({
      case_number: 'CR-2026-002',
      case_title: 'Initial Title',
      investigator: 'Examiner Doe',
    });

    const updated = DataService.updateCase(newCase.case_id, {
      case_title: 'Updated Title',
      priority: 'CRITICAL',
    });

    expect(updated).not.toBeNull();
    expect(updated?.case_title).toBe('Updated Title');
    expect(updated?.priority).toBe('CRITICAL');

    const audit = DataService.getAuditEvents();
    expect(audit.some(a => a.action === 'CASE_UPDATED')).toBe(true);
  });

  it('archives a case and logs CASE_ARCHIVED', () => {
    const newCase = DataService.createCase({
      case_number: 'CR-2026-003',
      case_title: 'To Archive',
      investigator: 'Examiner Doe',
    });

    const archived = DataService.archiveCase(newCase.case_id);
    expect(archived?.status).toBe('ARCHIVED');

    const audit = DataService.getAuditEvents();
    expect(audit.some(a => a.action === 'CASE_ARCHIVED')).toBe(true);
  });

  it('deletes a case and logs CASE_DELETED', () => {
    const newCase = DataService.createCase({
      case_number: 'CR-2026-004',
      case_title: 'To Delete',
      investigator: 'Examiner Doe',
    });

    const success = DataService.deleteCase(newCase.case_id);
    expect(success).toBe(true);
    expect(DataService.getCases().length).toBe(0);

    const audit = DataService.getAuditEvents();
    expect(audit.some(a => a.action === 'CASE_DELETED')).toBe(true);
  });

  it('creates an investigator with real fields and no fake defaults', () => {
    const inv = DataService.createInvestigator({
      name: 'Agent Morgan',
      role: 'Forensic Analyst',
      organization: 'Digital Forensics Unit',
      email: 'morgan@dfir.org',
      operator_id: 'OP-449',
    });

    expect(inv.investigator_id).toBeDefined();
    expect(inv.name).toBe('Agent Morgan');
    expect(DataService.getInvestigators().length).toBe(1);

    const audit = DataService.getAuditEvents();
    expect(audit.some(a => a.action === 'INVESTIGATOR_CREATED')).toBe(true);
  });

  it('attaches evidence with pending analysis state', () => {
    const newCase = DataService.createCase({
      case_number: 'CR-2026-005',
      case_title: 'Evidence Test',
      investigator: 'Examiner Doe',
    });

    const ev = DataService.createEvidence({
      case_id: newCase.case_id,
      name: 'disk_sda1.raw',
      source_path: '/mnt/evidence/disk_sda1.raw',
      format: 'RAW',
    });

    expect(ev.evidence_id).toBeDefined();
    expect(ev.analysis_status).toBe('PENDING');
    expect(ev.filesystem_type).toBeNull();
    expect(ev.acquisition_hash).toBeNull();

    const audit = DataService.getAuditEvents();
    expect(audit.some(a => a.action === 'EVIDENCE_ADDED')).toBe(true);
  });

  it('customizes and persists dashboard layout', () => {
    const layout = DataService.getDashboardLayout();
    expect(layout.widgets.length).toBeGreaterThan(0);

    const modified = {
      widgets: layout.widgets.map(w => w.id === 'timeline' ? { ...w, visible: true } : w),
    };
    DataService.updateDashboardLayout(modified);

    const persisted = DataService.getDashboardLayout();
    expect(persisted.widgets.find(w => w.id === 'timeline')?.visible).toBe(true);

    const audit = DataService.getAuditEvents();
    expect(audit.some(a => a.action === 'DASHBOARD_LAYOUT_UPDATED')).toBe(true);
  });
});
