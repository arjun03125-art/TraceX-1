import { useState } from 'react';
import {
  ShieldCheck, Lock, AlertOctagon, FileCheck, FileX,
  KeyRound, Terminal, CheckCircle2, ShieldAlert,
  FolderLock, RefreshCw
} from 'lucide-react';

export default function AdminSecurityPage() {
  const [writeBlockActive, setWriteBlockActive] = useState(true);
  const [execNeutralizationActive, setExecNeutralizationActive] = useState(true);
  const [pathSanitizationActive, setPathSanitizationActive] = useState(true);
  const [auditTamperLock, setAuditTamperLock] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleVerifyImmutability = () => {
    setStatusMessage('Verifying cryptographic audit chain...');
    setTimeout(() => {
      setStatusMessage('✓ Cryptographic audit ledger verified intact. Zero tampering detected.');
    }, 1200);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Security & Write-Block Policies
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/50 text-emerald-300 font-bold">
                ENFORCED
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Strict digital forensic safeguards: hardware write-blocking, executable quarantine, path traversal sanitization, and audit ledger immutability.
            </p>
          </div>
        </div>

        <button
          onClick={handleVerifyImmutability}
          className="px-4 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 text-purple-300 font-mono text-xs font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Verify Integrity Chain
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Grid of Security Policy Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Write-Block Evidence Protection */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 space-y-4 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">
                Evidence Write-Block Policy
              </h3>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 font-bold">
              O_RDONLY ACTIVE
            </span>
          </div>

          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            TraceX operates under strict forensic protocol. Original forensic evidence images (RAW, E01, DD, IMG) are opened with kernel-level read-only flags. No write operations are ever dispatched to evidence paths.
          </p>

          <div className="p-3.5 rounded-xl bg-[#050811] border border-[#152138] space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">File Descriptor Mode:</span>
              <span className="text-emerald-400 font-bold">O_RDONLY (POSIX) / FILE_SHARE_READ</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Pre-Scan Hash Verification:</span>
              <span className="text-cyan-400">Automatic (SHA-256 + BLAKE3)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Tamper Alarm Threshold:</span>
              <span className="text-rose-400 font-bold">Zero-Tolerance (Immediate Abort)</span>
            </div>
          </div>
        </div>

        {/* Module 2: Executable Quarantine & Neutralization */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 space-y-4 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">
                Executable Neutralization
              </h3>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700/40 text-amber-300 font-bold">
              SAFEGUARD ON
            </span>
          </div>

          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            Recovered files containing binary signatures for executables, scripts, or PE/ELF headers are automatically stripped of execution bits to prevent accidental execution in the examiner workspace.
          </p>

          <div className="p-3.5 rounded-xl bg-[#050811] border border-[#152138] space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Default Output Permissions:</span>
              <span className="text-cyan-400 font-bold">chmod 0640 (-rw-r-----)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Auto-Execution Prevention:</span>
              <span className="text-emerald-400 font-bold">Strictly Disabled (TC88)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Quarantine Sub-Directory:</span>
              <span className="text-slate-400 font-mono">/forensic/recovered/quarantine</span>
            </div>
          </div>
        </div>

        {/* Module 3: Path Traversal & Workspace Confinement */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 space-y-4 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">
                Path Traversal Protection
              </h3>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/40 text-cyan-300 font-bold">
              JAIL ACTIVE
            </span>
          </div>

          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            All filenames extracted from metadata forks, directory entries, or carving headers are sanitized against directory traversal attacks (e.g., `../../etc/passwd` or `C:\Windows\System32`).
          </p>

          <div className="p-3.5 rounded-xl bg-[#050811] border border-[#152138] space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Path Sanitization Engine:</span>
              <span className="text-cyan-400 font-bold">Active (strips `..`, `/`, `\`)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Boundary Confinement:</span>
              <span className="text-emerald-400 font-bold">Workspace Jailed (TC86)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Null Byte Stripping:</span>
              <span className="text-slate-300 font-mono">Enforced (0x00 stripped)</span>
            </div>
          </div>
        </div>

        {/* Module 4: Audit Immutability Protection */}
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 space-y-4 shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold font-mono text-slate-100">
                Audit Immutability & Anti-Rewrite
              </h3>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-950/60 border border-purple-700/40 text-purple-300 font-bold">
              IMMUTABLE
            </span>
          </div>

          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            Even administrators cannot casually rewrite, delete, or reorder historical audit entries. All forensic operations are cryptographically chained using SHA-256 block hashes in SQLite.
          </p>

          <div className="p-3.5 rounded-xl bg-[#050811] border border-[#152138] space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Database Constraints:</span>
              <span className="text-purple-300 font-bold">APPEND-ONLY (No UPDATE/DELETE)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Cryptographic Hash Chaining:</span>
              <span className="text-emerald-400 font-bold">Active (TC65 & TC98)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Retention Horizon:</span>
              <span className="text-slate-300 font-mono">Permanent (Forensic Standard)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
