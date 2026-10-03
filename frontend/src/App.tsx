import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import DemoPage from './pages/DemoPage';
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

// Admin Pages
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminCasesPage from './pages/AdminCasesPage';
import AdminInvestigatorsPage from './pages/AdminInvestigatorsPage';
import AdminEvidencePage from './pages/AdminEvidencePage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminAuditPage from './pages/AdminAuditPage';
import AdminSettingsPage from './pages/AdminSettingsPage';

export default function App() {
  return (
    <Routes>
      {/* Landing page — full-screen cinematic experience */}
      <Route path="/" element={<LandingPage />} />

      {/* Demo page — full-screen isolated demo experience, NOT wrapped in Layout */}
      <Route path="/demo" element={<DemoPage />} />

      {/* Application shell routes — wrapped in Layout with dual workspace & admin sidebar */}
      <Route element={<Layout />}>
        {/* Workspace Routes */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/cases/:caseId" element={<CaseDetailPage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/deleted" element={<DeletedFilesPage />} />
        <Route path="/recovered" element={<RecoveredFilesPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/audit" element={<AuditLogPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Administration Routes */}
        <Route path="/admin" element={<AdminOverviewPage />} />
        <Route path="/admin/cases" element={<AdminCasesPage />} />
        <Route path="/admin/cases/:caseId" element={<CaseDetailPage />} />
        <Route path="/admin/investigators" element={<AdminInvestigatorsPage />} />
        <Route path="/admin/evidence" element={<AdminEvidencePage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/audit" element={<AdminAuditPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
