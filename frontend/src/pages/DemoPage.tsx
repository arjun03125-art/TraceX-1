/**
 * DemoPage — TRACE X Guided Forensic Demo
 *
 * Deterministic, frontend-only simulation workflow.
 * 9 numbered stages. Manual presentation controls (RUN STEP -> explain -> NEXT).
 * Zero backend/API/database/external dependencies.
 * Coherent dataset: Case TRACEX-DEMO-001, Evidence demo-evidence-01.raw, Filesystem XFS.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, HardDrive, CheckCircle2, ScanLine, Search,
  FileCheck2, ShieldCheck, ScrollText, ClipboardList,
  AlertTriangle, ChevronRight, ChevronLeft, Terminal,
  ArrowRight, Play, Pause, RotateCcw, X,
  FileX2, Hash, Circle, Loader2, Sparkles
} from 'lucide-react';

// ─── Pipeline Stage Definition ───────────────────────────────────────────────

interface DemoStage {
  num: string;
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  headline: string;
  explanation: string;
  why: string;
  whatWeTake: string;
  whatWeDo: string[];
  whatWeProduce: string[];
  whereItGoesNext: string;
  outputSummary: string;
  command: string;
  logLines: string[];
}

const STAGES: DemoStage[] = [
  {
    num: '01',
    id: 'create-case',
    label: 'CREATE CASE',
    icon: ClipboardList,
    color: '#3b82f6',
    headline: 'Every investigation begins with a legally structured case workspace.',
    explanation:
      'A forensic case is a controlled, auditable workspace that binds the evidence, the assigned lead examiner, and the unbroken chain of custody. Without a formal case, evidence lacks legal admissibility.',
    why: 'Courts require all digital evidence to be tied to a documented investigation with a named examiner, timestamp, and opening authority.',
    whatWeTake: 'Formal forensic investigation request & incident declaration',
    whatWeDo: [
      'Assign unique case identifier: TRACEX-DEMO-001',
      'Register lead forensic examiner: Demo Examiner',
      'Enforce hardware/kernel-level O_RDONLY write-blocking',
      'Initialize cryptographically chained append-only audit trail',
    ],
    whatWeProduce: [
      'Case Workspace: TRACEX-DEMO-001',
      'Case Title: Deleted Data Recovery Demonstration',
      'Examiner Assigned: Demo Examiner',
      'Audit Genesis Entry #001 (Genesis Block)',
    ],
    whereItGoesNext: '02 ADD EVIDENCE',
    outputSummary: 'Case TRACEX-DEMO-001 initialized — Examiner: Demo Examiner',
    command: 'tracex case create --id TRACEX-DEMO-001 --examiner "Demo Examiner"',
    logLines: [
      '[14:00:01] Initializing forensic case workspace...',
      '[14:00:02] Assigning case identifier: TRACEX-DEMO-001',
      '[14:00:02] Registering lead examiner: Demo Examiner',
      '[14:00:03] Security mode: O_RDONLY write-blocking ENFORCED',
      '[14:00:03] Audit genesis record #001 written to ledger',
      '[14:00:04] STEP 01 COMPLETE: Case workspace initialized',
    ],
  },
  {
    num: '02',
    id: 'add-evidence',
    label: 'ADD EVIDENCE',
    icon: HardDrive,
    color: '#22d3ee',
    headline: 'Physical and logical disk images are registered into custody.',
    explanation:
      'A forensic disk image is registered as an evidence container. The bitstream source is mounted strictly read-only and indexed by size and sector layout before any byte inspection occurs.',
    why: 'Evidence must be formally registered into the chain of custody prior to any analysis to establish an indisputable evidentiary baseline.',
    whatWeTake: 'Forensic disk image (demo-evidence-01.raw)',
    whatWeDo: [
      'Register evidence image container path',
      'Verify physical write-blocker & file size (32.0 GiB)',
      'Enforce immutable read-only permissions (O_RDONLY)',
      'Link evidence container to Case TRACEX-DEMO-001',
    ],
    whatWeProduce: [
      'Evidence ID: EV-DEMO-001',
      'Container Path: /evidence/demo-evidence-01.raw',
      'Bitstream Size: 32.0 GiB (34,359,738,368 bytes)',
      'Audit Entry #002',
    ],
    whereItGoesNext: '03 VERIFY EVIDENCE',
    outputSummary: 'Evidence EV-DEMO-001 registered — 32.0 GiB RAW image',
    command: 'tracex evidence add --image demo-evidence-01.raw --case TRACEX-DEMO-001',
    logLines: [
      '[14:00:05] Attaching evidence image: demo-evidence-01.raw',
      '[14:00:06] Verifying read-only access locks (O_RDONLY)...',
      '[14:00:06] Detected bitstream size: 32.0 GiB (raw sector dump)',
      '[14:00:07] Registered evidence ID: EV-DEMO-001',
      '[14:00:07] Audit entry #002 written to secure ledger',
      '[14:00:08] STEP 02 COMPLETE: Evidence EV-DEMO-001 registered',
    ],
  },
  {
    num: '03',
    id: 'verify-evidence',
    label: 'VERIFY EVIDENCE',
    icon: Hash,
    color: '#a78bfa',
    headline: 'Dual cryptographic hashes establish bitstream integrity.',
    explanation:
      'TRACE X streams the raw image bitstream through SHA-256 and BLAKE3 hashing engines simultaneously. These dual signatures are sealed into the chain of custody.',
    why: 'Cryptographic proof guarantees that not a single bit of the original digital media was altered during intake or subsequent examination.',
    whatWeTake: 'Registered evidence source (EV-DEMO-001)',
    whatWeDo: [
      'Stream bitstream in hardware-locked O_RDONLY mode',
      'Calculate cryptographic SHA-256 baseline hash',
      'Calculate high-throughput BLAKE3 integrity digest',
      'Record dual-hash fingerprint in chain of custody ledger',
    ],
    whatWeProduce: [
      'SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'BLAKE3: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
      'Cryptographic Evidence Fingerprint baseline',
      'Audit Entry #003',
    ],
    whereItGoesNext: '04 ANALYZE EVIDENCE',
    outputSummary: 'SHA-256 & BLAKE3 Verified — Bitstream integrity locked',
    command: 'tracex evidence verify --id EV-DEMO-001 --algorithms sha256,blake3',
    logLines: [
      '[14:00:09] Beginning bitstream cryptographic verification...',
      '[14:00:10] Streaming image blocks through SHA-256 engine...',
      '[14:00:11] SHA-256: e3b0c442...7852b855 [VERIFIED]',
      '[14:00:11] Streaming image blocks through BLAKE3 engine...',
      '[14:00:12] BLAKE3 : 4f53cda1...1202b945 [VERIFIED]',
      '[14:00:12] Audit entry #003 written: Dual-hash baseline recorded',
      '[14:00:13] STEP 03 COMPLETE: Evidence integrity verified',
    ],
  },
  {
    num: '04',
    id: 'analyze-evidence',
    label: 'ANALYZE EVIDENCE',
    icon: ScanLine,
    color: '#fbbf24',
    headline: 'TRACE X decodes and maps the underlying filesystem geometry.',
    explanation:
      'The partition and filesystem structures are parsed: superblock, allocation group headers, B-tree indexes, and inode allocation tables are mapped across all 8 allocation groups.',
    why: 'Understanding filesystem architecture enables the engine to know exactly where live data resides and where deleted file structures remain unallocated.',
    whatWeTake: 'Verified bitstream image (EV-DEMO-001)',
    whatWeDo: [
      'Inspect sector 0 and parse XFS primary Superblock (0x58465342)',
      'Map 8 Allocation Groups (AG 0–7) geometry',
      'Traverse Inode B+ trees and Extent allocation maps',
      'Index unallocated free space clusters for deleted artifact hunt',
    ],
    whatWeProduce: [
      'Filesystem: XFS v5 (Block size: 4096 B, AG count: 8)',
      'Live Inodes mapped: 1,847,302',
      'Unallocated clusters catalogued: 94,182 blocks',
      'Audit Entry #004',
    ],
    whereItGoesNext: '05 FIND DELETED ARTIFACTS',
    outputSummary: 'XFS v5 mapped — 1,847,302 inodes, 94,182 free clusters',
    command: 'tracex analyze --evidence EV-DEMO-001 --fs xfs --deep-map',
    logLines: [
      '[14:00:14] Inspecting partition table and primary superblock...',
      '[14:00:14] Detected filesystem: XFS v5 (magic: 0x58465342)',
      '[14:00:15] Mapping 8 allocation groups (AG 0 through 7)...',
      '[14:00:16] Scanning Inode B+ trees: 1,847,302 live inodes indexed',
      '[14:00:16] Cataloguing unallocated free space: 94,182 clusters',
      '[14:00:17] Audit entry #004 written: Filesystem geometry mapped',
      '[14:00:17] STEP 04 COMPLETE: XFS filesystem analyzed',
    ],
  },
  {
    num: '05',
    id: 'find-deleted',
    label: 'FIND DELETED ARTIFACTS',
    icon: Search,
    color: '#f43f5e',
    headline: 'Deleted files leave discoverable footprints in filesystem remnants.',
    explanation:
      'When files are deleted, unlinked inodes (di_nlink == 0) and orphan extent pointers often persist. TRACE X scans unallocated space and carves known file header signatures.',
    why: 'Deleted data is not immediately destroyed on disk; identifying its residual pointers allows forensically sound recovery.',
    whatWeTake: 'Filesystem map and unallocated clusters from Step 04',
    whatWeDo: [
      'Scan Allocation Groups for unlinked inodes (di_nlink == 0)',
      'Trace extent maps pointing to unallocated block runs',
      'Perform block-level signature carving (magic headers)',
      'Classify and score deleted candidates by forensic confidence',
    ],
    whatWeProduce: [
      '3 High-Confidence Deleted Artifacts found:',
      '• financial_audit_2026.pdf (Inode #482910, 100% confidence)',
      '• customer_records.sqlite (Inode #482915, 96% confidence)',
      '• system_auth.log (Inode #482922, 100% confidence)',
      'Audit Entry #005',
    ],
    whereItGoesNext: '06 RECOVER ARTIFACTS',
    outputSummary: '3 critical deleted artifacts discovered (confidence >= 95%)',
    command: 'tracex discover --case TRACEX-DEMO-001 --strategy unlinked-inodes,carve',
    logLines: [
      '[14:00:18] Scanning for unlinked inodes with di_nlink == 0...',
      '[14:00:19] [DISCOVERED] Inode 482910: PDF signature at extent 0x3F8200',
      '[14:00:19] [DISCOVERED] Inode 482915: SQLite header at extent 0x4A1000',
      '[14:00:20] [DISCOVERED] Inode 482922: Text log run at extent 0x5C2400',
      '[14:00:21] Classified 3 critical deleted artifacts (confidence >= 95%)',
      '[14:00:21] Audit entry #005 written: 3 candidate artifacts catalogued',
      '[14:00:22] STEP 05 COMPLETE: 3 deleted artifacts discovered',
    ],
  },
  {
    num: '06',
    id: 'recover-artifacts',
    label: 'RECOVER ARTIFACTS',
    icon: FileCheck2,
    color: '#34d399',
    headline: 'File data streams are reassembled from physical block extents.',
    explanation:
      'For each discovered candidate, TRACE X reads the physical disk extents and stitches contiguous and fragmented blocks back into complete file streams in an isolated quarantine vault.',
    why: 'Digital forensics requires extracting verifiable file content, not just raw disk coordinates, so files can be analyzed and submitted as evidence.',
    whatWeTake: '3 candidate artifacts and extent maps from Step 05',
    whatWeDo: [
      'Read disk extents from raw image bitstream (read-only)',
      'Stitch contiguous and fragmented block extents into memory',
      'Extract byte streams into isolated forensic recovery vault',
      'Calculate per-file SHA-256 checksums',
    ],
    whatWeProduce: [
      'financial_audit_2026.pdf (4.2 MB) — 100% blocks recovered',
      'customer_records.sqlite (18.6 MB) — 100% blocks recovered',
      'system_auth.log (840 KB) — 100% blocks recovered',
      'Recovery Rate: 3 of 3 artifacts recovered (100%)',
      'Audit Entry #006',
    ],
    whereItGoesNext: '07 VALIDATE RESULTS',
    outputSummary: '3 of 3 artifacts reconstructed — 100% block integrity',
    command: 'tracex recover --artifacts all --output-vault /evidence/recovered/',
    logLines: [
      '[14:00:23] Initiating block reassembly from extents...',
      '[14:00:24] [1/3] Reassembling financial_audit_2026.pdf (4.2 MB)... 100%',
      '[14:00:25] [2/3] Reassembling customer_records.sqlite (18.6 MB)... 100%',
      '[14:00:25] [3/3] Reassembling system_auth.log (840 KB)... 100%',
      '[14:00:26] Writing recovered artifacts to quarantined vault path...',
      '[14:00:26] Audit entry #006 written: 3 artifacts recovered',
      '[14:00:27] STEP 06 COMPLETE: 3 artifacts successfully recovered',
    ],
  },
  {
    num: '07',
    id: 'validate-results',
    label: 'VALIDATE RESULTS',
    icon: ShieldCheck,
    color: '#10b981',
    headline: 'Every recovered file is independently validated for integrity.',
    explanation:
      'TRACE X checks each recovered file against multiple signals: magic bytes, internal structure (PDF xref table, SQLite B-tree pages), timestamp coherence, and checksums.',
    why: 'Evidence is only admissible if you can legally prove it was recovered cleanly and not corrupted or fabricated during extraction.',
    whatWeTake: '3 recovered artifacts from Step 06',
    whatWeDo: [
      'Validate magic headers and internal file structure (PDF xref, SQLite header)',
      'Cross-check MACB timestamps against filesystem journal records',
      'Recompute and verify independent file hash integrity',
      'Assign formal legal provenance category: RECOVERED',
    ],
    whatWeProduce: [
      'Validation Status: PASSED (3 / 3 verified intact)',
      'Provenance Category: RECOVERED (Confidence: 1.00)',
      'Integrity verification certificates for all 3 files',
      'Audit Entry #007',
    ],
    whereItGoesNext: '08 GENERATE REPORT',
    outputSummary: 'Validation PASSED — 3 artifacts verified with intact provenance',
    command: 'tracex validate --vault /evidence/recovered/ --signals all',
    logLines: [
      '[14:00:28] Executing multi-signal validation suite...',
      '[14:00:29] [VALIDATED] financial_audit_2026.pdf: PDF-1.7 xref table intact',
      '[14:00:29] [VALIDATED] customer_records.sqlite: SQLite page checksums valid',
      '[14:00:30] [VALIDATED] system_auth.log: UTF-8 encoding valid, no corruptions',
      '[14:00:31] Validation grade: PASSED (3/3 artifacts verified)',
      '[14:00:31] Audit entry #007 written: Artifact validation complete',
      '[14:00:32] STEP 07 COMPLETE: Forensic validation PASSED',
    ],
  },
  {
    num: '08',
    id: 'generate-report',
    label: 'GENERATE REPORT',
    icon: ScrollText,
    color: '#f97316',
    headline: 'A comprehensive, tamper-evident forensic report is assembled.',
    explanation:
      'TRACE X compiles the entire investigative history: case parameters, evidence acquisition hashes, discovery methodology, recovery manifests, and validation certificates.',
    why: 'Forensic findings must be documented in a transparent, methodology-backed report ready for judicial review.',
    whatWeTake: 'Case metadata, evidence hashes, recovered artifacts, validation certificates',
    whatWeDo: [
      'Compile forensic examination methodology section',
      'Embed evidence acquisition metadata and dual cryptographic hashes',
      'Attach artifact recovery manifest and validation certificates',
      'Sign report cryptographically with SHA-256 seal',
    ],
    whatWeProduce: [
      'Court-Ready Examination Report: TRACEX-DEMO-001-REPORT',
      'Digital Signature Seal: 9b2a7d4e3f... [VERIFIED]',
      'Multi-format export bundle: PDF, HTML, JSON, CSV',
      'Audit Entry #008',
    ],
    whereItGoesNext: '09 AUDIT TRAIL',
    outputSummary: 'Court-ready report package generated — Cryptographically sealed',
    command: 'tracex report generate --case TRACEX-DEMO-001 --format all --seal',
    logLines: [
      '[14:00:33] Assembling court-ready forensic report package...',
      '[14:00:34] Embedding chain of custody and evidence hash manifests...',
      '[14:00:35] Embedding recovery catalog for 3 validated artifacts...',
      '[14:00:35] Generating cryptographic report seal (SHA-256)...',
      '[14:00:36] Export packages built: PDF, HTML, JSON, CSV',
      '[14:00:36] Audit entry #008 written: Report generated',
      '[14:00:37] STEP 08 COMPLETE: Court-ready report generated',
    ],
  },
  {
    num: '09',
    id: 'audit-trail',
    label: 'AUDIT TRAIL',
    icon: ClipboardList,
    color: '#8b5cf6',
    headline: 'The immutable, cryptographically chained audit log is sealed.',
    explanation:
      'Every operation throughout the investigation was recorded into an append-only ledger. TRACE X verifies that each entry references the hash of the preceding record without gap or modification.',
    why: 'An unbroken, cryptographically verifiable chain of custody is required to defend findings against claims of evidence tampering.',
    whatWeTake: 'Append-only audit log records #001 through #008',
    whatWeDo: [
      'Inspect append-only sequence from genesis block to current state',
      'Verify SHA-256 cryptographic chaining (hash-linked entries)',
      'Verify zero gaps, modifications, or deletions in the ledger',
      'Seal final investigation audit ledger',
    ],
    whatWeProduce: [
      'Chain of Custody: COMPLETE',
      'Audit Trail: COMPLETE (9 verified sequential entries)',
      'Ledger Tamper-Resistance: 100% VERIFIED',
      'Audit Entry #009 (Final Ledger Seal)',
    ],
    whereItGoesNext: 'INVESTIGATION COMPLETE',
    outputSummary: 'Audit Trail COMPLETE — 9 entries cryptographically sealed',
    command: 'tracex audit verify --case TRACEX-DEMO-001 --seal-final',
    logLines: [
      '[14:00:38] Inspecting append-only audit trail ledger...',
      '[14:00:39] Verifying cryptographic hash chain (#001 → #008)...',
      '[14:00:39] Chain integrity check: 100% VALID — no gaps detected',
      '[14:00:40] Confirming immutable timestamp sequence...',
      '[14:00:41] Audit entry #009 written: Final case ledger sealed',
      '[14:00:41] STEP 09 COMPLETE: Audit trail verified and sealed',
    ],
  },
];

type StepStatus = 'pending' | 'running' | 'paused' | 'completed';

export default function DemoPage() {
  const navigate = useNavigate();

  // Active step index (0 to 8)
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Status for each step
  const [stepStatuses, setStepStatuses] = useState<Record<number, StepStatus>>({
    0: 'pending',
    1: 'pending',
    2: 'pending',
    3: 'pending',
    4: 'pending',
    5: 'pending',
    6: 'pending',
    7: 'pending',
    8: 'pending',
  });

  // Track the number of displayed actions (0 to 4) and log lines for each step
  const [actionProgress, setActionProgress] = useState<Record<number, number>>({
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0,
  });

  const [displayedLogs, setDisplayedLogs] = useState<Record<number, string[]>>({
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [],
  });

  // Final summary view shown when Step 09 completes and user clicks Next
  const [showFinalSummary, setShowFinalSummary] = useState(false);

  // Timer ref for executing sequential actions/logs
  const executionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const activeStage = STAGES[currentStepIndex];
  const currentStatus = stepStatuses[currentStepIndex] || 'pending';
  const currentActionCount = actionProgress[currentStepIndex] || 0;
  const currentLogs = displayedLogs[currentStepIndex] || [];

  // Completed steps set
  const completedSteps = Object.entries(stepStatuses)
    .filter(([_, status]) => status === 'completed')
    .map(([idx]) => Number(idx));

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (executionTimerRef.current) clearInterval(executionTimerRef.current);
    };
  }, []);

  // Auto scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentLogs.length]);

  // ─── RUN STEP Handler ───────────────────────────────────────────────────────
  const handleRunStep = useCallback(() => {
    if (currentStatus === 'running') return;

    // Set status to running
    setStepStatuses(prev => ({ ...prev, [currentStepIndex]: 'running' }));

    const stage = STAGES[currentStepIndex];
    let logIdx = displayedLogs[currentStepIndex]?.length || 0;
    let actIdx = actionProgress[currentStepIndex] || 0;

    if (executionTimerRef.current) clearInterval(executionTimerRef.current);

    // Each step takes approx 3.6 seconds (6 log lines * 600ms = 3.6s)
    executionTimerRef.current = setInterval(() => {
      logIdx++;

      // Compute action count based on log progress (4 actions mapped over 6 log lines)
      const newActIdx = Math.min(stage.whatWeDo.length, Math.floor((logIdx / stage.logLines.length) * (stage.whatWeDo.length + 1)));
      actIdx = newActIdx;

      setDisplayedLogs(prev => ({
        ...prev,
        [currentStepIndex]: stage.logLines.slice(0, logIdx),
      }));

      setActionProgress(prev => ({
        ...prev,
        [currentStepIndex]: actIdx,
      }));

      // When all logs are printed, complete the step
      if (logIdx >= stage.logLines.length) {
        if (executionTimerRef.current) clearInterval(executionTimerRef.current);
        executionTimerRef.current = null;

        setStepStatuses(prev => ({ ...prev, [currentStepIndex]: 'completed' }));
        setActionProgress(prev => ({ ...prev, [currentStepIndex]: stage.whatWeDo.length }));
      }
    }, 600);
  }, [currentStepIndex, currentStatus, displayedLogs, actionProgress]);

  // ─── PAUSE Handler ──────────────────────────────────────────────────────────
  const handlePause = useCallback(() => {
    if (currentStatus === 'running') {
      if (executionTimerRef.current) clearInterval(executionTimerRef.current);
      executionTimerRef.current = null;
      setStepStatuses(prev => ({ ...prev, [currentStepIndex]: 'paused' }));
    }
  }, [currentStatus, currentStepIndex]);

  // ─── RESUME Handler ─────────────────────────────────────────────────────────
  const handleResume = useCallback(() => {
    if (currentStatus === 'paused') {
      handleRunStep();
    }
  }, [currentStatus, handleRunStep]);

  // ─── NEXT Handler ───────────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (currentStatus !== 'completed') return;

    if (executionTimerRef.current) clearInterval(executionTimerRef.current);

    if (currentStepIndex < STAGES.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
    } else {
      // Step 09 complete -> show final completion screen
      setShowFinalSummary(true);
    }
  }, [currentStatus, currentStepIndex]);

  // ─── PREVIOUS Handler ───────────────────────────────────────────────────────
  const handlePrevious = useCallback(() => {
    if (currentStepIndex === 0 || currentStatus === 'running') return;

    if (executionTimerRef.current) clearInterval(executionTimerRef.current);
    setShowFinalSummary(false);
    setCurrentStepIndex(prev => prev - 1);
  }, [currentStepIndex, currentStatus]);

  // ─── RESTART DEMO Handler ───────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    if (executionTimerRef.current) clearInterval(executionTimerRef.current);
    executionTimerRef.current = null;

    setCurrentStepIndex(0);
    setShowFinalSummary(false);
    setStepStatuses({
      0: 'pending',
      1: 'pending',
      2: 'pending',
      3: 'pending',
      4: 'pending',
      5: 'pending',
      6: 'pending',
      7: 'pending',
      8: 'pending',
    });
    setActionProgress({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 });
    setDisplayedLogs({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] });
  }, []);

  // ─── MANUAL STAGE SELECTION ─────────────────────────────────────────────────
  const handleSelectStage = useCallback((idx: number) => {
    if (currentStatus === 'running') return;
    if (executionTimerRef.current) clearInterval(executionTimerRef.current);
    setShowFinalSummary(false);
    setCurrentStepIndex(idx);
  }, [currentStatus]);

  return (
    <div className="min-h-screen bg-[#06080f] text-white font-sans flex flex-col selection:bg-cyan-500/20">

      {/* ══════ DEMO BANNER ══════ */}
      <header className="sticky top-0 z-50 bg-[#0a0507] border-b border-[#f43f5e]/25 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#f43f5e]/15 border border-[#f43f5e]/30">
              <AlertTriangle className="w-3.5 h-3.5 text-[#f43f5e]" />
              <span className="text-[11px] font-mono font-bold text-[#f43f5e] tracking-widest">DEMO MODE</span>
            </div>
            <span className="text-[11px] font-mono text-[#94a3b8] font-medium hidden sm:inline">
              SIMULATED INVESTIGATION — NO REAL DATA
            </span>
            <span className="text-[10px] font-mono text-[#4a5568] hidden md:inline">
              Case: <span className="text-[#94a3b8] font-bold">TRACEX-DEMO-001</span> | Evidence: <span className="text-[#94a3b8] font-bold">demo-evidence-01.raw</span> (XFS)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-[#94a3b8] border border-[#1c2536] hover:text-white hover:border-[#2d3748] transition-all"
            >
              <X className="w-3.5 h-3.5" /> EXIT DEMO
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            >
              OPEN WORKSPACE <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ══════ MAIN VIEW CONTAINER ══════ */}
      <main className="max-w-[1600px] w-full mx-auto px-4 md:px-8 py-6 space-y-6 flex-1">

        {/* ══════ TITLE & INTRO ══════ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1c2536] pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-cyan-400 tracking-wider font-bold">
                TRACE X GUIDED FORENSIC PIPELINE
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tight">
              Deleted Data Recovery Demonstration
            </h1>
            <p className="text-xs text-[#94a3b8] mt-1 font-mono">
              9 sequential forensic stages. Use manual controls: <span className="text-cyan-400 font-bold">RUN STEP</span> → explain → <span className="text-cyan-400 font-bold">NEXT</span>.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono text-[#94a3b8] border border-[#1c2536] hover:text-white hover:border-[#2d3748] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> RESTART DEMO
            </button>
          </div>
        </div>

        {/* ══════ 9-STEP PIPELINE TRACKER ══════ */}
        <div className="p-3.5 rounded-2xl bg-[#090c16] border border-[#1c2536] shadow-lg">
          <div className="text-[10px] font-mono font-bold text-[#64748b] tracking-widest mb-2.5 uppercase flex items-center justify-between">
            <span>Investigation Pipeline (9 Stages)</span>
            <span className="text-cyan-400">Step {currentStepIndex + 1} of 9</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
            {STAGES.map((s, idx) => {
              const isCompleted = stepStatuses[idx] === 'completed';
              const isActive = currentStepIndex === idx && !showFinalSummary;
              const isPending = stepStatuses[idx] === 'pending';
              const isRunning = stepStatuses[idx] === 'running';

              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectStage(idx)}
                  disabled={currentStatus === 'running'}
                  className={`p-2 rounded-xl text-left border transition-all relative flex flex-col justify-between min-h-[58px] ${
                    isActive
                      ? 'bg-[#0f172a] border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                      : isCompleted
                        ? 'bg-[#061e16] border-emerald-500/40 hover:border-emerald-500/60'
                        : 'bg-[#060810] border-[#162032] opacity-75 hover:opacity-100 hover:border-[#243550]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold" style={{ color: isActive ? '#22d3ee' : isCompleted ? '#34d399' : '#64748b' }}>
                      {s.num}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isRunning ? (
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    ) : (
                      <Circle className="w-3 h-3 text-[#2d3b55]" />
                    )}
                  </div>
                  <div className={`text-[10px] font-mono font-semibold truncate mt-1 ${isActive ? 'text-white' : isCompleted ? 'text-emerald-200' : 'text-[#8b9bb4]'}`}>
                    {s.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════ MAIN WORKSPACE AREA ══════ */}
        {!showFinalSummary ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: ACTIVE STEP DETAILS & EXPLANATION (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">

              {/* STEP CARD */}
              <div
                className="rounded-2xl border overflow-hidden bg-gradient-to-b from-[#090d18] to-[#060810] transition-all"
                style={{
                  borderColor: currentStatus === 'running' ? `${activeStage.color}60` : currentStatus === 'completed' ? '#05966950' : '#1c2536',
                  boxShadow: currentStatus === 'running' ? `0 0 25px ${activeStage.color}15` : 'none',
                }}
              >
                {/* Step Header */}
                <div className="p-5 border-b border-[#162137] flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${activeStage.color}15`, border: `1px solid ${activeStage.color}35` }}
                    >
                      <activeStage.icon className="w-6 h-6" style={{ color: activeStage.color }} />
                    </div>
                    <div>
                      <div className="text-[11px] font-mono tracking-widest uppercase font-bold" style={{ color: activeStage.color }}>
                        STAGE {activeStage.num} OF 09
                      </div>
                      <h2 className="text-lg font-bold text-white font-mono">{activeStage.label}</h2>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold border uppercase"
                    style={{
                      color: currentStatus === 'completed' ? '#34d399' : currentStatus === 'running' ? '#22d3ee' : currentStatus === 'paused' ? '#fbbf24' : '#64748b',
                      borderColor: currentStatus === 'completed' ? '#05966950' : currentStatus === 'running' ? '#0891b250' : '#1c2536',
                      background: currentStatus === 'completed' ? '#061e16' : currentStatus === 'running' ? '#082f49' : '#080d19',
                    }}
                  >
                    {currentStatus === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : currentStatus === 'running' ? (
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    ) : (
                      <Circle className="w-3.5 h-3.5" />
                    )}
                    {currentStatus}
                  </div>
                </div>

                {/* 4 SECTIONS (Task 4: WHAT WE TAKE, WHAT WE DO, WHAT WE PRODUCE, WHERE IT GOES NEXT) */}
                <div className="p-5 space-y-4 font-mono text-xs">

                  {/* 1. WHAT WE TAKE */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-[#64748b] tracking-wider uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> WHAT WE TAKE
                    </div>
                    <div className="p-3 rounded-xl bg-[#060812] border border-[#162137] text-slate-200">
                      {activeStage.whatWeTake}
                    </div>
                  </div>

                  {/* 2. WHAT WE DO */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-[#64748b] tracking-wider uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> WHAT WE DO
                    </div>
                    <div className="p-3 rounded-xl bg-[#060812] border border-[#162137] space-y-2">
                      {activeStage.whatWeDo.map((action, i) => {
                        const isDone = currentStatus === 'completed' || i < currentActionCount;
                        const isCurrent = currentStatus === 'running' && i === currentActionCount;

                        return (
                          <div
                            key={i}
                            className={`flex items-start gap-2.5 transition-colors duration-300 ${
                              isDone ? 'text-slate-200' : isCurrent ? 'text-cyan-300 font-semibold' : 'text-[#475569]'
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : isCurrent ? (
                                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-[#1e293b]" />
                              )}
                            </div>
                            <span className="leading-relaxed">{action}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. WHAT WE PRODUCE */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-[#64748b] tracking-wider uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> WHAT WE PRODUCE
                    </div>
                    <div
                      className={`p-3 rounded-xl border transition-all ${
                        currentStatus === 'completed'
                          ? 'bg-[#061e16] border-emerald-500/40 text-emerald-200'
                          : currentStatus === 'running'
                            ? 'bg-[#081528] border-cyan-500/30 text-cyan-200'
                            : 'bg-[#060812] border-[#162137] text-[#475569]'
                      }`}
                    >
                      {currentStatus === 'completed' || currentStatus === 'running' ? (
                        <div className="space-y-1.5">
                          {activeStage.whatWeProduce.map((prod, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-emerald-400 font-bold">•</span>
                              <span className="text-slate-200">{prod}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="italic text-[#475569]">— awaiting execution —</span>
                      )}
                    </div>
                  </div>

                  {/* 4. WHERE IT GOES NEXT */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-[#64748b] tracking-wider uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> WHERE IT GOES NEXT
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#060812] border border-[#162137] text-slate-300 flex items-center justify-between">
                      <span className="font-semibold text-amber-300">{activeStage.whereItGoesNext}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  </div>
                </div>

                {/* CONTROLS TOOLBAR (Task 7 & 8: PREVIOUS, RUN STEP, PAUSE/RESUME, NEXT) */}
                <div className="p-4 bg-[#070b16] border-t border-[#162137] flex items-center justify-between gap-3 flex-wrap">
                  <button
                    onClick={handlePrevious}
                    disabled={currentStepIndex === 0 || currentStatus === 'running'}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-mono font-bold border border-[#1c2536] text-[#94a3b8] hover:text-white hover:border-[#2d3748] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" /> PREVIOUS
                  </button>

                  <div className="flex items-center gap-2.5">
                    {/* RUN STEP BUTTON */}
                    {currentStatus !== 'running' ? (
                      <button
                        onClick={handleRunStep}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all shadow-md ${
                          currentStatus === 'completed'
                            ? 'bg-[#0f241d] border border-emerald-500/40 text-emerald-300 hover:bg-[#15342a]'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {currentStatus === 'completed' ? 'RE-RUN STEP' : `RUN STEP ${activeStage.num}`}
                      </button>
                    ) : (
                      <button
                        onClick={handlePause}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        PAUSE
                      </button>
                    )}

                    {currentStatus === 'paused' && (
                      <button
                        onClick={handleResume}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-600 text-white hover:bg-cyan-500 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> RESUME
                      </button>
                    )}

                    {/* NEXT BUTTON (Disabled until current step completes) */}
                    <button
                      onClick={handleNext}
                      disabled={currentStatus !== 'completed'}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
                        currentStatus === 'completed'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse'
                          : 'border border-[#1c2536] text-[#475569] opacity-40 cursor-not-allowed'
                      }`}
                    >
                      {currentStepIndex === STAGES.length - 1 ? 'FINISH INVESTIGATION' : 'NEXT'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* EXPLANATION & LEGAL CONTEXT PANEL */}
              <div className="p-4 rounded-xl bg-[#080d19] border border-[#162137] space-y-2.5 font-mono text-xs">
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  FORENSIC CONTEXT & ADMISSIBILITY
                </div>
                <p className="text-slate-300 leading-relaxed">{activeStage.explanation}</p>
                <div className="pt-2 border-t border-[#131d33]">
                  <span className="text-[10px] font-bold text-[#64748b] tracking-wider uppercase block mb-1">
                    WHY THIS STEP EXISTS:
                  </span>
                  <p className="text-[#94a3b8] leading-relaxed">{activeStage.why}</p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: TERMINAL LOGS & FORENSIC CONSOLE (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl bg-[#050811] border border-[#1c2536] overflow-hidden flex flex-col h-full min-h-[500px] shadow-2xl">
                {/* Terminal Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#090c16] border-b border-[#1c2536]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-xs font-mono text-cyan-400 font-bold ml-1">forensic-core</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    SIMULATED OUTPUT
                  </span>
                </div>

                {/* Command banner */}
                <div className="px-4 py-2 bg-[#060a14] border-b border-[#141d2e] font-mono text-[11px] text-cyan-300/80 truncate">
                  $ {activeStage.command}
                </div>

                {/* Terminal Lines (Task 5: Sequential logs, no permanent awaiting completion) */}
                <div className="p-4 font-mono text-xs leading-relaxed flex-1 overflow-y-auto space-y-1.5 min-h-[360px] max-h-[520px]">
                  {currentLogs.length === 0 ? (
                    <div className="text-[#475569] italic pt-4">
                      {currentStatus === 'pending'
                        ? '[READY] Click "RUN STEP ' + activeStage.num + '" to execute this stage...'
                        : 'Starting execution...'}
                    </div>
                  ) : (
                    currentLogs.map((line, idx) => {
                      const isCompleteLine = line.includes('COMPLETE') || line.includes('[OK]');
                      const isVerified = line.includes('VERIFIED') || line.includes('PASSED');
                      const isDiscovered = line.includes('[DISCOVERED]') || line.includes('[VALIDATED]');

                      return (
                        <div
                          key={idx}
                          className={`${
                            isCompleteLine
                              ? 'text-emerald-400 font-bold'
                              : isVerified
                                ? 'text-teal-300 font-semibold'
                                : isDiscovered
                                  ? 'text-amber-300 font-semibold'
                                  : line.startsWith('[')
                                    ? 'text-slate-300'
                                    : 'text-[#94a3b8]'
                          }`}
                        >
                          {line}
                        </div>
                      );
                    })
                  )}

                  {currentStatus === 'running' && (
                    <div className="text-cyan-400 animate-pulse text-sm">▋</div>
                  )}

                  <div ref={terminalEndRef} />
                </div>

                {/* Terminal Footer */}
                <div className="px-4 py-2 bg-[#090c16] border-t border-[#1c2536] flex items-center justify-between text-[10px] font-mono text-[#64748b]">
                  <span>Status: <span className="text-slate-300 uppercase">{currentStatus}</span></span>
                  <span>Logs: {currentLogs.length} / {activeStage.logLines.length}</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* ══════ TASK 9: FINAL INVESTIGATION COMPLETE SCREEN ══════ */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-[#061e16] to-[#04100c] p-8 md:p-12 text-center max-w-4xl mx-auto shadow-2xl space-y-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <div className="text-xs font-mono font-bold text-emerald-400 tracking-widest uppercase mb-1">
                ALL 9 STAGES VERIFIED
              </div>
              <h2 className="text-2xl md:text-3xl font-bold font-mono text-white tracking-tight">
                INVESTIGATION COMPLETE
              </h2>
              <p className="text-xs font-mono text-[#94a3b8] mt-2 max-w-lg mx-auto">
                The simulated digital forensics recovery pipeline has executed completely and cleanly from case intake to final sealed audit trail.
              </p>
            </div>

            {/* Structured Evidence Manifest (Task 9) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-left font-mono">
              <div className="p-3.5 rounded-xl bg-[#081512] border border-emerald-500/20">
                <div className="text-[10px] text-[#64748b] uppercase">Case ID</div>
                <div className="text-sm font-bold text-white mt-0.5">TRACEX-DEMO-001</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#081512] border border-emerald-500/20">
                <div className="text-[10px] text-[#64748b] uppercase">Evidence</div>
                <div className="text-sm font-bold text-white mt-0.5">demo-evidence-01.raw</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#081512] border border-emerald-500/20">
                <div className="text-[10px] text-[#64748b] uppercase">Artifacts Found</div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">3</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#081512] border border-emerald-500/20">
                <div className="text-[10px] text-[#64748b] uppercase">Artifacts Recovered</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">3 (100%)</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#081512] border border-emerald-500/20">
                <div className="text-[10px] text-[#64748b] uppercase">Validation</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">PASSED</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#081512] border border-emerald-500/20">
                <div className="text-[10px] text-[#64748b] uppercase">Chain of Custody</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">COMPLETE</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#081512] border border-emerald-500/20 col-span-2 sm:col-span-1 md:col-span-2">
                <div className="text-[10px] text-[#64748b] uppercase">Audit Trail</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">COMPLETE (9 Sealed Entries)</div>
              </div>
            </div>

            {/* Navigation Actions (Task 9 & 10) */}
            <div className="flex items-center justify-center gap-4 flex-wrap pt-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all shadow-[0_0_25px_rgba(6,182,212,0.3)]"
              >
                <Terminal className="w-4 h-4" /> VIEW DASHBOARD
              </button>

              <button
                onClick={() => navigate('/reports')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0a1826] border border-cyan-500/30 hover:bg-[#102438] text-cyan-300 font-mono font-bold text-xs transition-all"
              >
                <ScrollText className="w-4 h-4" /> VIEW REPORT
              </button>

              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#1c2536] text-[#94a3b8] hover:text-white hover:border-[#2d3748] font-mono text-xs transition-all"
              >
                <RotateCcw className="w-4 h-4" /> RESTART DEMO
              </button>
            </div>
          </motion.div>
        )}

      </main>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-[#162137] py-4 bg-[#050811] text-center">
        <p className="text-[11px] font-mono text-[#475569] max-w-xl mx-auto px-4">
          TRACE X DEMONSTRATION WORKFLOW — All cases, hashes, and recovery parameters are synthetically generated for presentation and do not alter real system evidence.
        </p>
      </footer>

    </div>
  );
}
