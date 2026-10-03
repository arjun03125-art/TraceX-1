import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Clock, Search, Plus, Shield, ArrowLeft,
  Users, KeyRound, HardDrive, FileText, CheckCircle2
} from 'lucide-react';
import CommandPalette from './CommandPalette';
import AdminSidebar from './AdminSidebar';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cases } = useApp();
  const { currentUser, switchRole } = useAuth();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [utcTime, setUtcTime] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Keep selectedCaseId synced
  useEffect(() => {
    if (cases.length > 0 && (!selectedCaseId || !cases.some(c => c.case_id === selectedCaseId))) {
      setSelectedCaseId(cases[0].case_id);
    } else if (cases.length === 0) {
      setSelectedCaseId('');
    }
  }, [cases, selectedCaseId]);

  const activeCase = cases.find(c => c.case_id === selectedCaseId);

  // UTC clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getSubpageTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return 'System Overview';
    if (path === '/admin/cases') return 'Case Management';
    if (path.startsWith('/admin/cases/')) return 'Case Dossier & Evidence';
    if (path === '/admin/investigators') return 'Investigator Management';
    if (path === '/admin/evidence') return 'Evidence Management';
    if (path === '/admin/reports') return 'Report Management';
    if (path === '/admin/audit') return 'Cryptographic Audit Trail';
    if (path === '/admin/engine') return 'Filesystem & Recovery Engine';
    if (path === '/admin/security') return 'Security & Write-Block Policies';
    if (path === '/admin/settings') return 'System Settings & Config';
    return 'Admin Module';
  };

  return (
    <div className="flex h-screen bg-[#050713] text-slate-100 overflow-hidden font-sans select-none">
      {/* Universal Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Dedicated Admin Sidebar */}
      <AdminSidebar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#060817]">
        {/* Top Global Admin Command Bar */}
        <header className="h-14 flex-shrink-0 bg-[#090b1f]/95 backdrop-blur-md border-b border-[#1c1f3d] px-6 flex items-center justify-between z-10">
          {/* Breadcrumbs & Case Scope */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-950/60 border border-purple-800/40 text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>ADMIN PORTAL</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-500">
              <span className="text-slate-700">/</span>
              <span className="text-purple-300 font-semibold">{getSubpageTitle()}</span>
            </div>

            {activeCase && (
              <div className="hidden xl:flex items-center gap-2 px-2 py-0.5 rounded bg-[#10142e] border border-[#202752] text-[11px] font-mono text-slate-400">
                <span className="text-slate-500">Scope:</span>
                <span className="text-cyan-300 font-semibold">{activeCase.case_number}</span>
              </div>
            )}
          </div>

          {/* Center Search Input Trigger */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0d1026] border border-[#21274f] hover:border-purple-500/40 text-slate-400 hover:text-slate-200 transition-all text-xs font-mono w-72 justify-between group shadow-inner"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="truncate text-slate-400">Search cases, configs, logs...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#161c3d] border border-[#2d3568] text-[9px] text-purple-400">
              Ctrl+K
            </kbd>
          </button>

          {/* Right Status & Role Indicators */}
          <div className="flex items-center gap-3">
            {/* UTC Clock */}
            <div className="px-2.5 py-1 rounded bg-[#0d1026] border border-[#21274f] text-[11px] font-mono text-slate-400 flex items-center gap-1.5 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span className="tabular-nums font-mono text-slate-300">{utcTime || 'UTC'}</span>
            </div>

            {/* Quick Actions */}
            <button
              onClick={() => navigate('/admin/cases')}
              className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs font-mono transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden md:inline">Case</span>
            </button>

            {/* Switch to Investigator Role for quick testing */}
            <button
              onClick={switchRole}
              title="Toggle role for testing"
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-all"
            >
              <KeyRound className="w-3 h-3" />
              <span className="hidden md:inline">Role: {currentUser.role}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-[#060817] relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
