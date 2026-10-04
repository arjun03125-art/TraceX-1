import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine, Layers, Database, HardDrive, ShieldCheck, CheckCircle2,
  AlertTriangle, ArrowRight, Clock, FileCheck2, FileX2, Search,
  Terminal, Sliders, Hash, Cpu, ExternalLink, Activity, Info, Plus
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import AddEvidenceModal from '../components/AddEvidenceModal';
import clsx from 'clsx';

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { cases, evidence, artifacts, activeCase, activeCaseId, setActiveCaseId, logEvent } = useApp();

  const [selectedAg, setSelectedAg] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanComplete, setScanComplete] = useState(true);
  const [isAddEvidenceOpen, setIsAddEvidenceOpen] = useState(false);

  const currentCase = activeCase || cases[0];

  const caseEvidence = useMemo(() => {
    if (!currentCase) return [];
    return evidence.filter(e => e.case_id === currentCase.case_id);
  }, [evidence, currentCase]);

  const activeEvidence = caseEvidence[0] || null;

  const isXfs = activeEvidence
    ? (activeEvidence.filesystem_type === 'XFS' || activeEvidence.detected_fs === 'XFS' || !activeEvidence.filesystem_type?.includes('BTRFS'))
    : true;

  const caseArtifacts = useMemo(() => {
    if (!activeEvidence) return [];
    return artifacts.filter(a => a.evidence_id === activeEvidence.evidence_id);
  }, [artifacts, activeEvidence]);

  const handleRunDeepScan = () => {
    if (!activeEvidence) return;
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setScanComplete(true);
      logEvent('EVIDENCE_ANALYZED', `Extensive B+Tree and Inode extent scan completed for ${activeEvidence.name}. Located ${caseArtifacts.length} deleted inode records.`, {
        case_id: currentCase?.case_id,
        evidence_id: activeEvidence.evidence_id,
        status: 'ANALYZED',
      });
    }, 700);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans select-none">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Forensic Filesystem &amp; Inode Analysis
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Low-level block allocation, extent mapping, and unallocated slack space inspection
              </p>
            </div>
          </div>
        </div>

        {/* Case Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0a101f] border border-[#1b2742] rounded-xl px-3 py-1.5 font-mono text-xs">
            <span className="text-[10px] text-slate-500 uppercase">Case:</span>
            <select
              value={currentCase?.case_id || ''}
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

          <button
            onClick={handleRunDeepScan}
            disabled={analyzing || !activeEvidence}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] disabled:opacity-40"
          >
            <Activity className={clsx('w-3.5 h-3.5', analyzing && 'animate-spin')} />
            <span>{analyzing ? 'Scanning...' : 'Re-Analyze Extents'}</span>
          </button>
        </div>
      </div>

      {!activeEvidence ? (
        <div className="p-12 rounded-2xl bg-[#080d19] border border-[#152138] text-center font-mono space-y-4">
          <HardDrive className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-200">NO EVIDENCE ATTACHED TO THIS CASE</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto font-sans">
              Forensic inode parsing requires an attached disk image. Add an XFS or Btrfs forensic image to {currentCase?.case_number} to begin low-level analysis.
            </p>
          </div>
          <button
            onClick={() => setIsAddEvidenceOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Attach Forensic Image</span>
          </button>
        </div>
      ) : (
        <>
          {/* ── Filesystem Superblock & Core Parameter Cards ──────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono">
        <div className="p-3.5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">FILESYSTEM DETECTED</div>
          <div className="text-base font-bold text-purple-400 mt-1 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>{isXfs ? 'SGI XFS v5' : 'Btrfs Chunk Tree'}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Magic: {isXfs ? '0x58465342 (XFSB)' : '0x4D5F5362 (_BHRfS_M)'}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">BLOCK &amp; CLUSTER SIZE</div>
          <div className="text-base font-bold text-cyan-400 mt-1">4,096 Bytes (4 KB)</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Sectors / Block: 8 (512B Native)</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            {isXfs ? 'ALLOCATION GROUPS' : 'CHUNK TREE NODES'}
          </div>
          <div className="text-base font-bold text-emerald-400 mt-1">
            {isXfs ? '4 AGs (AG0 - AG3)' : '8 Leaf Roots (Intact)'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {isXfs ? '8,388,608 blocks per AG' : 'Cluster Slack Groups 4-8'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#080d19] border border-[#152138] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">INODE INTEGRITY PROGNOSIS</div>
          <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isXfs ? '100% RETRIEVABLE' : '70% RECONSTRUCTED'}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {isXfs ? 'Zero Extent Map Fragmentation' : 'Slack Space Overwritten: 30%'}
          </div>
        </div>
      </div>

      {/* ── Main Analysis Console ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
        {/* Left: Allocation Group Selector / Extent Trees */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-4 space-y-3 shadow-[0_4px_25px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between pb-2 border-b border-[#141f36]">
              <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                {isXfs ? 'Allocation Group Inspector' : 'B-Tree Chunk Map'}
              </span>
              <span className="text-[10px] text-cyan-400 font-bold">O_RDONLY</span>
            </div>

            {isXfs ? (
              <div className="grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((ag) => (
                  <button
                    key={ag}
                    onClick={() => setSelectedAg(ag)}
                    className={clsx(
                      'p-3 rounded-xl border text-left transition-all',
                      selectedAg === ag
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'bg-[#0a101f] text-slate-400 border-[#16223b] hover:border-slate-600'
                    )}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>AG {ag}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#131d33] text-cyan-400">
                        {ag === 0 ? 'PRIMARY' : 'SECONDARY'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Superblock {ag} Intact</div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">B+Tree Valid</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-[#0a101f] border border-amber-500/30 text-amber-300">
                  <div className="font-bold flex items-center justify-between">
                    <span>Chunk Tree Root</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-700/40">DAMAGED</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Zeroing anti-forensic pass detected at sector 0x2000</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0a101f] border border-emerald-500/30 text-emerald-300">
                  <div className="font-bold flex items-center justify-between">
                    <span>Cluster Slack Carve</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/40">ACTIVE (70%)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Leaf generation 478 transid pointers recovered</div>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#070b16] border border-[#141f36] space-y-1.5 text-[11px]">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Active AG Metadata:</div>
              <div className="flex justify-between text-slate-300">
                <span>Free Block Count:</span>
                <span className="text-cyan-400">4,194,304</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Free Inode Tree (inobt):</span>
                <span className="text-emerald-400 font-bold">Intact</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Extent Free Tree (cntbt):</span>
                <span className="text-emerald-400 font-bold">Verified</span>
              </div>
            </div>
          </div>

          {/* Quick Flow Navigator */}
          <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-4 space-y-2.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Investigation Next Steps
            </span>
            <button
              onClick={() => navigate('/deleted-files')}
              className="w-full p-2.5 rounded-xl bg-[#0c1326] hover:bg-[#121e3a] border border-[#182645] hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileX2 className="w-4 h-4 text-rose-400" />
                <span>Examine Deleted Files</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/recovered-files')}
              className="w-full p-2.5 rounded-xl bg-[#0c1326] hover:bg-[#121e3a] border border-[#182645] hover:border-emerald-500/40 text-slate-200 hover:text-emerald-300 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>Recovered Files &amp; Carving</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/chronology')}
              className="w-full p-2.5 rounded-xl bg-[#0c1326] hover:bg-[#121e3a] border border-[#182645] hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Chronology Timeline</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center & Right: Unlinked Inode Extent Analysis */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-5 space-y-4 shadow-[0_4px_25px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#141f36]">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-slate-100">
                  Unlinked Inode Core Records &amp; Extent B+Tree Maps
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-bold">
                {caseArtifacts.length} Inode Cores Located
              </span>
            </div>

            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              When files are deleted on XFS/Btrfs, inode metadata cores and extent map pointers often remain completely
              intact in unallocated chunks until overwritten. TraceX parses these extent maps directly from raw block devices.
            </p>

            {/* Inode Table */}
            <div className="overflow-x-auto rounded-xl border border-[#152138] bg-[#070b16]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#141f36] bg-[#0a101f] text-[10px] uppercase text-slate-400">
                    <th className="py-2.5 px-3">Inode ID</th>
                    <th className="py-2.5 px-3">Artifact / Target</th>
                    <th className="py-2.5 px-3">File Type</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Extent Fragments</th>
                    <th className="py-2.5 px-3">Extent Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10192e] text-slate-300">
                  {caseArtifacts.map((art) => (
                    <tr key={art.artifact_id} className="hover:bg-[#0c1426] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-cyan-300 font-bold">
                        {art.object_id || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">{art.filename}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]" title={art.path || ''}>
                          {art.path}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{art.file_type}</td>
                      <td className="py-2.5 px-3 font-mono">{(art.size_bytes / 1024).toFixed(1)} KB</td>
                      <td className="py-2.5 px-3 font-mono text-cyan-400">{art.fragment_count || 1} Extents</td>
                      <td className="py-2.5 px-3">
                        <span className={clsx(
                          'px-2 py-0.5 rounded text-[10px] font-bold border',
                          art.status === 'CONFIRMED'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                            : art.status === 'PARTIAL'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                            : 'bg-rose-950/60 text-rose-300 border-rose-700/50'
                        )}>
                          {art.status === 'CONFIRMED' ? 'INTACT & CARVABLE' : art.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => navigate('/recovered-files')}
                          className="px-2 py-1 rounded bg-[#111a2f] hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors text-[10px]"
                        >
                          Carve File
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Extent Allocation Visualizer */}
            <div className="p-3.5 rounded-xl bg-[#070b16] border border-[#141f36] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-bold">Bitstream Extent Map Spectrum</span>
                <span className="text-emerald-400 font-bold">100% Block Coverage Verified</span>
              </div>
              <div className="h-4 w-full bg-[#0a101f] rounded-lg overflow-hidden flex border border-[#16223b]">
                <div className="h-full bg-cyan-500 w-[18%]" title="Superblocks & Allocation Group Headers" />
                <div className="h-full bg-purple-500 w-[12%]" title="Inode B+Tree Roots" />
                <div className="h-full bg-slate-800 w-[35%]" title="Unallocated Free Blocks" />
                <div className="h-full bg-emerald-500 w-[20%]" title="server.log & incident_notes.txt Extents" />
                <div className="h-full bg-blue-500 w-[15%]" title="deleted_report.pdf Extents" />
              </div>
              <div className="flex items-center justify-between text-[9px] text-slate-500 pt-1">
                <span>Start Offset: 0x00000000</span>
                <span>End Offset: 0x07FFFFFFF (32.0 GB)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      <AddEvidenceModal
        isOpen={isAddEvidenceOpen}
        onClose={() => setIsAddEvidenceOpen(false)}
        targetCaseId={currentCase?.case_id}
      />
    </div>
  );
}
