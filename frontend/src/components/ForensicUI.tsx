import React, { useState } from 'react';
import {
  Shield, HardDrive, FileX2, FileCheck2, Layers, AlertCircle,
  Cpu, CheckCircle2, XCircle, Copy, Check, Hash, Activity
} from 'lucide-react';
import type { RecoveryStatus, ConfidenceLevel, FilesystemType } from '../types/forensic';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RecoveryStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  CONFIRMED:     { label: 'CONFIRMED',     bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-500/40', dot: 'bg-emerald-400' },
  PROBABLE:      { label: 'PROBABLE',      bg: 'bg-cyan-950/40',    text: 'text-cyan-400',    border: 'border-cyan-500/40',    dot: 'bg-cyan-400' },
  PARTIAL:       { label: 'PARTIAL',       bg: 'bg-amber-950/40',   text: 'text-amber-400',   border: 'border-amber-500/40',   dot: 'bg-amber-400' },
  CARVED:        { label: 'CARVED',        bg: 'bg-purple-950/40',  text: 'text-purple-400',  border: 'border-purple-500/40',  dot: 'bg-purple-400' },
  UNRECOVERABLE: { label: 'UNRECOVERABLE', bg: 'bg-rose-950/40',    text: 'text-rose-400',    border: 'border-rose-500/40',    dot: 'bg-rose-400' },
  UNKNOWN:       { label: 'UNKNOWN',       bg: 'bg-slate-900/40',   text: 'text-slate-400',   border: 'border-slate-700/40',   dot: 'bg-slate-400' },
};

export function StatusBadge({ status }: { status: RecoveryStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNKNOWN;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase border ${cfg.bg} ${cfg.text} ${cfg.border} shadow-[0_0_8px_rgba(0,0,0,0.3)]`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}

// ─── Confidence Badge ─────────────────────────────────────────────────────────

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; text: string; bg: string; border: string }> = {
  HIGH:    { label: 'HIGH CONFIDENCE',   text: 'text-emerald-300', bg: 'bg-emerald-950/40', border: 'border-emerald-600/40' },
  MEDIUM:  { label: 'MED CONFIDENCE',    text: 'text-amber-300',   bg: 'bg-amber-950/40',   border: 'border-amber-600/40' },
  LOW:     { label: 'LOW CONFIDENCE',    text: 'text-rose-300',    bg: 'bg-rose-950/40',    border: 'border-rose-600/40' },
  UNKNOWN: { label: 'UNCERTAIN',         text: 'text-slate-400',   bg: 'bg-slate-900/40',   border: 'border-slate-700/40' },
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const cfg = CONFIDENCE_CONFIG[level] ?? CONFIDENCE_CONFIG.UNKNOWN;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-medium tracking-wide uppercase border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// ─── Filesystem Badge ─────────────────────────────────────────────────────────

export function FilesystemBadge({ type }: { type: FilesystemType | null }) {
  if (!type || type === 'UNKNOWN') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono text-slate-400 bg-slate-900/60 border border-slate-700/50">
        UNKNOWN
      </span>
    );
  }

  const isXFS = type === 'XFS';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
      isXFS
        ? 'text-cyan-300 bg-cyan-950/40 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
        : 'text-blue-300 bg-blue-950/40 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
    }`}>
      <span className={`w-1 h-1 rounded-full ${isXFS ? 'bg-cyan-400' : 'bg-blue-400'}`} />
      {type}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  subtext?: string;
  trend?: string;
}

