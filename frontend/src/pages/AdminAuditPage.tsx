import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import {
  ScrollText, Search, Filter, Download, Shield,
  CheckCircle2, AlertTriangle, ArrowUpDown, Clock,
  Hash, User, KeyRound, FolderOpen
} from 'lucide-react';
import clsx from 'clsx';

export default function AdminAuditPage() {
  const { auditEvents } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'ADMIN' | 'INVESTIGATION'>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const ADMIN_ACTIONS = new Set([
    'ADMIN_LOGIN',
    'ADMIN_LOGOUT',
    'SETTINGS_UPDATED',
    'INVESTIGATOR_CREATED',
    'INVESTIGATOR_UPDATED',
    'INVESTIGATOR_DELETED',
    'SECURITY_POLICY_CHANGED',
    'ENGINE_CONFIG_CHANGED',
    'ADMIN_ACTION_PERFORMED',
    'DASHBOARD_LAYOUT_UPDATED',
  ]);

  const isAdminEvent = (action: string) =>
    ADMIN_ACTIONS.has(action) || action.startsWith('ADMIN_') || action.includes('SETTINGS') || action.includes('POLICY') || action.includes('ENGINE');

  const adminCount = useMemo(() => auditEvents.filter(e => isAdminEvent(e.action)).length, [auditEvents]);
  const investigationCount = useMemo(() => auditEvents.filter(e => !isAdminEvent(e.action)).length, [auditEvents]);

  const filteredEvents = useMemo(() => {
    return auditEvents.filter(ev => {
      const matchSearch =
        ev.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.details ? ev.details.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
        (ev.description ? ev.description.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
        (ev.target ? ev.target.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
        (ev.case_id && ev.case_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.event_id && ev.event_id.toLowerCase().includes(searchQuery.toLowerCase()));

      const isEvAdmin = isAdminEvent(ev.action);
      const matchScope =
        scopeFilter === 'ALL' ||
        (scopeFilter === 'ADMIN' && isEvAdmin) ||
        (scopeFilter === 'INVESTIGATION' && !isEvAdmin);

      const matchAction = actionFilter === 'ALL' || ev.action === actionFilter;
      return matchSearch && matchScope && matchAction;
    }).slice().reverse(); // newest first
  }, [auditEvents, searchQuery, scopeFilter, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedList = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tracex_admin_audit_log_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('LOGIN') || action.includes('SECURITY') || action.includes('ENGINE')) {
      return 'bg-purple-950/50 text-purple-300 border-purple-800/40';
    }
    if (action.includes('CREATED') || action.includes('ADDED') || action.includes('COMPLETED') || action.includes('VALIDATED')) {
      return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
    }
    if (action.includes('UPDATED')) {
      return 'bg-blue-950/40 text-blue-400 border-blue-800/40';
    }
    if (action.includes('DELETED')) {
      return 'bg-rose-950/40 text-rose-400 border-rose-800/40';
    }
    if (action.includes('ARCHIVED')) {
      return 'bg-amber-950/40 text-amber-400 border-amber-800/40';
    }
    return 'bg-slate-800/60 text-slate-300 border-slate-700/50';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <ScrollText className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Cryptographic Audit Log &amp; Administration
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Tamper-evident, court-verifiable chain of administrative and forensic events
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportJSON}
          disabled={auditEvents.length === 0}
          className="px-4 py-2 rounded-xl bg-[#0e1629] hover:bg-[#152342] border border-[#1d2d4d] text-slate-200 font-mono font-bold text-xs transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,0,0,0.3)] self-start md:self-auto"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          EXPORT AUDIT LOG (JSON)
        </button>
      </div>

      {/* Scope Selector Tabs — Differentiating Admin vs Investigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
        <button
          onClick={() => { setScopeFilter('ALL'); setCurrentPage(1); }}
          className={clsx(
            'p-3.5 rounded-xl border text-left transition-all flex items-center justify-between',
            scopeFilter === 'ALL'
              ? 'bg-[#0f1a30] border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              : 'bg-[#090e1c] border-[#16223b] text-slate-400 hover:border-slate-700'
          )}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Master Stream</div>
            <div className="font-bold text-slate-200 text-sm mt-0.5">All Audit Records</div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-[#142038] text-slate-300 font-bold border border-[#1e2f52]">
            {auditEvents.length}
          </span>
        </button>

        <button
          onClick={() => { setScopeFilter('ADMIN'); setCurrentPage(1); }}
          className={clsx(
            'p-3.5 rounded-xl border text-left transition-all flex items-center justify-between',
            scopeFilter === 'ADMIN'
              ? 'bg-[#180f2e] border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
              : 'bg-[#090e1c] border-[#16223b] text-slate-400 hover:border-slate-700'
          )}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-purple-400 font-bold">Admin Governance</div>
            <div className="font-bold text-slate-200 text-sm mt-0.5">Administrative Audit</div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-purple-950/50 text-purple-300 font-bold border border-purple-800/40">
            {adminCount}
          </span>
        </button>

        <button
          onClick={() => { setScopeFilter('INVESTIGATION'); setCurrentPage(1); }}
          className={clsx(
            'p-3.5 rounded-xl border text-left transition-all flex items-center justify-between',
            scopeFilter === 'INVESTIGATION'
              ? 'bg-[#091a26] border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'bg-[#090e1c] border-[#16223b] text-slate-400 hover:border-slate-700'
          )}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Case Evidence Chain</div>
            <div className="font-bold text-slate-200 text-sm mt-0.5">Investigator Audit Trail</div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/50 text-emerald-300 font-bold border border-emerald-800/40">
            {investigationCount}
          </span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b] flex flex-wrap items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)] font-mono text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search audit trail by action, details, actor, or entity ID..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-300 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">All Event Types</option>
            <option value="ADMIN_LOGIN">ADMIN_LOGIN</option>
            <option value="SECURITY_POLICY_CHANGED">SECURITY_POLICY_CHANGED</option>
            <option value="ENGINE_CONFIG_CHANGED">ENGINE_CONFIG_CHANGED</option>
            <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
            <option value="INVESTIGATOR_CREATED">INVESTIGATOR_CREATED</option>
            <option value="CASE_CREATED">CASE_CREATED</option>
            <option value="EVIDENCE_ADDED">EVIDENCE_ADDED</option>
            <option value="FILESYSTEM_IDENTIFIED">FILESYSTEM_IDENTIFIED</option>
            <option value="METADATA_EXTRACTED">METADATA_EXTRACTED</option>
            <option value="RECOVERY_COMPLETED">RECOVERY_COMPLETED</option>
            <option value="RECOVERY_VALIDATED">RECOVERY_VALIDATED</option>
            <option value="REPORT_GENERATED">REPORT_GENERATED</option>
          </select>
        </div>
      </div>

      {/* Main Table / Empty State */}
      {auditEvents.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <ScrollText className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200 tracking-tight">
            NO AUDIT ACTIVITY
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
            Administrative and forensic activity will appear here in real-time as cases, evidence, or settings are modified.
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] p-8 text-center font-mono">
          <p className="text-xs text-slate-400">No audit events match your search query.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)] font-mono text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#141f36] bg-[#0c1222]/80 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Associated Entity</th>
                  <th className="py-3 px-4 text-right">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131d33]">
                {paginatedList.map(ev => (
                  <tr key={ev.event_id} className="hover:bg-[#0e1629]/60 transition-colors">
                    <td className="py-3 px-4 text-slate-400 select-all">
                      {ev.event_id}
                    </td>
                    <td className="py-3 px-4">
                      {isAdminEvent(ev.action) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/40 text-purple-300 border border-purple-800/40">
                          <Shield className="w-3 h-3 text-purple-400" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-800/40">
                          <FolderOpen className="w-3 h-3 text-cyan-400" />
                          Case
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {new Date(ev.event_time).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-3 px-4 text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {ev.actor}
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx('px-2 py-0.5 rounded text-[10px] font-semibold border', getActionBadgeColor(ev.action))}>
                        {ev.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-sm truncate">
                      {ev.details}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {ev.case_id || ev.evidence_id || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 text-[10px]">
                        <CheckCircle2 className="w-3 h-3" />
                        Signed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="py-3 px-4 border-t border-[#141f36] bg-[#0c1222]/50 flex items-center justify-between text-[11px] text-slate-400">
            <div>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredEvents.length)} of {filteredEvents.length} events
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded bg-[#111b30] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#16233f]"
              >
                Previous
              </button>
              <span className="px-2 text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded bg-[#111b30] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#16233f]"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
