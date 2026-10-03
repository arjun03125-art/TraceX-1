import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import type { Evidence, EvidenceFormat, EvidenceStatus } from '../types/forensic';
import {
  HardDrive, Plus, Search, Filter, Trash2, Edit3, Shield,
  CheckCircle2, AlertCircle, Clock, Database, X, AlertTriangle,
  FolderOpen, FileCode, Check, Eye
} from 'lucide-react';
import clsx from 'clsx';

export default function AdminEvidencePage() {
  const { evidence, cases, createEvidence, updateEvidence, deleteEvidence } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
  const [viewingEvidence, setViewingEvidence] = useState<Evidence | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    source_path: string;
    format: EvidenceFormat;
    case_id: string;
    description: string;
    notes: string;
  }>({
    name: '',
    source_path: '',
    format: 'RAW',
    case_id: '',
    description: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      source_path: '',
      format: 'RAW',
      case_id: cases.length > 0 ? cases[0].case_id : '',
      description: '',
      notes: '',
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  const handleOpenEdit = (ev: Evidence) => {
    setEditingEvidence(ev);
    setFormData({
      name: ev.name,
      source_path: ev.source_path,
      format: (ev.format as EvidenceFormat) || 'RAW',
      case_id: ev.case_id,
      description: ev.description || '',
      notes: ev.notes || '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Evidence name is required';
    if (!formData.source_path.trim()) errors.source_path = 'Source path or disk image is required';
    if (!formData.case_id) errors.case_id = 'Case association is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    createEvidence({
      case_id: formData.case_id,
      name: formData.name.trim(),
      source_path: formData.source_path.trim(),
      format: formData.format,
      description: formData.description.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });
    setIsAddOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvidence || !validateForm()) return;
    updateEvidence(editingEvidence.evidence_id, {
      name: formData.name.trim(),
      source_path: formData.source_path.trim(),
      format: formData.format,
      description: formData.description.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });
    setEditingEvidence(null);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteEvidence(deletingId);
      setDeletingId(null);
    }
  };

  const filteredEvidence = useMemo(() => {
    return evidence.filter(ev => {
      const matchSearch =
        ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.source_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.hash_sha256 && ev.hash_sha256.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchFormat = formatFilter === 'ALL' || ev.format === formatFilter;
      const matchStatus = statusFilter === 'ALL' || ev.status === statusFilter;

      return matchSearch && matchFormat && matchStatus;
    });
  }, [evidence, searchQuery, formatFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEvidence.length / pageSize));
  const paginatedList = filteredEvidence.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getCaseName = (id: string) => {
    const c = cases.find(item => item.case_id === id);
    return c ? `${c.case_number} (${c.case_title})` : id;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Evidence Management
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Register disk images, physical drives, and logical sources
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)] self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          ADD EVIDENCE
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
              placeholder="Search evidence by name, file path, or SHA-256..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={formatFilter}
            onChange={e => { setFormatFilter(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">All Formats</option>
            <option value="RAW">RAW (.dd, .raw, .img)</option>
            <option value="E01">Expert Witness (.E01)</option>
            <option value="VMDK">VMware (.vmdk)</option>
            <option value="VHD">Virtual Hard Disk (.vhd)</option>
            <option value="PHYSICAL_DRIVE">Physical Block Drive</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="READY">Ready</option>
            <option value="INGESTING">Ingesting</option>
            <option value="ANALYZING">Analyzing</option>
            <option value="ERROR">Error</option>
          </select>
        </div>
      </div>

      {/* Main Table / Empty State */}
      {evidence.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <HardDrive className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200 tracking-tight">
            NO EVIDENCE SOURCES
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
            Add an evidence image, disk source, mounted source, or supported evidence input to begin forensic extraction.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <Plus className="w-4 h-4" />
            ADD EVIDENCE
          </button>
        </div>
      ) : filteredEvidence.length === 0 ? (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] p-8 text-center font-mono">
          <p className="text-xs text-slate-400">No evidence sources match the filter criteria.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)] font-mono text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#141f36] bg-[#0c1222]/80 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Evidence Source</th>
                  <th className="py-3 px-4">Case</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Filesystem</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Hash (SHA-256)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131d33]">
                {paginatedList.map(ev => (
                  <tr key={ev.evidence_id} className="hover:bg-[#0e1629]/60 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{ev.name}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-xs">{ev.source_path}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {getCaseName(ev.case_id)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-1.5 py-0.5 rounded bg-[#131c33] border border-[#1c2c4d] text-[10px] text-cyan-300">
                        {ev.format}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {ev.detected_fs ? (
                        <span className="text-emerald-400">{ev.detected_fs}</span>
                      ) : (
                        <span className="text-slate-500">Pending analysis</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {ev.size_bytes ? `${(ev.size_bytes / (1024 * 1024)).toFixed(1)} MB` : <span className="text-slate-500">Not available</span>}
                    </td>
                    <td className="py-3 px-4">
                      {ev.hash_sha256 ? (
                        <span className="text-emerald-400 font-mono text-[10px]" title={ev.hash_sha256}>
                          {ev.hash_sha256.substring(0, 12)}...
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-semibold border',
                        ev.status === 'READY' && 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
                        ev.status === 'ANALYZING' && 'bg-blue-950/40 text-blue-400 border-blue-800/40',
                        ev.status === 'INGESTING' && 'bg-cyan-950/40 text-cyan-400 border-cyan-800/40',
                        ev.status === 'ERROR' && 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                      )}>
                        {ev.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={() => setViewingEvidence(ev)}
                          title="View Evidence Dossier"
                          className="p-1.5 rounded-lg bg-[#111b30] hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(ev)}
                          title="Edit Evidence Metadata"
                          className="p-1.5 rounded-lg bg-[#111b30] hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(ev.evidence_id)}
                          title="Delete Evidence"
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
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredEvidence.length)} of {filteredEvidence.length} sources
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

      {/* ADD EVIDENCE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
          <div className="w-full max-w-xl rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Attach Evidence Source</h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Evidence Label / Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Primary NVMe Disk Image"
                  className={clsx(
                    'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 focus:outline-none focus:border-cyan-500',
                    formErrors.name ? 'border-rose-500/60' : 'border-[#1b2a47]'
                  )}
                />
                {formErrors.name && <p className="text-[10px] text-rose-400 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Source File Path or Device <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.source_path}
                  onChange={e => setFormData({ ...formData, source_path: e.target.value })}
                  placeholder="e.g. /dev/sdb or C:\Forensic\evidence.raw"
                  className={clsx(
                    'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 focus:outline-none focus:border-cyan-500',
                    formErrors.source_path ? 'border-rose-500/60' : 'border-[#1b2a47]'
                  )}
                />
                {formErrors.source_path && <p className="text-[10px] text-rose-400 mt-1">{formErrors.source_path}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Associate with Case <span className="text-rose-400">*</span>
                  </label>
                  {cases.length > 0 ? (
                    <select
                      value={formData.case_id}
                      onChange={e => setFormData({ ...formData, case_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select Case</option>
                      {cases.map(c => (
                        <option key={c.case_id} value={c.case_id}>
                          {c.case_number} — {c.case_title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-[11px] text-amber-400 py-1">
                      No cases exist. Create a case first.
                    </div>
                  )}
                  {formErrors.case_id && <p className="text-[10px] text-rose-400 mt-1">{formErrors.case_id}</p>}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Evidence Type / Format</label>
                  <select
                    value={formData.format}
                    onChange={e => setFormData({ ...formData, format: e.target.value as EvidenceFormat })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="RAW">RAW Image (.raw, .dd, .img)</option>
                    <option value="E01">E01 Expert Witness</option>
                    <option value="VMDK">VMDK Virtual Disk</option>
                    <option value="VHD">VHD / VHDX Disk</option>
                    <option value="PHYSICAL_DRIVE">Direct Block Device</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Device serial number, acquisition conditions, hardware details..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Chain of Custody Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Custody transfer log or storage location..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#16223b]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#121c33] text-slate-300 hover:bg-[#182545]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cases.length === 0}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-40"
                >
                  Add Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EVIDENCE MODAL */}
      {editingEvidence && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
          <div className="w-full max-w-xl rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Edit Evidence: {editingEvidence.name}</h3>
              </div>
              <button onClick={() => setEditingEvidence(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Evidence Label</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Source Path</label>
                <input
                  type="text"
                  value={formData.source_path}
                  onChange={e => setFormData({ ...formData, source_path: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Format</label>
                <select
                  value={formData.format}
                  onChange={e => setFormData({ ...formData, format: e.target.value as EvidenceFormat })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="RAW">RAW Image</option>
                  <option value="E01">E01 Expert Witness</option>
                  <option value="VMDK">VMDK Virtual Disk</option>
                  <option value="VHD">VHD / VHDX Disk</option>
                  <option value="PHYSICAL_DRIVE">Direct Block Device</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#16223b]">
                <button
                  type="button"
                  onClick={() => setEditingEvidence(null)}
                  className="px-4 py-2 rounded-xl bg-[#121c33] text-slate-300 hover:bg-[#182545]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)]"
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
              <h3 className="text-sm font-bold text-slate-100">Delete Evidence Source</h3>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Are you sure you want to remove this evidence source? Associated metadata and logs will be permanently updated.
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
                Delete Source
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW EVIDENCE DOSSIER MODAL */}
      {viewingEvidence && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden font-mono text-xs">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Evidence Source Metadata</h3>
              </div>
              <button onClick={() => setViewingEvidence(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-100">{viewingEvidence.name}</h4>
                  <p className="text-[11px] text-cyan-400 font-mono mt-0.5">{viewingEvidence.source_path}</p>
                </div>
                <span className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border',
                  viewingEvidence.status === 'READY' && 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
                  viewingEvidence.status === 'ANALYZING' && 'bg-blue-950/40 text-blue-400 border-blue-800/40',
                  viewingEvidence.status === 'INGESTING' && 'bg-cyan-950/40 text-cyan-400 border-cyan-800/40',
                  viewingEvidence.status === 'ERROR' && 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                )}>
                  {viewingEvidence.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742]">
                  <div className="text-[10px] text-slate-500 uppercase">Evidence ID</div>
                  <div className="text-slate-200 font-bold mt-0.5 truncate">{viewingEvidence.evidence_id}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742]">
                  <div className="text-[10px] text-slate-500 uppercase">Associated Case</div>
                  <div className="text-slate-200 font-bold mt-0.5 truncate">{getCaseName(viewingEvidence.case_id)}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742]">
                  <div className="text-[10px] text-slate-500 uppercase">Image Format</div>
                  <div className="text-cyan-300 font-bold mt-0.5">{viewingEvidence.format}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742]">
                  <div className="text-[10px] text-slate-500 uppercase">Filesystem Remnants</div>
                  <div className="text-slate-200 mt-0.5">{viewingEvidence.detected_fs || <span className="text-slate-500">Pending analysis</span>}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742]">
                  <div className="text-[10px] text-slate-500 uppercase">Image Size</div>
                  <div className="text-slate-200 mt-0.5">{viewingEvidence.size_bytes ? `${(viewingEvidence.size_bytes / (1024 * 1024)).toFixed(1)} MB` : <span className="text-slate-500">Not available</span>}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742]">
                  <div className="text-[10px] text-slate-500 uppercase">Added Timestamp</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{new Date(viewingEvidence.added_at).toUTCString()}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742] col-span-2">
                  <div className="text-[10px] text-slate-500 uppercase">Cryptographic Hash (SHA-256)</div>
                  <div className="text-emerald-400 font-mono text-[11px] mt-0.5 break-all">
                    {viewingEvidence.hash_sha256 || <span className="text-slate-500">Pending analysis</span>}
                  </div>
                </div>
                {viewingEvidence.description && (
                  <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742] col-span-2">
                    <div className="text-[10px] text-slate-500 uppercase">Acquisition Description</div>
                    <div className="text-slate-300 text-xs mt-0.5 whitespace-pre-wrap">{viewingEvidence.description}</div>
                  </div>
                )}
                {viewingEvidence.notes && (
                  <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742] col-span-2">
                    <div className="text-[10px] text-slate-500 uppercase">Forensic Notes</div>
                    <div className="text-slate-300 text-xs mt-0.5 whitespace-pre-wrap">{viewingEvidence.notes}</div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#16223b]">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingEvidence;
                    setViewingEvidence(null);
                    handleOpenEdit(toEdit);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors"
                >
                  Edit Metadata
                </button>
                <button
                  type="button"
                  onClick={() => setViewingEvidence(null)}
                  className="px-4 py-2 rounded-xl bg-[#10182b] text-slate-300 hover:bg-[#15213b] text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
