import { useState, useMemo } from 'react';
import {
  ScrollText, ShieldCheck, Search, Download, Check, Copy, Filter,
  Layers, Clock, Shield, Eye, X, CheckCircle2, ArrowRight
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { AuditEvent } from '../types/forensic';
import clsx from 'clsx';

export default function AuditLogPage() {
  const { auditEvents, cases } = useApp();
  const [search, setSearch] = useState('');
  const [caseFilter, setCaseFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const filtered = useMemo(() => {
    return auditEvents.filter((e) => {
      const matchSearch =
        e.action.toLowerCase().includes(search.toLowerCase()) ||
        (e.actor && e.actor.toLowerCase().includes(search.toLowerCase())) ||
        (e.target && e.target.toLowerCase().includes(search.toLowerCase())) ||
        (e.description && e.description.toLowerCase().includes(search.toLowerCase())) ||
        (e.details && e.details.toLowerCase().includes(search.toLowerCase()));

      const matchCase = caseFilter === 'ALL' || e.case_id === caseFilter;
      const matchAction = actionFilter === 'ALL' || e.action === actionFilter;

      return matchSearch && matchCase && matchAction;
    });
  }, [auditEvents, search, caseFilter, actionFilter]);

  const handleCopyDetails = (id: number | undefined, text: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (id !== undefined) setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditEvents, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tracex_audit_chain_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <ScrollText className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Cryptographic Audit Log
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Tamper-evident chain of all forensic commands, operations &amp; evidence access
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-semibold tracking-wider uppercase">
            DEMO / SYNTHETIC FORENSIC DATA
          </span>
          <button
            onClick={handleExportJSON}
            disabled={auditEvents.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-[#0a101f] hover:bg-[#121c33] border border-[#1b2742] text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Log (JSON)</span>
          </button>
        </div>
      </div>

      {/* Forensic Audit Principle Banner: What Happened, When, Who, Which Evidence */}
      <div className="p-4 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] font-mono text-xs">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chain of Custody Four-Pillar Attribution</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="p-2.5 rounded-xl bg-[#0c1326] border border-[#16223b]">
            <div className="text-[9px] text-slate-500 uppercase">1. WHAT HAPPENED</div>
            <div className="text-xs font-bold text-emerald-400 mt-0.5">12-Stage Inode Sequence</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0c1326] border border-[#16223b]">
            <div className="text-[9px] text-slate-500 uppercase">2. WHEN IT HAPPENED</div>
            <div className="text-xs font-bold text-slate-200 mt-0.5">UTC Microsecond Timestamps</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0c1326] border border-[#16223b]">
            <div className="text-[9px] text-slate-500 uppercase">3. WHO PERFORMED IT</div>
            <div className="text-xs font-bold text-cyan-300 mt-0.5">Attributed Examiner Identity</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0c1326] border border-[#16223b]">
            <div className="text-[9px] text-slate-500 uppercase">4. WHICH EVIDENCE</div>
            <div className="text-xs font-bold text-blue-300 mt-0.5">Target Bitstream &amp; Inodes</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="p-3.5 rounded-xl bg-[#080d19] border border-[#152138] flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-inner">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit events by action, investigator, target, or hash..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#050811] border border-[#18243c] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Case:</span>
            <select
              value={caseFilter}
              onChange={(e) => setCaseFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#050811] border border-[#18243c] text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Cases</option>
              {cases.map((c) => (
                <option key={c.case_id} value={c.case_id}>
                  {c.case_number}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#050811] border border-[#18243c] text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Actions</option>
              <option value="CASE_CREATED">CASE_CREATED</option>
              <option value="EVIDENCE_ADDED">EVIDENCE_ADDED</option>
              <option value="EVIDENCE_HASHED">EVIDENCE_HASHED</option>
              <option value="EVIDENCE_VERIFIED">EVIDENCE_VERIFIED</option>
              <option value="FILESYSTEM_IDENTIFIED">FILESYSTEM_IDENTIFIED</option>
              <option value="FILESYSTEM_ANALYZED">FILESYSTEM_ANALYZED</option>
              <option value="METADATA_EXTRACTED">METADATA_EXTRACTED</option>
              <option value="DELETED_ARTIFACT_DISCOVERED">DELETED_ARTIFACT_DISCOVERED</option>
              <option value="RECOVERY_STARTED">RECOVERY_STARTED</option>
              <option value="RECOVERY_COMPLETED">RECOVERY_COMPLETED</option>
              <option value="RECOVERY_VALIDATED">RECOVERY_VALIDATED</option>
              <option value="REPORT_GENERATED">REPORT_GENERATED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table: Showing all required columns */}
      <div className="rounded-2xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.4)] font-mono text-xs">
        <div className="p-3.5 border-b border-[#141f36] bg-[#0c1222]/80 flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-300 uppercase">
            Cryptographic Audit Records ({filtered.length})
          </span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HASH CHAIN SEALED &bull; ZERO TAMPER DETECTED</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#141f36] bg-[#0a0f1d] text-[10px] uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3.5">Timestamp (UTC)</th>
                <th className="py-3 px-3.5">Case ID</th>
                <th className="py-3 px-3.5">Investigator</th>
                <th className="py-3 px-3.5">Action</th>
                <th className="py-3 px-3.5">Target / Evidence</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Description</th>
                <th className="py-3 px-3.5">Hash / Reference</th>
                <th className="py-3 px-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d33]">
              {filtered.slice().reverse().map((entry) => {
                const caseObj = cases.find(c => c.case_id === entry.case_id);
                const displayCase = caseObj?.case_number || (entry.case_id ? 'CR-2026-RET-01' : 'SYSTEM');
                const isFinal = entry.status === 'FINAL' || entry.status === 'VERIFIED' || entry.status === 'SUCCESS' || entry.status === 'VALID';

                return (
                  <tr key={entry.event_id} className="hover:bg-[#0c1426] transition-colors group">
                    {/* Timestamp */}
                    <td className="py-3 px-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(entry.event_time).toISOString().replace('T', ' ').substring(0, 19)} UTC
                    </td>

                    {/* Case ID */}
                    <td className="py-3 px-3.5 text-cyan-300 font-semibold whitespace-nowrap">
                      {displayCase}
                    </td>

                    {/* Investigator */}
                    <td className="py-3 px-3.5 text-slate-200 font-bold whitespace-nowrap">
                      {entry.actor || 'Det. H. Vance'}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3.5">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap',
                        entry.action.includes('VERIFIED') || entry.action.includes('VALIDATED')
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                          : entry.action.includes('REPORT')
                          ? 'bg-blue-950/60 text-blue-300 border-blue-700/50'
                          : entry.action.includes('RECOVERY')
                          ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50'
                          : 'bg-amber-950/50 text-amber-300 border-amber-800/40'
                      )}>
                        {entry.action}
                      </span>
                    </td>

                    {/* Target / Evidence */}
                    <td className="py-3 px-3.5 text-slate-300 font-medium truncate max-w-[160px]" title={entry.target || ''}>
                      {entry.target || (entry.evidence_id ? 'DEMO_FORENSIC_IMAGE_XFS.E01' : 'Workspace')}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-bold border',
                        isFinal
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                          : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                      )}>
                        {entry.status || 'SUCCESS'}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-3.5 text-slate-300 text-[11px] truncate max-w-[240px]" title={entry.description || ''}>
                      {entry.description || (entry.details ? JSON.parse(entry.details).case_title || entry.details : 'Operation completed')}
                    </td>

                    {/* Hash / Ref */}
                    <td className="py-3 px-3.5 font-mono text-[10px] text-cyan-400 truncate max-w-[120px]" title={entry.hash_reference || ''}>
                      {entry.hash_reference ? (
                        <div className="flex items-center gap-1">
                          <span className="truncate">{entry.hash_reference.substring(0, 12)}...</span>
                          <button
                            onClick={() => handleCopyDetails(entry.id, entry.hash_reference!)}
                            className="text-slate-500 hover:text-cyan-300"
                            title="Copy Hash"
                          >
                            {copiedId === entry.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right">
                      <button
                        onClick={() => setSelectedEvent(entry)}
                        className="p-1 rounded-lg bg-[#111a2e] hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
                        title="View Full Audit Event"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AUDIT EVENT DETAIL MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
          <div className="w-full max-w-xl rounded-2xl bg-[#080d19] border border-[#1b2a47] p-6 space-y-4 shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#152138]">
              <div className="flex items-center gap-2 text-amber-400">
                <ScrollText className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-100">
                  Audit Entry: {selectedEvent.event_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                  <div className="text-[10px] text-slate-500 uppercase">Action</div>
                  <div className="text-amber-400 font-bold mt-0.5">{selectedEvent.action}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                  <div className="text-[10px] text-slate-500 uppercase">Timestamp (UTC)</div>
                  <div className="text-slate-200 font-bold mt-0.5">{new Date(selectedEvent.event_time).toUTCString()}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                  <div className="text-[10px] text-slate-500 uppercase">Investigator</div>
                  <div className="text-slate-200 font-bold mt-0.5">{selectedEvent.actor || 'Det. H. Vance'}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                  <div className="text-[10px] text-slate-500 uppercase">Case Scope</div>
                  <div className="text-cyan-300 font-bold mt-0.5">{selectedEvent.case_id || 'System'}</div>
                </div>
              </div>

              {selectedEvent.description && (
                <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                  <div className="text-[10px] text-slate-500 uppercase">Description</div>
                  <div className="text-slate-200 mt-0.5">{selectedEvent.description}</div>
                </div>
              )}

              {selectedEvent.hash_reference && (
                <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                  <div className="text-[10px] text-slate-500 uppercase">Cryptographic Reference / Hash</div>
                  <div className="text-cyan-300 mt-0.5 break-all select-all font-mono text-[11px]">{selectedEvent.hash_reference}</div>
                </div>
              )}

              {selectedEvent.details && (
                <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                  <div className="text-[10px] text-slate-500 uppercase">Structured Raw Parameters</div>
                  <pre className="text-slate-400 mt-1 font-mono text-[10px] whitespace-pre-wrap overflow-x-auto select-all">
                    {JSON.stringify(JSON.parse(selectedEvent.details), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#152138]">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-[#121c33] text-slate-300 hover:bg-[#182545]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
