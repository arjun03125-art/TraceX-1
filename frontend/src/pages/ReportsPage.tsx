import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Printer, CheckCircle2, Shield, Plus, ArrowRight } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function ReportsPage() {
  const navigate = useNavigate();
  const { cases, reports, evidence } = useApp();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const activeCase = cases.length > 0 ? cases[0] : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Forensic Examination Reports
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Court-admissible technical documentation and attestation dossiers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => navigate('/admin/reports')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
          >
            <Plus className="w-4 h-4" />
            CREATE REPORT
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200">NO REPORTS GENERATED</h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto font-sans">
            No court reports have been compiled yet. Create a report in the administration panel to summarize recovered files, hashes, and timeline events.
          </p>
          <button
            onClick={() => navigate('/admin/reports')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
          >
            <Plus className="w-4 h-4" />
            CREATE REPORT
          </button>
        </div>
      ) : (
        <div className="space-y-4 font-mono text-xs">
          <div className="rounded-2xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#141f36] bg-[#0c1222]/80 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#131d33]">
                  {reports.map((r) => (
                    <tr key={r.report_id} className="hover:bg-[#0c1324] transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {r.title}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {r.report_type}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {r.author}
                      </td>
                      <td className="py-3 px-4 text-amber-400">
                        {r.classification}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate('/admin/reports')}
                          className="text-cyan-400 hover:underline flex items-center gap-1 ml-auto"
                        >
                          Manage <ArrowRight className="w-3 h-3" />
                        </button>
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
