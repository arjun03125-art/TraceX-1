import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import type { Report, ReportType } from '../types/forensic';
import {
  FileText, Plus, Search, Filter, Trash2, Edit3, Download,
  CheckCircle2, Clock, Shield, AlertTriangle, X, FileCheck
} from 'lucide-react';
import clsx from 'clsx';

export default function AdminReportsPage() {
  const { reports, cases, investigators, createReport, updateReport, deleteReport } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    case_id: string;
    title: string;
    report_type: ReportType;
    author: string;
    classification: string;
    status: 'DRAFT' | 'FINAL' | 'ARCHIVED';
    summary: string;
  }>({
    case_id: '',
    title: '',
    report_type: 'COMPREHENSIVE',
    author: '',
    classification: 'LAW_ENFORCEMENT_SENSITIVE',
    status: 'DRAFT',
    summary: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setFormData({
      case_id: cases.length > 0 ? cases[0].case_id : '',
      title: '',
      report_type: 'COMPREHENSIVE',
      author: investigators.length > 0 ? investigators[0].name : '',
      classification: 'LAW_ENFORCEMENT_SENSITIVE',
      status: 'DRAFT',
      summary: '',
    });
    setFormErrors({});
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (r: Report) => {
    setEditingReport(r);
    setFormData({
      case_id: r.case_id,
      title: r.title,
      report_type: (r.report_type as ReportType) || 'COMPREHENSIVE',
      author: r.author || '',
      classification: r.classification || 'LAW_ENFORCEMENT_SENSITIVE',
      status: r.status,
      summary: r.summary || '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'Report title is required';
    if (!formData.case_id) errors.case_id = 'Associated case is required';
    if (!formData.author.trim()) errors.author = 'Author / Examiner is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    createReport({
      case_id: formData.case_id,
      title: formData.title.trim(),
      report_type: formData.report_type,
      author: formData.author.trim(),
      classification: formData.classification,
      summary: formData.summary.trim() || undefined,
    });
    setIsCreateOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !validateForm()) return;
    updateReport(editingReport.report_id, {
      title: formData.title.trim(),
      report_type: formData.report_type,
      author: formData.author.trim(),
      classification: formData.classification,
      status: formData.status,
      summary: formData.summary.trim() || undefined,
    });
    setEditingReport(null);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteReport(deletingId);
      setDeletingId(null);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.author ? r.author.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
        (r.classification && r.classification.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = typeFilter === 'ALL' || r.report_type === typeFilter;
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [reports, searchQuery, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const paginatedList = filteredReports.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getCaseNumber = (id: string) => {
    const c = cases.find(item => item.case_id === id);
    return c ? c.case_number : id;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Court & Forensic Reports
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Generate, sign, and export court-admissible forensic documentation
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)] self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          CREATE REPORT
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
              placeholder="Search reports by title, examiner, or classification..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL">All Report Types</option>
            <option value="COMPREHENSIVE">Comprehensive Investigation</option>
            <option value="TIMELINE">Timeline Analysis</option>
            <option value="EVIDENCE_SUMMARY">Evidence Summary</option>
            <option value="CHAIN_OF_CUSTODY">Chain of Custody</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="FINAL">Final (Signed)</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Main Table / Empty State */}
      {reports.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200 tracking-tight">
            NO REPORTS
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
            No reports have been generated. Compile court documentation summarizing recovered files and timeline events.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
          >
            <Plus className="w-4 h-4" />
            CREATE REPORT
          </button>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] p-8 text-center font-mono">
          <p className="text-xs text-slate-400">No reports match the filter criteria.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)] font-mono text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#141f36] bg-[#0c1222]/80 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Report Title</th>
                  <th className="py-3 px-4">Case Ref</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131d33]">
                {paginatedList.map(r => (
                  <tr key={r.report_id} className="hover:bg-[#0e1629]/60 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{r.title}</div>
                      {r.summary && <div className="text-[10px] text-slate-500 truncate max-w-xs">{r.summary}</div>}
                    </td>
                    <td className="py-3 px-4 text-cyan-400 font-semibold">
                      {getCaseNumber(r.case_id)}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#101b30] border border-[#1b2f52] text-slate-300">
                        {r.report_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] text-amber-400">
                        {r.classification || 'UNCLASSIFIED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {r.author}
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-semibold border',
                        r.status === 'FINAL' && 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
                        r.status === 'DRAFT' && 'bg-amber-950/40 text-amber-400 border-amber-800/40',
                        r.status === 'ARCHIVED' && 'bg-slate-800/60 text-slate-400 border-slate-700/50'
                      )}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          title="Edit Report"
                          className="p-1.5 rounded-lg bg-[#111b30] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(r.report_id)}
                          title="Delete Report"
                          className="p-1.5 rounded-lg bg-[#111b30] hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="py-3 px-4 border-t border-[#141f36] bg-[#0c1222]/50 flex items-center justify-between text-[11px] text-slate-400">
            <div>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredReports.length)} of {filteredReports.length} reports
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

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
          <div className="w-full max-w-xl rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Generate Court Report</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Report Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Expert Forensic Inode Carving Report"
                  className={clsx(
                    'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 focus:outline-none focus:border-emerald-500',
                    formErrors.title ? 'border-rose-500/60' : 'border-[#1b2a47]'
                  )}
                />
                {formErrors.title && <p className="text-[10px] text-rose-400 mt-1">{formErrors.title}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Associate Case <span className="text-rose-400">*</span>
                  </label>
                  {cases.length > 0 ? (
                    <select
                      value={formData.case_id}
                      onChange={e => setFormData({ ...formData, case_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select Case</option>
                      {cases.map(c => (
                        <option key={c.case_id} value={c.case_id}>
                          {c.case_number} — {c.case_title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-[11px] text-amber-400 py-1">No cases exist. Create a case first.</div>
                  )}
                  {formErrors.case_id && <p className="text-[10px] text-rose-400 mt-1">{formErrors.case_id}</p>}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Report Type</label>
                  <select
                    value={formData.report_type}
                    onChange={e => setFormData({ ...formData, report_type: e.target.value as ReportType })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="COMPREHENSIVE">Comprehensive Investigation</option>
                    <option value="TIMELINE">Timeline Analysis</option>
                    <option value="EVIDENCE_SUMMARY">Evidence Summary</option>
                    <option value="CHAIN_OF_CUSTODY">Chain of Custody</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Author / Lead Examiner <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Examiner name"
                    className={clsx(
                      'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 focus:outline-none focus:border-emerald-500',
                      formErrors.author ? 'border-rose-500/60' : 'border-[#1b2a47]'
                    )}
                  />
                  {formErrors.author && <p className="text-[10px] text-rose-400 mt-1">{formErrors.author}</p>}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Classification</label>
                  <select
                    value={formData.classification}
                    onChange={e => setFormData({ ...formData, classification: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LAW_ENFORCEMENT_SENSITIVE">Law Enforcement Sensitive</option>
                    <option value="CONFIDENTIAL">Confidential</option>
                    <option value="PRIVILEGED_WORK_PRODUCT">Privileged Work Product</option>
                    <option value="PUBLIC">Public</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Executive Summary</label>
                <textarea
                  rows={3}
                  value={formData.summary}
                  onChange={e => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Summary of findings, methodology, and verified cryptographic hashes..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#16223b]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#121c33] text-slate-300 hover:bg-[#182545]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cases.length === 0}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-40"
                >
                  Create Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingReport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
          <div className="w-full max-w-xl rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Edit Report</h3>
              </div>
              <button onClick={() => setEditingReport(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'DRAFT' | 'FINAL' | 'ARCHIVED' })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="FINAL">Final (Signed)</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Summary</label>
                <textarea
                  rows={3}
                  value={formData.summary}
                  onChange={e => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#16223b]">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2 rounded-xl bg-[#121c33] text-slate-300 hover:bg-[#182545]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#0a0f1d] border border-rose-500/30 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Delete Court Report</h3>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Are you sure you want to delete this report? This action will be logged in the cryptographic audit log.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl bg-[#131b2e] text-slate-300 hover:bg-[#18233b]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              >
                Delete Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
