import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import type { CasePriority, CaseStatus } from '../types/forensic';
import {
  FolderOpen, ArrowLeft, Calendar, Shield, User, Building,
  FileText, HardDrive, Cpu, Clock, ScrollText, CheckCircle2,
  AlertCircle, Plus, Edit3, Trash2, X, ExternalLink
} from 'lucide-react';
import clsx from 'clsx';

type TabKey = 'overview' | 'evidence' | 'analysis' | 'recovery' | 'timeline' | 'reports' | 'audit';

export default function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { cases, evidence, reports, auditEvents, updateCase, deleteCase } = useApp();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isEditOpen, setIsEditOpen] = useState(false);

  const currentCase = cases.find(c => c.case_id === caseId || c.case_number === caseId);

  // Edit form state
  const [formData, setFormData] = useState({
    case_title: '',
    case_number: '',
    investigator: '',
    organization: '',
    priority: 'MEDIUM' as CasePriority,
    status: 'ACTIVE' as CaseStatus,
    description: '',
    notes: '',
  });

  const caseEvidence = useMemo(() => {
    if (!currentCase) return [];
    return evidence.filter(e => e.case_id === currentCase.case_id);
  }, [evidence, currentCase]);

  const caseReports = useMemo(() => {
    if (!currentCase) return [];
    return reports.filter(r => r.case_id === currentCase.case_id);
  }, [reports, currentCase]);

  const caseAuditEvents = useMemo(() => {
    if (!currentCase) return [];
    return auditEvents.filter(a => a.case_id === currentCase.case_id);
  }, [auditEvents, currentCase]);

  if (!currentCase) {
    return (
      <div className="p-12 text-center max-w-xl mx-auto font-mono">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-base font-bold text-slate-200">CASE NOT FOUND</h2>
        <p className="text-xs text-slate-500 mt-2">
          The requested case ID <code className="text-cyan-400">{caseId}</code> does not exist or has been removed.
        </p>
        <button
          onClick={() => navigate('/admin/cases')}
          className="mt-6 px-4 py-2 rounded-xl bg-[#121c33] hover:bg-[#182545] text-slate-200 text-xs transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cases
        </button>
      </div>
    );
  }

  const handleOpenEdit = () => {
    setFormData({
      case_title: currentCase.case_title,
      case_number: currentCase.case_number,
      investigator: currentCase.investigator,
      organization: currentCase.organization || '',
      priority: currentCase.priority || 'MEDIUM',
      status: currentCase.status,
      description: currentCase.description || '',
      notes: currentCase.notes || '',
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCase(currentCase.case_id, {
      case_title: formData.case_title.trim(),
      case_number: formData.case_number.trim(),
      investigator: formData.investigator.trim(),
      organization: formData.organization.trim() || undefined,
      priority: formData.priority,
      status: formData.status,
      description: formData.description.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });
    setIsEditOpen(false);
  };

  const tabs: { key: TabKey; label: string; count?: number; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: FolderOpen },
    { key: 'evidence', label: 'Evidence', count: caseEvidence.length, icon: HardDrive },
    { key: 'analysis', label: 'Analysis', icon: Cpu },
    { key: 'recovery', label: 'Recovery', icon: CheckCircle2 },
    { key: 'timeline', label: 'Timeline', icon: Clock },
    { key: 'reports', label: 'Reports', count: caseReports.length, icon: FileText },
    { key: 'audit', label: 'Audit Trail', count: caseAuditEvents.length, icon: ScrollText },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/cases')}
            className="p-2 rounded-xl bg-[#0d1424] hover:bg-[#121c33] border border-[#1b2742] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400">
                {currentCase.case_number}
              </span>
              <span className={clsx(
                'px-2 py-0.5 rounded text-[10px] font-mono font-semibold border',
                currentCase.status === 'ACTIVE' && 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
                currentCase.status === 'CLOSED' && 'bg-slate-800/60 text-slate-400 border-slate-700/50',
                currentCase.status === 'ARCHIVED' && 'bg-amber-950/40 text-amber-400 border-amber-800/40'
              )}>
                {currentCase.status}
              </span>
              <span className={clsx(
                'px-1.5 py-0.5 rounded text-[10px] font-mono border',
                currentCase.priority === 'CRITICAL' && 'text-rose-400 border-rose-800/40 bg-rose-950/30',
                currentCase.priority === 'HIGH' && 'text-amber-400 border-amber-800/40 bg-amber-950/30',
                currentCase.priority === 'MEDIUM' && 'text-blue-400 border-blue-800/40 bg-blue-950/30',
                currentCase.priority === 'LOW' && 'text-slate-400 border-slate-700/40 bg-slate-900/40'
              )}>
                {currentCase.priority || 'MEDIUM'} PRIORITY
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 font-mono mt-1">
              {currentCase.case_title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
          <button
            onClick={handleOpenEdit}
            className="px-3.5 py-2 rounded-xl bg-[#0f172a] hover:bg-[#152342] border border-[#1e2f52] text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            Edit Case
          </button>
          <button
            onClick={() => navigate('/admin/evidence')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Evidence
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[#152138] overflow-x-auto custom-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-b-2 transition-all duration-150 whitespace-nowrap',
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              )}
            >
              <Icon className={clsx('w-3.5 h-3.5', isActive ? 'text-cyan-400' : 'text-slate-500')} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={clsx(
                  'px-1.5 py-0.2 rounded-full text-[10px]',
                  isActive ? 'bg-cyan-900/60 text-cyan-300' : 'bg-slate-800 text-slate-400'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
          <div className="lg:col-span-2 space-y-6">
            {/* Description & Scope */}
            <div className="p-5 rounded-xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Case Description & Scope
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {currentCase.description || <span className="text-slate-500 italic">No description provided for this investigation.</span>}
              </p>
            </div>

            {/* Internal Notes */}
            <div className="p-5 rounded-xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Investigation Notes
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {currentCase.notes || <span className="text-slate-500 italic">No private case notes recorded.</span>}
              </p>
            </div>

            {/* Attached Evidence Preview */}
            <div className="p-5 rounded-xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  Attached Evidence Sources ({caseEvidence.length})
                </h3>
                <button
                  onClick={() => navigate('/admin/evidence')}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Source
                </button>
              </div>
              {caseEvidence.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  No evidence sources attached to this case yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {caseEvidence.map(e => (
                    <div key={e.evidence_id} className="p-3 rounded-lg bg-[#0d1424] border border-[#1a2640] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">{e.name}</div>
                        <div className="text-[10px] text-slate-500">{e.source_path} • {e.format}</div>
                      </div>
                      <span className="text-[10px] text-cyan-400">{e.size_bytes ? `${(e.size_bytes / (1024 * 1024)).toFixed(1)} MB` : 'Pending'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Metadata Card */}
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-4 text-xs">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-[#141f36] pb-2">
                Case Metadata
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Case ID</div>
                  <div className="font-bold text-slate-200 mt-0.5 select-all">{currentCase.case_id}</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Reference Number</div>
                  <div className="font-bold text-cyan-400 mt-0.5">{currentCase.case_number}</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Lead Investigator</div>
                  <div className="font-bold text-slate-200 mt-0.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    {currentCase.investigator}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Organization</div>
                  <div className="font-bold text-slate-300 mt-0.5 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    {currentCase.organization || 'Not specified'}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Created Date</div>
                  <div className="text-slate-300 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(currentCase.created_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Last Updated</div>
                  <div className="text-slate-300 mt-0.5">
                    {new Date(currentCase.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Evidence */}
      {activeTab === 'evidence' && (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] p-6 shadow-[0_4px_25px_rgba(0,0,0,0.3)] font-mono">
          <div className="flex items-center justify-between pb-4 border-b border-[#141f36]">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Attached Evidence Images</h3>
              <p className="text-xs text-slate-400 mt-0.5">Disk images, logical mounts, and raw dumps linked to this case</p>
            </div>
            <button
              onClick={() => navigate('/admin/evidence')}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              ADD EVIDENCE
            </button>
          </div>

          {caseEvidence.length === 0 ? (
            <div className="py-12 text-center">
              <HardDrive className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-300">NO EVIDENCE SOURCES</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No evidence has been attached to this case. Add an evidence image to begin file carving.
              </p>
              <button
                onClick={() => navigate('/admin/evidence')}
                className="mt-4 px-4 py-2 rounded-xl bg-[#121c33] hover:bg-[#182545] text-cyan-300 text-xs transition-colors inline-flex items-center gap-2 border border-cyan-500/30"
              >
                <Plus className="w-3.5 h-3.5" />
                ADD EVIDENCE
              </button>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-[#141f36]">
              {caseEvidence.map(e => (
                <div key={e.evidence_id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-200">{e.name}</div>
                    <div className="text-[10px] text-slate-500">{e.source_path} • {e.format} • Hash: {e.hash_sha256 ? e.hash_sha256.substring(0, 16) + '...' : 'Pending analysis'}</div>
                  </div>
                  <button
                    onClick={() => navigate('/admin/evidence')}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Analysis */}
      {activeTab === 'analysis' && (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] p-12 text-center font-mono">
          <Cpu className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-300">ANALYSIS PENDING</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            No analysis has been initiated for this case. Attach and mount an evidence image in the forensic workspace to trigger inode parsing and carving.
          </p>
          <button
            onClick={() => navigate('/evidence')}
            className="mt-4 px-4 py-2 rounded-xl bg-[#121c33] hover:bg-[#182545] text-cyan-300 text-xs transition-colors inline-flex items-center gap-2 border border-cyan-500/30"
          >
            Go to Evidence Workspace
          </button>
        </div>
      )}

      {/* TAB CONTENT: Recovery */}
      {activeTab === 'recovery' && (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] p-12 text-center font-mono">
          <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-300">NO RECOVERED FILES</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            No files have been recovered yet for this case. Run the carving engine on analyzed evidence remnants to extract deleted data.
          </p>
          <button
            onClick={() => navigate('/recovered')}
            className="mt-4 px-4 py-2 rounded-xl bg-[#121c33] hover:bg-[#182545] text-cyan-300 text-xs transition-colors inline-flex items-center gap-2 border border-cyan-500/30"
          >
            Open Recovery Engine
          </button>
        </div>
      )}

      {/* TAB CONTENT: Timeline */}
      {activeTab === 'timeline' && (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] p-12 text-center font-mono">
          <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-300">NO TIMELINE EVENTS</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Chronological forensic events will populate automatically as metadata (MACB timestamps) is extracted from evidence inodes.
          </p>
        </div>
      )}

      {/* TAB CONTENT: Reports */}
      {activeTab === 'reports' && (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] p-6 font-mono">
          <div className="flex items-center justify-between pb-4 border-b border-[#141f36]">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Court Reports</h3>
              <p className="text-xs text-slate-400 mt-0.5">Court-admissible forensic documentation generated for this case</p>
            </div>
            <button
              onClick={() => navigate('/admin/reports')}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              CREATE REPORT
            </button>
          </div>

          {caseReports.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-300">NO REPORTS GENERATED</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No court reports have been compiled for this case.
              </p>
              <button
                onClick={() => navigate('/admin/reports')}
                className="mt-4 px-4 py-2 rounded-xl bg-[#121c33] hover:bg-[#182545] text-cyan-300 text-xs transition-colors inline-flex items-center gap-2 border border-cyan-500/30"
              >
                <Plus className="w-3.5 h-3.5" />
                CREATE REPORT
              </button>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-[#141f36]">
              {caseReports.map(r => (
                <div key={r.report_id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-200">{r.title}</div>
                    <div className="text-[10px] text-slate-500">{r.classification} • Author: {r.author} • {new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="rounded-xl bg-[#080d19] border border-[#152138] p-6 font-mono">
          <div className="pb-4 border-b border-[#141f36]">
            <h3 className="text-sm font-bold text-slate-200">Case Audit Log</h3>
            <p className="text-xs text-slate-400 mt-0.5">Cryptographic log of all actions associated with this case ID</p>
          </div>

          {caseAuditEvents.length === 0 ? (
            <div className="py-12 text-center">
              <ScrollText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-300">NO AUDIT ACTIVITY</h4>
              <p className="text-xs text-slate-500 mt-1">
                Audit events are recorded when case metadata or evidence is modified.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-[#141f36]">
              {caseAuditEvents.map(a => (
                <div key={a.event_id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-cyan-400 mr-2">{a.action}</span>
                    <span className="text-slate-400">{a.details}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(a.event_time).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Edit Case: {currentCase.case_number}
                </h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#15213b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Case Name</label>
                  <input
                    type="text"
                    value={formData.case_title}
                    onChange={e => setFormData({ ...formData, case_title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Case Reference Number</label>
                  <input
                    type="text"
                    value={formData.case_number}
                    onChange={e => setFormData({ ...formData, case_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Lead Investigator</label>
                  <input
                    type="text"
                    value={formData.investigator}
                    onChange={e => setFormData({ ...formData, investigator: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
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
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#121c33] hover:bg-[#182545] text-slate-300 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
