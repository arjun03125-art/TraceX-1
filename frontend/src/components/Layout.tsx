import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, HardDrive, FileX2,
  FileCheck2, Clock, FileText, ScrollText,
  Shield, Terminal, ArrowLeft, Search,
  Lock, Plus, KeyRound, ShieldAlert, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';
import CommandPalette from './CommandPalette';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cases, evidence, reports } = useApp();
  const { currentUser, currentRole, isAdmin, switchRole } = useAuth();

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

  // Dedicated Investigator Workspace routes ONLY (No Admin items)
  const INVESTIGATOR_NAV = [
    { path: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
    { path: '/cases', label: 'Cases', icon: FolderOpen, count: cases.length },
    { path: '/evidence', label: 'Evidence', icon: HardDrive, count: evidence.length },
    { path: '/deleted-files', label: 'Deleted Files', icon: FileX2 },
    { path: '/recovered-files', label: 'Recovered Files', icon: FileCheck2 },
    { path: '/chronology', label: 'Chronology', icon: Clock },
    { path: '/reports', label: 'Reports', icon: FileText, count: reports.length },
    { path: '/audit', label: 'Audit Log', icon: ScrollText },
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
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-bold">
                    WORK
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 font-mono tracking-tight flex items-center gap-1">
                  <span>INVESTIGATOR WORKSPACE</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">v0.1.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Write-Block & Security Ribbon */}
        <div className="mx-3 mt-3 px-3 py-2 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-emerald-950/20 border border-emerald-500/30 rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(160,185,129,0.08)]">
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

        {/* Scrollable Nav Section — Investigator Routes ONLY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1 pt-3">
          <div className="px-2 pb-1.5">
            <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
              Forensic Modules
            </span>
          </div>
          <nav className="space-y-0.5">
            {INVESTIGATOR_NAV.map(({ path, label, icon: Icon, count }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/dashboard'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer group',
                    isActive
                      ? 'bg-gradient-to-r from-cyan-950/60 to-blue-950/40 text-cyan-300 border-l-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.12)] font-semibold'
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

        {/* Administrator Portal Switcher (Visible if user is Admin) */}
        {isAdmin && (
          <div className="mx-3 mb-2 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Administrator Active
              </span>
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-cyan-900/60 text-cyan-200">
                ACTIVE
              </span>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="mt-2 w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.25)]"
            >
              Open Admin Portal →
            </button>
          </div>
        )}

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

        {/* Active Identity & Role Switcher Footer */}
        <div className="px-3 py-2.5 bg-[#060913] border-t border-[#151f33] space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-700/50 flex items-center justify-center flex-shrink-0 text-cyan-300 text-[10px] font-bold">
                {currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-slate-200 font-semibold truncate">
                  {currentUser.name}
                </div>
                <div className="text-[9px] font-mono text-slate-400 truncate">
                  {currentUser.role} ({currentUser.badge})
                </div>
              </div>
            </div>
            <button
              onClick={switchRole}
              title="Switch user role for testing"
              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#10182c] border border-[#213054] text-cyan-400 hover:bg-[#152342] transition-colors"
            >
              Switch Role
            </button>
          </div>
          <div className="text-[8px] font-mono text-slate-500 flex items-center justify-between pt-1 border-t border-[#121829]">
            <span>Rust Core: 1.82+</span>
            <span className="text-emerald-400">IMMUTABLE LOG</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#060a14]">
        {/* Top Global Command Bar */}
        <header className="h-14 flex-shrink-0 bg-[#080d1a]/90 backdrop-blur-md border-b border-[#151f33] px-4 sm:px-6 flex items-center justify-between gap-3 z-10 min-w-0">
          {/* Active Case Selector / Breadcrumbs */}
          <div className="flex items-center gap-2.5 min-w-0 flex-shrink">
            {activeCase ? (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0e1629] border border-[#1d2a45] min-w-0 max-w-[200px] sm:max-w-[260px] md:max-w-[320px] lg:max-w-[380px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex-shrink-0">CASE:</span>
                <select
                  value={selectedCaseId}
                  onChange={e => setSelectedCaseId(e.target.value)}
                  className="bg-transparent text-xs font-mono font-semibold text-cyan-300 focus:outline-none cursor-pointer truncate min-w-0 w-full"
                >
                  {cases.map(c => (
                    <option key={c.case_id} value={c.case_id} className="bg-[#0e1629] text-slate-200">
                      {c.case_number} — {c.case_title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0e1629] border border-[#1d2a45] flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">NO ACTIVE CASE</span>
              </div>
            )}

            <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-slate-500 flex-shrink-0">
              <span className="text-slate-700">/</span>
              <span className="text-slate-400 capitalize">
                {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          {/* Center Search Input Trigger */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0a101f] border border-[#1a253c] hover:border-cyan-500/40 text-slate-400 hover:text-slate-200 transition-all text-xs font-mono w-48 xl:w-64 justify-between group shadow-inner flex-shrink min-w-0"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="truncate text-slate-400">Search evidence...</span>
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#131d33] border border-[#213052] text-[9px] text-cyan-400/80 flex-shrink-0">
              Ctrl+K
            </kbd>
          </button>

          {/* Right Status Indicators */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Real-time UTC investigation clock */}
            <div className="px-2.5 py-1 rounded bg-[#0a101f] border border-[#1b2742] text-[11px] font-mono text-slate-400 flex items-center gap-1.5 shadow-inner whitespace-nowrap flex-shrink-0">
              <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="tabular-nums font-mono text-slate-300">{utcTime || 'UTC'}</span>
            </div>

            {/* Current Role badge */}
            <div
              className="px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 text-xs font-mono flex items-center gap-1.5 shadow-inner whitespace-nowrap flex-shrink-0"
              title={`Logged in as ${currentUser.name} (${currentRole})`}
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>Role: {currentRole}</span>
            </div>

            {/* Administrator Portal jump */}
            <button
              onClick={() => navigate('/admin')}
              title="Open Administrator Portal (Authentication required)"
              className="px-2.5 sm:px-3 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 hover:border-cyan-400/60 text-cyan-200 text-xs font-mono font-medium transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.12)] whitespace-nowrap flex-shrink-0"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span>Admin Portal</span>
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