export function StatCard({ label, value, icon, color = '#06b6d4', subtext, trend }: StatCardProps) {
  return (
    <div className="relative group p-4 rounded-xl bg-gradient-to-b from-[#0b101f] to-[#080d19] border border-[#162137] hover:border-cyan-500/40 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.12)]">
      {/* Subtle top indicator bar */}
      <div
        className="absolute top-0 left-4 right-4 h-[1px] opacity-40 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-semibold flex items-center gap-1.5">
            {label}
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono mt-1 tracking-tight flex items-baseline gap-2">
            <span>{value}</span>
            {trend && (
              <span className="text-[10px] font-normal text-emerald-400 font-mono">
                {trend}
              </span>
            )}
          </div>
          {subtext && (
            <div className="text-[11px] text-slate-500 mt-1 font-mono truncate">
              {subtext}
            </div>
          )}
        </div>

        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
          style={{ background: `${color}15`, border: `1px solid ${color}35` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

export function ProgressBar({ value, max = 100, color = '#06b6d4' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-1.5 bg-[#0f172a] rounded-full overflow-hidden border border-[#1e293b]">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          boxShadow: `0 0 8px ${color}80`
        }}
      />
    </div>
  );
}

// ─── Signal Checklist ─────────────────────────────────────────────────────────

interface SignalChecklistProps {
  signals: Array<{ label: string; value: boolean | null | undefined }>;
}

export function SignalChecklist({ signals }: SignalChecklistProps) {
  return (
    <div className="space-y-1.5">
      {signals.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-2 text-xs font-mono py-1 px-2 rounded bg-[#090e1c] border border-[#141e33]">
          {value === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
          {value === false && <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
          {(value === null || value === undefined) && (
            <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex-shrink-0" />
          )}
          <span className={
            value === true ? 'text-emerald-300' :
            value === false ? 'text-rose-300' :
            'text-slate-400'
          }>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Hash Display with Instant Copy ──────────────────────────────────────────

export function HashDisplay({ algorithm, digest, isLegacy }: {
  algorithm: string;
  digest?: string | null;
  isLegacy?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const displayDigest = digest || 'PENDING CALCULATION';

  const handleCopy = () => {
    if (!digest) return;
    navigator.clipboard.writeText(digest);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#090e1c] border border-[#17223b] text-xs font-mono group">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${
          isLegacy
            ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
            : 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/50'
        }`}>
          {algorithm}
        </span>
        <span className="text-slate-400 truncate max-w-[260px] md:max-w-md select-all" title={displayDigest}>
          {displayDigest}
        </span>
      </div>

      {digest && (
        <button
          onClick={handleCopy}
          className="p-1 rounded text-slate-500 hover:text-cyan-300 hover:bg-[#121c33] transition-colors flex-shrink-0"
          title="Copy Hash to Clipboard"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

// ─── Provenance Tag ────────────────────────────────────────────────────────────

export function ProvenanceTag({ source }: { source: string }) {
  const colors: Record<string, { text: string; bg: string; border: string }> = {
    RECOVERED: { text: 'text-emerald-400', bg: 'bg-emerald-950/50', border: 'border-emerald-700/40' },
    INFERRED:  { text: 'text-amber-400',   bg: 'bg-amber-950/50',   border: 'border-amber-700/40' },
    DERIVED:   { text: 'text-blue-400',    bg: 'bg-blue-950/50',    border: 'border-blue-700/40' },
    UNKNOWN:   { text: 'text-slate-400',   bg: 'bg-slate-900/50',   border: 'border-slate-700/40' },
  };

  const style = colors[source] ?? colors.UNKNOWN;

  return (
    <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
      {source}
    </span>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="px-6 py-5 border-b border-[#141e33] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#090e1c] via-[#070b16] to-[#080d19]">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide">{title}</h1>
          {badge && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-1 font-mono">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900/60 border border-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
        {icon}
      </div>
      <div className="text-sm font-semibold text-slate-200 font-mono">{title}</div>
      {description && <div className="text-xs text-slate-500 mt-1.5 max-w-sm font-mono">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="border-2 border-[#16233d] border-t-cyan-400 rounded-full animate-spin"
    />
  );
}

// ─── Origin Badge (Real / Demo / Simulated) ───────────────────────────────────

export type DataOrigin = 'REAL' | 'DEMO' | 'SIMULATED';

export function OriginBadge({ origin }: { origin: DataOrigin }) {
  if (origin === 'REAL') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        REAL
      </span>
    );
  }
  if (origin === 'DEMO') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-950/60 text-cyan-400 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        DEMO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-950/60 text-amber-400 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      SIMULATED
    </span>
  );
}
