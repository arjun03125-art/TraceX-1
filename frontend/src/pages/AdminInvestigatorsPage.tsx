import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import type { Investigator, InvestigatorStatus } from '../types/forensic';
import {
  Users, Plus, Search, Filter, Trash2, Edit3, Mail,
  Building, Shield, Check, X, AlertTriangle, ArrowUpDown,
  BadgeCheck, Eye, Archive
} from 'lucide-react';
import clsx from 'clsx';

export default function AdminInvestigatorsPage() {
  const { investigators, createInvestigator, updateInvestigator, deleteInvestigator } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvestigatorStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Investigator | null>(null);
  const [viewingInv, setViewingInv] = useState<Investigator | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    role: string;
    organization: string;
    email: string;
    operator_id: string;
    status: InvestigatorStatus;
    notes: string;
  }>({
    name: '',
    role: '',
    organization: '',
    email: '',
    operator_id: '',
    status: 'ACTIVE',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      role: '',
      organization: '',
      email: '',
      operator_id: '',
      status: 'ACTIVE',
      notes: '',
    });
    setFormErrors({});
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (inv: Investigator) => {
    setEditingInv(inv);
    setFormData({
      name: inv.name,
      role: inv.role,
      organization: inv.organization || '',
      email: inv.email || '',
      operator_id: inv.operator_id || '',
      status: inv.status,
      notes: inv.notes || '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.role.trim()) errors.role = 'Role is required';
    if (formData.email && !formData.email.includes('@')) {
      errors.email = 'Valid email is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    createInvestigator({
      name: formData.name.trim(),
      role: formData.role.trim(),
      organization: formData.organization.trim() || undefined,
      email: formData.email.trim() || undefined,
      operator_id: formData.operator_id.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });
    setIsCreateOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInv || !validateForm()) return;
    updateInvestigator(editingInv.investigator_id, {
      name: formData.name.trim(),
      role: formData.role.trim(),
      organization: formData.organization.trim() || undefined,
      email: formData.email.trim() || undefined,
      operator_id: formData.operator_id.trim() || undefined,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
    });
    setEditingInv(null);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteInvestigator(deletingId);
      setDeletingId(null);
    }
  };

  const filteredInvestigators = useMemo(() => {
    return investigators.filter(inv => {
      const matchSearch =
        inv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.organization && inv.organization.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inv.operator_id && inv.operator_id.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [investigators, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInvestigators.length / pageSize));
  const paginatedList = filteredInvestigators.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Investigators & Examiners
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Manage registered examiners, operators, and agency credentials
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)] self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          ADD INVESTIGATOR
        </button>
      </div>

      {/* Control Bar */}
      <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b] flex flex-wrap items-center justify-between gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by examiner name, role, agency, or operator ID..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Table or Empty State */}
      {investigators.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200 font-mono tracking-tight">
            NO INVESTIGATORS
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1.5 max-w-md mx-auto">
            No investigators have been configured in this workspace. Add an examiner to attribute evidence analysis and sign court reports.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono font-bold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <Plus className="w-4 h-4" />
            ADD INVESTIGATOR
          </button>
        </div>
      ) : filteredInvestigators.length === 0 ? (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] p-8 text-center">
          <p className="text-xs text-slate-400 font-mono">No investigators match your search.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[#141f36] bg-[#0c1222]/80 text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Operator ID</th>
                  <th className="py-3 px-4">Examiner Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131d33]">
                {paginatedList.map(inv => (
                  <tr key={inv.investigator_id} className="hover:bg-[#0e1629]/60 transition-colors group">
                    <td className="py-3 px-4 text-cyan-400 font-semibold">
                      {inv.operator_id || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {inv.name}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {inv.role}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {inv.organization || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {inv.email || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-semibold border',
                        inv.status === 'ACTIVE'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                          : 'bg-slate-800/60 text-slate-400 border-slate-700/50'
                      )}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={() => setViewingInv(inv)}
                          title="View Investigator Dossier"
                          className="p-1.5 rounded-lg bg-[#111b30] hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(inv)}
                          title="Edit Investigator"
                          className="p-1.5 rounded-lg bg-[#111b30] hover:bg-blue-500/20 hover:text-blue-300 text-slate-400 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateInvestigator(inv.investigator_id, { status: inv.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' })}
                          title={inv.status === 'ARCHIVED' ? 'Activate Investigator' : 'Archive Investigator'}
                          className="p-1.5 rounded-lg bg-[#111b30] hover:bg-amber-500/20 hover:text-amber-300 text-slate-400 transition-colors"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(inv.investigator_id)}
                          title="Delete Investigator"
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
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredInvestigators.length)} of {filteredInvestigators.length} investigators
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
          <div className="w-full max-w-lg rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden font-mono text-xs">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Add Investigator</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Elena Rostova"
                  className={clsx(
                    'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 focus:outline-none focus:border-cyan-500',
                    formErrors.name ? 'border-rose-500/60' : 'border-[#1b2a47]'
                  )}
                />
                {formErrors.name && <p className="text-[10px] text-rose-400 mt-1">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Role <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. Senior Digital Forensics Examiner"
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Operator ID</label>
                  <input
                    type="text"
                    value={formData.operator_id}
                    onChange={e => setFormData({ ...formData, operator_id: e.target.value })}
                    placeholder="e.g. OP-842"
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Organization / Agency</label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={e => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="e.g. Forensic Services Bureau"
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="examiner@lab.org"
                    className={clsx(
                      'w-full px-3 py-2 rounded-lg bg-[#0d1527] border text-slate-200 focus:outline-none focus:border-cyan-500',
                      formErrors.email ? 'border-rose-500/60' : 'border-[#1b2a47]'
                    )}
                  />
                  {formErrors.email && <p className="text-[10px] text-rose-400 mt-1">{formErrors.email}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Notes / Credentials</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Certifications (GCFA, EnCE), jurisdiction, or internal notes..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
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
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                >
                  Save Investigator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingInv && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden font-mono text-xs">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Edit Investigator: {editingInv.name}</h3>
              </div>
              <button onClick={() => setEditingInv(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Operator ID</label>
                  <input
                    type="text"
                    value={formData.operator_id}
                    onChange={e => setFormData({ ...formData, operator_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Organization</label>
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={e => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as InvestigatorStatus })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
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
                  onClick={() => setEditingInv(null)}
                  className="px-4 py-2 rounded-xl bg-[#121c33] text-slate-300 hover:bg-[#182545]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.25)]"
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
              <h3 className="text-sm font-bold text-slate-100">Delete Investigator</h3>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Are you sure you want to remove this investigator? This will be logged in the cryptographic audit log.
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
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* VIEW INVESTIGATOR DOSSIER MODAL */}
      {viewingInv && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden font-mono text-xs">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Investigator Dossier</h3>
              </div>
              <button onClick={() => setViewingInv(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-100">{viewingInv.name}</h4>
                  <p className="text-xs text-cyan-400 font-semibold mt-0.5">{viewingInv.role}</p>
                </div>
                <span className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-semibold border',
                  viewingInv.status === 'ACTIVE' && 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
                  viewingInv.status === 'INACTIVE' && 'bg-slate-800/60 text-slate-400 border-slate-700/50',
                  viewingInv.status === 'ARCHIVED' && 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                )}>
                  {viewingInv.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742]">
                  <div className="text-[10px] text-slate-500 uppercase">Operator ID</div>
                  <div className="text-slate-200 font-bold mt-0.5">{viewingInv.operator_id || 'Not assigned'}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742]">
                  <div className="text-[10px] text-slate-500 uppercase">Organization</div>
                  <div className="text-slate-200 font-bold mt-0.5">{viewingInv.organization || 'Not assigned'}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742] col-span-2">
                  <div className="text-[10px] text-slate-500 uppercase">Official Email</div>
                  <div className="text-slate-200 mt-0.5">{viewingInv.email || 'None registered'}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742] col-span-2">
                  <div className="text-[10px] text-slate-500 uppercase">Registered Timestamp</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{new Date(viewingInv.created_at).toUTCString()}</div>
                </div>
                {viewingInv.notes && (
                  <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1b2742] col-span-2">
                    <div className="text-[10px] text-slate-500 uppercase">Operational Notes</div>
                    <div className="text-slate-300 text-xs mt-0.5 whitespace-pre-wrap">{viewingInv.notes}</div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#16223b]">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingInv;
                    setViewingInv(null);
                    handleOpenEdit(toEdit);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
                >
                  Edit Investigator
                </button>
                <button
                  type="button"
                  onClick={() => setViewingInv(null)}
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
