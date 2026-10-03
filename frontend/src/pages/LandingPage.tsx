import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  Shield, Search, FileX2, FileCheck2, Layers, Hash,
  ChevronRight, ArrowRight, Lock, Eye, Clock,
  AlertTriangle, CheckCircle2, Fingerprint, Cpu,
  Terminal, Zap, Database, ScanLine, Binary,
  HardDrive, ScrollText, ShieldCheck, Activity,
  ArrowDown, Command, Crosshair, Network,
  Play, MonitorPlay, FlaskConical
} from 'lucide-react';
import ForensicVisualization from '../components/ForensicVisualization';

// ─── Pipeline Data ──────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  {
    id: 'evidence',
    label: 'EVIDENCE',
    icon: HardDrive,
    color: '#3b82f6',
    title: 'Evidence Acquisition',
    description: 'Load forensic disk images with kernel-level O_RDONLY enforcement. SHA-256 and BLAKE3 dual-hash verification ensures bitstream integrity from first contact.',
    detail: 'Supports RAW, E01, AFF4 image formats across XFS v4/v5 and Btrfs filesystems.',
    metrics: ['32 GiB image', 'O_RDONLY enforced', 'Dual-hash verified'],
  },
  {
    id: 'analyze',
    label: 'ANALYZE',
    icon: ScanLine,
    color: '#22d3ee',
    title: 'Filesystem Analysis',
    description: 'Parse superblock structures, allocation groups, B-tree roots, and inode tables. Identify filesystem geometry, block sizes, and feature flags.',
    detail: 'XFS AG headers, inode cores, extent btrees. Btrfs chunk trees, root items, generation scanning.',
    metrics: ['4096-byte blocks', 'AG structure map', 'Btree traversal'],
  },
  {
    id: 'discover',
    label: 'DISCOVER',
    icon: Search,
    color: '#a78bfa',
    title: 'Deleted File Discovery',
    description: 'Locate unlinked inodes with di_nlink == 0, scan historical Btrfs generations, and identify unallocated extents with preserved metadata.',
    detail: 'Multi-strategy: inode core scanning, extent map reconstruction, block-level signature carving.',
    metrics: ['Unlinked inodes', 'Historical gens', 'Unallocated extents'],
  },
  {
    id: 'recover',
    label: 'RECOVER',
    icon: FileCheck2,
    color: '#34d399',
    title: 'Content Recovery',
    description: 'Reconstruct file content from extent maps, historical tree blocks, and carved signatures. Handle fragmentation and partial overwrites.',
    detail: 'Fragment reassembly, gap detection, confidence-scored reconstruction percentage.',
    metrics: ['Fragment reassembly', 'Gap detection', 'Content scoring'],
  },
  {
    id: 'validate',
    label: 'VALIDATE',
    icon: ShieldCheck,
    color: '#fbbf24',
    title: 'Integrity Validation',
    description: 'Verify recovered content through structural validation, file magic matching, internal checksum verification, and independent hash computation.',
    detail: 'Multi-signal confidence model: metadata, extent, signature, content, checksum, timestamp.',
    metrics: ['Magic match', 'Checksum verified', 'Multi-signal'],
  },
  {
    id: 'report',
    label: 'REPORT',
    icon: ScrollText,
    color: '#f43f5e',
    title: 'Forensic Reporting',
    description: 'Generate court-admissible technical reports with full methodology disclosure, chain of custody records, and examiner attestation.',
    detail: 'HTML, PDF, JSON, CSV formats. ISO/IEC 27037 conformant. Append-only audit trail.',
    metrics: ['Court-admissible', 'Chain of custody', 'ISO 27037'],
  },
];

// ─── Capability Data ────────────────────────────────────────────────────────
const CAPABILITIES = [
  { icon: FileX2, title: 'Deleted File Discovery', desc: 'XFS unlinked inode cores and Btrfs historical generation scanning', color: '#f43f5e', tag: 'DETECTION' },
  { icon: Layers, title: 'Filesystem Analysis', desc: 'Superblock parsing, AG structures, chunk trees, and extent btrees', color: '#3b82f6', tag: 'PARSING' },
  { icon: Binary, title: 'File Carving', desc: 'JPEG, PNG, PDF, ELF, ZIP, SQLite signature-based block carving', color: '#22d3ee', tag: 'CARVING' },
  { icon: Fingerprint, title: 'Metadata Extraction', desc: 'Timestamps, permissions, ownership, extended attributes with provenance', color: '#a78bfa', tag: 'METADATA' },
  { icon: Hash, title: 'Hash Verification', desc: 'SHA-256, SHA-512, BLAKE3 cryptographic integrity verification', color: '#34d399', tag: 'CRYPTO' },
  { icon: Clock, title: 'Timeline Reconstruction', desc: 'Normalized forensic super-timeline with JSON/CSV export', color: '#fbbf24', tag: 'TEMPORAL' },
  { icon: Shield, title: 'Confidence Model', desc: 'Multi-signal provenance: RECOVERED, INFERRED, DERIVED, UNKNOWN', color: '#60a5fa', tag: 'SCORING' },
  { icon: ScrollText, title: 'Audit Logging', desc: 'Append-only immutable operation log with cryptographic chain', color: '#a78bfa', tag: 'AUDIT' },
];

