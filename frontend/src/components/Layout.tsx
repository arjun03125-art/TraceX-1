import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, HardDrive, FileX2,
  FileCheck2, Clock, FileText, ScrollText, Settings,
  Shield, AlertTriangle, Terminal, ArrowLeft, Search,
  CheckCircle2, Cpu, Activity, Database, ChevronDown,
  Layers, Lock, Users, Plus
} from 'lucide-react';
import clsx from 'clsx';
import CommandPalette from './CommandPalette';
import { useApp } from '../store/AppContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cases, evidence, reports, auditEvents, investigators } = useApp();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [utcTime, setUtcTime] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Keep selectedCaseId synced with available cases
  useEffect(() => {
    if (cases.length > 0 && (!selectedCaseId || !cases.some(c => c.case_id === selectedCaseId))) {
      setSelectedCaseId(cases[0].case_id);
    } else if (cases.length === 0) {
      setSelectedCaseId('');
    }
  }, [cases, selectedCaseId]);

  const activeCase = cases.find(c => c.case_id === selectedCaseId);

  // Real-time UTC investigation clock
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

  // Keyboard shortcut for command palette (Ctrl+K or Cmd+K)
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

  const WORKSPACE_NAV = [
    { path: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
    { path: '/cases', label: 'Cases', icon: FolderOpen, count: cases.length },
    { path: '/evidence', label: 'Evidence', icon: HardDrive, count: evidence.length },
    { path: '/deleted', label: 'Deleted Files', icon: FileX2 },
    { path: '/recovered', label: 'Recovered Files', icon: FileCheck2 },
    { path: '/timeline', label: 'Chronology', icon: Clock },
    { path: '/reports', label: 'Reports', icon: FileText, count: reports.length },
  ];

  const ADMIN_NAV = [
    { path: '/admin', label: 'Overview', icon: LayoutDashboard },
    { path: '/admin/cases', label: 'Cases', icon: FolderOpen, count: cases.length },
    { path: '/admin/investigators', label: 'Investigators', icon: Users, count: investigators.length },
    { path: '/admin/evidence', label: 'Evidence', icon: HardDrive, count: evidence.length },
    { path: '/admin/reports', label: 'Reports', icon: FileText, count: reports.length },
    { path: '/admin/audit', label: 'Audit', icon: ScrollText, count: auditEvents.length },
    { path: '/admin/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#050811] text-slate-100 overflow-hidden font-sans select-none">
      {/* Universal Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Sidebar Command Rail */}
      <aside className="w-64 flex-shrink-0 bg-[#070b16] border-r border-[#151f33] flex flex-col relative z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
        {/* Brand Header */}
        <div className="p-4 border-b border-[#151f33] bg-[#090e1c]/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                  <Shield className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">TRACE X</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300">
                    CORE
                  </span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono tracking-tight flex items-center gap-1">
                  <span>FORENSIC RECOVERY</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">v0.1.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Write-Block & Security Ribbon */}
        <div className="mx-3 mt-3 px-3 py-2 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-emerald-950/20 border border-emerald-500/30 rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.08)]">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-emerald-400 font-mono font-semibold tracking-wider">
                O_RDONLY LOCKED
              </div>
              <div className="text-[8px] text-slate-500 font-mono">WRITE-BLOCK HARDWARE ACTIVE</div>
            </div>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        {/* Quick Command Palette Button */}
        <div className="px-3 mt-3">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#0d1424] hover:bg-[#121c33] border border-[#1b2742] text-slate-400 hover:text-slate-200 transition-all text-xs font-mono group"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] text-slate-400">Quick Palette...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#17223b] border border-[#233355] text-[9px] text-cyan-400/80">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Scrollable Nav Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-4 pt-3">
          {/* Section 1: Forensic Workspace */}
          <div>
            <div className="px-2 pb-1.5">
              <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                Forensic Workspace
              </span>
            </div>
            <nav className="space-y-0.5">
              {WORKSPACE_NAV.map(({ path, label, icon: Icon, count }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/dashboard'}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer group',
                      isActive
                        ? 'bg-gradient-to-r from-cyan-950/60 to-blue-950/40 text-cyan-300 border-l-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.12)]'
                        : 'text-slate-400 hover:bg-[#0d1424] hover:text-slate-200'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={clsx(
                            'w-3.5 h-3.5 flex-shrink-0 transition-colors',
                            isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                          )}
                        />
                        <span className="truncate">{label}</span>
                      </div>

                      {count !== undefined && count > 0 && (
                        <span
                          className={clsx(
                            'text-[10px] font-mono px-1.5 py-0.2 rounded-full border',
                            isActive
                              ? 'bg-cyan-900/50 text-cyan-300 border-cyan-700/40'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700/40'
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Section 2: Administration */}
          <div>
            <div className="px-2 pb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-mono tracking-widest text-purple-400 uppercase font-semibold">
                Administration
              </span>
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                MGMT
              </span>
            </div>
            <nav className="space-y-0.5">
              {ADMIN_NAV.map(({ path, label, icon: Icon, count }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/admin'}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer group',
                      isActive
                        ? 'bg-gradient-to-r from-purple-950/60 to-indigo-950/40 text-purple-300 border-l-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.12)]'
                        : 'text-slate-400 hover:bg-[#0d1424] hover:text-slate-200'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={clsx(
                            'w-3.5 h-3.5 flex-shrink-0 transition-colors',
                            isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'
                          )}
                        />
                        <span className="truncate">{label}</span>
                      </div>

                      {count !== undefined && count > 0 && (
                        <span
                          className={clsx(
                            'text-[10px] font-mono px-1.5 py-0.2 rounded-full border',
                            isActive
                              ? 'bg-purple-900/50 text-purple-300 border-purple-700/40'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700/40'
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Engine Hardware Telemetry Card */}
        <div className="mx-3 my-2 p-2.5 rounded-lg bg-[#090e1c] border border-[#152035] space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-cyan-400" />
              Engine Architecture
            </span>
            <span className="text-emerald-400 font-semibold">ONLINE</span>
          </div>

          <div className="space-y-1 text-[9px] font-mono text-slate-500">
            <div className="flex items-center justify-between">
              <span>Filesystems</span>
              <span className="text-slate-300">ext4 • XFS • Btrfs</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Carving Worker</span>
              <span className="text-slate-300">Ready</span>
            </div>
          </div>
        </div>

        {/* Return to Cinematic Landing */}
        <div className="px-3 pb-2 pt-1 border-t border-[#151f33]">
          <NavLink
            to="/"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-mono text-slate-400 hover:text-cyan-300 hover:bg-[#0d1424] transition-colors border border-transparent hover:border-cyan-500/20"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              Cinematic Overview
            </span>
            <span className="text-[9px] text-slate-600">HOME</span>
          </NavLink>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#060913] border-t border-[#151f33] text-[9px] text-slate-500 font-mono flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>Rust 1.82+ | Tauri 2</span>
          </div>
          <span className="text-slate-600">IMMUTABLE LOG</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#060a14]">
        {/* Top Global Command Bar */}
        <header className="h-14 flex-shrink-0 bg-[#080d1a]/90 backdrop-blur-md border-b border-[#151f33] px-6 flex items-center justify-between z-10">
          {/* Active Case Selector / Breadcrumbs */}
          <div className="flex items-center gap-3">
            {activeCase ? (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0e1629] border border-[#1d2a45]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">CASE:</span>
                <select
                  value={selectedCaseId}
                  onChange={e => setSelectedCaseId(e.target.value)}
                  className="bg-transparent text-xs font-mono font-semibold text-cyan-300 focus:outline-none cursor-pointer"
                >
                  {cases.map(c => (
                    <option key={c.case_id} value={c.case_id} className="bg-[#0e1629] text-slate-200">
                      {c.case_number} — {c.case_title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0e1629] border border-[#1d2a45]">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">NO ACTIVE CASE</span>
                <button
                  onClick={() => navigate('/admin/cases')}
                  className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1 ml-1"
                >
                  <Plus className="w-3 h-3" /> Create Case
                </button>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-500">
              <span className="text-slate-700">/</span>
              <span className="text-slate-400 capitalize">
                {location.pathname.replace('/', '').replace('admin/', 'admin • ') || 'Dashboard'}
              </span>
            </div>
          </div>

          {/* Center Search Input Trigger */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0a101f] border border-[#1a253c] hover:border-cyan-500/40 text-slate-400 hover:text-slate-200 transition-all text-xs font-mono w-72 justify-between group shadow-inner"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="truncate text-slate-400">Search evidence, inodes, cases...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#131d33] border border-[#213052] text-[9px] text-cyan-400/80">
              Ctrl+K
            </kbd>
          </button>

          {/* Right Status Indicators */}
          <div className="flex items-center gap-3">
            {/* Real-time UTC investigation clock */}
            <div className="px-2.5 py-1 rounded bg-[#0a101f] border border-[#1b2742] text-[11px] font-mono text-slate-400 flex items-center gap-1.5 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="tabular-nums font-mono text-slate-300">{utcTime || 'UTC'}</span>
            </div>

            {/* Quick Export report trigger */}
            <button
              onClick={() => navigate('/admin/reports')}
              className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs font-mono font-medium transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reports</span>
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
