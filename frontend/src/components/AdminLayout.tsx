import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Clock, Search, Plus, Shield, ArrowLeft,
  Users, HardDrive, FileText, CheckCircle2, LogOut
} from 'lucide-react';
import CommandPalette from './CommandPalette';
import AdminSidebar from './AdminSidebar';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cases } = useApp();
  const { adminLogout } = useAuth();

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

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login', { replace: true });
  };

  const getSubpageTitle = () => {
    const path = location.pathname;
    if (path === '/admin' || path === '/admin/overview') return 'System Overview';
    if (path === '/admin/cases') return 'Case Administration';
    if (path.startsWith('/admin/cases/')) return 'Case Dossier & Evidence';
    if (path === '/admin/investigators') return 'Investigators';
    if (path === '/admin/evidence') return 'Evidence Administration';
    if (path === '/admin/reports') return 'Report Oversight';
    if (path === '/admin/audit') return 'Audit Administration';
    if (path === '/admin/engine') return 'Forensic Engine';
    if (path === '/admin/security') return 'Security Policies';
    if (path === '/admin/settings') return 'System Settings';
    return 'Administrator';
  };

  return (
    <div className="flex h-screen bg-[#050811] text-slate-100 overflow-hidden font-sans select-none">
      {/* Universal Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Dedicated Admin Sidebar */}
      <AdminSidebar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#060a14]">
        {/* Top Global Admin Command Bar */}
        <header className="h-14 flex-shrink-0 bg-[#080d1a]/90 backdrop-blur-md border-b border-[#151f33] px-4 sm:px-6 flex items-center justify-between gap-3 z-10 min-w-0">
          {/* Breadcrumbs & Case Scope */}
          <div className="flex items-center gap-2.5 min-w-0 flex-shrink">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800/40 text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider flex-shrink-0">
              <Shield className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>ADMINISTRATOR</span>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-500 flex-shrink-0">
              <span className="text-slate-700">/</span>
              <span className="text-cyan-300 font-semibold">{getSubpageTitle()}</span>
            </div>

            {activeCase && (
              <div className="hidden xl:flex items-center gap-2 px-2 py-0.5 rounded bg-[#0e1629] border border-[#1d2a45] text-[11px] font-mono text-slate-400 flex-shrink-0">
                <span className="text-slate-500">Scope:</span>
                <span className="text-cyan-300 font-semibold">{activeCase.case_number}</span>
              </div>
            )}
          </div>

          {/* Center Search Input Trigger */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0a101f] border border-[#1a253c] hover:border-cyan-500/40 text-slate-400 hover:text-slate-200 transition-all text-xs font-mono w-48 xl:w-64 justify-between group shadow-inner flex-shrink min-w-0"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="truncate text-slate-400">Search cases...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#131d33] border border-[#213052] text-[9px] text-cyan-400/80 flex-shrink-0">
              Ctrl+K
            </kbd>
          </button>

          {/* Right Status & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* UTC Clock */}
            <div className="px-2.5 py-1 rounded bg-[#0a101f] border border-[#1b2742] text-[11px] font-mono text-slate-400 flex items-center gap-1.5 shadow-inner whitespace-nowrap flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="tabular-nums font-mono text-slate-300">{utcTime || 'UTC'}</span>
            </div>

            {/* Quick Actions */}
            <button
              onClick={() => navigate('/admin/cases')}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-mono transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden md:inline">Case</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Logout from Administrator Session"
              className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 border border-rose-700/40 text-rose-300 hover:text-rose-200 text-xs font-mono flex items-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-[#060a14] relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
