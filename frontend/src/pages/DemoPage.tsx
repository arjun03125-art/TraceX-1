/**
 * DemoPage — TRACE X Guided Forensic Demo
 *
 * 9 numbered stages. 1x default speed. Auto + Guided modes.
 * COMPLETELY ISOLATED — zero interaction with real data stores.
 * All data is synthetic. Never persists anywhere.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, HardDrive, CheckCircle2, ScanLine, Search,
  FileCheck2, ShieldCheck, ScrollText, ClipboardList,
  AlertTriangle, ChevronRight, ChevronLeft, Terminal,
  ArrowRight, Play, Pause, RotateCcw, X,
  FileX2, Fingerprint, Clock, Hash, Lock,
  Circle, Loader2
} from 'lucide-react';

// ─── Pipeline definition ─────────────────────────────────────────────────────

interface DemoStage {
  num: string;
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  headline: string;
  explanation: string;
  why: string;
  input: string;
  process: string[];
  output: string;
  // Duration in ms for auto-play at 1x
  durationMs: number;
  // Terminal log lines
  log: string[];
}

const STAGES: DemoStage[] = [
  {
    num: '01',
    id: 'create-case',
    label: 'CREATE CASE',
    icon: ClipboardList,
    color: '#3b82f6',
    headline: 'Every investigation begins with a structured case.',
    explanation:
      'A forensic case is a controlled workspace that links the evidence, the examiner, and the chain of custody. Without a case, evidence has no legal context.',
    why: 'Courts require that evidence be tied to a documented investigation with a named examiner and an opening date.',
    input: 'New investigation request',
    process: [
      'Assign unique case identifier',
      'Register lead examiner',
      'Set classification level',
      'Initialize audit trail',
    ],
    output: 'Case workspace created — DEMO-001',
    durationMs: 8000,
    log: [
      '$ tracex case create',
      '  Case ID   : DEMO-001',
      '  Title     : TRACE X Demo Investigation',
      '  Examiner  : Demo Examiner (SIMULATED)',
      '  Opened    : ' + new Date().toISOString().slice(0, 10),
      '  Status    : Active',
      '',
      '[OK] Case DEMO-001 created',
      '[OK] Audit entry #001 written',
      '[OK] Write-block mode: ENFORCED',
    ],
  },
  {
    num: '02',
    id: 'add-evidence',
    label: 'ADD EVIDENCE',
    icon: HardDrive,
    color: '#22d3ee',
    headline: 'Evidence is attached before any analysis begins.',
    explanation:
      'A forensic image (RAW, E01, or AFF4) is registered as an evidence source. The file is never modified — only read. The path and size are logged immediately.',
    why: 'The evidence must be on record before any processing. This creates a clean baseline for the chain of custody.',
    input: 'demo-evidence-image.img (48 GiB)',
    process: [
      'Register evidence source path',
      'Record file size and format',
      'Log registration to audit trail',
      'Prepare for integrity check',
    ],
    output: 'Evidence source registered — EV-DEMO-001',
    durationMs: 7000,
    log: [
      '$ tracex evidence add --image demo-evidence-image.img',
      '  Evidence ID : EV-DEMO-001',
      '  Source      : demo-evidence-image.img',
      '  Size        : 48.0 GiB',
      '  Format      : RAW',
      '  Case        : DEMO-001',
      '',
      '[OK] Evidence EV-DEMO-001 registered',
      '[OK] Audit entry #002 written',
      '[ ] Hash verification pending...',
    ],
  },
  {
    num: '03',
    id: 'verify-evidence',
    label: 'VERIFY EVIDENCE',
    icon: Hash,
    color: '#a78bfa',
    headline: 'Integrity is verified before analysis begins.',
    explanation:
      'TRACE X computes two independent cryptographic hashes (SHA-256 and BLAKE3) of the evidence image. These are stored in the audit log as the baseline fingerprint.',
    why: 'Any future question about whether the evidence was modified can be answered by recomputing and comparing the hashes.',
    input: 'EV-DEMO-001 — demo-evidence-image.img',
    process: [
      'Open image in read-only mode (O_RDONLY)',
      'Stream image through SHA-256 algorithm',
      'Stream image through BLAKE3 algorithm',
      'Compare against provided hash (if any)',
      'Record both hashes to audit log',
    ],
    output: 'SHA-256 ✓  BLAKE3 ✓  — SIMULATED RESULT',
    durationMs: 10000,
    log: [
      '$ tracex evidence verify --id EV-DEMO-001',
      '  Mode        : O_RDONLY (write-blocked)',
      '',
      '  Computing SHA-256...',
      '  ░░░░░░░░░░░░░░░░░░░░  0%',
      '  ████░░░░░░░░░░░░░░░░  20%',
      '  ████████░░░░░░░░░░░░  40%',
      '  ████████████░░░░░░░░  60%',
      '  ████████████████░░░░  80%',
      '  ████████████████████  100%',
      '  SHA-256 : a3f9b2e1...c2d4 [SIMULATED]',
      '',
      '  Computing BLAKE3...',
      '  BLAKE3  : 8d2f1a9c...f6b9 [SIMULATED]',
      '',
      '[OK] Verification PASSED (simulated)',
      '[OK] Audit entry #003 written',
    ],
  },
  {
    num: '04',
    id: 'analyze-evidence',
    label: 'ANALYZE EVIDENCE',
    icon: ScanLine,
    color: '#fbbf24',
    headline: 'TRACE X maps the filesystem geometry.',
    explanation:
      'The filesystem on the image is parsed: superblock, allocation group headers, B-tree structures, and inode tables are all mapped. This tells TRACE X where files live and where deleted files may still exist.',
    why: 'Without understanding the filesystem layout, we cannot know where to look for deleted file remnants.',
    input: 'EV-DEMO-001 — XFS v5 image',
    process: [
      'Read and validate XFS superblock',
      'Map 8 allocation group (AG) headers',
      'Traverse inode B-trees per AG',
      'Traverse extent B-trees',
      'Catalogue free space blocks',
      'Build complete filesystem geometry',
    ],
    output: 'Filesystem mapped — 1,847,302 inodes, 94,182 free clusters',
    durationMs: 12000,
    log: [
      '$ tracex analyze --evidence EV-DEMO-001 --fs xfs',
      '',
      '  Reading superblock at 0x0000...',
      '  Magic : 0x58465342 (XFSB) ✓',
      '  Filesystem: XFS v5 | Block size: 4096 B',
      '  Allocation groups: 8',
      '',
      '  Traversing AG[0]... 230,912 inodes',
      '  Traversing AG[1]... 231,048 inodes',
      '  Traversing AG[2]... 230,187 inodes',
      '  Traversing AG[3]... 229,944 inodes',
      '  Traversing AG[4]... 231,523 inodes',
      '  Traversing AG[5]... 230,712 inodes',
      '  Traversing AG[6]... 231,089 inodes',
      '  Traversing AG[7]... 231,887 inodes',
      '',
      '[OK] 1,847,302 live inodes mapped',
      '[OK] 94,182 free clusters catalogued',
      '[OK] Audit entry #004 written',
    ],
  },
  {
    num: '05',
    id: 'find-deleted',
    label: 'FIND DELETED ARTIFACTS',
    icon: FileX2,
    color: '#f43f5e',
    headline: 'Deleted files leave traces in filesystem structures.',
    explanation:
      'When a file is deleted, its inode record (di_nlink == 0) may still exist. Extent maps may point to data blocks that haven\'t been overwritten. TRACE X scans for all of these.',
    why: 'Files deleted by an attacker or user are often still physically present on disk. The filesystem just no longer references them through the normal directory tree.',
    input: 'Filesystem geometry from Step 04',
    process: [
      'Scan each AG for inodes with di_nlink == 0',
      'Identify extents pointing to unallocated blocks',
      'Run block-level signature carving (PDF, JPEG, ELF, SQLite)',
      'Classify each candidate by confidence',
    ],
    output: '112 deleted file candidates — HIGH: 73 | MEDIUM: 31 | LOW: 8',
    durationMs: 12000,
    log: [
      '$ tracex discover --strategy all --min-confidence medium',
      '',
      '  Strategy 1/3: Inode scan (di_nlink == 0)',
      '  AG[0] → 14 unlinked inodes',
      '  AG[1] → 23 unlinked inodes',
      '  AG[2] → 19 unlinked inodes',
      '  AG[3] → 31 unlinked inodes',
      '  (remaining AGs)...',
      '',
      '  Strategy 2/3: Extent map reconstruction',
      '  87 recoverable extents with intact metadata',
      '',
      '  Strategy 3/3: Block-level signature carving',
      '  JPEG: 4  |  PDF: 3  |  SQLite: 2  |  ELF: 2  |  ZIP: 1',
      '',
      '[OK] Candidates: 112 [SIMULATED]',
      '[OK] HIGH: 73  MEDIUM: 31  LOW: 8',
      '[OK] Audit entry #005 written',
    ],
  },
  {
    num: '06',
    id: 'recover',
    label: 'RECOVER ARTIFACTS',
    icon: FileCheck2,
    color: '#34d399',
    headline: 'File content is reconstructed from disk remnants.',
    explanation:
      'For each candidate, TRACE X reads the extent map and reassembles blocks into a file. Fragmented files are handled by stitching discontinuous block ranges. Each recovered file gets a unique ID.',
    why: 'The goal of forensic recovery is to produce the actual file content, not just metadata. The recovered file can then be examined as evidence.',
    input: '104 high/medium confidence candidates from Step 05',
    process: [
      'Read extents for each candidate (read-only)',
      'Reassemble contiguous and fragmented blocks',
      'Handle gaps with gap-fill markers',
      'Write recovered file to isolated output path',
      'Compute per-file hash for integrity',
    ],
    output: '98 files recovered — 89 at 100% integrity, 9 partial',
    durationMs: 14000,
    log: [
      '$ tracex recover --candidates HIGH,MEDIUM --output /demo/recovered/',
      '',
      '  Processing 104 candidates...',
      '  [1/104]  contracts_Q3.pdf       → 4 extents  → 100%',
      '  [2/104]  employee_db.sqlite     → 12 extents → 97.4% (2 gaps)',
      '  [3/104]  access_log_sep.txt     → 1 extent   → 100%',
      '  [4/104]  net_capture_eth0.pcap  → 8 extents  → 100%',
      '  ...',
      '',
      '  Progress: ░░░░░░░░░░░░░░░░░░░░   0%',
      '  Progress: █████░░░░░░░░░░░░░░░  25%',
      '  Progress: ██████████░░░░░░░░░░  50%',
      '  Progress: ███████████████░░░░░  75%',
      '  Progress: ████████████████████ 100%',
      '',
      '[OK] Recovered: 98 / 104 candidates [SIMULATED]',
      '[OK] Full integrity: 89 files',
      '[OK] Audit entry #006 written',
    ],
  },
  {
    num: '07',
    id: 'validate',
    label: 'VALIDATE RESULTS',
    icon: ShieldCheck,
    color: '#10b981',
    headline: 'Every recovered artifact is independently verified.',
    explanation:
      'TRACE X checks each recovered file through multiple independent signals: file magic bytes, internal structure, checksum, MACB timestamps, and metadata consistency. Each gets an explicit provenance tag.',
    why: 'Validation makes the difference between a file you "found" and a file you can defend in court. Every artifact must carry provenance.',
    input: '98 recovered files from Step 06',
    process: [
      'Match file magic bytes against known signatures',
      'Validate internal file structure (PDF xref, SQLite header, etc.)',
      'Recompute and verify per-file hash',
      'Cross-check MACB timestamps with filesystem records',
      'Assign provenance: RECOVERED | INFERRED | DERIVED',
    ],
    output: 'RECOVERED (≥0.85): 89 files | INFERRED: 9 files | UNKNOWN: 0',
    durationMs: 10000,
    log: [
      '$ tracex validate --all --signals magic,structure,hash,macb',
      '',
      '  contracts_Q3.pdf',
      '  [✓] Magic: PDF-1.7',
      '  [✓] Structure: valid xref table',
      '  [✓] Hash verified (independent)',
      '  [✓] mtime: 2026-09-13T22:14:55Z',
      '  → RECOVERED  confidence: 0.97',
      '',
      '  employee_db.sqlite',
      '  [✓] Magic: SQLite 3.x',
      '  [✓] Page checksum: PASS',
      '  [~] 2 gap-filled blocks',
      '  → INFERRED   confidence: 0.81',
      '',
      '[OK] RECOVERED: 89  INFERRED: 9  UNKNOWN: 0 [SIMULATED]',
      '[OK] Audit entry #007 written',
    ],
  },
  {
    num: '08',
    id: 'report',
    label: 'GENERATE REPORT',
    icon: ScrollText,
    color: '#f97316',
    headline: 'A court-ready report is assembled from the full investigation.',
    explanation:
      'TRACE X compiles the case metadata, evidence records, analysis results, recovery manifest, validation scores, and complete audit trail into a structured forensic report.',
    why: 'Forensic findings are only useful in legal proceedings if they are documented in a methodology-transparent, tamper-evident report.',
    input: 'Case + Evidence + Analysis + Recovery + Validation + Audit',
    process: [
      'Compile investigation methodology section',
      'Embed evidence acquisition metadata',
      'Include recovery and validation manifest',
      'Attach chain of custody (47 events)',
      'Generate report hash for tamper detection',
      'Export HTML, PDF, JSON, CSV formats',
    ],
    output: 'TRACE X DEMONSTRATION REPORT — SIMULATED DATA',
    durationMs: 10000,
    log: [
      '$ tracex report --case DEMO-001 --format all',
      '',
      '  Compiling methodology...',
      '  Embedding evidence metadata...',
      '  Attaching recovery manifest (98 artifacts)...',
      '  Attaching validation manifest (89 RECOVERED)...',
      '  Embedding audit trail (47 events)...',
      '  Computing report hash...',
      '',
      '  → demo_report.html  (2.4 MB) [SIMULATED]',
      '  → demo_report.pdf   (3.1 MB) [SIMULATED]',
      '  → demo_report.json  (847 KB) [SIMULATED]',
      '  → demo_manifest.csv (124 KB) [SIMULATED]',
      '',
      '[OK] Report hash: c7f2a9b3... [SIMULATED]',
      '[OK] Audit entry #008 written',
    ],
  },
  {
    num: '09',
    id: 'audit',
    label: 'AUDIT TRAIL',
    icon: ClipboardList,
    color: '#8b5cf6',
    headline: 'Every action in this investigation was recorded.',
    explanation:
      'The audit trail is an append-only log of every operation: who did what, when, and to which evidence. It cannot be edited. It is included in the final report.',
    why: 'Chain of custody requires that every action on evidence be documented. If any step is questioned, the audit log provides the authoritative record.',
    input: 'All operations from Steps 01–08',
    process: [
      'Review append-only audit log',
      'Verify cryptographic chain (each entry references the previous)',
      'Display all 8 major workflow events',
    ],
    output: '8 audit events — cryptographically chained [SIMULATED]',
    durationMs: 8000,
    log: [
      '$ tracex audit --case DEMO-001 --verify',
      '',
      '  #001  CASE_CREATED          2026-10-03T16:00:00Z [DEMO]',
      '  #002  EVIDENCE_ADDED        2026-10-03T16:00:08Z [DEMO]',
      '  #003  VERIFICATION_STARTED  2026-10-03T16:00:15Z [DEMO]',
      '  #004  ANALYSIS_STARTED      2026-10-03T16:00:25Z [DEMO]',
      '  #005  CANDIDATES_IDENTIFIED 2026-10-03T16:01:37Z [DEMO]',
      '  #006  RECOVERY_STARTED      2026-10-03T16:02:58Z [DEMO]',
      '  #007  VALIDATION_COMPLETED  2026-10-03T16:04:12Z [DEMO]',
      '  #008  REPORT_GENERATED      2026-10-03T16:05:02Z [DEMO]',
      '',
      '[OK] Chain integrity: VERIFIED (simulated)',
      '[OK] 8 events — no gaps detected',
    ],
  },
];

// ─── Pipeline breadcrumb component ───────────────────────────────────────────

function PipelineBar({ activeIdx, completedIdxs }: { activeIdx: number; completedIdxs: Set<number> }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center min-w-max gap-0">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const done = completedIdxs.has(i);
          const active = activeIdx === i;
          const pending = !done && !active;
          return (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-500 ${
                  active
                    ? 'bg-[#0c1a2e] border'
                    : done
                      ? 'text-[#34d399]'
                      : 'text-[#2d3748]'
                }`}
                style={active ? { borderColor: `${s.color}40`, color: s.color } : undefined}
              >
                {done ? (
                  <CheckCircle2 className="w-3 h-3 text-[#34d399]" />
                ) : active ? (
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <Circle className="w-3 h-3 fill-current" style={{ color: s.color }} />
                  </motion.div>
                ) : (
                  <Circle className="w-3 h-3" />
                )}
                <span className={pending ? 'hidden sm:inline' : ''}>{s.num}</span>
                <span className="hidden md:inline">{s.label}</span>
              </div>
              {i < STAGES.length - 1 && (
                <ChevronRight className={`w-3 h-3 mx-0.5 flex-shrink-0 ${done ? 'text-[#34d399]/50' : 'text-[#1c2536]'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Log terminal ─────────────────────────────────────────────────────────────

function StageTerminal({ lines, speed }: { lines: string[]; speed: number }) {
  const [shown, setShown] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const linesKey = lines.join('|');

  useEffect(() => {
    setShown([]);
    let i = 0;
    // At 1x: 350ms/line — leisurely, readable pace
    const interval = setInterval(() => {
      if (i < lines.length) {
        setShown(prev => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, Math.max(80, Math.round(350 / speed)));
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, speed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [shown]);

  return (
    <div className="rounded-xl bg-[#050811] border border-[#1c2536] overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#090c16] border-b border-[#1c2536] flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#f43f5e]/60" />
          <div className="w-2 h-2 rounded-full bg-[#fbbf24]/60" />
          <div className="w-2 h-2 rounded-full bg-[#34d399]/60" />
        </div>
        <span className="text-[10px] font-mono text-[#3b82f6] ml-1 font-bold tracking-widest">forensic-core</span>
        <span className="ml-auto text-[9px] font-mono text-[#2d3748] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]/60 inline-block" />
          SIMULATED OUTPUT
        </span>
      </div>
      <div className="p-4 font-mono text-[11px] leading-[1.65] min-h-[200px] max-h-[300px] overflow-y-auto flex-1">
        {shown.map((line, i) => (
          <div
            key={i}
            className={`${
              line.startsWith('[OK]') ? 'text-[#34d399]' :
              line.startsWith('[ERR]') ? 'text-[#f43f5e]' :
              line.startsWith('$') ? 'text-[#60a5fa] font-bold' :
              line.startsWith('  [✓]') ? 'text-[#34d399] pl-4' :
              line.startsWith('  [~]') ? 'text-[#fbbf24] pl-4' :
              line.startsWith('  →') ? 'text-[#a78bfa] pl-4' :
              line.includes('RECOVERED') ? 'text-[#34d399] font-bold' :
              line.includes('INFERRED') ? 'text-[#fbbf24] font-bold' :
              line.includes('[SIMULATED]') || line.includes('[DEMO]') ? 'text-[#4a5568]' :
              'text-[#94a3b8]'
            }`}
          >
            {line || '\u00a0'}
          </div>
        ))}
        {shown.length < lines.length && (
          <span className="animate-pulse text-[#3b82f6] text-sm">▋</span>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Step info card ───────────────────────────────────────────────────────────

function StepInfoCard({
  stage, isActive, isComplete, speed
}: {
  stage: DemoStage;
  isActive: boolean;
  isComplete: boolean;
  speed: number;
}) {
  const [processIdx, setProcessIdx] = useState(-1);

  useEffect(() => {
    if (!isActive) { setProcessIdx(-1); return; }
    setProcessIdx(-1);
    let i = 0;
    // Reveal one sub-step every ~2s at 1x
    const interval = setInterval(() => {
      if (i < stage.process.length) {
        setProcessIdx(i);
        i++;
      } else {
        clearInterval(interval);
      }
    }, Math.max(500, Math.round(2000 / speed)));
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, stage.id, speed]);

  const statusColor = isComplete ? '#34d399' : isActive ? stage.color : '#2d3748';
  const statusLabel = isComplete ? 'COMPLETE' : isActive ? 'RUNNING' : 'PENDING';

  return (
    <div
      className="rounded-2xl border overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${stage.color}06 0%, #090c16 100%)`,
        borderColor: isActive ? `${stage.color}30` : '#1c2536',
      }}
    >
      {/* Top accent */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${stage.color}50, transparent)` }} />
      )}

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${stage.color}12`, border: `1px solid ${stage.color}25` }}
            >
              <stage.icon className="w-6 h-6" style={{ color: stage.color }} />
            </div>
            <div>
              <div className="text-[9px] font-mono tracking-widest" style={{ color: stage.color }}>
                STEP {stage.num} OF {STAGES.length}
              </div>
              <div className="text-base font-bold text-white font-mono">{stage.label}</div>
            </div>
          </div>
          {/* STATUS */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border"
            style={{ color: statusColor, borderColor: `${statusColor}30`, background: `${statusColor}08` }}
          >
            {isComplete ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : isActive ? (
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                <Loader2 className="w-3 h-3 animate-spin" />
              </motion.div>
            ) : (
              <Circle className="w-3 h-3" />
            )}
            {statusLabel}
          </div>
        </div>

        {/* INPUT */}
        <div className="space-y-1">
          <div className="text-[9px] font-mono font-bold text-[#4a5568] tracking-widest uppercase">INPUT</div>
          <div className="text-[12px] font-mono text-[#94a3b8] bg-[#050811] border border-[#1c2536] px-3 py-2 rounded-lg">
            {stage.input}
          </div>
        </div>

        {/* PROCESS */}
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono font-bold text-[#4a5568] tracking-widest uppercase">PROCESS</div>
          <div className="space-y-1">
            {stage.process.map((p, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-[11px] font-mono px-2 py-1 rounded transition-all duration-500 ${
                  i <= processIdx ? 'text-[#94a3b8]' : 'text-[#2d3748]'
                }`}
              >
                {i < processIdx ? (
                  <CheckCircle2 className="w-3 h-3 text-[#34d399] flex-shrink-0" />
                ) : i === processIdx ? (
                  <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                    <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" style={{ color: stage.color }} />
                  </motion.div>
                ) : (
                  <Circle className="w-3 h-3 flex-shrink-0 text-[#1c2536]" />
                )}
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* OUTPUT */}
        <div className="space-y-1">
          <div className="text-[9px] font-mono font-bold text-[#4a5568] tracking-widest uppercase">OUTPUT</div>
          <div
            className={`text-[12px] font-mono px-3 py-2 rounded-lg border transition-all duration-700 ${
              isComplete
                ? 'text-[#34d399] border-[#34d399]/25 bg-[#052019]'
                : 'text-[#2d3748] border-[#1c2536] bg-[#050811]'
            }`}
          >
            {isComplete ? stage.output : '— awaiting completion —'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── "WHAT IS HAPPENING?" panel ───────────────────────────────────────────────

function ExplainerPanel({ stage }: { stage: DemoStage }) {
  return (
    <motion.div
      key={stage.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="p-4 rounded-xl bg-[#070b16] border border-[#1c2536] space-y-3"
    >
      <div className="text-[9px] font-mono font-bold text-[#4a5568] tracking-widest">WHAT IS HAPPENING?</div>
      <p className="text-[12px] text-[#94a3b8] leading-relaxed">{stage.explanation}</p>
      <div className="pt-2 border-t border-[#131d33]">
        <div className="text-[9px] font-mono font-bold text-[#4a5568] tracking-widest mb-1">WHY?</div>
        <p className="text-[11px] text-[#64748b] leading-relaxed">{stage.why}</p>
      </div>
    </motion.div>
  );
}

// ─── MAIN DEMO PAGE ──────────────────────────────────────────────────────────

export default function DemoPage() {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const [completedIdxs, setCompletedIdxs] = useState<Set<number>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'auto' | 'guided'>('auto');
  const [speed, setSpeed] = useState(1.0);
  const [guidedWaiting, setGuidedWaiting] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [terminalKey, setTerminalKey] = useState(0);

  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStage = STAGES[activeIdx];
  const isAllComplete = completedIdxs.size === STAGES.length;

  // Complete current stage and advance
  const completeAndAdvance = useCallback(() => {
    setCompletedIdxs(prev => new Set([...prev, activeIdx]));
    if (activeIdx < STAGES.length - 1) {
      if (mode === 'guided') {
        setIsPlaying(false);
        setGuidedWaiting(true);
      } else {
        // Auto mode — 2.5s natural pause between stages
        stageTimerRef.current = setTimeout(() => {
          setActiveIdx(i => i + 1);
          setTerminalKey(k => k + 1);
        }, 2500);
      }
    } else {
      setIsPlaying(false);
    }
  }, [activeIdx, mode]);

  // Auto-advance timer
  useEffect(() => {
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    if (!isPlaying || guidedWaiting) return;

    const duration = Math.max(4000, currentStage.durationMs / speed);
    stageTimerRef.current = setTimeout(completeAndAdvance, duration);

    return () => { if (stageTimerRef.current) clearTimeout(stageTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, activeIdx, speed, guidedWaiting]);

  // Elapsed timer
  useEffect(() => {
    if (isPlaying && !guidedWaiting) {
      elapsedRef.current = setInterval(() => setElapsedMs(e => e + 100), 100);
    } else {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [isPlaying, guidedWaiting]);

  const handlePlay = () => {
    if (isAllComplete) return;
    setIsPlaying(true);
    setGuidedWaiting(false);
    setTerminalKey(k => k + 1);
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
  };

  const handleReset = () => {
    handlePause();
    setActiveIdx(0);
    setCompletedIdxs(new Set());
    setGuidedWaiting(false);
    setElapsedMs(0);
    setTerminalKey(k => k + 1);
  };

  const handleGuidedContinue = () => {
    setGuidedWaiting(false);
    setActiveIdx(i => i + 1);
    setTerminalKey(k => k + 1);
    setIsPlaying(true);
  };

  const handleManualStage = (i: number) => {
    if (isPlaying) return;
    setActiveIdx(i);
    setTerminalKey(k => k + 1);
    setGuidedWaiting(false);
  };

  const elapsed = `${String(Math.floor(elapsedMs / 60000)).padStart(2, '0')}:${String(Math.floor((elapsedMs % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#06080f] text-white font-sans">

      {/* ══════ DEMO BANNER ══════ */}
      <div className="sticky top-0 z-50 bg-[#0d0205] border-b border-[#f43f5e]/20">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-2 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#f43f5e]/10 border border-[#f43f5e]/30">
              <AlertTriangle className="w-3 h-3 text-[#f43f5e]" />
              <span className="text-[10px] font-mono font-bold text-[#f43f5e] tracking-widest">DEMO MODE</span>
            </div>
            <span className="text-[10px] font-mono text-[#4a5568] hidden sm:inline">SIMULATED INVESTIGATION — NO REAL DATA</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-mono text-[#64748b] border border-[#1c2536] hover:text-white hover:border-[#2d3748] transition-all"
            >
              <X className="w-3 h-3" /> EXIT DEMO
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold text-[#3b82f6] border border-[#3b82f6]/30 hover:bg-[#3b82f6]/10 transition-all"
            >
              OPEN WORKSPACE <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-5">

        {/* ══════ PAGE HEADER ══════ */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-[#3b82f6]" />
            <span className="text-[10px] font-mono text-[#60a5fa] tracking-widest font-bold">TRACE X — FORENSIC INVESTIGATION DEMO</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white font-mono">
            Guided Workflow: Evidence → Report
          </h1>
          <p className="text-[12px] text-[#64748b] mt-1">
            9 numbered stages. Follow each step to understand what TRACE X does, what it receives, and what it produces.
          </p>
        </div>

        {/* ══════ PIPELINE BAR ══════ */}
        <div className="p-3 rounded-xl bg-[#090c16] border border-[#1c2536]">
          <div className="text-[9px] font-mono font-bold text-[#2d3748] tracking-widest mb-2">
            TRACE X INVESTIGATION PIPELINE
          </div>
          <PipelineBar activeIdx={activeIdx} completedIdxs={completedIdxs} />
        </div>

        {/* ══════ CONTROL BAR ══════ */}
        <div className="p-3 rounded-xl bg-[#090c16] border border-[#1c2536] flex flex-wrap items-center gap-3">
          {/* Mode selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#050811] border border-[#1c2536]">
            {(['auto', 'guided'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); handlePause(); }}
                className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                  mode === m
                    ? 'bg-[#1c2536] text-white'
                    : 'text-[#4a5568] hover:text-[#94a3b8]'
                }`}
              >
                {m === 'auto' ? 'AUTO DEMO' : 'GUIDED MODE'}
              </button>
            ))}
          </div>

          {/* Play / Pause */}
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={isAllComplete || guidedWaiting}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-mono font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isPlaying
                ? 'text-[#fbbf24] border-[#fbbf24]/30 bg-[#fbbf24]/08 hover:bg-[#fbbf24]/15'
                : 'text-[#3b82f6] border-[#3b82f6]/30 bg-[#3b82f6]/08 hover:bg-[#3b82f6]/15'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'PAUSE' : guidedWaiting ? 'PAUSED' : isAllComplete ? 'COMPLETE' : '▶ PLAY'}
          </button>

          {/* Speed */}
          <div className="flex items-center gap-1">
            {[0.5, 1.0, 1.5, 2.0].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                  speed === s
                    ? 'text-[#22d3ee] border-[#22d3ee]/30 bg-[#22d3ee]/08'
                    : 'text-[#4a5568] border-[#1c2536] hover:text-[#94a3b8]'
                }`}
              >
                {s}x{s === 1.0 ? ' ★' : ''}
              </button>
            ))}
          </div>

          {/* Restart */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono text-[#4a5568] border border-[#1c2536] hover:text-[#94a3b8] hover:border-[#2d3748] transition-all"
          >
            <RotateCcw className="w-3 h-3" /> RESET
          </button>

          {/* Elapsed */}
          <div className="ml-auto text-[10px] font-mono text-[#4a5568]">
            Elapsed: <span className="text-[#22d3ee] font-bold">{elapsed}</span>
            <span className="mx-2 text-[#1c2536]">|</span>
            Stage {activeIdx + 1} / {STAGES.length}
          </div>
        </div>

        {/* ══════ GUIDED MODE — STEP COMPLETE GATE ══════ */}
        <AnimatePresence>
          {guidedWaiting && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-5 rounded-xl bg-[#052019] border border-[#34d399]/30 flex items-center justify-between flex-wrap gap-4"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#34d399]" />
                <div>
                  <div className="text-[11px] font-mono font-bold text-[#34d399] tracking-widest">
                    STEP {currentStage.num} COMPLETE
                  </div>
                  <div className="text-[12px] text-[#94a3b8] font-mono mt-0.5">{currentStage.label} — {currentStage.output}</div>
                </div>
              </div>
              {activeIdx < STAGES.length - 1 && (
                <button
                  onClick={handleGuidedContinue}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-mono font-bold text-white border border-[#3b82f6]/40 bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 transition-all"
                >
                  CONTINUE TO STEP {STAGES[activeIdx + 1].num} — {STAGES[activeIdx + 1].label}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════ MAIN CONTENT AREA ══════ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            {/* Left: Step info + explainer */}
            <div className="lg:col-span-4 space-y-4">
              {/* Headline */}
              <div
                className="p-4 rounded-xl border"
                style={{ borderColor: `${currentStage.color}20`, background: `${currentStage.color}05` }}
              >
                <div className="text-[9px] font-mono text-[#4a5568] tracking-widest mb-1">STAGE OBJECTIVE</div>
                <p className="text-[13px] text-[#94a3b8] leading-relaxed font-mono italic">"{currentStage.headline}"</p>
              </div>

              {/* Info card */}
              <StepInfoCard
                stage={currentStage}
                isActive={isPlaying && !guidedWaiting}
                isComplete={completedIdxs.has(activeIdx)}
                speed={speed}
              />

              {/* Explainer */}
              <ExplainerPanel stage={currentStage} />

              {/* Manual nav */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleManualStage(Math.max(0, activeIdx - 1))}
                  disabled={activeIdx === 0 || isPlaying}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-mono border border-[#1c2536] text-[#4a5568] hover:text-[#94a3b8] hover:border-[#2d3748] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> PREV
                </button>
                <button
                  onClick={() => handleManualStage(Math.min(STAGES.length - 1, activeIdx + 1))}
                  disabled={activeIdx === STAGES.length - 1 || isPlaying}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-mono border border-[#1c2536] text-[#4a5568] hover:text-[#94a3b8] hover:border-[#2d3748] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  NEXT <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right: Terminal + stage selector */}
            <div className="lg:col-span-8 space-y-4">
              {/* Stage selector pills */}
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((s, i) => {
                  const done = completedIdxs.has(i);
                  const active = activeIdx === i;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleManualStage(i)}
                      disabled={isPlaying}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all disabled:cursor-not-allowed ${
                        active
                          ? 'scale-[1.04]'
                          : done
                            ? 'text-[#34d399] border-[#1c3a28] bg-[#052019]'
                            : 'text-[#4a5568] border-[#1c2536] hover:text-[#94a3b8]'
                      }`}
                      style={active ? { color: s.color, borderColor: `${s.color}35`, background: `${s.color}0A` } : undefined}
                    >
                      {done && !active ? <CheckCircle2 className="w-3 h-3 text-[#34d399]" /> : null}
                      {s.num} {s.label}
                    </button>
                  );
                })}
              </div>

              {/* Terminal */}
              <StageTerminal key={terminalKey} lines={currentStage.log} speed={speed} />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ══════ COMPLETION ══════ */}
        {isAllComplete && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="p-8 rounded-2xl border border-[#34d399]/25 bg-[#052019] relative overflow-hidden text-center"
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, #34d39908, transparent 70%)' }} />
            <CheckCircle2 className="w-14 h-14 text-[#34d399] mx-auto mb-4" />
            <h2 className="text-2xl font-bold font-mono text-white mb-1">09 / 09 — INVESTIGATION WORKFLOW COMPLETE</h2>
            <p className="text-[13px] text-[#64748b] mb-6 max-w-xl mx-auto">
              You have walked the complete TRACE X forensic pipeline from case creation to audit trail.
              This was a simulated demonstration using synthetic data only.
            </p>

            {/* Completion checklist */}
            <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mb-8 max-w-3xl mx-auto">
              {STAGES.map(s => (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-5 h-5 text-[#34d399]" />
                  <span className="text-[9px] font-mono text-[#34d399] text-center leading-tight">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#1c2536] text-[#94a3b8] text-sm font-mono hover:border-[#2d3748] hover:text-white transition-all"
              >
                <RotateCcw className="w-4 h-4" /> RESTART DEMO
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold font-mono text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #22d3ee)', boxShadow: '0 0 24px #3b82f615' }}
              >
                <Terminal className="w-4 h-4" /> OPEN REAL WORKSPACE <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 text-[10px] font-mono text-[#f43f5e]/50">
              TRACE X DEMONSTRATION REPORT — SIMULATED DATA — No real forensic data was processed.
            </div>
          </motion.div>
        )}

        {/* ══════ DISCLAIMER ══════ */}
        <div className="pt-4 border-t border-[#1c2536]/60 text-center">
          <p className="text-[10px] font-mono text-[#2d3748] max-w-lg mx-auto">
            All case numbers, file names, hashes, inodes, and recovery results shown here are
            synthetically generated for demonstration. This data does not represent any real investigation
            and must never be treated as evidence.
          </p>
        </div>
      </div>
    </div>
  );
}
