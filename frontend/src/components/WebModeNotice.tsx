/**
 * WebModeNotice — displays the current execution context.
 *
 * Detects whether the app is running in a web-only context (no local
 * forensic engine available) or in a local deployment with the Rust
 * forensic core.
 *
 * Phase 39 (UI Truthfulness): every panel that shows forensic results
 * must clearly identify the data origin: REAL | DEMO | SIMULATED | WEB MODE.
 *
 * Phase 40 (Web Deployment): the web frontend must explain when local
 * forensic processing is required.
 */

import { Monitor, Globe, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

// ─── Mode detection ──────────────────────────────────────────────────────────

/**
 * Detect whether this app has access to a local forensic API.
 *
 * In a Vercel / CDN deployment there is no local Rust engine.
 * Detection heuristic:
 *   - If window.__TRACEX_LOCAL_API is set (injected by local server) → LOCAL
 *   - If hostname is localhost/127.0.0.1 → LOCAL (likely)
 *   - Otherwise → WEB
 *
 * Note: this is a best-effort hint only. Real API availability is only
 * confirmed when an actual API call succeeds.
 */
export type AppExecutionMode = 'LOCAL' | 'WEB' | 'UNKNOWN';

declare global {
  interface Window {
    __TRACEX_LOCAL_API?: string;
  }
}

export function detectExecutionMode(): AppExecutionMode {
  if (typeof window === 'undefined') return 'UNKNOWN';
  if (window.__TRACEX_LOCAL_API) return 'LOCAL';
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return 'LOCAL';
  }
  return 'WEB';
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface WebModeNoticeProps {
  /** Override the auto-detected mode for testing. */
  mode?: AppExecutionMode;
  /** Whether to show the compact inline version. */
  compact?: boolean;
  /** Additional CSS class names. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WebModeNotice({ mode: modeProp, compact = false, className = '' }: WebModeNoticeProps) {
  const mode = modeProp ?? detectExecutionMode();

  if (compact) {
    return <CompactBadge mode={mode} className={className} />;
  }

  return <FullBanner mode={mode} className={className} />;
}

// ─── Compact badge ───────────────────────────────────────────────────────────

function CompactBadge({ mode, className }: { mode: AppExecutionMode; className: string }) {
  if (mode === 'LOCAL') {
    return (
      <span
        id="mode-badge-local"
        className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 ${className}`}
      >
        <Monitor size={9} />
        LOCAL ENGINE
      </span>
    );
  }

  if (mode === 'WEB') {
    return (
      <span
        id="mode-badge-web"
        className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 ${className}`}
      >
        <Globe size={9} />
        WEB MODE
      </span>
    );
  }

  return (
    <span
      id="mode-badge-unknown"
      className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border border-slate-500/30 bg-slate-500/10 text-slate-400 ${className}`}
    >
      <Info size={9} />
      UNKNOWN MODE
    </span>
  );
}

// ─── Full banner ─────────────────────────────────────────────────────────────

function FullBanner({ mode, className }: { mode: AppExecutionMode; className: string }) {
  if (mode === 'LOCAL') {
    return (
      <div
        id="web-mode-banner-local"
        className={`rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3 ${className}`}
      >
        <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-0.5">
          <div className="text-[10px] font-mono font-bold tracking-widest text-emerald-400">
            LOCAL FORENSIC ENGINE — ACTIVE
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            TraceX is connected to the local Rust forensic core. Hashing, filesystem analysis,
            artifact recovery, and validation produce <strong className="text-white">real results</strong> from
            actual evidence images. No results are simulated.
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'WEB') {
    return (
      <div
        id="web-mode-banner-web"
        className={`rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3 ${className}`}
      >
        <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono font-bold tracking-widest text-amber-400">
            WEB MODE — LOCAL FORENSIC PROCESSING NOT AVAILABLE
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            This deployment runs in a web browser environment. Actual disk forensic processing —
            including XFS/Btrfs analysis, evidence hashing, artifact recovery, and validation —
            requires the <strong className="text-white">local Rust forensic engine</strong> which
            cannot execute inside a browser or serverless function.
          </p>
          <div className="pt-1 space-y-1">
            <p className="text-[10px] font-mono text-slate-500">
              AVAILABLE IN WEB MODE:
            </p>
            <ul className="text-[11px] text-slate-400 space-y-0.5 ml-2">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={9} className="text-emerald-400 flex-shrink-0" />
                Case management (localStorage)
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={9} className="text-emerald-400 flex-shrink-0" />
                Demo mode (deterministic synthetic data)
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={9} className="text-emerald-400 flex-shrink-0" />
                Report viewing (if reports were generated locally)
              </li>
            </ul>
            <p className="text-[10px] font-mono text-slate-500 pt-1">
              NOT AVAILABLE IN WEB MODE:
            </p>
            <ul className="text-[11px] text-slate-400 space-y-0.5 ml-2">
              <li className="flex items-center gap-1.5">
                <AlertTriangle size={9} className="text-red-400 flex-shrink-0" />
                Evidence hashing (SHA-256/SHA-512/BLAKE3)
              </li>
              <li className="flex items-center gap-1.5">
                <AlertTriangle size={9} className="text-red-400 flex-shrink-0" />
                XFS / Btrfs filesystem analysis
              </li>
              <li className="flex items-center gap-1.5">
                <AlertTriangle size={9} className="text-red-400 flex-shrink-0" />
                Deleted artifact discovery
              </li>
              <li className="flex items-center gap-1.5">
                <AlertTriangle size={9} className="text-red-400 flex-shrink-0" />
                File carving and recovery
              </li>
              <li className="flex items-center gap-1.5">
                <AlertTriangle size={9} className="text-red-400 flex-shrink-0" />
                Validation engine
              </li>
            </ul>
          </div>
          <div className="pt-2 border-t border-amber-500/10">
            <p className="text-[10px] font-mono text-slate-500">
              To use the full forensic engine, run TraceX locally:
            </p>
            <pre className="mt-1 text-[10px] font-mono text-emerald-400 bg-black/30 rounded px-2 py-1">
              cargo build --release{'\n'}
              ./target/release/forensic-recovery --help
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // UNKNOWN
  return (
    <div
      id="web-mode-banner-unknown"
      className={`rounded-xl border border-slate-500/20 bg-slate-500/5 p-3 flex items-center gap-2 ${className}`}
    >
      <Info size={14} className="text-slate-400 flex-shrink-0" />
      <p className="text-[11px] text-slate-400">
        Forensic engine status unknown. Check{' '}
        <span className="font-mono text-slate-300">TRACEX_LOCAL_API</span> configuration.
      </p>
    </div>
  );
}

// ─── Data origin label (for individual result panels) ─────────────────────────

export type DataOrigin = 'REAL' | 'DEMO' | 'SIMULATED' | 'NOT_AVAILABLE';

interface DataOriginBadgeProps {
  origin: DataOrigin;
  className?: string;
}

/**
 * Small badge that labels the origin of displayed data.
 * Required by Phase 30 and Phase 39: every result must be labeled.
 */
export function DataOriginBadge({ origin, className = '' }: DataOriginBadgeProps) {
  const config: Record<DataOrigin, { label: string; color: string }> = {
    REAL:          { label: 'REAL',          color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    DEMO:          { label: 'DEMO',          color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
    SIMULATED:     { label: 'SIMULATED',     color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    NOT_AVAILABLE: { label: 'NOT AVAILABLE', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  };

  const { label, color } = config[origin];

  return (
    <span
      className={`inline-flex items-center text-[8px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded border ${color} ${className}`}
    >
      {label}
    </span>
  );
}