// ─── Evidence Principles ────────────────────────────────────────────────────
const PRINCIPLES = [
  { icon: Lock, label: 'READ-ONLY', desc: 'Kernel O_RDONLY enforcement. Evidence is never modified.', color: '#34d399', stat: 'ENFORCED' },
  { icon: Hash, label: 'HASH VERIFIED', desc: 'Dual SHA-256 + BLAKE3 acquisition and artifact checksums.', color: '#3b82f6', stat: '2× HASH' },
  { icon: Fingerprint, label: 'CHAIN OF CUSTODY', desc: 'Every operation timestamped in immutable SQLite audit log.', color: '#a78bfa', stat: 'IMMUTABLE' },
  { icon: Eye, label: 'AUDITABLE', desc: 'Full methodology disclosure. No hidden transformations.', color: '#fbbf24', stat: 'FULL TRACE' },
  { icon: Activity, label: 'TRACEABLE', desc: 'Every metadata field carries explicit provenance tags.', color: '#22d3ee', stat: 'TAGGED' },
];

// ─── Recovery Flow Steps ────────────────────────────────────────────────────
const RECOVERY_FLOW = [
  {
    step: '01',
    label: 'DELETED FILE',
    sublabel: 'User or attacker removes file from active filesystem tree',
    techTag: 'di_nlink == 0',
    icon: FileX2,
    color: '#f43f5e',
  },
  {
    step: '02',
    label: 'FS REMNANTS',
    sublabel: 'Unlinked inode records and unallocated extents remain intact',
    techTag: 'Free Extents Intact',
    icon: Database,
    color: '#fbbf24',
  },
  {
    step: '03',
    label: 'METADATA',
    sublabel: 'MACB timestamps, permissions, and extent maps preserved',
    techTag: 'Inode Core Map',
    icon: Fingerprint,
    color: '#a78bfa',
  },
  {
    step: '04',
    label: 'RECOVERY',
    sublabel: 'Deterministic reconstruction of extents & block-level carving',
    techTag: 'Extent Reassembly',
    icon: Cpu,
    color: '#3b82f6',
  },
  {
    step: '05',
    label: 'VALIDATION',
    sublabel: 'Magic signature matching & independent dual-hash check',
    techTag: 'SHA-256 / BLAKE3',
    icon: ShieldCheck,
    color: '#34d399',
  },
  {
    step: '06',
    label: 'EVIDENCE',
    sublabel: 'Cryptographically verified, court-admissible forensic artifact',
    techTag: 'ISO/IEC 27037',
    icon: Shield,
    color: '#22d3ee',
  },
];


// ─── Fade In Animation Variants ─────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

const fadeRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Magnetic Button Component ──────────────────────────────────────────────
function MagneticButton({ children, onClick, className = '', href }: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  href?: string;
}) {
  const ref = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.15);
    y.set((e.clientY - centerY) * 0.15);
  }, [x, y]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const Tag = href ? motion.a : motion.button;

  return (
    <Tag
      ref={ref}
      href={href}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </Tag>
  );
}

// ─── Typed Text Effect ──────────────────────────────────────────────────────
function TypedLine({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setTimeout(() => setShowCursor(false), 1500);
        }
      }, 30);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <span className="font-mono text-[10px] text-[#4a5568]">
      <span className="text-[#34d399]">$</span> {displayed}
      {showCursor && <span className="animate-pulse text-[#3b82f6]">▋</span>}
    </span>
  );
}


