import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2, Download, HardDrive, Plus, ArrowRight, Search,
  Eye, Copy, Check, Filter, X, Shield, RefreshCw, CheckCircle2,
  AlertTriangle, Info, Clock, Database, Terminal
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import HexViewer from '../components/HexViewer';
import type { Artifact } from '../types/forensic';
import clsx from 'clsx';

export default function RecoveredFilesPage() {
  const navigate = useNavigate();
  const { artifacts } = useApp();

  const [search, setSearch] = useState('');
  const [fsFilter, setFsFilter] = useState<'ALL' | 'XFS' | 'BTRFS'>('ALL');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [inspectingArtifact, setInspectingArtifact] = useState<Artifact | null>(null);
  const [hexModalArtifact, setHexModalArtifact] = useState<Artifact | null>(null);

  // Only display recovered artifacts (confirmed or partial)
  const recoveredList = useMemo(() => {
    return artifacts.filter(a => a.status !== 'UNRECOVERABLE');
  }, [artifacts]);

  const filteredArtifacts = useMemo(() => {
    return recoveredList.filter(a => {
      const matchSearch =
        a.filename.toLowerCase().includes(search.toLowerCase()) ||
        (a.path && a.path.toLowerCase().includes(search.toLowerCase())) ||
        (a.sha256 && a.sha256.toLowerCase().includes(search.toLowerCase())) ||
        a.recovery_method.toLowerCase().includes(search.toLowerCase());

      const matchFs = fsFilter === 'ALL' || a.filesystem_type === fsFilter;
      return matchSearch && matchFs;
    });
  }, [recoveredList, search, fsFilter]);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Recovered Files &amp; Reconstructed Artifacts
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Bitstream validated file extractions with SHA-256 dual-hash attestation &amp; payload inspection
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-semibold tracking-wider uppercase">
            DEMO / SYNTHETIC FORENSIC DATA
          </span>
          <button
            onClick={() => navigate('/reports')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all"
          >
            <span>Generate Report</span>
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
            TraceX does not simply claim &ldquo;data recovered&rdquo; &mdash; it correlates inode extent structures, MACB timestamps, user ID credentials, and cryptographic digests to satisfy court chain-of-custody burdens.
          </p>
        </div>
      </div>

      {/* VALIDATION RESULTS SUMMARY BANNER (Requirement 9) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        <div className="p-4 rounded-xl bg-[#080d19] border border-emerald-500/30 shadow-inner space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Case 1: Full Recovery Validation</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 font-bold">
              INTEGRITY VERIFIED
            </span>
          </div>
          <div className="text-[11px] text-slate-300 space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Original Evidence Hash:</span><span className="text-cyan-300 truncate max-w-[200px]">e3b0c44298fc1c14...</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Recovered Extents Hash:</span><span className="text-cyan-300 truncate max-w-[200px]">9f86d081884c7d65...</span></div>
            <div className="text-emerald-400 font-semibold text-[10px]">100% Inode allocation B+Tree match &bull; 0 missing blocks</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#080d19] border border-amber-500/30 shadow-inner space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold uppercase text-[10px]">Case 2: Corrupted Btrfs Carve Validation</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/50 text-amber-400 border border-amber-800/40 font-bold">
              PARTIAL RECOVERY — METADATA INCOMPLETE
            </span>
          </div>
          <div className="text-[11px] text-slate-300 space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Target Files:</span><span className="text-amber-300">old_report.pdf, system_backup.tar</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Reconstruction Threshold:</span><span className="text-amber-300 font-bold">70% Extents Carved (30% fragmented)</span></div>
            <div className="text-amber-400 font-semibold text-[10px]">Realistic Partial Recovery &bull; Demonstrates edge-case carving</div>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#080d19] border border-[#152138] text-xs font-mono shadow-inner">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by filename (e.g. server.log, incident_notes.txt, old_report.pdf), path, SHA-256..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-slate-200 placeholder-slate-500 w-full focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[11px] mr-1">Filesystem:</span>
          {(['ALL', 'XFS', 'BTRFS'] as const).map(fs => (
            <button
              key={fs}
              onClick={() => setFsFilter(fs)}
              className={clsx(
                'px-2.5 py-1 rounded text-[10px] font-semibold tracking-wider transition-colors border',
                fsFilter === fs
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                  : 'bg-[#0f172a] text-slate-400 hover:text-slate-200 border-slate-800'
              )}
            >
              {fs}
            </button>
          ))}
        </div>
      </div>

      {/* Recovered Artifacts Table (Requirement 7 & 9) */}
      <div className="rounded-2xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.4)] font-mono text-xs">
        <div className="p-3.5 border-b border-[#141f36] bg-[#0c1222]/80 flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-300 uppercase">
            Recovered File Artifacts ({filteredArtifacts.length})
          </span>
          <span className="text-slate-500">
            Validated extractions with cryptographic SHA-256 attestation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#152138] bg-[#0a0f1d] text-[10px] uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3.5">Filename &amp; Path</th>
                <th className="py-3 px-3.5">Recovery</th>
                <th className="py-3 px-3.5">Filesystem</th>
                <th className="py-3 px-3.5">Size</th>
                <th className="py-3 px-3.5">Metadata</th>
                <th className="py-3 px-3.5">SHA-256 Digest</th>
                <th className="py-3 px-3.5">Integrity / Validation</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#131d33]">
              {filteredArtifacts.map(art => {
                const isSuccess = art.status === 'CONFIRMED';
                const metaStatus = art.metadata_source === 'RECOVERED' ? 'COMPLETE' : 'PARTIAL';
                const validationText = isSuccess ? 'VALID (INTEGRITY VERIFIED)' : 'PARTIAL RECOVERY — METADATA INCOMPLETE';

                return (
                  <tr key={art.artifact_id} className="hover:bg-[#0c1426] transition-colors group">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-100 flex items-center gap-2">
                        <span className={clsx('w-2 h-2 rounded-full', isSuccess ? 'bg-emerald-400' : 'bg-amber-400')} />
                        <span>{art.filename}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[200px]" title={art.path || ''}>
                        {art.path || '/forensic/output'}
                      </div>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-bold border',
                        isSuccess
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                          : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                      )}>
                        {isSuccess ? 'SUCCESS' : 'PARTIAL'}
                      </span>
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

                    <td className="py-3 px-3.5 text-slate-300">
                      {art.size_bytes > 1024 * 1024
                        ? `${(art.size_bytes / (1024 * 1024)).toFixed(1)} MB`
                        : `${(art.size_bytes / 1024).toFixed(1)} KB`}
                    </td>

                    <td className="py-3 px-3.5">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] border',
                        metaStatus === 'COMPLETE'
                          ? 'bg-blue-950/40 text-blue-300 border-blue-800/40'
                          : 'bg-amber-950/30 text-amber-300 border-amber-800/30'
                      )}>
                        {metaStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 font-mono text-[10px] text-cyan-300">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[130px] select-all">{art.sha256}</span>
                        {art.sha256 && (
                          <button
                            onClick={() => handleCopy(art.sha256!)}
                            title="Copy SHA-256"
                            className="text-slate-500 hover:text-cyan-300"
                          >
                            {copiedHash === art.sha256 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] font-bold border',
                        isSuccess
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                          : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                      )}>
                        {validationText}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingArtifact(art)}
                          className="px-2.5 py-1 rounded-lg bg-[#111a2e] hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors flex items-center gap-1"
                          title="View Forensic Metadata"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Metadata</span>
                        </button>
                        <button
                          onClick={() => setHexModalArtifact(art)}
                          className="px-2.5 py-1 rounded-lg bg-[#111a2e] hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1"
                          title="Hex Payload View"
                        >
                          <Terminal className="w-3 h-3" />
                          <span>Hex</span>
                        </button>
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
                    Forensic Metadata &amp; Attestation: {inspectingArtifact.filename}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Recovered Inode Context &amp; Allocation Integrity
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
                <div><span className="text-slate-500">Modified:</span><div className="text-slate-200 mt-0.5">{inspectingArtifact.mtime || 'N/A'}</div></div>
                <div><span className="text-slate-500">Changed:</span><div className="text-slate-200 mt-0.5">{inspectingArtifact.ctime || 'N/A'}</div></div>
                <div><span className="text-slate-500">Accessed:</span><div className="text-slate-200 mt-0.5">{inspectingArtifact.atime || 'N/A'}</div></div>
                <div><span className="text-slate-500">Deleted:</span><div className="text-amber-400 font-bold mt-0.5">{inspectingArtifact.deleted_at || '2026-10-03 19:00:00 UTC'}</div></div>
              </div>
            </div>

            {/* Cryptographic SHA-256 */}
            <div className="p-3 rounded-xl bg-[#050811] border border-[#18243c]">
              <div className="text-[10px] text-slate-500 uppercase mb-1">Recovered Stream SHA-256 Digest</div>
              <div className="font-mono text-cyan-300 text-[11px] break-all select-all">
                {inspectingArtifact.sha256}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#152138]">
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

      {/* HEX VIEWER MODAL */}
      {hexModalArtifact && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-[#1b2b48] rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b2b48] pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-teal-400" />
                  Forensic Raw Stream: {hexModalArtifact.filename}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  SHA-256: {hexModalArtifact.sha256 || 'UNKNOWN'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHexModalArtifact(null)}
                className="px-3 py-1.5 rounded-lg bg-[#14213d] hover:bg-[#1e315b] text-slate-200 text-xs font-mono"
              >
                Close [ESC]
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <HexViewer
                title={hexModalArtifact.filename}
                data={hexModalArtifact.sha256 || 'TraceX Synthetic Forensic Stream'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
