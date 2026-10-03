import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import type { Case, CasePriority, CaseStatus } from '../types/forensic';
import {
  FolderOpen, Plus, Search, Filter, Trash2, Edit3, Eye,
  AlertTriangle, Shield, Check, X, Calendar, ChevronDown,
  ArrowUpDown, ExternalLink, Archive
} from 'lucide-react';
import clsx from 'clsx';

export default function AdminCasesPage() {
  const navigate = useNavigate();
  const { cases, investigators, createCase, updateCase, deleteCase, archiveCase } = useApp();

  // Filter / Search / Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'case_title' | 'case_number' | 'created_at' | 'updated_at' | 'priority'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

  // Form states for Create/Edit
  const [formData, setFormData] = useState<{
    case_title: string;
    case_number: string;
    investigator: string;
    organization: string;
    priority: CasePriority;
    status: CaseStatus;
    description: string;
    notes: string;
  }>({
    case_title: '',
    case_number: '',
    investigator: '',
    organization: '',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    description: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setFormData({
      case_title: '',
      case_number: `CR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      investigator: investigators.length > 0 ? investigators[0].name : '',
      organization: '',
      priority: 'MEDIUM',
      status: 'ACTIVE',
      description: '',
      notes: '',
    });
    setFormErrors({});
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (c: Case) => {
    setEditingCase(c);
    setFormData({
      case_title: c.case_title,
      case_number: c.case_number,
      investigator: c.investigator,
      organization: c.organization || '',
      priority: c.priority || 'MEDIUM',
      status: c.status,
      description: c.description || '',
      notes: c.notes || '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.case_title.trim()) {
      errors.case_title = 'Case title is required';
    }
    if (!formData.case_number.trim()) {
      errors.case_number = 'Case reference number is required';
    }
    if (!formData.investigator.trim()) {
      errors.investigator = 'Investigator is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    createCase({
      case_title: formData.case_title.trim(),
      case_number: formData.case_number.trim(),
      investigator: formData.investigator.trim(),
      organization: formData.organization.trim() || undefined,
      priority: formData.priority,
      description: formData.description.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });
    setIsCreateOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase || !validateForm()) return;
    updateCase(editingCase.case_id, {
      case_title: formData.case_title.trim(),
      case_number: formData.case_number.trim(),
      investigator: formData.investigator.trim(),
      organization: formData.organization.trim() || undefined,
      priority: formData.priority,
      status: formData.status,
      description: formData.description.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });
    setEditingCase(null);
  };

  const handleDelete = () => {
    if (deletingCaseId) {
      deleteCase(deletingCaseId);
      setDeletingCaseId(null);
    }
  };

  // Filtered & Sorted Cases
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchSearch =
        c.case_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.investigator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.organization && c.organization.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchPriority = priorityFilter === 'ALL' || (c.priority || 'MEDIUM') === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    }).sort((a, b) => {
      let valA: string | number = a[sortField] || '';
      let valB: string | number = b[sortField] || '';
      if (sortField === 'created_at') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [cases, searchQuery, statusFilter, priorityFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / pageSize));
  const paginatedCases = filteredCases.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Cases
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Manage forensic investigations and case metadata.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)] self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          CREATE CASE
        </button>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b] flex flex-wrap items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by case name, reference, or investigator..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="CLOSED">Closed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* Main Table / Empty State */}
      {cases.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <FolderOpen className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200 font-mono tracking-tight">
            NO CASES YET
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1.5 max-w-md mx-auto">
            Create your first forensic investigation to begin tracking evidence and carving remnants.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <Plus className="w-4 h-4" />
            CREATE CASE
          </button>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] p-8 text-center">
          <p className="text-xs text-slate-400 font-mono">No cases match the selected filter criteria.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#141f36] bg-[#0c1222]/80 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 cursor-pointer hover:text-cyan-300" onClick={() => toggleSort('case_number')}>
                    <div className="flex items-center gap-1.5">
                      Case ID
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:text-cyan-300" onClick={() => toggleSort('case_title')}>
                    <div className="flex items-center gap-1.5">
                      Case Name
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Investigator</th>
                  <th className="py-3 px-4 cursor-pointer hover:text-cyan-300" onClick={() => toggleSort('created_at')}>
                    <div className="flex items-center gap-1.5">
                      Created
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:text-cyan-300" onClick={() => toggleSort('updated_at')}>
                    <div className="flex items-center gap-1.5">
                      Updated
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131d33] text-xs font-mono">
                {paginatedCases.map(c => (
                  <tr key={c.case_id} className="hover:bg-[#0e1629]/60 transition-colors group">
                    <td className="py-3 px-4 font-semibold text-cyan-400">
                      {c.case_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{c.case_title}</div>
                      {c.organization && (
                        <div className="text-[10px] text-slate-500 mt-0.5">{c.organization}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-semibold border',
                        c.status === 'ACTIVE' && 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
                        c.status === 'CLOSED' && 'bg-slate-800/60 text-slate-400 border-slate-700/50',
                        c.status === 'ARCHIVED' && 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                      )}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {c.investigator || <span className="text-slate-600">Unassigned</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(c.updated_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={() => navigate(`/cases/${c.case_id}`)}
                          title="View Case Detail"
                          className="p-1.5 rounded-lg bg-[#111b30] hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Case"
                          className="p-1.5 rounded-lg bg-[#111b30] hover:bg-blue-500/20 hover:text-blue-300 text-slate-400 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => archiveCase(c.case_id)}
                          title={c.status === 'ARCHIVED' ? 'Already Archived' : 'Archive Case'}
                          className="p-1.5 rounded-lg bg-[#111b30] hover:bg-amber-500/20 hover:text-amber-300 text-slate-400 transition-colors"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingCaseId(c.case_id)}
                          title="Delete Case"
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
          <div className="py-3 px-4 border-t border-[#141f36] bg-[#0c1222]/50 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <div>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredCases.length)} of {filteredCases.length} cases
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">Create Forensic Case</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#15213b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-6 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Case Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.case_title}
                    onChange={e => setFormData({ ...formData, case_title: e.target.value })}
                    placeholder="e.g. Incident Response Alpha"
                    className={clsx(
                      'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500',
                      formErrors.case_title ? 'border-rose-500/60' : 'border-[#1b2a47]'
                    )}
                  />
                  {formErrors.case_title && (
                    <p className="text-[10px] text-rose-400 mt-1">{formErrors.case_title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Case Reference Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.case_number}
                    onChange={e => setFormData({ ...formData, case_number: e.target.value })}
                    placeholder="e.g. CR-2026-001"
                    className={clsx(
                      'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500',
                      formErrors.case_number ? 'border-rose-500/60' : 'border-[#1b2a47]'
                    )}
                  />
                  {formErrors.case_number && (
                    <p className="text-[10px] text-rose-400 mt-1">{formErrors.case_number}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Lead Investigator <span className="text-rose-400">*</span>
                  </label>
                  {investigators.length > 0 ? (
                    <select
                      value={formData.investigator}
                      onChange={e => setFormData({ ...formData, investigator: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select Investigator</option>
                      {investigators.map(i => (
                        <option key={i.investigator_id} value={i.name}>
                          {i.name} ({i.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.investigator}
                      onChange={e => setFormData({ ...formData, investigator: e.target.value })}
                      placeholder="Investigator name"
                      className={clsx(
                        'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500',
                        formErrors.investigator ? 'border-rose-500/60' : 'border-[#1b2a47]'
                      )}
                    />
                  )}
                  {formErrors.investigator && (
                    <p className="text-[10px] text-rose-400 mt-1">{formErrors.investigator}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Organization / Agency
                  </label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={e => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="e.g. Cyber Forensics Lab"
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as CasePriority })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as CaseStatus })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="CLOSED">Closed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Case objectives, scope, or initial findings..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Private notes for chain of custody or legal tracking..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#16223b]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#121c33] hover:bg-[#182545] text-slate-300 font-mono text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                >
                  Save Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingCase && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Edit Case: {editingCase.case_number}
                </h3>
              </div>
              <button
                onClick={() => setEditingCase(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#15213b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Case Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.case_title}
                    onChange={e => setFormData({ ...formData, case_title: e.target.value })}
                    className={clsx(
                      'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 focus:outline-none focus:border-cyan-500',
                      formErrors.case_title ? 'border-rose-500/60' : 'border-[#1b2a47]'
                    )}
                  />
                  {formErrors.case_title && (
                    <p className="text-[10px] text-rose-400 mt-1">{formErrors.case_title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Case Reference Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.case_number}
                    onChange={e => setFormData({ ...formData, case_number: e.target.value })}
                    className={clsx(
                      'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 focus:outline-none focus:border-cyan-500',
                      formErrors.case_number ? 'border-rose-500/60' : 'border-[#1b2a47]'
                    )}
                  />
                  {formErrors.case_number && (
                    <p className="text-[10px] text-rose-400 mt-1">{formErrors.case_number}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Lead Investigator <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.investigator}
                    onChange={e => setFormData({ ...formData, investigator: e.target.value })}
                    className={clsx(
                      'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 focus:outline-none focus:border-cyan-500',
                      formErrors.investigator ? 'border-rose-500/60' : 'border-[#1b2a47]'
                    )}
                  />
                  {formErrors.investigator && (
                    <p className="text-[10px] text-rose-400 mt-1">{formErrors.investigator}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Organization</label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={e => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as CasePriority })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as CaseStatus })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="CLOSED">Closed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
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
                  onClick={() => setEditingCase(null)}
                  className="px-4 py-2 rounded-xl bg-[#121c33] hover:bg-[#182545] text-slate-300 font-mono text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingCaseId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0a0f1d] border border-rose-500/30 shadow-[0_10px_40px_rgba(244,63,94,0.15)] p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-100">Confirm Case Deletion</h3>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete this forensic case? This action will remove all case metadata and log an audit event.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingCaseId(null)}
                className="px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#18233b] text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              >
                Delete Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
