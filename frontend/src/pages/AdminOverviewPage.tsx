import { useApp } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Users, HardDrive, FileText,
  ScrollText, Settings, ArrowRight, Plus, Activity, Shield,
  Cpu, Database, CheckCircle2, AlertTriangle, Layers, Lock,
  Clock, Server, Zap
} from 'lucide-react';

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const { stats, cases, evidence, investigators } = useApp();

  const metrics = [
    { label: 'Total Cases', value: stats.totalCases, icon: FolderOpen, color: '#3b82f6', link: '/admin/cases' },
    { label: 'Evidence Sources', value: stats.totalEvidence, icon: HardDrive, color: '#22d3ee', link: '/admin/evidence' },
    { label: 'Investigators', value: stats.totalInvestigators, icon: Users, color: '#a78bfa', link: '/admin/investigators' },
    { label: 'Reports', value: stats.totalReports, icon: FileText, color: '#34d399', link: '/admin/reports' },
    { label: 'Audit Entries', value: stats.totalAuditEvents, icon: ScrollText, color: '#fbbf24', link: '/admin/audit' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <LayoutDashboard className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Administrator Portal Overview
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-700/50 text-cyan-300 font-bold">
                SYSTEM ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Comprehensive telemetry, health metrics, storage allocation, database status, and case oversight.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/cases')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <Plus className="w-4 h-4" />
            Create Case
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metrics.map(m => (
          <button
            key={m.label}
            onClick={() => navigate(m.link)}
            className="group relative p-4 rounded-xl bg-gradient-to-b from-[#0b101f] to-[#080d19] border border-[#162137] hover:border-cyan-500/40 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.3)] text-left"
          >
            <div
              className="absolute top-0 left-4 right-4 h-[1px] opacity-40 group-hover:opacity-100 transition-opacity"
              style={{ background: `linear-gradient(90deg, transparent, ${m.color}, transparent)` }}
            />
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-semibold">
                  {m.label}
                </div>
                <div className="text-2xl font-bold text-slate-100 font-mono mt-1">
                  {m.value}
                </div>
              </div>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                style={{ background: `${m.color}15`, border: `1px solid ${m.color}35` }}
              >
                <m.icon className="w-4 h-4" style={{ color: m.color }} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* System Health, Engine Status & Storage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: System Health */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 shadow-[0_4px_25px_rgba(0,0,0,0.4)] space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">System Health</h3>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 font-bold">
              100% OPERATIONAL
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>CPU Load (AVX2 Active)</span>
                <span className="text-slate-200 font-semibold">3.8%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full w-[4%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Memory Footprint (Bounded)</span>
                <span className="text-slate-200 font-semibold">48.2 MB / 8 GB</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full w-[6%]" />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-[#12192c]">
              <span>Worker Threads:</span>
              <span className="text-emerald-400 font-bold">8 / 8 Online</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>File Descriptors:</span>
              <span className="text-slate-200">14 Active (O_RDONLY)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Engine Status */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 shadow-[0_4px_25px_rgba(0,0,0,0.4)] space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">Engine Status</h3>
            </div>
            <button
              onClick={() => navigate('/admin/engine')}
              className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
            >
              Config <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="p-2 rounded-lg bg-[#050811] border border-[#152138] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-200">XFS Parser Engine (v5 CRC)</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">READY</span>
            </div>

            <div className="p-2 rounded-lg bg-[#050811] border border-[#152138] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-200">Btrfs Parser & Carving</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">READY</span>
            </div>

            <div className="p-2 rounded-lg bg-[#050811] border border-[#152138] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-slate-200">Multi-Hash Pipeline</span>
              </div>
              <span className="text-[10px] text-cyan-300 font-bold">SHA / BLAKE3</span>
            </div>
          </div>
        </div>

        {/* Card 3: Database & Storage Status */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 shadow-[0_4px_25px_rgba(0,0,0,0.4)] space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">Database & Storage</h3>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/40 text-cyan-300 font-bold">
              ACID WAL
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>SQLite Schema:</span>
              <span className="text-slate-200">forensic-case.db (v1.0)</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Foreign Key Enforcement:</span>
              <span className="text-emerald-400 font-bold">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Audit Chain Integrity:</span>
              <span className="text-emerald-400 font-bold">VERIFIED</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 border-t border-[#12192c] pt-1">
              <span>Recovery Storage Free:</span>
              <span className="text-cyan-400 font-bold">428.4 GB Available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Jobs Queue */}
      <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 shadow-[0_4px_25px_rgba(0,0,0,0.4)] space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold font-mono text-slate-100">Active Forensic Background Jobs</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            3 Managed Tasks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[#131d33] text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3">Job ID</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Target Evidence</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10182c]">
              <tr className="hover:bg-[#0c1224] transition-colors">
                <td className="py-2.5 px-3 text-cyan-400 font-bold">JOB-8821</td>
                <td className="py-2.5 px-3 text-slate-200">XFS Full Inode Recovery</td>
                <td className="py-2.5 px-3 text-slate-400">target_alpha_xfs_vol.raw</td>
                <td className="py-2.5 px-3">
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 font-bold">
                    COMPLETED
                  </span>
                </td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">100%</td>
              </tr>
              <tr className="hover:bg-[#0c1224] transition-colors">
                <td className="py-2.5 px-3 text-cyan-400 font-bold">JOB-8822</td>
                <td className="py-2.5 px-3 text-slate-200">Btrfs Cluster Slack Deep Carving</td>
                <td className="py-2.5 px-3 text-slate-400">vault_echo_btrfs_corrupt.dd</td>
                <td className="py-2.5 px-3">
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700/40 text-amber-300 font-bold">
                    IN_PROGRESS
                  </span>
                </td>
                <td className="py-2.5 px-3 text-amber-400 font-bold">70%</td>
              </tr>
              <tr className="hover:bg-[#0c1224] transition-colors">
                <td className="py-2.5 px-3 text-cyan-400 font-bold">JOB-8823</td>
                <td className="py-2.5 px-3 text-slate-200">BLAKE3 Cryptographic Verification</td>
                <td className="py-2.5 px-3 text-slate-400">xfs_deleted_demo.img</td>
                <td className="py-2.5 px-3">
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 font-bold">
                    COMPLETED
                  </span>
                </td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Access to Administration Modules */}
      <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
        <h3 className="text-sm font-bold text-slate-100 font-mono mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Administrator Management Portals
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
          {[
            { label: 'Case Management', icon: FolderOpen, link: '/admin/cases', color: '#3b82f6', desc: 'Case creation, edits, archival' },
            { label: 'Investigators', icon: Users, link: '/admin/investigators', color: '#06b6d4', desc: 'Examiner roles & operator IDs' },
            { label: 'Evidence Management', icon: HardDrive, link: '/admin/evidence', color: '#22d3ee', desc: 'Disk images, hashes, FS detection' },
            { label: 'Audit Trail', icon: ScrollText, link: '/admin/audit', color: '#fbbf24', desc: 'Cryptographic append-only log' },
            { label: 'Report Management', icon: FileText, link: '/admin/reports', color: '#34d399', desc: 'HTML, JSON, CSV exports' },
            { label: 'Forensic Engine', icon: Cpu, link: '/admin/engine', color: '#38bdf8', desc: 'XFS/Btrfs parsers & carving' },
            { label: 'Security Policies', icon: Shield, link: '/admin/security', color: '#10b981', desc: 'Hardware write-block & sandbox' },
            { label: 'System Settings', icon: Settings, link: '/admin/settings', color: '#60a5fa', desc: 'Storage paths & preferences' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.link)}
              className="group p-3.5 rounded-xl bg-[#050811] border border-[#152138] hover:border-cyan-500/40 transition-all text-left space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${action.color}15`, border: `1px solid ${action.color}35` }}
                >
                  <action.icon className="w-3.5 h-3.5" style={{ color: action.color }} />
                </div>
                <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                  {action.label}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">{action.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
