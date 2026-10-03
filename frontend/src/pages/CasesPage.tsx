import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Plus, Search, Calendar, User, Building,
  FileText, ArrowRight, X, ExternalLink, CheckCircle2, Activity, Sparkles, ShieldCheck
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import clsx from 'clsx';

export default function CasesPage() {
  const navigate = useNavigate();
  const { cases, investigators, createCase } = useApp();

  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases.length > 0 ? cases[0].case_id : '');
  const [search, setSearch] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // New Case Form
  const [caseNumber, setCaseNumber] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [investigator, setInvestigator] = useState('');
  const [organization, setOrganization] = useState('');
  const [description, setDescription] = useState('');

  const selectedCase = cases.find(c => c.case_id === selectedCaseId) || (cases.length > 0 ? cases[0] : null);

  const filteredCases = cases.filter(
    (c) =>
      c.case_number.toLowerCase().includes(search.toLowerCase()) ||
      c.case_title.toLowerCase().includes(search.toLowerCase()) ||
      c.investigator.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setCaseNumber(`CR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setCaseTitle('');
    setInvestigator(investigators.length > 0 ? investigators[0].name : '');
    setOrganization('');
    setDescription('');
    setIsNewModalOpen(true);
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseNumber || !caseTitle) return;

    const newCase = createCase({
      case_number: caseNumber.trim(),
      case_title: caseTitle.trim(),
      investigator: investigator.trim() || 'Lead Examiner',
      organization: organization.trim() || undefined,
      description: description.trim() || undefined,
    });

    setSelectedCaseId(newCase.case_id);
    setIsNewModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Forensic Case Dossiers &amp; Warrants
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Active chain of custody and case assignments for filesystem recovery
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Case Warrant</span>
        </button>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200">NO CASES YET</h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto font-sans">
            Create your first forensic investigation to begin tracking evidence images and carved files.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <Plus className="w-4 h-4" />
            CREATE CASE
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
          {/* Left: Case List */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cases by ID or title..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0a1020] border border-[#192642] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="space-y-2">
              {filteredCases.map((c) => {
                const isSelected = selectedCase?.case_id === c.case_id;
                return (
                  <div
                    key={c.case_id}
                    onClick={() => setSelectedCaseId(c.case_id)}
                    className={clsx(
                      'p-4 rounded-xl border transition-all cursor-pointer text-left',
                      isSelected
                        ? 'bg-gradient-to-br from-[#0c152b] to-[#080e1d] border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
                        : 'bg-[#080d19] border-[#141f36] hover:border-slate-700 text-slate-400'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400">{c.case_number}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                        {c.status}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-200 mt-1 line-clamp-1">
                      {c.case_title}
                    </div>

                    {c.recovery_progress !== undefined && (
                      <div className="mt-2.5 p-2 rounded-lg bg-[#050a16] border border-[#141f38] space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                          <span className={clsx(
                            'flex items-center gap-1',
                            c.recovery_progress >= 100 ? 'text-emerald-400' : 'text-amber-400'
                          )}>
                            {c.recovery_progress >= 100 ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>RETRIEVED (100%)</span>
                              </>
                            ) : (
                              <>
                                <Activity className="w-3 h-3 text-amber-400 animate-pulse" />
                                <span>{c.recovery_progress}% RECOVERED</span>
                              </>
                            )}
                          </span>
                          <span className={c.recovery_progress >= 100 ? 'text-emerald-300' : 'text-amber-300'}>
                            {c.recovery_progress}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#0d162a] rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full transition-all duration-500',
                              c.recovery_progress >= 100
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                : 'bg-gradient-to-r from-amber-500 to-cyan-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                            )}
                            style={{ width: `${c.recovery_progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
                      <span>{c.investigator}</span>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Case Details */}
          {selectedCase && (
            <div className="lg:col-span-2 rounded-2xl bg-[#080d19] border border-[#152138] p-6 space-y-6 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#141f36] gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-cyan-400">{selectedCase.case_number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                      {selectedCase.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-100 mt-1">{selectedCase.case_title}</h2>
                </div>

                <button
                  onClick={() => navigate(`/cases/${selectedCase.case_id}`)}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
                >
                  <span>Open Case Dossier</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    Lead Investigator
                  </div>
                  <div className="font-semibold text-slate-200">{selectedCase.investigator}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-purple-400" />
                    Organization
                  </div>
                  <div className="font-semibold text-slate-200">{selectedCase.organization || 'Unspecified'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Created Timestamp
                  </div>
                  <div className="text-slate-300">{new Date(selectedCase.created_at).toLocaleString()}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    Last Updated
                  </div>
                  <div className="text-slate-300">{new Date(selectedCase.updated_at).toLocaleString()}</div>
                </div>
              </div>

              {selectedCase.recovery_progress !== undefined && (
                <div className={clsx(
                  'p-4 rounded-xl border space-y-3',
                  selectedCase.recovery_progress >= 100
                    ? 'bg-gradient-to-br from-[#061e16] to-[#04120d] border-emerald-500/30'
                    : 'bg-gradient-to-br from-[#1c1404] to-[#0c0d17] border-amber-500/30'
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedCase.recovery_progress >= 100 ? (
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                          {selectedCase.recovery_progress >= 100
                            ? 'Forensic Retrieval Complete (100%)'
                            : 'Partial Inode Reconstruction (70% Retrieved)'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {selectedCase.recovery_progress >= 100
                            ? 'All extent blocks recovered • Cryptographic hash verified'
                            : 'Extent mapping complete • 30% slack space carving in progress'}
                        </div>
                      </div>
                    </div>
                    <span className={clsx(
                      'text-sm font-mono font-extrabold px-2.5 py-1 rounded-md border',
                      selectedCase.recovery_progress >= 100
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    )}>
                      {selectedCase.recovery_progress}%
                    </span>
                  </div>

                  <div className="h-2 w-full bg-[#0d162a] rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all duration-700',
                        selectedCase.recovery_progress >= 100
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                          : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-cyan-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                      )}
                      style={{ width: `${selectedCase.recovery_progress}%` }}
                    />
                  </div>

                  {selectedCase.notes && (
                    <div className="text-[11px] text-slate-300 font-sans border-t border-white/5 pt-2">
                      <span className="text-slate-400 font-mono font-semibold text-[10px] mr-1.5 uppercase">Technician Notes:</span>
                      {selectedCase.notes}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Case Scope &amp; Objectives
                </div>
                <div className="p-4 rounded-xl bg-[#0d1424] border border-[#1a2640] text-xs text-slate-300 font-sans leading-relaxed">
                  {selectedCase.description || <span className="text-slate-500 italic">No description provided.</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW CASE MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[#090e1c] border border-[#1c2c4d] shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#16223b] flex items-center justify-between bg-[#0c1326]">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Create Forensic Case Warrant</h3>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Case Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  placeholder="e.g. Incident Response Alpha"
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Warrant / Case Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="e.g. CR-2026-0891"
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Lead Investigator</label>
                  <input
                    type="text"
                    value={investigator}
                    onChange={(e) => setInvestigator(e.target.value)}
                    placeholder="Examiner name"
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Organization / Agency</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. Cyber Forensics Lab"
                    className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Scope &amp; Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope of digital evidence search..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#16223b]">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#121c33] text-slate-300 hover:bg-[#182545]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                >
                  Create Warrant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
