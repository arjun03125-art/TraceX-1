import { useApp } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Users, HardDrive, FileText,
  ScrollText, Settings, ArrowRight, Plus, Activity, Shield
} from 'lucide-react';

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const { stats } = useApp();

  const metrics = [
    { label: 'Cases', value: stats.totalCases, icon: FolderOpen, color: '#3b82f6', link: '/admin/cases' },
    { label: 'Evidence Sources', value: stats.totalEvidence, icon: HardDrive, color: '#22d3ee', link: '/admin/evidence' },
    { label: 'Investigators', value: stats.totalInvestigators, icon: Users, color: '#a78bfa', link: '/admin/investigators' },
    { label: 'Reports', value: stats.totalReports, icon: FileText, color: '#34d399', link: '/admin/reports' },
    { label: 'Audit Events', value: stats.totalAuditEvents, icon: ScrollText, color: '#fbbf24', link: '/admin/audit' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Administration Overview
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Manage cases, investigators, evidence, and system configuration
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin/cases')}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
        >
          <Plus className="w-4 h-4" />
          Create Case
        </button>
      </div>

      {/* Metrics Grid */}
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

      {/* Recent Activity Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100 font-mono">Recent Cases</h3>
            </div>
            <button
              onClick={() => navigate('/admin/cases')}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {stats.recentCases.length === 0 ? (
              <div className="py-8 text-center">
                <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-mono">No cases created yet.</p>
                <button
                  onClick={() => navigate('/admin/cases')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono hover:bg-cyan-500/20 transition-colors"
                >
                  Create Case
                </button>
              </div>
            ) : (
              stats.recentCases.map(c => (
                <div
                  key={c.case_id}
                  onClick={() => navigate(`/cases/${c.case_id}`)}
                  className="p-3 bg-[#050811] rounded-xl border border-[#152138] hover:border-cyan-500/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-cyan-400">{c.case_number}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/40 text-emerald-300">
                      {c.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 font-medium mt-1 truncate">{c.case_title}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">{c.investigator}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Evidence */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100 font-mono">Recent Evidence</h3>
            </div>
            <button
              onClick={() => navigate('/admin/evidence')}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {stats.recentEvidence.length === 0 ? (
              <div className="py-8 text-center">
                <HardDrive className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-mono">No evidence sources added.</p>
                <button
                  onClick={() => navigate('/admin/evidence')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono hover:bg-cyan-500/20 transition-colors"
                >
                  Add Evidence
                </button>
              </div>
            ) : (
              stats.recentEvidence.map(ev => (
                <div
                  key={ev.evidence_id}
                  className="p-3 bg-[#050811] rounded-xl border border-[#152138] hover:border-cyan-500/30 transition-all cursor-pointer"
                  onClick={() => navigate('/admin/evidence')}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-200 truncate">{ev.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-700/40 text-blue-300">
                      {ev.analysis_status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    {ev.source_type} • Hash: {ev.acquisition_hash ? 'Available' : 'Pending'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-slate-100 font-mono">Recent Activity</h3>
            </div>
            <button
              onClick={() => navigate('/admin/audit')}
              className="text-[10px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {stats.recentAudit.length === 0 ? (
              <div className="py-8 text-center">
                <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-mono">No audit activity yet.</p>
                <p className="text-[10px] text-slate-600 font-mono mt-1">Administrative activity will appear here.</p>
              </div>
            ) : (
              stats.recentAudit.slice(0, 5).map(entry => (
                <div
                  key={entry.id}
                  className="p-2.5 bg-[#050811] rounded-lg border border-[#141f36] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-bold text-[11px] font-mono">{entry.action}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(entry.event_time).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{entry.actor}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5">
        <h3 className="text-sm font-bold text-slate-100 font-mono mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Create Case', icon: FolderOpen, link: '/admin/cases', color: '#3b82f6' },
            { label: 'Add Investigator', icon: Users, link: '/admin/investigators', color: '#a78bfa' },
            { label: 'Add Evidence', icon: HardDrive, link: '/admin/evidence', color: '#22d3ee' },
            { label: 'System Settings', icon: Settings, link: '/admin/settings', color: '#fbbf24' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.link)}
              className="group p-4 rounded-xl bg-[#050811] border border-[#152138] hover:border-cyan-500/30 transition-all text-left flex items-center gap-3"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${action.color}10`, border: `1px solid ${action.color}25` }}
              >
                <action.icon className="w-4 h-4" style={{ color: action.color }} />
              </div>
              <span className="text-xs font-mono text-slate-300 group-hover:text-white transition-colors">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
