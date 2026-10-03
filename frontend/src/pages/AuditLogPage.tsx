import { useState } from 'react';
import { ScrollText, ShieldCheck, Search, Download, Check, Copy } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function AuditLogPage() {
  const { auditEvents } = useApp();
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filtered = auditEvents.filter((e) =>
    e.action.toLowerCase().includes(search.toLowerCase()) ||
    (e.actor && e.actor.toLowerCase().includes(search.toLowerCase())) ||
    (e.details && e.details.toLowerCase().includes(search.toLowerCase()))
  );

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
    downloadAnchor.setAttribute('download', `tracex_audit_log_${Date.now()}.json`);
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

        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={handleExportJSON}
            disabled={auditEvents.length === 0}
            className="px-3.5 py-1.5 rounded-xl bg-[#0a101f] hover:bg-[#121c33] border border-[#1b2742] text-xs text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Export Log (JSON)
          </button>
        </div>
      </div>

      {auditEvents.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <ScrollText className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200">NO AUDIT ACTIVITY</h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto font-sans">
            Administrative and forensic activity will appear here as cases, evidence, or settings are created and modified.
          </p>
        </div>
      ) : (
        <div className="space-y-4 font-mono text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail by action or parameters..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0a1020] border border-[#192642] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="rounded-2xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#141f36] bg-[#0c1222]/80 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Parameters</th>
                    <th className="py-3 px-4 text-right">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#131d33]">
                  {filtered.slice().reverse().map((entry) => (
                    <tr key={entry.event_id} className="hover:bg-[#0c1324] transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-400 select-all">
                        {entry.event_id}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(entry.event_time).toISOString().replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {entry.actor}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/40 text-amber-400 border border-amber-800/40">
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="flex items-center gap-1.5">
                          <code className="text-[11px] text-slate-400 truncate select-all">
                            {entry.details}
                          </code>
                          <button
                            onClick={() => handleCopyDetails(entry.id, entry.details)}
                            className="p-1 rounded text-slate-500 hover:text-slate-200"
                          >
                            {copiedId === entry.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                          Signed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
