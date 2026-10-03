import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Users, HardDrive, FileText,
  ScrollText, Cpu, ShieldCheck, Settings, Lock, Search,
  ArrowLeft, LogOut, Shield
} from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';

interface AdminSidebarProps {
  onOpenCommandPalette: () => void;
}

export default function AdminSidebar({ onOpenCommandPalette }: AdminSidebarProps) {
  const { cases, evidence, reports, auditEvents, investigators } = useApp();
  const { adminLogout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login', { replace: true });
  };

  const ADMIN_NAV = [
    { path: '/admin/overview', label: 'System Overview', icon: LayoutDashboard },
    { path: '/admin/cases', label: 'Case Administration', icon: FolderOpen, count: cases.length },
    { path: '/admin/investigators', label: 'Investigators', icon: Users, count: investigators.length },
    { path: '/admin/evidence', label: 'Evidence Administration', icon: HardDrive, count: evidence.length },
    { path: '/admin/audit', label: 'Audit Administration', icon: ScrollText, count: auditEvents.length },
    { path: '/admin/engine', label: 'Forensic Engine', icon: Cpu },
    { path: '/admin/settings', label: 'System Settings', icon: Settings },
    { path: '/admin/security', label: 'Security Policies', icon: ShieldCheck },
    { path: '/admin/reports', label: 'Report Oversight', icon: FileText, count: reports.length },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#070b16] border-r border-[#151f33] flex flex-col relative z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
      {/* Brand Header — Exact TraceX Identity */}
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
                  CORE
                </span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono tracking-tight flex items-center gap-1">
                <span>FORENSIC RECOVERY</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">v0.1.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Write-Block & Security Ribbon — Identical to TraceX Workspace */}
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
          onClick={onOpenCommandPalette}
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
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1 pt-3">
        <div className="px-2 pb-1.5 flex items-center justify-between">
          <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
            ADMINISTRATOR
          </span>
          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
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

      {/* Return to Investigator Workspace (Requirement 5) */}
      <div className="px-3 pt-2 pb-1 border-t border-[#151f33]">
        <button
          onClick={() => navigate('/cases')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-mono text-slate-300 hover:text-cyan-300 hover:bg-[#0d1424] border border-cyan-500/20 hover:border-cyan-500/40 transition-all group shadow-sm"
        >
          <span className="flex items-center gap-2 truncate">
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="truncate font-semibold">← Return to Investigator Workspace</span>
          </span>
          <span className="text-[9px] text-slate-500">/cases</span>
        </button>
      </div>

      {/* Administrator Profile & Logout Footer */}
      <div className="p-3 bg-[#060913] border-t border-[#151f33] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-700/50 flex items-center justify-center flex-shrink-0 text-cyan-300 text-[10px] font-bold">
              AD
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-slate-200 font-semibold truncate">
                Administrator
              </div>
              <div className="text-[9px] font-mono text-cyan-400 truncate">
                admin
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out of Administrator Portal"
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-950/70 border border-rose-700/40 text-rose-300 hover:text-rose-200 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pt-1 border-t border-[#121829]">
          <span>TraceX Engine: ONLINE</span>
          <span className="text-emerald-400">READ-ONLY</span>
        </div>
      </div>
    </aside>
  );
}
