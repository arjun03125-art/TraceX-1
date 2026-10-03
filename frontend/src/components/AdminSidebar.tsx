import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Users, HardDrive, FileText,
  ScrollText, Cpu, ShieldCheck, Settings, Lock, Search,
  ArrowLeft, Terminal, Shield, ArrowUpRight, UserCheck
} from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';

interface AdminSidebarProps {
  onOpenCommandPalette: () => void;
}

export default function AdminSidebar({ onOpenCommandPalette }: AdminSidebarProps) {
  const { cases, evidence, reports, auditEvents, investigators } = useApp();
  const { currentUser, switchRole } = useAuth();
  const navigate = useNavigate();

  const ADMIN_NAV = [
    { path: '/admin', label: 'System Overview', icon: LayoutDashboard },
    { path: '/admin/cases', label: 'Case Management', icon: FolderOpen, count: cases.length },
    { path: '/admin/investigators', label: 'Investigators', icon: Users, count: investigators.length },
    { path: '/admin/evidence', label: 'Evidence Management', icon: HardDrive, count: evidence.length },
    { path: '/admin/reports', label: 'Report Management', icon: FileText, count: reports.length },
    { path: '/admin/audit', label: 'Audit Logs', icon: ScrollText, count: auditEvents.length },
    { path: '/admin/engine', label: 'Forensic Engine', icon: Cpu },
    { path: '/admin/security', label: 'Security & Write-Block', icon: ShieldCheck },
    { path: '/admin/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#080b18] border-r border-[#1a1c38] flex flex-col relative z-20 shadow-[10px_0_30px_rgba(0,0,0,0.6)]">
      {/* Brand Header — Dedicated Administrator Identity */}
      <div className="p-4 border-b border-[#1c1d3b] bg-[#0c0e22]/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/25 to-indigo-600/35 border border-purple-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Shield className="w-4 h-4 text-purple-400" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold tracking-[0.25em] text-purple-400 uppercase">TRACE X</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-950/80 border border-purple-700/50 text-purple-300 font-bold">
                  ADMIN
                </span>
              </div>
              <div className="text-[9px] text-slate-400 font-mono tracking-tight flex items-center gap-1">
                <span>ADMINISTRATOR PORTAL</span>
                <span className="text-purple-400">•</span>
                <span className="text-purple-300">CLEARANCE L4</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Write-Block & Security Ribbon */}
      <div className="mx-3 mt-3 px-3 py-2 bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-purple-950/20 border border-purple-500/30 rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(168,85,247,0.08)]">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <div>
            <div className="text-[10px] text-purple-300 font-mono font-semibold tracking-wider">
              ADMIN WRITE-BLOCK ON
            </div>
            <div className="text-[8px] text-slate-500 font-mono">EVIDENCE INTEGRITY LOCKED</div>
          </div>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
      </div>

      {/* Quick Command Palette Button */}
      <div className="px-3 mt-3">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#0e1126] hover:bg-[#141936] border border-[#21254a] text-slate-400 hover:text-slate-200 transition-all text-xs font-mono group"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-[11px] text-slate-400">Admin Palette...</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#171d3d] border border-[#2c3366] text-[9px] text-purple-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Scrollable Nav Section */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1 pt-3">
        <div className="px-2 pb-1.5 flex items-center justify-between">
          <span className="text-[9px] font-mono tracking-widest text-purple-400 uppercase font-semibold">
            Portal Navigation
          </span>
          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
            9 MODULES
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
                    ? 'bg-gradient-to-r from-purple-950/70 to-indigo-950/50 text-purple-200 border-l-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] font-semibold'
                    : 'text-slate-400 hover:bg-[#10142c] hover:text-slate-200'
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
                          ? 'bg-purple-900/60 text-purple-300 border-purple-700/50'
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

      {/* Switch to Investigator Workspace Button */}
      <div className="px-3 pt-2 pb-1 border-t border-[#1a1c38]">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-mono text-cyan-300 bg-cyan-950/30 hover:bg-cyan-950/50 border border-cyan-800/40 hover:border-cyan-500/40 transition-all shadow-[0_0_12px_rgba(6,182,212,0.1)] group"
        >
          <span className="flex items-center gap-2 truncate">
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="truncate">Investigator Workspace</span>
          </span>
          <span className="text-[9px] text-cyan-400/80 font-bold">/dashboard</span>
        </button>
      </div>

      {/* Current Admin User Badge & Role Switcher */}
      <div className="p-3 bg-[#070914] border-t border-[#1a1c38] space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-purple-950 border border-purple-700/50 flex items-center justify-center flex-shrink-0 text-purple-300 text-[10px] font-bold">
              AM
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-slate-200 font-semibold truncate">
                {currentUser.name}
              </div>
              <div className="text-[9px] font-mono text-purple-400 truncate">
                ADMINISTRATOR ({currentUser.badge})
              </div>
            </div>
          </div>
          <button
            onClick={switchRole}
            title="Switch active role for testing"
            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-700/40 text-purple-300 hover:bg-purple-900/60 transition-colors"
          >
            Switch Role
          </button>
        </div>

        <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pt-1 border-t border-[#14162e]">
          <span>TraceX Engine: ONLINE</span>
          <span className="text-purple-400 font-bold">ADMIN MODE</span>
        </div>
      </div>
    </aside>
  );
}
