/**
 * AppContext — React Context providing app-wide state backed by DataService.
 * 
 * Components read from this context instead of hardcoded mock data.
 * All mutations go through DataService and trigger re-renders.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import DataService from './DataService';
import type {
  Case, Evidence, Investigator, Report, AuditEvent,
  AppSettings, DashboardLayout,
  CreateCaseRequest, UpdateCaseRequest,
  CreateInvestigatorRequest, UpdateInvestigatorRequest,
  CreateEvidenceRequest, UpdateEvidenceRequest,
  CreateReportRequest, UpdateReportRequest,
} from '../types/forensic';

// ─── Context Shape ──────────────────────────────────────────────────────────

interface AppState {
  cases: Case[];
  investigators: Investigator[];
  evidence: Evidence[];
  reports: Report[];
  auditEvents: AuditEvent[];
  settings: AppSettings;
  dashboardLayout: DashboardLayout;
  stats: ReturnType<typeof DataService.getStats>;
}

interface AppActions {
  // Cases
  createCase(req: CreateCaseRequest): Case;
  updateCase(id: string, req: UpdateCaseRequest): Case | null;
  deleteCase(id: string): boolean;
  archiveCase(id: string): Case | null;

  // Investigators
  createInvestigator(req: CreateInvestigatorRequest): Investigator;
  updateInvestigator(id: string, req: UpdateInvestigatorRequest): Investigator | null;
  deleteInvestigator(id: string): boolean;

  // Evidence
  createEvidence(req: CreateEvidenceRequest): Evidence;
  updateEvidence(id: string, req: UpdateEvidenceRequest): Evidence | null;
  deleteEvidence(id: string): boolean;

  // Reports
  createReport(req: CreateReportRequest): Report;
  updateReport(id: string, req: UpdateReportRequest): Report | null;
  deleteReport(id: string): boolean;

  // Settings
  updateSettings(settings: AppSettings): AppSettings;

  // Dashboard Layout
  updateDashboardLayout(layout: DashboardLayout): DashboardLayout;
  resetDashboardLayout(): DashboardLayout;

  // Refresh
  refreshAll(): void;
}

type AppContextType = AppState & AppActions;

const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  // version counter to trigger re-reads from DataService
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion(v => v + 1);
  }, []);

  // Read state from DataService on every version change
  const state = useMemo((): AppState => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    version; // dependency tracking
    return {
      cases: DataService.getCases(),
      investigators: DataService.getInvestigators(),
      evidence: DataService.getEvidence(),
      reports: DataService.getReports(),
      auditEvents: DataService.getAuditEvents(),
      settings: DataService.getSettings(),
      dashboardLayout: DataService.getDashboardLayout(),
      stats: DataService.getStats(),
    };
  }, [version]);

  // Actions that mutate and refresh
  const actions = useMemo((): AppActions => ({
    createCase(req) {
      const result = DataService.createCase(req);
      refresh();
      return result;
    },
    updateCase(id, req) {
      const result = DataService.updateCase(id, req);
      refresh();
      return result;
    },
    deleteCase(id) {
      const result = DataService.deleteCase(id);
      refresh();
      return result;
    },
    archiveCase(id) {
      const result = DataService.archiveCase(id);
      refresh();
      return result;
    },
    createInvestigator(req) {
      const result = DataService.createInvestigator(req);
      refresh();
      return result;
    },
    updateInvestigator(id, req) {
      const result = DataService.updateInvestigator(id, req);
      refresh();
      return result;
    },
    deleteInvestigator(id) {
      const result = DataService.deleteInvestigator(id);
      refresh();
      return result;
    },
    createEvidence(req) {
      const result = DataService.createEvidence(req);
      refresh();
      return result;
    },
    updateEvidence(id, req) {
      const result = DataService.updateEvidence(id, req);
      refresh();
      return result;
    },
    deleteEvidence(id) {
      const result = DataService.deleteEvidence(id);
      refresh();
      return result;
    },
    createReport(req) {
      const result = DataService.createReport(req);
      refresh();
      return result;
    },
    updateReport(id, req) {
      const result = DataService.updateReport(id, req);
      refresh();
      return result;
    },
    deleteReport(id) {
      const result = DataService.deleteReport(id);
      refresh();
      return result;
    },
    updateSettings(settings) {
      const result = DataService.updateSettings(settings);
      refresh();
      return result;
    },
    updateDashboardLayout(layout) {
      const result = DataService.updateDashboardLayout(layout);
      refresh();
      return result;
    },
    resetDashboardLayout() {
      const result = DataService.resetDashboardLayout();
      refresh();
      return result;
    },
    refreshAll: refresh,
  }), [refresh]);

  const contextValue = useMemo(() => ({
    ...state,
    ...actions,
  }), [state, actions]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}

export default AppContext;
