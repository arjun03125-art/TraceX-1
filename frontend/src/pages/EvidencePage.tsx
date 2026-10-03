import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HardDrive, Plus, Shield, CheckCircle2, RefreshCw, AlertTriangle,
  FileSearch, Key, Hash, Layers, Copy, Check
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import clsx from 'clsx';

export default function EvidencePage() {
  const navigate = useNavigate();
  const { evidence } = useApp();

  const [selectedId, setSelectedId] = useState<string>(evidence.length > 0 ? evidence[0].evidence_id : '');
  const [copiedHash, setCopiedHash] = useState(false);

  const selectedEvidence = evidence.find(e => e.evidence_id === selectedId) || (evidence.length > 0 ? evidence[0] : null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Evidence Sources &amp; Integrity Verification
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Physical bitstream images, write-block verification &amp; dual-hash cryptographic attestation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/evidence')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <Plus className="w-4 h-4" />
            ADD EVIDENCE
          </button>
        </div>
      </div>

      {evidence.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <HardDrive className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200">NO EVIDENCE SOURCES</h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto font-sans">
            No evidence sources are attached to this workspace. Register an evidence image or block device to begin analysis.
          </p>
          <button
            onClick={() => navigate('/admin/evidence')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <Plus className="w-4 h-4" />
            ADD EVIDENCE
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
          {/* Left Column: Evidence List */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-4 space-y-3 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between pb-2 border-b border-[#141f36]">
                <span className="text-[11px] font-bold text-slate-300 uppercase">Attached Images ({evidence.length})</span>
                <span className="text-[10px] text-emerald-400">WRITE-BLOCKED</span>
              </div>

              <div className="space-y-2">
                {evidence.map(ev => {
                  const isSelected = selectedEvidence?.evidence_id === ev.evidence_id;
                  return (
                    <div
                      key={ev.evidence_id}
                      onClick={() => setSelectedId(ev.evidence_id)}
                      className={clsx(
                        'p-3 rounded-xl border transition-all cursor-pointer text-left',
                        isSelected
                          ? 'bg-gradient-to-br from-[#0c152b] to-[#080e1d] border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
                          : 'bg-[#0a0f1d] border-[#141f36] hover:border-slate-700'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{ev.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                          {ev.format}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 truncate">{ev.source_path}</div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                        <span>{ev.detected_fs || 'FS: Pending'}</span>
                        <span>{ev.size_bytes ? `${(ev.size_bytes / (1024 * 1024)).toFixed(1)} MB` : 'Size: Pending'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Selected Evidence Detail */}
          {selectedEvidence && (
            <div className="lg:col-span-2 rounded-2xl bg-[#080d19] border border-[#152138] p-6 space-y-6 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-between pb-4 border-b border-[#141f36]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm">{selectedEvidence.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                      {selectedEvidence.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{selectedEvidence.source_path}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640]">
                  <div className="text-[10px] text-slate-500 uppercase">Filesystem Remnants</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {selectedEvidence.detected_fs || <span className="text-slate-500">Pending analysis</span>}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640]">
                  <div className="text-[10px] text-slate-500 uppercase">Acquisition Size</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {selectedEvidence.size_bytes ? `${(selectedEvidence.size_bytes / (1024 * 1024)).toFixed(1)} MB` : <span className="text-slate-500">Pending</span>}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] md:col-span-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase mb-1">
                    <span>Cryptographic Hash (SHA-256)</span>
                    {selectedEvidence.hash_sha256 && (
                      <button
                        onClick={() => copyToClipboard(selectedEvidence.hash_sha256!)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedHash ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <div className="font-mono text-cyan-300 break-all select-all">
                    {selectedEvidence.hash_sha256 || <span className="text-slate-500 italic">Pending cryptographic verification</span>}
                  </div>
                </div>
              </div>

              {selectedEvidence.description && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase">Acquisition Notes</div>
                  <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1a2640] text-slate-300 font-sans leading-relaxed">
                    {selectedEvidence.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