// ─── LANDING PAGE ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [activePipeline, setActivePipeline] = useState(0);
  const [hoveredCapability, setHoveredCapability] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.12], [1, 0.96]);
  const heroY = useTransform(scrollYProgress, [0, 0.12], [0, -30]);

  // Auto-cycle pipeline stages
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePipeline((prev) => (prev + 1) % PIPELINE_STAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut: ⌘/Ctrl + Enter → dashboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        navigate('/dashboard');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <div className="noise-overlay grid-overlay relative">
      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
        className="relative min-h-screen flex items-center overflow-hidden"
      >
        {/* Interactive Visualization Background */}
        <div className="viz-canvas" style={{ opacity: 0.55 }}>
          <ForensicVisualization />
        </div>

        {/* Atmospheric gradient overlays */}
        <div className="absolute inset-0 z-[1] pointer-events-none">
          {/* Strong left fade for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#06080f] via-[#06080f]/85 to-transparent" />
          {/* Bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#06080f] via-transparent to-[#06080f]/30" />
          {/* Top-left atmospheric accent */}
          <div
            className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
          />
          {/* Bottom-right atmospheric accent */}
          <div
            className="absolute -bottom-60 -right-60 w-[800px] h-[800px] rounded-full opacity-[0.03]"
            style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-16 w-full">
          <div className="max-w-2xl">
            {/* System Label */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4 mb-10"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/8 border border-[#3b82f6]/15 flex items-center justify-center backdrop-blur-sm">
                  <Shield className="w-5 h-5 text-[#3b82f6]" />
                </div>
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-lg border border-[#3b82f6]/20 animate-[glow-pulse_3s_ease-in-out_infinite]" />
              </div>
              <div>
                <div className="text-[12px] font-mono font-bold tracking-[0.35em] text-[#60a5fa] uppercase">
                  Trace X
                </div>
                <div className="text-[9px] font-mono text-[#4a5568] tracking-[0.25em] uppercase mt-0.5">
                  Digital Forensics Platform
                </div>
              </div>
              <div className="hidden sm:block ml-4 h-5 w-px bg-[#1c2536]" />
              <div className="hidden sm:block text-[9px] font-mono text-[#2d3748] tracking-wider uppercase">
                v0.1.0
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.2rem] font-bold leading-[1.02] tracking-[-0.02em]"
            >
              <span className="text-white block">Recover What</span>
              <span className="text-white block">Wasn't Meant</span>
              <span className="hero-headline-gradient block mt-1">To Be Found.</span>
            </motion.h1>

            {/* Supporting Text */}
            <motion.p
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-7 text-[15px] md:text-base text-[#64748b] leading-[1.7] max-w-lg font-light"
            >
              Production-grade forensic recovery for XFS and Btrfs disk images.
              Read-only analysis. Cryptographic verification. Court-admissible reporting.
            </motion.p>

            {/* Terminal-style line */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="mt-5 p-3 rounded-md bg-[#090c16]/60 border border-[#1c2536]/60 backdrop-blur-sm max-w-md"
            >
              <TypedLine text="forensic-core scan --image /dev/sda1 --read-only --hash sha256+blake3" delay={1500} />
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <MagneticButton
                onClick={() => navigate('/dashboard')}
                className="magnetic-btn group relative inline-flex items-center gap-3 px-8 py-4 rounded-lg text-sm font-semibold text-white transition-all duration-300 hero-cta-primary"
              >
                <Terminal className="w-4 h-4" />
                <span>START INVESTIGATION</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </MagneticButton>

              <MagneticButton
                href="#challenge"
                className="magnetic-btn group inline-flex items-center gap-2.5 px-6 py-4 rounded-lg text-sm font-medium text-[#94a3b8] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] hover:text-white transition-all duration-300"
              >
                <Crosshair className="w-4 h-4 text-[#3b82f6]" />
                <span>EXPLORE PLATFORM</span>
              </MagneticButton>
            </motion.div>

            {/* Micro Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.6 }}
              className="mt-14 flex items-center gap-6 sm:gap-10"
            >
              {[
                { value: 'XFS + Btrfs', label: 'Filesystem Support', color: '#3b82f6' },
                { value: 'SHA-256 + BLAKE3', label: 'Dual Hash Verification', color: '#34d399' },
                { value: 'READ-ONLY', label: 'Evidence Integrity', color: '#fbbf24' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-4">
                  {i > 0 && <div className="w-px h-8 bg-[#1c2536]" />}
                  <div>
                    <div className="text-sm font-bold font-mono" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                    <div className="text-[10px] font-mono text-[#4a5568] mt-0.5">{stat.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3"
        >
          <div className="text-[9px] font-mono text-[#2d3748] uppercase tracking-[0.4em]">
            Scroll to investigate
          </div>
          <div className="relative w-5 h-9 rounded-full border border-[#1c2536]/60">
            <motion.div
              animate={{ y: [2, 14, 2] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute left-1/2 -translate-x-1/2 top-1 w-1 h-2 rounded-full bg-[#3b82f6]/60"
            />
          </div>
        </motion.div>
      </motion.section>

      {/* ═══════════════ SECTION DIVIDER ═══════════════ */}
      <div className="relative h-px">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3b82f6]/20 to-transparent" />
      </div>

      {/* ═══════════════ SECTION 2: THE CHALLENGE ═══════════════ */}
      <section id="challenge" className="relative py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#3b82f6]/[0.02] to-transparent pointer-events-none" />

        <AnimatedSection className="max-w-[1550px] w-[90%] md:w-[92%] mx-auto px-2 sm:px-4">
          <motion.div variants={fadeUp} className="text-center mb-8 max-w-3xl mx-auto">
            <div className="section-label mx-auto mb-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>THE CHALLENGE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-slate-100 tracking-tight">
              What happens when <span className="hero-headline-gradient">evidence disappears?</span>
            </h2>
            <p className="mt-2.5 text-sm sm:text-[15px] text-slate-300 leading-relaxed font-sans max-w-2xl mx-auto">
              Deleted files leave indelible marks across inode structures, extent trees, and unallocated clusters. TRACE X deterministically traces the complete forensic lifecycle from unlinking to judicial attestation.
            </p>
          </motion.div>

          {/* Workflow Sequence Strip */}
          <motion.div variants={fadeUp} className="hidden xl:flex items-center justify-between max-w-5xl mx-auto mb-6 px-4 py-2 rounded-xl bg-[#070b16]/90 border border-[#16233b] text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              FORENSIC PIPELINE
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-rose-400 font-bold">DELETED FILE</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-amber-400 font-bold">FS REMNANTS</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-purple-400 font-bold">METADATA</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-blue-400 font-bold">RECOVERY</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-emerald-400 font-bold">VALIDATION</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-cyan-400 font-bold">EVIDENCE</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
              ISO/IEC 27037
            </span>
          </motion.div>

          {/* Large Full-Width 6-Stage Forensic Workflow */}
          <motion.div variants={fadeUp} className="relative mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 xl:gap-4 items-stretch">
              {RECOVERY_FLOW.map((step, i) => (
                <motion.div
                  key={step.label}
                  variants={fadeUp}
                  className="relative group h-full flex flex-col"
                >
                  <div
                    className="relative flex flex-col justify-between p-5 xl:p-6 rounded-2xl bg-gradient-to-b from-[#0b101f] to-[#070b15] border border-[#17233c] hover:border-opacity-90 hover:border-cyan-500/50 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] min-h-[250px] xl:min-h-[275px] h-full"
                    style={{ '--card-accent': step.color } as React.CSSProperties}
                  >
                    {/* Top row: Large Icon (48-64px visual container) + Stage Number in upper right */}
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="w-14 h-14 xl:w-16 xl:h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-inner"
                        style={{ background: `${step.color}15`, border: `1px solid ${step.color}35` }}
                      >
                        <step.icon className="w-7 h-7 xl:w-8 xl:h-8" style={{ color: step.color }} />
                      </div>

                      <span
                        className="text-xs xl:text-sm font-mono font-bold tracking-widest px-2.5 py-1 rounded-lg bg-[#050811] border border-[#192642]"
                        style={{ color: step.color }}
                      >
                        {step.step}
                      </span>
                    </div>

                    {/* Content: Title (16-20px) + Short Description (14-16px) */}
                    <div className="space-y-2 text-left my-auto">
                      <div className="text-base xl:text-[18px] font-mono font-bold text-slate-100 tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: step.color }} />
                        <span>{step.label}</span>
                      </div>
                      <p className="text-[14px] xl:text-[14.5px] text-slate-300 font-sans leading-relaxed">
                        {step.sublabel}
                      </p>
                    </div>

                    {/* Bottom Technical Tag */}
                    <div className="pt-3 border-t border-[#131d33] flex items-center justify-between text-[11px] font-mono mt-3">
                      <span className="text-slate-500 font-semibold">STAGE {step.step}</span>
                      <span
                        className="px-2.5 py-1 rounded text-[10px] xl:text-[11px] font-semibold border"
                        style={{
                          background: `${step.color}10`,
                          color: step.color,
                          borderColor: `${step.color}30`
                        }}
                      >
                        {step.techTag}
                      </span>
                    </div>
                  </div>

                  {/* Flow Arrow Connector between cards on large screens */}
                  {i < RECOVERY_FLOW.length - 1 && (
                    <div className="hidden xl:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-[#070b16] border border-[#1d2a45] items-center justify-center shadow-lg text-slate-500 group-hover:text-cyan-400 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ═══════════════ SECTION DIVIDER ═══════════════ */}
      <div className="relative h-px max-w-3xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1c2536] to-transparent" />
      </div>

      {/* ═══════════════ SECTION 3: INVESTIGATION PIPELINE ═══════════════ */}
      <section id="pipeline" className="relative py-14 md:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#090c16]/80 to-transparent pointer-events-none" />

        <AnimatedSection className="max-w-[1550px] w-[90%] md:w-[92%] mx-auto px-4 md:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="section-label mx-auto">
              <Zap className="w-3 h-3" /> Methodology
            </div>
            <h2 className="section-heading text-center">
              The Investigation Pipeline
            </h2>
            <p className="section-subheading text-center mx-auto">
              A structured forensic workflow from evidence intake to court-ready reporting.
              Every step preserves chain of custody.
            </p>
          </motion.div>

          {/* Pipeline Stages */}
          <motion.div variants={fadeUp}>
            {/* Stage Selector Strip */}
            <div className="flex items-center justify-center gap-1 mb-10 overflow-x-auto pb-2 pipeline-selector">
              {PIPELINE_STAGES.map((stage, i) => (
                <button
                  key={stage.id}
                  onClick={() => setActivePipeline(i)}
                  className={`group flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-mono font-semibold transition-all duration-400 whitespace-nowrap ${
                    activePipeline === i
                      ? 'pipeline-stage-active'
                      : 'text-[#4a5568] hover:text-[#94a3b8] border border-transparent hover:border-[#1c2536]/60'
                  }`}
                  style={activePipeline === i ? {
                    background: `${stage.color}0A`,
                    borderColor: `${stage.color}25`,
                    color: stage.color,
                    boxShadow: `0 0 20px ${stage.color}08`,
                  } as React.CSSProperties : undefined}
                >
                  {i > 0 && <ChevronRight className="w-3 h-3 text-[#1c2536] -ml-2 mr-0" />}
                  <stage.icon className="w-3.5 h-3.5" style={{ color: activePipeline === i ? stage.color : undefined }} />
                  {stage.label}
                </button>
              ))}
            </div>

            {/* Active Stage Detail */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activePipeline}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -25 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative p-8 md:p-10 rounded-2xl border overflow-hidden pipeline-detail-card"
                style={{
                  background: `linear-gradient(145deg, ${PIPELINE_STAGES[activePipeline].color}04 0%, #090c16 60%, #0c1019 100%)`,
                  borderColor: `${PIPELINE_STAGES[activePipeline].color}12`,
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent 10%, ${PIPELINE_STAGES[activePipeline].color}30, transparent 90%)` }}
                />
                {/* Left accent line */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-px"
                  style={{ background: `linear-gradient(180deg, ${PIPELINE_STAGES[activePipeline].color}20, transparent 80%)` }}
                />

                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 pipeline-icon-container"
                    style={{
                      background: `${PIPELINE_STAGES[activePipeline].color}08`,
                      border: `1px solid ${PIPELINE_STAGES[activePipeline].color}20`,
                      boxShadow: `0 0 40px ${PIPELINE_STAGES[activePipeline].color}08`,
                    }}
                  >
                    {(() => {
                      const Icon = PIPELINE_STAGES[activePipeline].icon;
                      return <Icon className="w-7 h-7" style={{ color: PIPELINE_STAGES[activePipeline].color }} />;
                    })()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="text-[9px] font-mono font-bold tracking-[0.25em] uppercase"
                        style={{ color: PIPELINE_STAGES[activePipeline].color }}
                      >
                        STAGE {activePipeline + 1} OF {PIPELINE_STAGES.length}
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-display font-bold text-white mb-3">
                      {PIPELINE_STAGES[activePipeline].title}
                    </h3>
                    <p className="text-sm text-[#64748b] leading-relaxed mb-5 max-w-xl">
                      {PIPELINE_STAGES[activePipeline].description}
                    </p>

                    {/* Metrics tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {PIPELINE_STAGES[activePipeline].metrics.map((m, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono font-medium"
                          style={{
                            background: `${PIPELINE_STAGES[activePipeline].color}08`,
                            color: PIPELINE_STAGES[activePipeline].color,
                            border: `1px solid ${PIPELINE_STAGES[activePipeline].color}15`,
                          }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>

                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.015] border border-white/[0.04] text-[10px] font-mono text-[#4a5568]">
                      <Terminal className="w-3 h-3 text-[#3b82f6]" />
                      {PIPELINE_STAGES[activePipeline].detail}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-8 flex gap-1.5">
                  {PIPELINE_STAGES.map((_, i) => (
                    <div
                      key={i}
                      className="h-[2px] flex-1 rounded-full transition-all duration-600"
                      style={{
                        background: i <= activePipeline
                          ? PIPELINE_STAGES[activePipeline].color
                          : '#1c2536',
                        opacity: i <= activePipeline ? (i === activePipeline ? 1 : 0.3) : 0.12,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ═══════════════ SECTION DIVIDER ═══════════════ */}
      <div className="relative h-px max-w-3xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1c2536] to-transparent" />
      </div>

      {/* ═══════════════ SECTION 4: FORENSIC INTELLIGENCE ═══════════════ */}
      <section className="relative py-14 md:py-20">
        <AnimatedSection className="max-w-[1550px] w-[90%] md:w-[92%] mx-auto px-4 md:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="section-label mx-auto">
              <Cpu className="w-3 h-3" /> Capabilities
            </div>
            <h2 className="section-heading text-center">
              Forensic Intelligence
            </h2>
            <p className="section-subheading text-center mx-auto">
              Purpose-built analysis modules powered by the Rust forensic-core engine.
              Each capability integrates with the case management and audit trail.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CAPABILITIES.map((cap, i) => (
              <motion.div
                key={cap.title}
                variants={fadeUp}
                onMouseEnter={() => setHoveredCapability(i)}
                onMouseLeave={() => setHoveredCapability(null)}
                className="group relative p-5 rounded-xl bg-[#090c16] border border-[#1c2536] transition-all duration-500 capability-card overflow-hidden"
                style={{ '--cap-accent': cap.color } as React.CSSProperties}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at top left, ${cap.color}06, transparent 70%)`,
                  }}
                />

                {/* Tag */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                      style={{ background: `${cap.color}0A`, border: `1px solid ${cap.color}18` }}
                    >
                      <cap.icon className="w-5 h-5" style={{ color: cap.color }} />
                    </div>
                    <span
                      className="text-[8px] font-mono font-bold tracking-[0.2em] uppercase px-2 py-0.5 rounded"
                      style={{ color: `${cap.color}80`, background: `${cap.color}08` }}
                    >
                      {cap.tag}
                    </span>
                  </div>
                  <h3 className="text-[13px] font-display font-semibold text-white mb-2">{cap.title}</h3>
                  <p className="text-[11px] text-[#4a5568] leading-relaxed font-mono">{cap.desc}</p>
                </div>

                {/* Bottom accent line on hover */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(90deg, transparent, ${cap.color}40, transparent)` }}
                />
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ═══════════════ SECTION DIVIDER ═══════════════ */}
      <div className="relative h-px max-w-3xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1c2536] to-transparent" />
      </div>

      {/* ═══════════════ SECTION 5: BUILT FOR EVIDENCE ═══════════════ */}
      <section className="relative py-14 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#34d399]/[0.01] to-transparent pointer-events-none" />

        <AnimatedSection className="max-w-[1550px] w-[90%] md:w-[92%] mx-auto px-4 md:px-8">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <div className="section-label mx-auto">
              <Shield className="w-3 h-3" /> Integrity
            </div>
            <h2 className="section-heading text-center">
              Built for Evidence
            </h2>
            <p className="section-subheading text-center mx-auto">
              Every design decision prioritizes forensic soundness.
              Evidence is never modified. Operations are always auditable.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRINCIPLES.map((p, i) => (
              <motion.div
                key={p.label}
                variants={fadeUp}
                className="evidence-principle text-center group overflow-hidden"
              >
                {/* Top stat */}
                <div className="absolute top-3 right-3 text-[8px] font-mono font-bold tracking-[0.15em] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ color: p.color }}
                >
                  {p.stat}
                </div>

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-500 group-hover:scale-110"
                  style={{ background: `${p.color}0A`, border: `1px solid ${p.color}18` }}
                >
                  <p.icon className="w-5 h-5" style={{ color: p.color }} />
                </div>
                <div className="text-[11px] font-mono font-bold tracking-[0.15em] text-white mb-2">{p.label}</div>
                <div className="text-[10px] text-[#4a5568] leading-relaxed font-mono">{p.desc}</div>

                {/* Bottom accent */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(90deg, transparent, ${p.color}30, transparent)` }}
                />
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ═══════════════ SECTION DIVIDER ═══════════════ */}
      <div className="relative h-px max-w-3xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1c2536] to-transparent" />
      </div>

      {/* ═══════════════ SECTION 6: COMMAND CENTER PREVIEW ═══════════════ */}
      <section className="relative py-14 md:py-20">
        <AnimatedSection className="max-w-[1550px] w-[90%] md:w-[92%] mx-auto px-4 md:px-8">
          <motion.div variants={fadeUp} className="text-center mb-10">
            <div className="section-label mx-auto mb-2.5">
              <Terminal className="w-3 h-3" /> Workspace
            </div>
            <h2 className="section-heading text-center">
              Enter the Investigation
            </h2>
            <p className="section-subheading text-center mx-auto max-w-xl">
              The forensic workstation awaits. Case management, evidence analysis,
              timeline reconstruction, and reporting — all in one interface.
            </p>
          </motion.div>

          {/* App Preview Mock */}
          <motion.div
            variants={scaleIn}
            className="relative rounded-2xl overflow-hidden app-preview-container"
          >
            {/* Outer glow */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#3b82f6]/15 via-[#1c2536]/50 to-[#1c2536]/20 pointer-events-none" />

            <div className="relative rounded-2xl overflow-hidden border border-[#1c2536] bg-[#090c16]">
              {/* Mock titlebar */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0c1019] border-b border-[#1c2536]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#34d399]/60" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400">TRACE X CORE</span>
                    <span className="text-[9px] font-mono text-slate-500">v0.1.0</span>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                    <Lock className="w-3 h-3" />
                    O_RDONLY LOCKED
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-cyan-400">SHA-256 + BLAKE3 VERIFIED</span>
                </div>

                <div className="text-[9px] font-mono text-[#4a5568] flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[#141a28] border border-[#1c2536] text-[8px] text-cyan-400">⌘K</kbd>
                </div>
              </div>

              {/* Mock app layout */}
              <div className="flex min-h-[380px] md:min-h-[440px]">
                {/* Sidebar mock */}
                <div className="w-48 bg-[#070b16] border-r border-[#151f33] p-3 space-y-3 hidden sm:block flex-shrink-0 font-mono">
                  <div>
                    <div className="text-[8px] uppercase tracking-wider text-slate-500 px-2 mb-1 font-bold">Workspace</div>
                    {['Command Center', 'Cases', 'Evidence', 'Deleted Files', 'Recovered Files', 'Chronology', 'Reports'].map((item, i) => (
                      <div
                        key={item}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] transition-colors ${
                          i === 0 ? 'bg-cyan-950/60 text-cyan-300 border-l-2 border-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="text-[8px] uppercase tracking-wider text-purple-400 px-2 mb-1 font-bold">Administration</div>
                    {['Overview', 'Cases', 'Investigators', 'Evidence', 'Reports', 'Audit', 'System Settings'].map((item, i) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 px-2.5 py-1 rounded text-[10px] text-slate-400 hover:text-slate-200"
                      >
                        <div className="w-1 h-1 rounded-full bg-purple-900" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content area mock: Operational Forensic Telemetry */}
                <div className="flex-1 p-4 md:p-6 space-y-4 overflow-hidden font-mono bg-[#050811]">
                  {/* Case Banner */}
                  <div className="p-3.5 rounded-xl bg-[#090f1d] border border-cyan-500/30 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                        ACTIVE CASE
                      </span>
                      <span className="text-xs font-bold text-slate-100">CR-2026-0891</span>
                      <span className="text-slate-600 hidden md:inline">•</span>
                      <span className="text-[11px] text-slate-300 hidden md:inline">Storage Server Breach Forensic Triage</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold">STATUS: VERIFIED</span>
                  </div>

                  {/* Telemetry Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {[
                      { label: 'ACTIVE CASES', val: '1', sub: 'Managed Dossier', color: '#3b82f6' },
                      { label: 'EVIDENCE SOURCES', val: '1', sub: 'sda1_raw_image', color: '#22d3ee' },
                      { label: 'FILESYSTEM', val: 'XFS v5', sub: 'AG Structure Map', color: '#a78bfa' },
                      { label: 'WRITE-BLOCK', val: 'O_RDONLY', sub: 'Hardware Enforced', color: '#34d399' },
                    ].map((card, i) => (
                      <div key={i} className="p-3 rounded-xl bg-[#080d19] border border-[#141f36]">
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</div>
                        <div className="text-lg font-bold text-slate-100 mt-1" style={{ color: card.color }}>{card.val}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{card.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Forensic Evidence Table */}
                  <div className="rounded-xl bg-[#080d19] border border-[#141f36] overflow-hidden">
                    <div className="px-3 py-2 bg-[#0c1326] border-b border-[#141f36] flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-slate-300">Evidence Bitstream Image</span>
                      <span className="text-cyan-400 font-semibold">Dual Hash: Verified</span>
                    </div>
                    <div className="p-3 space-y-1.5 text-[10px]">
                      <div className="flex items-center justify-between text-slate-300 py-1 border-b border-[#131d33]">
                        <span className="font-bold text-cyan-300">source_sda1.raw</span>
                        <span>32.0 GiB • XFS v5 (AGs: 4)</span>
                        <span className="text-emerald-400 font-mono">SHA-256: 7f83b165...</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/40">READY</span>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Inode Recovery Feed */}
                  <div className="rounded-xl bg-[#080d19] border border-[#141f36] p-3 text-[10px] space-y-1 text-slate-400">
                    <div className="text-slate-500 font-bold uppercase text-[9px] mb-1">Unlinked Inode Recovery Stream</div>
                    <div className="text-slate-300 flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">0x0041F000</span>
                      <span>Inode #1048592</span>
                      <span className="text-rose-400 font-semibold">di_nlink == 0</span>
                      <span className="text-slate-500">|</span>
                      <span>Extents: 4 Blocks preserved</span>
                      <span className="text-emerald-400 ml-auto font-bold">HIGH CONFIDENCE</span>
                    </div>
                    <div className="text-slate-300 flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">0x0042B800</span>
                      <span>Inode #1048593</span>
                      <span className="text-rose-400 font-semibold">di_nlink == 0</span>
                      <span className="text-slate-500">|</span>
                      <span>Magic: PDF-1.7 Match</span>
                      <span className="text-emerald-400 ml-auto font-bold">VALIDATED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gradient overlay on preview */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#06080f] via-transparent to-transparent pointer-events-none rounded-2xl" />
          </motion.div>

          {/* CTA */}
          <motion.div variants={fadeUp} className="text-center mt-14">
            <MagneticButton
              onClick={() => navigate('/dashboard')}
              className="magnetic-btn group inline-flex items-center gap-3 px-10 py-5 rounded-xl text-sm font-semibold text-white transition-all duration-300 hero-cta-primary"
            >
              <Terminal className="w-4 h-4" />
              <span>OPEN FORENSIC WORKSPACE</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
            </MagneticButton>
            <div className="mt-5 flex items-center justify-center gap-3 text-[10px] font-mono text-[#2d3748]">
              <span>Keyboard shortcut:</span>
              <kbd className="px-2 py-0.5 rounded bg-[#141a28] text-[#4a5568] border border-[#1c2536] text-[9px]">⌘</kbd>
              <span className="text-[#1c2536]">+</span>
              <kbd className="px-2 py-0.5 rounded bg-[#141a28] text-[#4a5568] border border-[#1c2536] text-[9px]">Enter</kbd>
            </div>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ═══════════════ SECTION DIVIDER ═══════════════ */}
      <div className="relative h-px max-w-3xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3b82f6]/20 to-transparent" />
      </div>

      {/* ═══════════════ SECTION 7: SEE TRACE X IN ACTION ═══════════════ */}
      <section id="demo" className="relative py-20 md:py-28 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
          />
        </div>

        <AnimatedSection className="max-w-[1550px] w-[90%] md:w-[92%] mx-auto px-4 md:px-8 relative z-10">
          {/* Section label */}
          <motion.div variants={fadeUp} className="flex flex-col items-center text-center mb-10">
            <div className="section-label mx-auto mb-4">
              <MonitorPlay className="w-3 h-3 text-[#3b82f6]" /> Live Demo
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-[3.5rem] font-display font-bold text-white leading-tight tracking-tight">
              See <span className="hero-headline-gradient">TRACE X</span> in Action
            </h2>
            <p className="mt-4 text-base text-[#64748b] max-w-2xl leading-relaxed">
              From evidence ingestion to validated recovery,
              see how a complete forensic investigation moves through TRACE X.
            </p>
          </motion.div>

          {/* Demo Preview Strip */}
          <motion.div variants={fadeUp} className="mb-10">
            <div className="relative rounded-2xl overflow-hidden border border-[#1c2536] bg-[#070b16]">
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/40 to-transparent" />

              {/* Demo stages mini-preview */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-[#1c2536]">
                {[
                  { step: '01', label: 'INTAKE', icon: HardDrive, color: '#3b82f6', sub: 'O_RDONLY enforced' },
                  { step: '02', label: 'ANALYZE', icon: ScanLine, color: '#22d3ee', sub: 'XFS/Btrfs structures' },
                  { step: '03', label: 'DISCOVER', icon: Search, color: '#a78bfa', sub: '112 candidates' },
                  { step: '04', label: 'RECOVER', icon: FileCheck2, color: '#34d399', sub: '98 files restored' },
                  { step: '05', label: 'VALIDATE', icon: ShieldCheck, color: '#fbbf24', sub: 'Multi-signal proof' },
                  { step: '06', label: 'REPORT', icon: ScrollText, color: '#f43f5e', sub: 'ISO/IEC 27037' },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex flex-col items-center p-5 text-center gap-3 group hover:bg-[#0c1326]/60 transition-colors">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{ background: `${s.color}10`, border: `1px solid ${s.color}25` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: s.color }} />
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-[#4a5568] tracking-wider mb-0.5">STEP {s.step}</div>
                        <div className="text-[11px] font-mono font-bold" style={{ color: s.color }}>{s.label}</div>
                        <div className="text-[9px] font-mono text-[#4a5568] mt-1 leading-relaxed">{s.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Demo case badge */}
              <div className="border-t border-[#1c2536] px-6 py-3 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1.5 text-[#f43f5e] bg-[#f43f5e]/8 border border-[#f43f5e]/20 px-2.5 py-1 rounded">
                    <FlaskConical className="w-3 h-3" /> SIMULATED INVESTIGATION
                  </span>
                  <span className="text-[#2d3748]">Case: DEMO-CR-2026-0047</span>
                  <span className="text-[#2d3748] hidden sm:inline">·</span>
                  <span className="text-[#2d3748] hidden sm:inline">Image: nexus_node01_sda1.raw (48.0 GiB)</span>
                </div>
                <span className="text-[9px] font-mono text-[#2d3748]">No real data is stored</span>
              </div>
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <MagneticButton
              onClick={() => navigate('/demo')}
              className="magnetic-btn group relative inline-flex items-center gap-3 px-10 py-5 rounded-xl text-sm font-bold text-white transition-all duration-300 hero-cta-primary"
            >
              <Play className="w-5 h-5" />
              <span>▶ WATCH DEMO</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </MagneticButton>

            <MagneticButton
              onClick={() => navigate('/demo')}
              className="magnetic-btn group inline-flex items-center gap-3 px-8 py-5 rounded-xl text-sm font-medium text-[#94a3b8] bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-[#3b82f6]/30 hover:text-white transition-all duration-300"
            >
              <MonitorPlay className="w-5 h-5 text-[#3b82f6]" />
              <span>OPEN DEMO WORKSPACE</span>
            </MagneticButton>
          </motion.div>

          {/* Trust note */}
          <motion.div variants={fadeUp} className="mt-6 text-center">
            <p className="text-[11px] font-mono text-[#2d3748]">
              All demo data is synthetically generated ·  Never persisted · No account required
            </p>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ═══════════════ SECTION DIVIDER ═══════════════ */}
      <div className="relative h-px max-w-3xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1c2536] to-transparent" />
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="relative border-t border-[#1c2536]/60 py-14">
        <div className="max-w-5xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[#3b82f6]/6 border border-[#3b82f6]/12 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-[#3b82f6]" />
            </div>
            <span className="text-[11px] font-mono text-[#2d3748]">
              TRACE X — Digital Forensics Platform v0.1.0
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-[#2d3748]">
            <span>forensic-core: Rust 1.82+</span>
            <span className="text-[#1c2536]">|</span>
            <span>Read-Only Processing</span>
            <span className="text-[#1c2536]">|</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
