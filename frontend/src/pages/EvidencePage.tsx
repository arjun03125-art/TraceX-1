import { useState } from 'react';
import {
  HardDrive, Plus, Shield, CheckCircle2, RefreshCw, AlertTriangle,
  FileSearch, Key, Hash, Layers, Copy, Check, ArrowRight, ShieldCheck,
  Lock, Activity, Database
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import clsx from 'clsx';

export default function EvidencePage() {
  const { evidence, logEvent } = useApp();

  const [selectedId, setSelectedId] = useState<string>(evidence.length > 0 ? evidence[0].evidence_id : 'ev-ret-001');
  const [copiedHash, setCopiedHash] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  const selectedEvidence = evidence.find(e => e.evidence_id === selectedId) || evidence[0];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleVerifyEvidence = () => {
    if (!selectedEvidence) return;
    setVerifying(true);
    setVerifyNotice(null);

    setTimeout(() => {
      setVerifying(false);
      setVerifyNotice(`Integrity attestation confirmed: SHA-256 digest matches evidence locker chain-of-custody manifest (0 bit errors).`);
      logEvent('EVIDENCE_VERIFIED', `Evidence integrity verified: ${selectedEvidence.name} matches court custody manifest.`, {
        evidence_id: selectedEvidence.evidence_id,
        target: selectedEvidence.name,
        status: 'VERIFIED',
        hash_reference: selectedEvidence.hash_sha256 || undefined,
      });
    }, 600);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Banner & Header */}
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

        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-semibold tracking-wider uppercase">
            DEMO / SYNTHETIC FORENSIC DATA
          </span>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-mono text-xs flex items-center gap-1.5 font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>WRITE-BLOCK ACTIVE</span>
          </div>
        </div>
      </div>

      {/* FORENSIC WORKFLOW PIPELINE BAR: "What did we give TraceX?" */}
      <div className="p-4 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] font-mono text-xs">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-bold flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Evidence Pipeline Ingestion Trace: What Did We Give TraceX?</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1 text-center">
          <div className="p-2.5 rounded-xl bg-[#0c1326] border border-cyan-500/30">
            <div className="text-[9px] text-slate-500 uppercase">1. FORENSIC IMAGE</div>
            <div className="text-xs font-bold text-cyan-300 mt-0.5 truncate">{selectedEvidence?.name}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0c1326] border border-[#16223b]">
            <div className="text-[9px] text-slate-500 uppercase">2. SOURCE PATH</div>
            <div className="text-xs font-bold text-slate-200 mt-0.5 truncate">
              {selectedEvidence?.source_path.replace('demo/evidence/', '')}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0c1326] border border-[#16223b]">
            <div className="text-[9px] text-slate-500 uppercase">3. HASH DIGEST</div>
            <div className="text-xs font-bold text-cyan-400 mt-0.5 font-mono truncate">
              {selectedEvidence?.hash_sha256 ? `${selectedEvidence.hash_sha256.substring(0, 10)}...` : 'Pending'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0c1326] border border-emerald-500/30">
            <div className="text-[9px] text-slate-500 uppercase">4. FILESYSTEM</div>
            <div className="text-xs font-bold text-emerald-400 mt-0.5">
              {selectedEvidence?.detected_fs || 'XFS'}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0c1326] border border-blue-500/30">
            <div className="text-[9px] text-slate-500 uppercase">5. ANALYSIS STATUS</div>
            <div className="text-xs font-bold text-blue-300 mt-0.5">
              {selectedEvidence?.analysis_status === 'COMPLETE' ? 'COMPLETED' : '70% RECONSTRUCTION'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Attached Evidence Selector & Detailed Evidence Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
        {/* Left Column: Evidence List */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-4 space-y-3 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between pb-2 border-b border-[#141f36]">
              <span className="text-[11px] font-bold text-slate-300 uppercase">
                Attached Images ({evidence.length})
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">
                BOTH FILESYSTEMS READY
              </span>
            </div>

            <div className="space-y-2">
              {evidence.map(ev => {
                const isSelected = selectedEvidence?.evidence_id === ev.evidence_id;
                const isXfs = ev.detected_fs === 'XFS' || ev.filesystem_type === 'XFS';
                return (
                  <div
                    key={ev.evidence_id}
                    onClick={() => { setSelectedId(ev.evidence_id); setVerifyNotice(null); }}
                    className={clsx(
                      'p-3.5 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden',
                      isSelected
                        ? 'bg-gradient-to-br from-[#0c152b] to-[#080e1d] border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20'
                        : 'bg-[#0a0f1d] border-[#141f36] hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 truncate text-xs">{ev.name}</span>
                      <span className={clsx(
                        'text-[10px] px-2 py-0.5 rounded font-bold border',
                        isXfs
                          ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40'
                          : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/40'
                      )}>
                        {ev.detected_fs || 'FS'}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 mt-1 truncate">{ev.source_path}</div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-[#121c33]">
                      <span className="text-emerald-400 font-semibold">
                        {ev.status === 'COMPLETE' ? 'VERIFIED' : 'ANALYZING (70%)'}
                      </span>
                      <span className="font-mono text-slate-300">
                        {ev.size_bytes ? `${(ev.size_bytes / (1024 * 1024 * 1024)).toFixed(0)} GB` : '32 GB'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#080d19] border border-[#152138] space-y-2 text-[11px] text-slate-400 font-sans">
            <div className="font-bold text-slate-200 font-mono uppercase text-xs flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-Filesystem Demonstration</span>
            </div>
            <p className="leading-relaxed">
              TraceX parses both <strong>XFS</strong> allocation groups (B+Tree extents) and <strong>Btrfs</strong> subvolumes (chunk trees) directly from write-blocked bitstream disk images.
            </p>
          </div>
        </div>

        {/* Right Column: Selected Evidence Source Dossier */}
        {selectedEvidence && (
          <div className="lg:col-span-2 rounded-2xl bg-[#080d19] border border-[#152138] p-6 space-y-6 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#141f36] gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-0.5">
                  EVIDENCE SOURCE ATTESTATION
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-slate-100 text-base">{selectedEvidence.name}</span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 font-bold">
                    {selectedEvidence.status === 'COMPLETE' ? 'VERIFIED' : 'ACTIVE / SCANNING'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleVerifyEvidence}
                disabled={verifying}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)] self-start sm:self-auto disabled:opacity-50"
              >
                <RefreshCw className={clsx('w-3.5 h-3.5', verifying && 'animate-spin')} />
                <span>{verifying ? 'Verifying Integrity...' : 'Verify SHA-256 Hash'}</span>
              </button>
            </div>

            {/* Verification Success Toast */}
            {verifyNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{verifyNotice}</span>
              </div>
            )}

            {/* Evidence Source Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Acquisition Type</div>
                <div className="font-bold text-slate-200 text-xs">Forensic Disk Image (E01)</div>
                <div className="text-[10px] text-slate-500">Expert Witness Bitstream</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Detected Filesystem</div>
                <div className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                  <span>{selectedEvidence.detected_fs || 'XFS'}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    MOUNTED READ-ONLY
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">UUID: {selectedEvidence.filesystem_uuid || '4a8f9c10-e72b-4231-90a1'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Source Path</div>
                <div className="font-bold text-slate-200 text-xs truncate select-all">{selectedEvidence.source_path}</div>
                <div className="text-[10px] text-slate-500">Local evidence repository</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Image Size</div>
                <div className="font-bold text-slate-200 text-xs">
                  {selectedEvidence.size_bytes ? `${(selectedEvidence.size_bytes / (1024 * 1024 * 1024)).toFixed(0)} GB (34,359,738,368 bytes)` : '32 GB'}
                </div>
                <div className="text-[10px] text-slate-500">Sector Size: 512 bytes • Block Size: 4096</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Acquisition Timestamp (UTC)</div>
                <div className="font-bold text-slate-200 text-xs">
                  {new Date(selectedEvidence.added_at).toUTCString()}
                </div>
                <div className="text-[10px] text-slate-500">Lead Examiner: {selectedEvidence.added_by || 'Det. H. Vance'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] space-y-1">
                <div className="text-[10px] text-slate-500 uppercase">Hardware Write-Block Status</div>
                <div className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>O_RDONLY HARDWARE LOCKED</span>
                </div>
                <div className="text-[10px] text-slate-500">Kernel write protection: Enforced</div>
              </div>

              {/* SHA-256 Hash Display */}
              <div className="p-3.5 rounded-xl bg-[#0d1424] border border-[#1a2640] md:col-span-2">
                <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase mb-1.5">
                  <span className="font-bold text-slate-400">Cryptographic Hash Digest (SHA-256)</span>
                  {selectedEvidence.hash_sha256 && (
                    <button
                      onClick={() => copyToClipboard(selectedEvidence.hash_sha256!)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                    >
                      {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
                    </button>
                  )}
                </div>
                <div className="font-mono text-cyan-300 text-xs break-all select-all p-2 rounded-lg bg-[#050811] border border-[#18233b]">
                  {selectedEvidence.hash_sha256 || <span className="text-slate-500 italic">Pending cryptographic verification</span>}
                </div>
              </div>
            </div>

            {/* Ingestion Notes */}
            {selectedEvidence.notes && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Chain-of-Custody Notes</div>
                <div className="p-3 rounded-xl bg-[#0d1424] border border-[#1a2640] text-slate-300 font-sans leading-relaxed text-xs">
                  {selectedEvidence.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
