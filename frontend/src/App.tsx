import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import DemoPage from './pages/DemoPage';

// Investigator Workspace Pages
import DashboardPage from './pages/DashboardPage';
import CasesPage from './pages/CasesPage';
import CaseDetailPage from './pages/CaseDetailPage';
import EvidencePage from './pages/EvidencePage';
import DeletedFilesPage from './pages/DeletedFilesPage';
import RecoveredFilesPage from './pages/RecoveredFilesPage';
import TimelinePage from './pages/TimelinePage';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';

// Administrator Portal Pages
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminCasesPage from './pages/AdminCasesPage';
import AdminInvestigatorsPage from './pages/AdminInvestigatorsPage';
import AdminEvidencePage from './pages/AdminEvidencePage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminAuditPage from './pages/AdminAuditPage';
import AdminEnginePage from './pages/AdminEnginePage';
import AdminSecurityPage from './pages/AdminSecurityPage';
import AdminSettingsPage from './pages/AdminSettingsPage';

export default function App() {
  return (
    <Routes>
      {/* Landing page & Guided Demo */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<DemoPage />} />

      {/* ─────────────────────────────────────────────────────────────
          INVESTIGATOR WORKSPACE ROUTES
          Normal investigator workspace (Administration section excluded)
          ───────────────────────────────────────────────────────────── */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/cases/:caseId" element={<CaseDetailPage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/deleted-files" element={<DeletedFilesPage />} />
        <Route path="/deleted" element={<Navigate to="/deleted-files" replace />} />
        <Route path="/recovered-files" element={<RecoveredFilesPage />} />
        <Route path="/recovered" element={<Navigate to="/recovered-files" replace />} />
        <Route path="/chronology" element={<TimelinePage />} />
        <Route path="/timeline" element={<Navigate to="/chronology" replace />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/audit" element={<AuditLogPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* ─────────────────────────────────────────────────────────────
          ADMINISTRATOR PORTAL ROUTES
          Dedicated AdminLayout with route-level role protection
          ───────────────────────────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="ADMINISTRATOR">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="cases" element={<AdminCasesPage />} />
        <Route path="cases/:caseId" element={<CaseDetailPage />} />
        <Route path="investigators" element={<AdminInvestigatorsPage />} />
        <Route path="evidence" element={<AdminEvidencePage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="audit" element={<AdminAuditPage />} />
        <Route path="engine" element={<AdminEnginePage />} />
        <Route path="security" element={<AdminSecurityPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
