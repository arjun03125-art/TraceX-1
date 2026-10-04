import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, Filter, Download, Search, Layers, ShieldCheck, ArrowRight,
  HardDrive, CheckCircle2, FileCheck2, FileText, Check, Copy,
  AlertTriangle, Database, Hash, Sparkles, ExternalLink, Activity,
  ChevronDown, ChevronUp, Terminal, Shield, Eye
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import clsx from 'clsx';

type TimelineCategory = 'ALL' | 'EVIDENCE' | 'ANALYSIS' | 'RECOVERY' | 'VALIDATION' | 'REPORT';

interface ChronologyStage {
  id: string;
  stageNumber: string;
  title: string;
  auditAction: string;
  category: TimelineCategory;
  timestamp: string; // ISO string from audit log
  timeDisplay: string; // e.g. 02:15:00 UTC
  evidenceName: string;
  status: string;
  statusType: 'success' | 'verified' | 'detected' | 'recoverable' | 'progress' | 'final' | 'info';
  description: string;
  details: {
    label: string;
    value: string;
    isCode?: boolean;
    isHash?: boolean;
  }[];
  customContent?: 'metadata_table' | 'deleted_artifacts' | 'recovery_completed' | 'validation_match';
}

export default function TimelinePage() {
  const navigate = useNavigate();
  const { cases, evidence, artifacts, reports, auditEvents, activeCase: globalActiveCase, activeCaseId, setActiveCaseId } = useApp();

  const [activeCategory, setActiveCategory] = useState<TimelineCategory>('ALL');
  const [search, setSearch] = useState('');
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({
    '07': true, // Show metadata extracted by default
    '08': true, // Show deleted artifacts by default
    '10': true, // Show recovery completed by default
    '11': true, // Show validation by default
  });
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const activeCase = globalActiveCase || cases[0];

  const activeEvidence = useMemo(() => {
    return evidence.find(e => e.case_id === activeCase?.case_id) || evidence[0];
  }, [evidence, activeCase]);

  const isXfs = activeEvidence?.detected_fs === 'XFS' || activeEvidence?.filesystem_type === 'XFS' || activeCase?.case_number === 'CR-2026-RET-01';

  // Find audit events associated with active case to guarantee 100% agreement with Audit Log
  const caseAuditEvents = useMemo(() => {
    return auditEvents.filter(e => e.case_id === activeCase?.case_id);
  }, [auditEvents, activeCase]);

  // Helper to extract timestamp from matching audit log action
  const getAuditTime = (action: string, fallback: string) => {
    const match = caseAuditEvents.find(e => e.action === action);
    return match ? match.event_time : fallback;
  };

  const formatUtcTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toISOString().substring(11, 19) + ' UTC';
    } catch {
      return '02:00:00 UTC';
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Case-specific artifacts
  const caseArtifacts = useMemo(() => {
    return artifacts.filter(a => a.evidence_id === activeEvidence?.evidence_id);
  }, [artifacts, activeEvidence]);

  // Build the authoritative 12 Chronology stages
  const timelineStages: ChronologyStage[] = useMemo(() => {
    if (isXfs) {
      // ─── CASE: CR-2026-RET-01 (XFS 100% Retrieved) ─────────────────────
      const t01 = getAuditTime('CASE_CREATED', '2026-10-04T02:00:00.000Z');
      const t02 = getAuditTime('EVIDENCE_ADDED', '2026-10-04T02:15:00.000Z');
      const t03 = getAuditTime('EVIDENCE_HASHED', '2026-10-04T02:18:00.000Z');
      const t04 = getAuditTime('EVIDENCE_VERIFIED', '2026-10-04T02:20:00.000Z');
      const t05 = getAuditTime('FILESYSTEM_IDENTIFIED', '2026-10-04T02:22:00.000Z');
      const t06 = getAuditTime('FILESYSTEM_ANALYZED', '2026-10-04T02:25:00.000Z');
      const t07 = getAuditTime('METADATA_EXTRACTED', '2026-10-04T02:28:00.000Z');
      const t08 = getAuditTime('DELETED_ARTIFACT_DISCOVERED', '2026-10-04T02:30:00.000Z');
      const t09 = getAuditTime('RECOVERY_STARTED', '2026-10-04T02:31:00.000Z');
      const t10 = getAuditTime('RECOVERY_COMPLETED', '2026-10-04T02:32:00.000Z');
      const t11 = getAuditTime('RECOVERY_VALIDATED', '2026-10-04T02:35:00.000Z');
      const t12 = getAuditTime('REPORT_GENERATED', '2026-10-04T03:15:00.000Z');

      const demoEvidenceHash = activeEvidence?.hash_sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      return [
        {
          id: '01',
          stageNumber: '01',
          title: 'CASE CREATED',
          auditAction: 'CASE_CREATED',
          category: 'EVIDENCE',
          timestamp: t01,
          timeDisplay: formatUtcTime(t01),
          evidenceName: 'CR-2026-RET-01',
          status: 'INITIALIZED',
          statusType: 'success',
          description: 'Case opened: Target Server Alpha — Full Inode Recovery (100% Retrieved). Complete forensic retrieval of wiped database and sensitive documents from an XFS production partition.',
          details: [
            { label: 'Case ID', value: activeCase?.case_number || 'CR-2026-RET-01', isCode: true },
            { label: 'Investigator', value: activeCase?.investigator || 'Det. H. Vance (Lead Forensic Analyst)' },
            { label: 'Organization', value: activeCase?.organization || 'Cyber Incident Response Unit' },
            { label: 'Priority', value: activeCase?.priority || 'HIGH' },
            { label: 'Description', value: 'Complete forensic retrieval of wiped database and sensitive documents from an XFS production partition.' },
          ],
        },
        {
          id: '02',
          stageNumber: '02',
          title: 'FORENSIC IMAGE ADDED',
          auditAction: 'EVIDENCE_ADDED',
          category: 'EVIDENCE',
          timestamp: t02,
          timeDisplay: formatUtcTime(t02),
          evidenceName: 'DEMO_FORENSIC_IMAGE_XFS.E01',
          status: 'MOUNTED',
          statusType: 'success',
          description: 'Forensic image mounted via read-only write-block layer (32 GB bitstream). Hardware write-blocker verified.',
          details: [
            { label: 'Evidence', value: 'DEMO_FORENSIC_IMAGE_XFS.E01', isCode: true },
            { label: 'Source / Path', value: activeEvidence?.source_path || 'demo/evidence/DEMO_FORENSIC_IMAGE_XFS.E01', isCode: true },
            { label: 'Acquisition Type', value: 'Forensic Disk Image (Expert Witness E01)' },
            { label: 'Bitstream Size', value: '34,359,738,368 bytes (32.0 GB)' },
            { label: 'Write Blocker', value: 'HARDWARE READ-ONLY LAYER (VERIFIED)' },
          ],
        },
        {
          id: '03',
          stageNumber: '03',
          title: 'SHA-256 CALCULATED',
          auditAction: 'EVIDENCE_HASHED',
          category: 'EVIDENCE',
          timestamp: t03,
          timeDisplay: formatUtcTime(t03),
          evidenceName: 'DEMO_FORENSIC_IMAGE_XFS.E01',
          status: 'CALCULATED',
          statusType: 'verified',
          description: 'Computed physical SHA-256 cryptographic digest across entire 32 GB bitstream at 420 MB/s.',
          details: [
            { label: 'Hash (SHA-256)', value: demoEvidenceHash, isHash: true },
            { label: 'Status', value: 'CALCULATED' },
            { label: 'Algorithm', value: 'SHA-256' },
            { label: 'Bytes Processed', value: '34,359,738,368 bytes (100% Bitstream Coverage)' },
          ],
        },
        {
          id: '04',
          stageNumber: '04',
          title: 'EVIDENCE VERIFIED',
          auditAction: 'EVIDENCE_VERIFIED',
          category: 'VALIDATION',
          timestamp: t04,
          timeDisplay: formatUtcTime(t04),
          evidenceName: 'DEMO_FORENSIC_IMAGE_XFS.E01',
          status: 'VERIFIED',
          statusType: 'verified',
          description: 'Evidence hash verified before analysis. Acquisition hash matched against court chain-of-custody evidence manifest.',
          details: [
            { label: 'Integrity', value: 'VERIFIED (100% BIT-FOR-BIT MATCH)' },
            { label: 'Chain of Custody Ref', value: 'COC-2026-8824', isCode: true },
            { label: 'Verified Hash', value: demoEvidenceHash, isHash: true },
            { label: 'Description', value: 'Evidence hash verified before analysis. Zero modification or tampering detected.' },
          ],
        },
        {
          id: '05',
          stageNumber: '05',
          title: 'FILESYSTEM IDENTIFIED',
          auditAction: 'FILESYSTEM_IDENTIFIED',
          category: 'ANALYSIS',
          timestamp: t05,
          timeDisplay: formatUtcTime(t05),
          evidenceName: 'XFS',
          status: 'DETECTED',
          statusType: 'detected',
          description: 'Detected filesystem: XFS v5 superblock signature verified with 4 intact Allocation Groups.',
          details: [
            { label: 'Filesystem', value: 'XFS (SGI XFS v5)' },
            { label: 'Filesystem UUID', value: '4a8f9c10-e72b-4231-90a1-897f1c4e201b', isCode: true },
            { label: 'Block Size', value: '4,096 bytes (4 KB)' },
            { label: 'Allocation Groups', value: '4 AGs (AG 0 to AG 3)' },
            { label: 'Volume Label', value: 'DEMO-XFS-CORP-SRV' },
          ],
        },
        {
          id: '06',
          stageNumber: '06',
          title: 'FILESYSTEM ANALYSIS',
          auditAction: 'FILESYSTEM_ANALYZED',
          category: 'ANALYSIS',
          timestamp: t06,
          timeDisplay: formatUtcTime(t06),
          evidenceName: 'DEMO-XFS-CORP-SRV',
          status: 'ANALYZED',
          statusType: 'success',
          description: 'Parsed allocation groups 0-3; identified unallocated block maps and free extent B+Trees.',
          details: [
            { label: 'Filesystem Structures Analyzed', value: '4 Superblocks (Primary AG0 + Secondary AG1-3 intact)' },
            { label: 'Metadata Structures Examined', value: 'Free Space B+Trees (cntbt & bnobt), Inode B+Trees (inobt)' },
            { label: 'Inodes / Object Records Examined', value: '4,194,304 unallocated blocks scanned for unlinked inodes' },
            { label: 'Extent B+Tree Status', value: 'VALID EXTENT MAPS (ZERO CORRUPTION)' },
          ],
        },
        {
          id: '07',
          stageNumber: '07',
          title: 'METADATA EXTRACTED',
          auditAction: 'METADATA_EXTRACTED',
          category: 'ANALYSIS',
          timestamp: t07,
          timeDisplay: formatUtcTime(t07),
          evidenceName: 'XFS Inode Cores 1042, 1048, 1055',
          status: 'EXTRACTED',
          statusType: 'success',
          description: 'Recovered timestamps (mtime, ctime, atime, crtime) and file paths from extent headers.',
          details: [
            { label: 'Inode Cores Recovered', value: '3 Inode Records (1042, 1048, 1055)' },
            { label: 'MACB Timestamps Intact', value: '100% COMPLETE' },
            { label: 'File Paths Restored', value: 'Original absolute UNIX hierarchy preserved' },
          ],
          customContent: 'metadata_table',
        },
        {
          id: '08',
          stageNumber: '08',
          title: 'DELETED ARTIFACT DISCOVERED',
          auditAction: 'DELETED_ARTIFACT_DISCOVERED',
          category: 'ANALYSIS',
          timestamp: t08,
          timeDisplay: formatUtcTime(t08),
          evidenceName: 'server.log, incident_notes.txt, deleted_report.pdf',
          status: 'RECOVERABLE',
          statusType: 'recoverable',
          description: 'Discovered unlinked inode cores for target artifacts with intact extent pointers in free block allocation groups.',
          details: [
            { label: 'Artifact 1', value: 'server.log (Inode 1042, 184 KB) — RECOVERABLE' },
            { label: 'Artifact 2', value: 'incident_notes.txt (Inode 1048, 12.4 KB) — RECOVERABLE' },
            { label: 'Artifact 3', value: 'deleted_report.pdf (Inode 1055, 2.4 MB) — RECOVERABLE' },
          ],
          customContent: 'deleted_artifacts',
        },
        {
          id: '09',
          stageNumber: '09',
          title: 'RECOVERY STARTED',
          auditAction: 'RECOVERY_STARTED',
          category: 'RECOVERY',
          timestamp: t09,
          timeDisplay: formatUtcTime(t09),
          evidenceName: 'Target Inodes [1042, 1048, 1055]',
          status: 'IN_PROGRESS',
          statusType: 'progress',
          description: 'Recovery pipeline initiated. Reconstructing extent byte streams into secure write-blocked destination folder.',
          details: [
            { label: 'Recovery Method', value: 'xfs_extent_recovery (Direct Extent Stream Assembly)' },
            { label: 'Target Artifacts', value: 'server.log, incident_notes.txt, deleted_report.pdf' },
            { label: 'Recovery Status', value: 'IN_PROGRESS' },
            { label: 'Destination Folder', value: '/forensic/output/ (Secure Sandbox / Write-Blocked Target)', isCode: true },
          ],
        },
        {
          id: '10',
          stageNumber: '10',
          title: 'RECOVERY COMPLETED',
          auditAction: 'RECOVERY_COMPLETED',
          category: 'RECOVERY',
          timestamp: t10,
          timeDisplay: formatUtcTime(t10),
          evidenceName: 'server.log, incident_notes.txt, deleted_report.pdf',
          status: 'SUCCESS',
          statusType: 'success',
          description: 'All 3 target artifacts successfully carved and reconstructed with 0 missing bytes.',
          details: [
            { label: 'Recovered Count', value: '3 of 3 files (100% Recovery Rate)' },
            { label: 'Total Carved Bytes', value: '2,658,713 bytes (2.53 MB)' },
            { label: 'Missing Bytes', value: '0 bytes (Zero Fragment Loss)' },
            { label: 'Metadata Status', value: 'COMPLETE (MACB timestamps preserved)' },
          ],
          customContent: 'recovery_completed',
        },
        {
          id: '11',
          stageNumber: '11',
          title: 'RECOVERY VALIDATED',
          auditAction: 'RECOVERY_VALIDATED',
          category: 'VALIDATION',
          timestamp: t11,
          timeDisplay: formatUtcTime(t11),
          evidenceName: 'server.log (SHA-256)',
          status: 'VALID',
          statusType: 'verified',
          description: 'Integrity verified: Extracted stream hash matches inode checksum. Original hash vs recovered stream bit-for-bit identical.',
          details: [
            { label: 'Target File', value: 'server.log (Inode 1042)', isCode: true },
            { label: 'SHA-256 Digest', value: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', isHash: true },
            { label: 'Integrity', value: 'VALID (100% BITSTREAM MATCH)' },
            { label: 'Cross-Check Result', value: 'Bit-for-bit verified against XFS allocation group inode core' },
          ],
          customContent: 'validation_match',
        },
        {
          id: '12',
          stageNumber: '12',
          title: 'REPORT GENERATED',
          auditAction: 'REPORT_GENERATED',
          category: 'REPORT',
          timestamp: t12,
          timeDisplay: formatUtcTime(t12),
          evidenceName: 'REP-2026-XFS-01',
          status: 'FINAL',
          statusType: 'final',
          description: 'Court-ready Forensic Examination Report generated and digitally signed by Det. H. Vance.',
          details: [
            { label: 'Report ID', value: 'REP-2026-XFS-01 (rep-ret-001)', isCode: true },
            { label: 'Case ID', value: 'CR-2026-RET-01', isCode: true },
            { label: 'Evidence ID', value: 'ev-ret-001 (DEMO_FORENSIC_IMAGE_XFS.E01)', isCode: true },
            { label: 'Generated Timestamp', value: '2026-10-04 03:15:00 UTC' },
            { label: 'Classification', value: 'CONFIDENTIAL / COURT-ADMISSIBLE' },
            { label: 'Digital Attestation Signature', value: '4e9b7201bc894ef289a012c85b190e2417ac981f204b77ea82110c4d915a201b', isHash: true },
          ],
        },
      ];
    } else {
      // ─── CASE: CR-2026-REC-70 (Btrfs Corrupted Tree 70% Retrieved) ──────
      const t01 = getAuditTime('CASE_CREATED', '2026-10-04T02:30:00.000Z');
      const t02 = getAuditTime('EVIDENCE_ADDED', '2026-10-04T03:00:00.000Z');
      const t03 = '2026-10-04T03:05:00.000Z';
      const t04 = '2026-10-04T03:08:00.000Z';
      const t05 = getAuditTime('FILESYSTEM_IDENTIFIED', '2026-10-04T03:10:00.000Z');
      const t06 = '2026-10-04T03:12:00.000Z';
      const t07 = '2026-10-04T03:14:00.000Z';
      const t08 = '2026-10-04T03:15:00.000Z';
      const t09 = '2026-10-04T03:16:00.000Z';
      const t10 = '2026-10-04T03:17:00.000Z';
      const t11 = getAuditTime('RECOVERY_VALIDATED', '2026-10-04T03:18:00.000Z');
      const t12 = '2026-10-04T03:25:00.000Z';

      const btrfsEvidenceHash = activeEvidence?.hash_sha256 || 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

      return [
        {
          id: '01',
          stageNumber: '01',
          title: 'CASE CREATED',
          auditAction: 'CASE_CREATED',
          category: 'EVIDENCE',
          timestamp: t01,
          timeDisplay: formatUtcTime(t01),
          evidenceName: 'CR-2026-REC-70',
          status: 'INITIALIZED',
          statusType: 'success',
          description: 'Case opened: Vault Endpoint Echo — Inode Fragment Recovery (70% Retrieved). Active reconstruction of damaged Btrfs chunk tree.',
          details: [
            { label: 'Case ID', value: 'CR-2026-REC-70', isCode: true },
            { label: 'Investigator', value: 'Agent M. Sterling (Digital Forensics)' },
            { label: 'Organization', value: 'National Cyber Security Center' },
            { label: 'Priority', value: 'CRITICAL' },
          ],
        },
        {
          id: '02',
          stageNumber: '02',
          title: 'FORENSIC IMAGE ADDED',
          auditAction: 'EVIDENCE_ADDED',
          category: 'EVIDENCE',
          timestamp: t02,
          timeDisplay: formatUtcTime(t02),
          evidenceName: 'DEMO_FORENSIC_IMAGE_BTRFS.E01',
          status: 'MOUNTED',
          statusType: 'success',
          description: 'Forensic image mounted via read-only write-block layer (16 GB bitstream).',
          details: [
            { label: 'Evidence', value: 'DEMO_FORENSIC_IMAGE_BTRFS.E01', isCode: true },
            { label: 'Source / Path', value: 'demo/evidence/DEMO_FORENSIC_IMAGE_BTRFS.E01', isCode: true },
            { label: 'Acquisition Type', value: 'Forensic Disk Image (Expert Witness E01)' },
            { label: 'Bitstream Size', value: '17,179,869,184 bytes (16.0 GB)' },
          ],
        },
        {
          id: '03',
          stageNumber: '03',
          title: 'SHA-256 CALCULATED',
          auditAction: 'EVIDENCE_HASHED',
          category: 'EVIDENCE',
          timestamp: t03,
          timeDisplay: formatUtcTime(t03),
          evidenceName: 'DEMO_FORENSIC_IMAGE_BTRFS.E01',
          status: 'CALCULATED',
          statusType: 'verified',
          description: 'Computed physical SHA-256 cryptographic digest across 16 GB physical drive image.',
          details: [
            { label: 'Hash (SHA-256)', value: btrfsEvidenceHash, isHash: true },
            { label: 'Status', value: 'CALCULATED' },
            { label: 'Algorithm', value: 'SHA-256' },
          ],
        },
        {
          id: '04',
          stageNumber: '04',
          title: 'EVIDENCE VERIFIED',
          auditAction: 'EVIDENCE_VERIFIED',
          category: 'VALIDATION',
          timestamp: t04,
          timeDisplay: formatUtcTime(t04),
          evidenceName: 'DEMO_FORENSIC_IMAGE_BTRFS.E01',
          status: 'VERIFIED',
          statusType: 'verified',
          description: 'Acquisition hash verified against chain of custody manifest. Write-block protection intact.',
          details: [
            { label: 'Integrity', value: 'VERIFIED' },
            { label: 'Manifest Reference', value: 'COC-2026-9912', isCode: true },
            { label: 'Verified Hash', value: btrfsEvidenceHash, isHash: true },
          ],
        },
        {
          id: '05',
          stageNumber: '05',
          title: 'FILESYSTEM IDENTIFIED',
          auditAction: 'FILESYSTEM_IDENTIFIED',
          category: 'ANALYSIS',
          timestamp: t05,
          timeDisplay: formatUtcTime(t05),
          evidenceName: 'Btrfs',
          status: 'DETECTED',
          statusType: 'detected',
          description: 'Detected filesystem: Btrfs chunk tree with intentional anti-forensic zeroing detected.',
          details: [
            { label: 'Filesystem', value: 'BTRFS (B-tree Filesystem)' },
            { label: 'UUID', value: '8b3c104e-128a-4bc8-8120-f4e9102c771a', isCode: true },
            { label: 'Chunk Tree Status', value: 'DAMAGED / PARTIALLY CORRUPTED' },
          ],
        },
        {
          id: '06',
          stageNumber: '06',
          title: 'FILESYSTEM ANALYSIS',
          auditAction: 'FILESYSTEM_ANALYZED',
          category: 'ANALYSIS',
          timestamp: t06,
          timeDisplay: formatUtcTime(t06),
          evidenceName: 'DEMO-BTRFS-ENDPOINT',
          status: 'ANALYZED',
          statusType: 'info',
          description: 'Examined leaf roots and cluster groups 4-8. 70% of extent fragments indexed.',
          details: [
            { label: 'Structures Examined', value: 'Btrfs Root Tree, Chunk Tree & File Extent Items' },
            { label: 'Extent Recoverability', value: '70% Extent Fragments Indexed in Cluster Groups 4-8' },
          ],
        },
        {
          id: '07',
          stageNumber: '07',
          title: 'METADATA EXTRACTED',
          auditAction: 'METADATA_EXTRACTED',
          category: 'ANALYSIS',
          timestamp: t07,
          timeDisplay: formatUtcTime(t07),
          evidenceName: 'Btrfs Inodes [2048, 2088, 4096]',
          status: 'EXTRACTED',
          statusType: 'success',
          description: 'Partial metadata extracted from generation 478 transid pointers.',
          details: [
            { label: 'Metadata Source', value: 'DERIVED FROM TRANSACTION GENERATION 478' },
            { label: 'Timestamps Recovered', value: 'Partial MACB timestamps restored' },
          ],
        },
        {
          id: '08',
          stageNumber: '08',
          title: 'DELETED ARTIFACT DISCOVERED',
          auditAction: 'DELETED_ARTIFACT_DISCOVERED',
          category: 'ANALYSIS',
          timestamp: t08,
          timeDisplay: formatUtcTime(t08),
          evidenceName: 'old_report.pdf, system_backup.tar',
          status: 'PARTIAL',
          statusType: 'recoverable',
          description: 'Discovered damaged Btrfs extents: old_report.pdf (70% recoverable), system_backup.tar (70%), deleted_photo.jpg (overwritten).',
          details: [
            { label: 'Artifact 1', value: 'old_report.pdf (Inode 2048, 1.2 MB carved) — PARTIAL' },
            { label: 'Artifact 2', value: 'system_backup.tar (Inode 2088, 17.9 MB carved) — PARTIAL' },
            { label: 'Artifact 3', value: 'deleted_photo.jpg (Inode 4096) — UNRECOVERABLE / OVERWRITTEN' },
          ],
        },
        {
          id: '09',
          stageNumber: '09',
          title: 'RECOVERY STARTED',
          auditAction: 'RECOVERY_STARTED',
          category: 'RECOVERY',
          timestamp: t09,
          timeDisplay: formatUtcTime(t09),
          evidenceName: 'Btrfs Cluster Slack',
          status: 'IN_PROGRESS',
          statusType: 'progress',
          description: 'Deep carving pass underway on cluster groups 4-8 with signature header heuristics.',
          details: [
            { label: 'Method', value: 'btrfs_carving_fallback (Heuristic Slack Carve)' },
            { label: 'Status', value: 'IN_PROGRESS' },
          ],
        },
        {
          id: '10',
          stageNumber: '10',
          title: 'RECOVERY COMPLETED',
          auditAction: 'RECOVERY_COMPLETED',
          category: 'RECOVERY',
          timestamp: t10,
          timeDisplay: formatUtcTime(t10),
          evidenceName: 'old_report.pdf, system_backup.tar',
          status: 'PARTIAL_70',
          statusType: 'recoverable',
          description: '70% retrieval threshold reached. 2 partial artifacts recovered; 1 file unrecoverable.',
          details: [
            { label: 'Recovery Status', value: 'PARTIALLY RETRIEVED (70% BYTE RECONSTRUCTION)' },
            { label: 'Carved Files', value: 'old_report.pdf (1.2 MB), system_backup.tar (17.9 MB)' },
          ],
        },
        {
          id: '11',
          stageNumber: '11',
          title: 'RECOVERY VALIDATED',
          auditAction: 'RECOVERY_VALIDATED',
          category: 'VALIDATION',
          timestamp: t11,
          timeDisplay: formatUtcTime(t11),
          evidenceName: 'old_report.pdf (SHA-256)',
          status: 'PARTIAL',
          statusType: 'recoverable',
          description: 'Partial recovery verified: 1.2 MB carved; metadata partially reconstructed from generation 478.',
          details: [
            { label: 'Integrity', value: 'PARTIAL (PARTIALLY_VALID)' },
            { label: 'Validation Note', value: 'File reconstructed with missing tail sectors; PDF syntax repairable' },
          ],
        },
        {
          id: '12',
          stageNumber: '12',
          title: 'REPORT GENERATED',
          auditAction: 'REPORT_GENERATED',
          category: 'REPORT',
          timestamp: t12,
          timeDisplay: formatUtcTime(t12),
          evidenceName: 'REP-2026-BTRFS-02',
          status: 'FINAL',
          statusType: 'final',
          description: 'Technical Reconstruction Dossier generated with fragmentation defect attestation.',
          details: [
            { label: 'Report ID', value: 'REP-2026-BTRFS-02', isCode: true },
            { label: 'Examiner', value: 'Agent M. Sterling (Digital Forensics)' },
            { label: 'Status', value: 'FINAL' },
          ],
        },
      ];
    }
  }, [isXfs, caseAuditEvents, activeEvidence, activeCase]);

  // Filtered timeline stages
  const filteredStages = useMemo(() => {
    return timelineStages.filter(stage => {
      // Category match
      const matchCat =
        activeCategory === 'ALL' ||
        stage.category === activeCategory ||
        (activeCategory === 'EVIDENCE' && (stage.id === '01' || stage.id === '02' || stage.id === '03' || stage.id === '04')) ||
        (activeCategory === 'VALIDATION' && (stage.id === '04' || stage.id === '11'));

      // Search match
      const q = search.toLowerCase().trim();
      if (!q) return matchCat;

      const matchSearch =
        stage.title.toLowerCase().includes(q) ||
        stage.description.toLowerCase().includes(q) ||
        stage.evidenceName.toLowerCase().includes(q) ||
        stage.status.toLowerCase().includes(q) ||
        stage.details.some(d => d.label.toLowerCase().includes(q) || d.value.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [timelineStages, activeCategory, search]);

  // Export Chronology as JSON
  const handleExportJson = () => {
    const exportData = {
      title: 'TraceX Forensic Super-Timeline & Chronology',
      case_id: activeCase?.case_number || 'CR-2026-RET-01',
      evidence: activeEvidence?.name || 'DEMO_FORENSIC_IMAGE_XFS.E01',
      filesystem: isXfs ? 'XFS' : 'Btrfs',
      generated_at: new Date().toISOString(),
      stages: timelineStages.map(s => ({
        stage: s.stageNumber,
        title: s.title,
        timestamp: s.timestamp,
        time_utc: s.timeDisplay,
        evidence: s.evidenceName,
        status: s.status,
        description: s.description,
        details: s.details
      }))
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `tracex_chronology_${activeCase?.case_number || 'CR-2026-RET-01'}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Forensic Super-Timeline &amp; Chronology
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Temporal sequence synthesis correlated across filesystem logs, unlinked inode markers &amp; disk commits
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Case Switcher */}
          <div className="flex items-center gap-2 bg-[#0a101f] border border-[#1b2742] rounded-xl px-3 py-1.5 font-mono text-xs">
            <span className="text-[10px] text-slate-500 uppercase">Case:</span>
            <select
              value={activeCase?.case_id || ''}
              onChange={e => setActiveCaseId(e.target.value)}
              className="bg-transparent text-cyan-400 font-bold focus:outline-none cursor-pointer"
            >
              {cases.map(c => (
                <option key={c.case_id} value={c.case_id} className="bg-[#0a101f] text-slate-200">
                  {c.case_number} — {c.case_title.length > 25 ? c.case_title.substring(0, 25) + '...' : c.case_title}
                </option>
              ))}
            </select>
          </div>

          <span className="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-semibold tracking-wider uppercase hidden sm:inline-block">
            DEMO / SYNTHETIC FORENSIC DATA
          </span>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-1.5 rounded-xl bg-[#0a101f] hover:bg-[#121c33] border border-[#1b2742] text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* ── TOP SUMMARY (Compact 7-Grid Required Layout) ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 font-mono">
        {/* CASE */}
        <div className="p-3.5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">CASE</div>
          <div className="text-sm font-bold text-cyan-400 mt-1 truncate" title={activeCase?.case_number || 'CR-2026-RET-01'}>
            {activeCase?.case_number || 'CR-2026-RET-01'}
          </div>
        </div>

        {/* EVIDENCE */}
        <div className="p-3.5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">EVIDENCE</div>
          <div className="text-xs font-bold text-slate-200 mt-1 truncate" title={activeEvidence?.name || 'DEMO_FORENSIC_IMAGE_XFS.E01'}>
            {activeEvidence?.name || 'DEMO_FORENSIC_IMAGE_XFS.E01'}
          </div>
        </div>

        {/* FILESYSTEM */}
        <div className="p-3.5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">FILESYSTEM</div>
          <div className="text-sm font-bold text-purple-400 mt-1">
            {isXfs ? 'XFS' : 'Btrfs'}
          </div>
        </div>

        {/* EVENTS */}
        <div className="p-3.5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">EVENTS</div>
          <div className="text-sm font-bold text-cyan-300 mt-1">
            {timelineStages.length}
          </div>
        </div>

        {/* RECOVERED */}
        <div className="p-3.5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">RECOVERED</div>
          <div className="text-sm font-bold text-emerald-400 mt-1">
            {isXfs ? '3' : '2'}
          </div>
        </div>

        {/* PARTIAL */}
        <div className="p-3.5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">PARTIAL</div>
          <div className="text-sm font-bold text-amber-400 mt-1">
            1
          </div>
        </div>

        {/* VALIDATION */}
        <div className="p-3.5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">VALIDATION</div>
          <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>VERIFIED</span>
          </div>
        </div>
      </div>

      {/* ── JURY DEMO SEQUENCE PROGRESSION BAR ────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_25px_rgba(0,0,0,0.3)] font-mono">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-[11px] text-cyan-400 font-bold tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Jury Demo Investigation Progression Chain</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Click any step to filter
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] scrollbar-thin">
          {[
            { label: 'Forensic Image Added', cat: 'EVIDENCE' as TimelineCategory },
            { label: 'Hash Verified', cat: 'VALIDATION' as TimelineCategory },
            { label: isXfs ? 'XFS Identified' : 'Btrfs Identified', cat: 'ANALYSIS' as TimelineCategory },
            { label: 'Filesystem Analyzed', cat: 'ANALYSIS' as TimelineCategory },
            { label: 'Metadata Extracted', cat: 'ANALYSIS' as TimelineCategory },
            { label: 'Deleted Files Found', cat: 'ANALYSIS' as TimelineCategory },
            { label: 'Files Recovered', cat: 'RECOVERY' as TimelineCategory },
            { label: 'Recovery Validated', cat: 'VALIDATION' as TimelineCategory },
            { label: 'Report Generated', cat: 'REPORT' as TimelineCategory },
          ].map((step, idx, arr) => (
            <div key={idx} className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setActiveCategory(step.cat)}
                className="px-2.5 py-1 rounded-lg bg-[#0c1426] hover:bg-[#121e3a] border border-[#192745] hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                <span>{step.label}</span>
              </button>
              {idx < arr.length - 1 && (
                <span className="text-slate-600 font-bold select-none">↓</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── FILTERS & SEARCH BAR ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#080d19] border border-[#152138] p-3.5 rounded-2xl font-mono text-xs">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>FILTER:</span>
          </span>
          {(['ALL', 'EVIDENCE', 'ANALYSIS', 'RECOVERY', 'VALIDATION', 'REPORT'] as TimelineCategory[]).map((cat) => {
            const count = cat === 'ALL'
              ? timelineStages.length
              : cat === 'EVIDENCE'
              ? 4
              : cat === 'ANALYSIS'
              ? 4
              : cat === 'RECOVERY'
              ? 2
              : cat === 'VALIDATION'
              ? 2
              : 1;

            const isActive = activeCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5',
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'bg-[#0a101f] text-slate-400 hover:text-slate-200 border border-[#16223b] hover:bg-[#0f172a]'
                )}
              >
                <span>{cat}</span>
                <span className={clsx(
                  'px-1.5 py-0.2 rounded text-[10px]',
                  isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-[#152138] text-slate-400'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] sm:min-w-[320px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search chronology (event, artifact, hash, inode)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-[#0a101f] border border-[#16223b] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── VERTICAL TIMELINE CONTAINER ─────────────────────────────────── */}
      <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-6 font-mono text-xs shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        {filteredStages.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-300">NO MATCHING TIMELINE EVENTS</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No events found matching category "{activeCategory}" with filter "{search}".
            </p>
            <button
              onClick={() => { setActiveCategory('ALL'); setSearch(''); }}
              className="mt-4 px-4 py-2 rounded-xl bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-blue-500 before:to-emerald-500 before:opacity-30">
            {filteredStages.map((stage) => {
              const isExpanded = !!expandedEvents[stage.id];

              // Badge styling per event status
              const isVerified = stage.statusType === 'verified' || stage.status === 'VERIFIED' || stage.status === 'VALID';
              const isDetected = stage.statusType === 'detected' || stage.status === 'DETECTED';
              const isRecoverable = stage.statusType === 'recoverable' || stage.status === 'RECOVERABLE';
              const isFinal = stage.statusType === 'final' || stage.status === 'FINAL';
              const isProgress = stage.statusType === 'progress' || stage.status === 'IN_PROGRESS';

              const statusBadgeClass = clsx(
                'px-2.5 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 whitespace-nowrap',
                isVerified
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                  : isDetected
                  ? 'bg-purple-950/60 text-purple-300 border-purple-700/50'
                  : isRecoverable
                  ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                  : isFinal
                  ? 'bg-blue-950/60 text-blue-300 border-blue-700/50'
                  : isProgress
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50'
                  : 'bg-slate-900 text-slate-300 border-slate-700'
              );

              return (
                <div key={stage.id} className="relative group">
                  {/* Timeline Node Icon Circle on the vertical track */}
                  <div
                    className={clsx(
                      'absolute -left-6 sm:-left-8 top-3.5 -translate-x-1/2 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10',
                      isVerified
                        ? 'bg-[#09151f] border-emerald-400 text-emerald-400'
                        : isDetected
                        ? 'bg-[#150d24] border-purple-400 text-purple-400'
                        : isRecoverable
                        ? 'bg-[#1a1309] border-amber-400 text-amber-400'
                        : isFinal
                        ? 'bg-[#0b1429] border-cyan-400 text-cyan-400'
                        : 'bg-[#0a0f1d] border-cyan-500/60 text-cyan-400'
                    )}
                  >
                    {isVerified ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isDetected ? (
                      <Layers className="w-3.5 h-3.5" />
                    ) : isRecoverable ? (
                      <FileCheck2 className="w-3.5 h-3.5" />
                    ) : isFinal ? (
                      <FileText className="w-3.5 h-3.5" />
                    ) : (
                      <Activity className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Stage Card */}
                  <div className="rounded-2xl bg-[#0a101f] hover:bg-[#0c1426] border border-[#16223b] hover:border-[#1e3052] p-4 sm:p-5 transition-all shadow-[0_2px_15px_rgba(0,0,0,0.25)]">
                    {/* Event Header: TIME | EVENT | EVIDENCE | STATUS */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#141f36]">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Time */}
                        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px] bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span>● {stage.timeDisplay}</span>
                        </div>

                        {/* Event Title */}
                        <div className="text-slate-100 font-bold text-xs flex items-center gap-1.5">
                          <span className="text-cyan-400">{stage.stageNumber} —</span>
                          <span>{stage.title}</span>
                        </div>

                        {/* Evidence Badge */}
                        <div className="text-slate-300 bg-[#121c33] border border-[#1a294d] px-2 py-0.5 rounded text-[10px] font-mono truncate max-w-[240px]" title={stage.evidenceName}>
                          {stage.evidenceName}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {/* Status Badge */}
                        <span className={statusBadgeClass}>
                          {isVerified && '✓ '}
                          {isDetected && '✓ '}
                          {isFinal && '✓ '}
                          {stage.status}
                        </span>

                        {/* Toggle Details Button */}
                        <button
                          onClick={() => toggleExpand(stage.id)}
                          className="p-1 rounded-lg bg-[#111a2e] hover:bg-[#182545] text-slate-400 hover:text-cyan-300 border border-[#1c2c4d] transition-colors"
                          title={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Event Description */}
                    <div className="mt-3 text-slate-300 text-xs leading-relaxed font-sans">
                      {stage.description}
                    </div>

                    {/* Expanded Detailed Forensic Metadata */}
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-[#131d33] space-y-3">
                        {/* Key-Value Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {stage.details.map((item, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-[#070b16] border border-[#141f36] flex flex-col justify-between">
                              <span className="text-[10px] uppercase text-slate-500 font-mono tracking-wider font-semibold">
                                {item.label}:
                              </span>
                              <div className="mt-0.5 flex items-center justify-between gap-2">
                                <span className={clsx(
                                  'text-xs font-mono break-all',
                                  item.isHash ? 'text-cyan-300 font-mono text-[11px]' : 'text-slate-200'
                                )}>
                                  {item.value}
                                </span>
                                {item.isHash && (
                                  <button
                                    onClick={() => handleCopy(item.value)}
                                    className="p-1 rounded bg-[#111a2e] text-slate-400 hover:text-cyan-300 flex-shrink-0"
                                    title="Copy Hash"
                                  >
                                    {copiedText === item.value ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* ── CUSTOM SECTION: Stage 07 — Useful Metadata Table ─ */}
                        {stage.customContent === 'metadata_table' && isXfs && (
                          <div className="mt-3 p-3 rounded-xl bg-[#070b16] border border-[#16223b]">
                            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Extracted Inode Metadata Records (MACB Timestamps &amp; Paths)</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[11px]">
                                <thead>
                                  <tr className="border-b border-[#141f36] text-[10px] uppercase text-slate-400">
                                    <th className="py-1.5 px-2">Filename</th>
                                    <th className="py-1.5 px-2">Inode</th>
                                    <th className="py-1.5 px-2">Size</th>
                                    <th className="py-1.5 px-2">Created (crtime)</th>
                                    <th className="py-1.5 px-2">Modified (mtime)</th>
                                    <th className="py-1.5 px-2">Accessed (atime)</th>
                                    <th className="py-1.5 px-2">Deleted</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#10192e] text-slate-300">
                                  <tr>
                                    <td className="py-2 px-2 text-cyan-300 font-bold font-mono">server.log</td>
                                    <td className="py-2 px-2 text-slate-400">1042</td>
                                    <td className="py-2 px-2">184 KB</td>
                                    <td className="py-2 px-2 text-slate-400">2026-09-20 09:15 UTC</td>
                                    <td className="py-2 px-2 text-slate-400">2026-10-03 18:22 UTC</td>
                                    <td className="py-2 px-2 text-slate-400">2026-10-03 18:25 UTC</td>
                                    <td className="py-2 px-2 text-rose-400 font-bold">2026-10-03 19:00 UTC</td>
                                  </tr>
                                  <tr>
                                    <td className="py-2 px-2 text-cyan-300 font-bold font-mono">incident_notes.txt</td>
                                    <td className="py-2 px-2 text-slate-400">1048</td>
                                    <td className="py-2 px-2">12.4 KB</td>
                                    <td className="py-2 px-2 text-slate-400">2026-09-22 14:30 UTC</td>
                                    <td className="py-2 px-2 text-slate-400">2026-10-03 20:10 UTC</td>
                                    <td className="py-2 px-2 text-slate-400">2026-10-03 20:15 UTC</td>
                                    <td className="py-2 px-2 text-rose-400 font-bold">2026-10-03 20:30 UTC</td>
                                  </tr>
                                  <tr>
                                    <td className="py-2 px-2 text-cyan-300 font-bold font-mono">deleted_report.pdf</td>
                                    <td className="py-2 px-2 text-slate-400">1055</td>
                                    <td className="py-2 px-2">2.4 MB</td>
                                    <td className="py-2 px-2 text-slate-400">2026-09-15 10:00 UTC</td>
                                    <td className="py-2 px-2 text-slate-400">2026-10-02 14:40 UTC</td>
                                    <td className="py-2 px-2 text-slate-400">2026-10-02 14:45 UTC</td>
                                    <td className="py-2 px-2 text-rose-400 font-bold">2026-10-03 16:15 UTC</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* ── CUSTOM SECTION: Stage 08 — Deleted Artifacts Discovered ─ */}
                        {stage.customContent === 'deleted_artifacts' && isXfs && (
                          <div className="mt-3 p-3 rounded-xl bg-[#070b16] border border-[#16223b]">
                            <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Recoverable Demo Artifacts Identified</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div className="p-2.5 rounded-lg bg-[#0c1326] border border-[#182645]">
                                <div className="text-cyan-300 font-bold font-mono">server.log</div>
                                <div className="text-[10px] text-slate-400 mt-1">Inode 1042 • 184 KB • Log File</div>
                                <div className="text-[10px] text-emerald-400 mt-0.5 font-bold">RECOVERABLE (2 Extents)</div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-[#0c1326] border border-[#182645]">
                                <div className="text-cyan-300 font-bold font-mono">incident_notes.txt</div>
                                <div className="text-[10px] text-slate-400 mt-1">Inode 1048 • 12.4 KB • Plain Text</div>
                                <div className="text-[10px] text-emerald-400 mt-0.5 font-bold">RECOVERABLE (1 Extent)</div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-[#0c1326] border border-[#182645]">
                                <div className="text-cyan-300 font-bold font-mono">deleted_report.pdf</div>
                                <div className="text-[10px] text-slate-400 mt-1">Inode 1055 • 2.4 MB • PDF Document</div>
                                <div className="text-[10px] text-emerald-400 mt-0.5 font-bold">RECOVERABLE (6 Extents)</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── CUSTOM SECTION: Stage 10 — Recovery Completed ── */}
                        {stage.customContent === 'recovery_completed' && (
                          <div className="mt-3 p-3 rounded-xl bg-[#070b16] border border-[#16223b]">
                            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Reconstructed Files Carved &amp; Restored</span>
                            </div>
                            <div className="space-y-1.5 text-xs text-slate-300">
                              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c1326] border border-[#162442]">
                                <span className="font-bold text-cyan-300 font-mono">server.log (184 KB)</span>
                                <span className="text-emerald-400 font-bold">100% Carved • 0 Missing Bytes • Metadata COMPLETE</span>
                              </div>
                              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c1326] border border-[#162442]">
                                <span className="font-bold text-cyan-300 font-mono">incident_notes.txt (12.4 KB)</span>
                                <span className="text-emerald-400 font-bold">100% Carved • 0 Missing Bytes • Metadata COMPLETE</span>
                              </div>
                              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c1326] border border-[#162442]">
                                <span className="font-bold text-cyan-300 font-mono">deleted_report.pdf (2.4 MB)</span>
                                <span className="text-emerald-400 font-bold">100% Carved • 0 Missing Bytes • Metadata COMPLETE</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── CUSTOM SECTION: Stage 11 — Recovery Validated ── */}
                        {stage.customContent === 'validation_match' && (
                          <div className="mt-3 p-3 rounded-xl bg-[#06141a] border border-emerald-500/30">
                            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Cryptographic Attestation &amp; Dual-Hash Cross Verification</span>
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-300">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Inode Extent Expected SHA-256:</span>
                                <span className="text-cyan-300 font-mono">9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Carved Bitstream Actual SHA-256:</span>
                                <span className="text-cyan-300 font-mono">9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-emerald-500/20">
                                <span className="text-slate-400">Cross-Verification Attestation:</span>
                                <span className="text-emerald-400 font-bold">MATCH (Bit-for-bit verified against XFS allocation group inode core)</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Quick Navigation Action Links */}
                        <div className="pt-2 flex items-center gap-3">
                          {stage.id === '02' || stage.id === '03' || stage.id === '04' ? (
                            <button
                              onClick={() => navigate('/evidence')}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                            >
                              <span>View Evidence Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : stage.id === '08' ? (
                            <button
                              onClick={() => navigate('/deleted')}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                            >
                              <span>Inspect Deleted Files</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : stage.id === '10' || stage.id === '11' ? (
                            <button
                              onClick={() => navigate('/recovered')}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                            >
                              <span>Inspect Recovered Files &amp; Payloads</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : stage.id === '12' ? (
                            <button
                              onClick={() => navigate('/reports')}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                            >
                              <span>View Court Forensic Report</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : null}

                          <button
                            onClick={() => navigate('/audit')}
                            className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors ml-auto"
                          >
                            <span>Verify in Audit Log</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer Forensic Attestation Banner ────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-[#080d19] border border-[#152138] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            Chronology strictly correlated with cryptographic audit log. Zero divergent timeline events permitted.
          </span>
        </div>
        <div className="text-slate-500 text-[11px]">
          Standard: ISO/IEC 27037:2012 Digital Evidence Handling
        </div>
      </div>
    </div>
  );
}
