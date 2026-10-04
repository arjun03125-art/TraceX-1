import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileX2, Search, Filter, HardDrive, Plus, ArrowRight, Eye,
  Shield, CheckCircle2, Clock, AlertTriangle, Info, FileCheck2,
  Lock, X, Database
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { Artifact } from '../types/forensic';
import clsx from 'clsx';

export default function DeletedFilesPage() {
  const navigate = useNavigate();
  const { artifacts, updateArtifact, evidence, activeCase, cases, logEvent } = useApp();

  const [search, setSearch] = useState('');
  const [fsFilter, setFsFilter] = useState<string>('ALL');
  const [recoverabilityFilter, setRecoverabilityFilter] = useState<string>('ALL');
  const [activeCaseOnly, setActiveCaseOnly] = useState(false);
  const [inspectingArtifact, setInspectingArtifact] = useState<Artifact | null>(null);
  const [recoveredToast, setRecoveredToast] = useState<string | null>(null);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  // Filter by case if activeCase is set and activeCaseOnly is enabled
  const baseArtifacts = (activeCaseOnly && activeCase)
    ? artifacts.filter(a => {
        const caseEvidenceIds = evidence.filter(e => e.case_id === activeCase.case_id).map(e => e.evidence_id);
        return caseEvidenceIds.includes(a.evidence_id);
      })
    : artifacts;

  // Filter logic
  const filtered = baseArtifacts.filter(a => {
    const matchesSearch =
      a.filename.toLowerCase().includes(search.toLowerCase()) ||
      (a.path && a.path.toLowerCase().includes(search.toLowerCase())) ||
      (a.object_id && a.object_id.toString().includes(search));

    const matchesFs = fsFilter === 'ALL' || a.filesystem_type === fsFilter;
    const recStatus = a.status === 'CONFIRMED' ? 'RECOVERABLE' : a.status === 'PARTIAL' ? 'PARTIAL' : 'NOT RECOVERABLE';
    const matchesRec = recoverabilityFilter === 'ALL' || recStatus === recoverabilityFilter;

    return matchesSearch && matchesFs && matchesRec;
  });

  const handleRecover = (artifact: Artifact) => {
    setRecoveringId(artifact.artifact_id);
    logEvent('RECOVERY_STARTED', `Extent carving initiated for ${artifact.filename} (Inode ${artifact.object_id})`, {
      evidence_id: artifact.evidence_id,
      artifact_id: artifact.artifact_id,
      target: artifact.filename,
      status: 'PROCESSING'
    });

    setTimeout(() => {
      setRecoveringId(null);
      const isConfirmed = artifact.status === 'CONFIRMED' || artifact.status === 'INTACT';
      updateArtifact(artifact.artifact_id, {
        status: isConfirmed ? 'CONFIRMED' : 'PARTIAL',
        validation_status: 'PENDING_VALIDATION',
        recovery_method: artifact.recovery_method || 'INODE_EXTENT_RECONSTRUCTION',
      });

      logEvent('RECOVERY_COMPLETED', `Successfully carved and extracted ${artifact.filename} to /forensic/output. Inode extents verified.`, {
        evidence_id: artifact.evidence_id,
        artifact_id: artifact.artifact_id,
        target: artifact.filename,
        status: 'RECOVERED',
      });

      setRecoveredToast(`Successfully reconstructed "${artifact.filename}" to /forensic/output (${isConfirmed ? '100% Intact' : '70% Partial Carve'}). Ready for validation.`);
      setTimeout(() => setRecoveredToast(null), 4000);
    }, 450);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <FileX2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Deleted Files &amp; Inode Reconstruction
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                XFS unlinked inode cores, Btrfs chunk tree historical fragments &amp; cluster slack carve records
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-semibold tracking-wider uppercase">
            DEMO / SYNTHETIC FORENSIC DATA
          </span>
          <button
            onClick={() => navigate('/recovered-files')}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-mono text-xs flex items-center gap-1.5 transition-all"
          >
            <span>View Recovered ({artifacts.filter(a => a.status !== 'UNRECOVERABLE').length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* WHY METADATA MATTERS CALLOUT (Requirement 8) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#091124] to-[#080d19] border border-cyan-500/30 shadow-[0_4px_25px_rgba(6,182,212,0.1)] flex items-start gap-3.5">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="font-bold text-slate-200 font-mono uppercase tracking-wide">
            Forensic Relevance: Why Metadata Matters
          </div>
          <p className="text-slate-300 font-sans leading-relaxed text-[11px]">
            &ldquo;Metadata helps investigators establish file identity, location, timestamps and filesystem context. It can help reconstruct what happened and when.&rdquo;
            TraceX recovers inode extent allocation trees to prove original pathnames, user ownership (UID/GID), and exact deletion chronological windows even after disk zeroing.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {recoveredToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 font-mono text-xs flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{recoveredToast}</span>
          </div>
          <button onClick={() => navigate('/recovered-files')} className="text-cyan-400 underline ml-4 hover:text-cyan-300">
            Open in Recovered Files →
          </button>
        </div>
      )}

      {/* Control Bar: Search & Filters */}
      <div className="p-3.5 rounded-xl bg-[#080d19] border border-[#152138] flex flex-wrap items-center justify-between gap-3 font-mono text-xs shadow-inner">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename (e.g. server.log, deleted_report.pdf, incident_notes.txt)..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#050811] border border-[#18243c] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Filesystem:</span>
            <select
              value={fsFilter}
              onChange={(e) => setFsFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#050811] border border-[#18243c] text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Filesystems</option>
              <option value="XFS">XFS</option>
              <option value="BTRFS">Btrfs</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Recoverability:</span>
            <select
              value={recoverabilityFilter}
              onChange={(e) => setRecoverabilityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#050811] border border-[#18243c] text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="RECOVERABLE">RECOVERABLE</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="NOT RECOVERABLE">NOT RECOVERABLE</option>
            </select>
          </div>

          {activeCase && (
            <button
              onClick={() => setActiveCaseOnly(!activeCaseOnly)}
              className={clsx(
                'px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors',
                activeCaseOnly
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
              )}
            >
              {activeCaseOnly ? `Case: ${activeCase.case_number}` : 'Filter Active Case'}
            </button>
          )}
        </div>
      </div>

      {/* Main Table: Showing all required columns */}
      <div className="rounded-2xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.4)] font-mono text-xs">
        <div className="p-3.5 border-b border-[#141f36] bg-[#0c1222]/80 flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-300 uppercase">
            Deleted Artifact Candidates ({filtered.length})
          </span>
          <span className="text-slate-500">
            Click &ldquo;Inspect Metadata&rdquo; for full forensic context
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#141f36] bg-[#0a0f1d] text-[10px] uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3.5">Filename</th>
                <th className="py-3 px-3.5">Filesystem</th>
                <th className="py-3 px-3.5">Original Path</th>
                <th className="py-3 px-3.5">Inode / Object ID</th>
                <th className="py-3 px-3.5">Deleted Timestamp (UTC)</th>
                <th className="py-3 px-3.5">Size</th>
                <th className="py-3 px-3.5">Recoverability</th>
                <th className="py-3 px-3.5">Metadata Available</th>
                <th className="py-3 px-3.5">Recovery Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d33]">
              {filtered.map(art => {
                const recStatus = art.status === 'CONFIRMED' ? 'RECOVERABLE' : art.status === 'PARTIAL' ? 'PARTIAL' : 'NOT RECOVERABLE';
                const metaAvail = art.metadata_source === 'RECOVERED' ? 'COMPLETE' : art.metadata_source === 'DERIVED' ? 'PARTIAL' : 'INCOMPLETE';
                const isRecoverable = art.status !== 'UNRECOVERABLE';

                return (
                  <tr key={art.artifact_id} className="hover:bg-[#0c1426] transition-colors group">
                    <td className="py-3 px-3.5 font-bold text-slate-100 flex items-center gap-2">
                      <span className={clsx(
                        'w-2 h-2 rounded-full',
                        art.status === 'CONFIRMED' ? 'bg-emerald-400' : art.status === 'PARTIAL' ? 'bg-amber-400' : 'bg-rose-400'
                      )} />
                      <span>{art.filename}</span>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-bold border',
                        art.filesystem_type === 'XFS'
                          ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40'
                          : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/40'
                      )}>
                        {art.filesystem_type}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-slate-300 truncate max-w-[200px]" title={art.path || ''}>
                      {art.path || <span className="text-slate-600">Unlinked (Root Extent)</span>}
                    </td>

                    <td className="py-3 px-3.5 text-cyan-400 font-bold">
                      #{art.object_id || 'N/A'}
                    </td>

                    <td className="py-3 px-3.5 text-slate-400 text-[11px]">
                      {art.deleted_at || '2026-10-03 19:00:00 UTC'}
                    </td>

                    <td className="py-3 px-3.5 text-slate-300">
                      {art.size_bytes > 1024 * 1024
                        ? `${(art.size_bytes / (1024 * 1024)).toFixed(1)} MB`
                        : `${(art.size_bytes / 1024).toFixed(1)} KB`}
                    </td>

                    <td className="py-3 px-3.5">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-bold border',
                        recStatus === 'RECOVERABLE' && 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
                        recStatus === 'PARTIAL' && 'bg-amber-950/40 text-amber-400 border-amber-800/40',
                        recStatus === 'NOT RECOVERABLE' && 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                      )}>
                        {recStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] border',
                        metaAvail === 'COMPLETE' && 'bg-blue-950/40 text-blue-300 border-blue-800/40',
                        metaAvail === 'PARTIAL' && 'bg-amber-950/30 text-amber-300 border-amber-800/30',
                        metaAvail === 'INCOMPLETE' && 'bg-slate-800 text-slate-400 border-slate-700'
                      )}>
                        {metaAvail}
                      </span>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-semibold border',
                        art.status === 'CONFIRMED' && 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
                        art.status === 'PARTIAL' && 'bg-amber-950/40 text-amber-400 border-amber-800/40',
                        art.status === 'UNRECOVERABLE' && 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                      )}>
                        {art.status}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingArtifact(art)}
                          className="px-2.5 py-1 rounded-lg bg-[#111a2e] hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors flex items-center gap-1"
                          title="Inspect Metadata"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Metadata</span>
                        </button>

                        {isRecoverable && (
                          <button
                            onClick={() => handleRecover(art)}
                            disabled={recoveringId === art.artifact_id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 transition-colors flex items-center gap-1 disabled:opacity-50"
                            title="Carve & Recover File"
                          >
                            <FileCheck2 className={clsx('w-3 h-3', recoveringId === art.artifact_id && 'animate-spin')} />
                            <span>{recoveringId === art.artifact_id ? 'Carving...' : 'Recover'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* METADATA INSPECTOR MODAL (Requirement 8) */}
      {inspectingArtifact && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-[#080d19] border border-[#1b2a47] p-6 space-y-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#152138]">
              <div className="flex items-center gap-2 text-cyan-400">
                <Database className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Forensic Inode Metadata Dossier: {inspectingArtifact.filename}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Filesystem Context &amp; Allocation Integrity
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingArtifact(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation Note */}
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-300 text-[11px] leading-relaxed">
              <strong>Forensic Value:</strong> Establishing timestamps, permissions, and extent fragments permits timeline attribution (proving when the file existed and when anti-forensic deletion was executed).
            </div>

            {/* Inode Properties Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                <div className="text-[10px] text-slate-500 uppercase">Filename</div>
                <div className="text-slate-200 font-bold mt-0.5 truncate">{inspectingArtifact.filename}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                <div className="text-[10px] text-slate-500 uppercase">Original Path</div>
                <div className="text-slate-200 font-bold mt-0.5 truncate">{inspectingArtifact.path || 'Root'}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                <div className="text-[10px] text-slate-500 uppercase">Inode / Object ID</div>
                <div className="text-cyan-400 font-bold mt-0.5">#{inspectingArtifact.object_id}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                <div className="text-[10px] text-slate-500 uppercase">Filesystem</div>
                <div className="text-emerald-400 font-bold mt-0.5">{inspectingArtifact.filesystem_type}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                <div className="text-[10px] text-slate-500 uppercase">File Size</div>
                <div className="text-slate-200 font-bold mt-0.5">
                  {(inspectingArtifact.size_bytes / 1024).toFixed(1)} KB ({inspectingArtifact.size_bytes} bytes)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                <div className="text-[10px] text-slate-500 uppercase">File Type</div>
                <div className="text-slate-200 font-bold mt-0.5">{inspectingArtifact.file_type}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                <div className="text-[10px] text-slate-500 uppercase">Permissions</div>
                <div className="text-slate-300 font-mono mt-0.5">0{inspectingArtifact.permissions.toString(8)} (rw-r--r--)</div>
              </div>

              <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                <div className="text-[10px] text-slate-500 uppercase">UID / GID</div>
                <div className="text-slate-300 font-mono mt-0.5">{inspectingArtifact.uid} / {inspectingArtifact.gid}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
                <div className="text-[10px] text-slate-500 uppercase">Recovery Status</div>
                <div className="text-emerald-400 font-bold mt-0.5">{inspectingArtifact.status}</div>
              </div>
            </div>

            {/* Timestamps Box */}
            <div className="p-4 rounded-xl bg-[#050811] border border-[#18243c] space-y-2">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Forensic MACB Timestamps (UTC)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                <div><span className="text-slate-500">Modified (mtime):</span><div className="text-slate-200 mt-0.5">{inspectingArtifact.mtime || 'N/A'}</div></div>
                <div><span className="text-slate-500">Changed (ctime):</span><div className="text-slate-200 mt-0.5">{inspectingArtifact.ctime || 'N/A'}</div></div>
                <div><span className="text-slate-500">Accessed (atime):</span><div className="text-slate-200 mt-0.5">{inspectingArtifact.atime || 'N/A'}</div></div>
                <div><span className="text-slate-500">Deleted (dtime):</span><div className="text-amber-400 font-bold mt-0.5">{inspectingArtifact.deleted_at || '2026-10-03 19:00:00 UTC'}</div></div>
              </div>
            </div>

            {/* Cryptographic SHA-256 */}
            <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
              <div className="text-[10px] text-slate-500 uppercase mb-1">Recovered Stream SHA-256 Digest</div>
              <div className="font-mono text-cyan-300 text-[11px] break-all select-all">
                {inspectingArtifact.sha256 || 'Pending recovery carving execution'}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#152138]">
              {inspectingArtifact.status !== 'UNRECOVERABLE' && (
                <button
                  type="button"
                  onClick={() => {
                    const toRec = inspectingArtifact;
                    setInspectingArtifact(null);
                    handleRecover(toRec);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Execute Recovery</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setInspectingArtifact(null)}
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
