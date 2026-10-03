/**
 * DashboardPage — TRACE X Command Center
 *
 * Shows:
 * 1. Case / Investigation header
 * 2. Investigation Pipeline (9-stage indicator — matches demo)
 * 3. Current step / status panel
 * 4. SOURCE → PROCESS → OUTPUT flow
 * 5. Key workspace panels (cases, evidence, audit)
 * 6. System status
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import WebModeNotice from '../components/WebModeNotice';
import {
  FolderOpen, HardDrive, FileCheck2, FileText, ScrollText,
  Shield, Cpu, Plus, ArrowRight,
  Users, CheckCircle2, Clock, X, RotateCcw,
  Settings2, ClipboardList, ScanLine, Search,
  FileX2, ShieldCheck, Hash, Circle, ChevronRight,
  Sparkles, Loader2
} from 'lucide-react';

// ─── Pipeline stages (mirrors DemoPage for consistency) ──────────────────────

const PIPELINE_STAGES = [
  { num: '01', label: 'CASE',     short: 'Case',     icon: ClipboardList, route: '/admin/cases',      color: '#3b82f6' },
  { num: '02', label: 'EVIDENCE', short: 'Evidence', icon: HardDrive,     route: '/admin/evidence',   color: '#22d3ee' },
  { num: '03', label: 'VERIFY',   short: 'Verify',   icon: Hash,          route: '/admin/evidence',   color: '#a78bfa' },
  { num: '04', label: 'ANALYZE',  short: 'Analyze',  icon: ScanLine,      route: '/evidence',         color: '#fbbf24' },
  { num: '05', label: 'DISCOVER', short: 'Discover', icon: FileX2,        route: '/deleted',          color: '#f43f5e' },
  { num: '06', label: 'RECOVER',  short: 'Recover',  icon: FileCheck2,    route: '/recovered',        color: '#34d399' },
  { num: '07', label: 'VALIDATE', short: 'Validate', icon: ShieldCheck,   route: '/recovered',        color: '#10b981' },
  { num: '08', label: 'REPORT',   short: 'Report',   icon: FileText,      route: '/admin/reports',    color: '#f97316' },
  { num: '09', label: 'AUDIT',    short: 'Audit',    icon: ScrollText,    route: '/admin/audit',      color: '#8b5cf6' },
] as const;

// ─── Determine pipeline progress from real data ───────────────────────────────

function usePipelineProgress(casesLen: number, evidenceLen: number, reportsLen: number) {
  // Derive which stages are "done" based on real data
  let activeStage = 0;
  const completedStages = new Set<number>();

  if (casesLen > 0) {
    completedStages.add(0);
    activeStage = 1;
  }
  if (evidenceLen > 0) {
    completedStages.add(1);
    completedStages.add(2); // verify follows evidence
    activeStage = 3;
  }
  if (reportsLen > 0) {
    completedStages.add(3);
    completedStages.add(4);
    completedStages.add(5);
    completedStages.add(6);
    completedStages.add(7);
    completedStages.add(8);
    activeStage = -1; // all done
  }

  return { activeStage, completedStages };
}

// ─── Pipeline bar component ───────────────────────────────────────────────────

function InvestigationPipeline({
  activeStage,
  completedStages,
  onStageClick,
}: {
  activeStage: number;
  completedStages: Set<number>;
  onStageClick: (route: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center min-w-max gap-0">
        {PIPELINE_STAGES.map((s, i) => {
          const done = completedStages.has(i);
          const active = activeStage === i;
          const pending = !done && !active;
          const Icon = s.icon;
          return (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => onStageClick(s.route)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-mono font-bold transition-all hover:scale-[1.04] ${
                  active
                    ? 'border'
                    : done
                      ? 'text-[#34d399] hover:bg-[#052019]'
                      : 'text-[#2d3748] hover:text-[#4a5568]'
                }`}
                style={active ? {
                  borderColor: `${s.color}40`,
                  color: s.color,
                  background: `${s.color}08`,
                } : undefined}
                title={`Step ${s.num}: ${s.label}`}
              >
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-[#34d399]" />
                ) : active ? (
                  <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: s.color }} />
                ) : (
                  <Circle className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <Icon className="w-3 h-3 flex-shrink-0" style={{ color: active ? s.color : done ? '#34d399' : undefined }} />
                <span className="hidden sm:inline">{s.short}</span>
                {active && (
                  <span className="ml-1 text-[8px] opacity-70 hidden md:inline">RUNNING</span>
                )}
              </button>
              {i < PIPELINE_STAGES.length - 1 && (
                <ChevronRight
                  className={`w-3 h-3 mx-0.5 flex-shrink-0 transition-colors ${done ? 'text-[#34d399]/40' : 'text-[#1c2536]'}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Current step detail panel ────────────────────────────────────────────────

function CurrentStepPanel({
  activeStage,
  completedStages,
  casesLen,
  evidenceLen,
}: {
  activeStage: number;
  completedStages: Set<number>;
  casesLen: number;
  evidenceLen: number;
}) {
  const all = PIPELINE_STAGES.length;
  const done = completedStages.size;

  const getStageInfo = () => {
    if (casesLen === 0) return {
      step: '01', label: 'CREATE CASE',
      input: 'New investigation request',
      process: 'Create a case workspace to begin the investigation',
      output: 'Case created and ready for evidence',
      status: 'PENDING',
      color: '#3b82f6',
    };
    if (evidenceLen === 0) return {
      step: '02', label: 'ADD EVIDENCE',
      input: `Case: ${casesLen} case(s) active`,
      process: 'Attach a forensic disk image to the investigation',
      output: 'Evidence source registered',
      status: 'PENDING',
      color: '#22d3ee',
    };
    if (activeStage >= 0 && activeStage < all) {
      const s = PIPELINE_STAGES[activeStage];
      return {
        step: s.num, label: s.label,
        input: evidenceLen > 0 ? `${evidenceLen} evidence source(s) loaded` : '—',
        process: 'Forensic analysis in progress',
        output: 'Results will appear when analysis completes',
        status: 'READY',
        color: s.color,
      };
    }
    return {
      step: '09', label: 'AUDIT TRAIL',
      input: 'All investigation steps',
      process: 'Review audit chain and generate final report',
      output: 'Court-admissible report package',
      status: 'COMPLETE',
      color: '#8b5cf6',
    };
  };

  const info = getStageInfo();
  const pct = all > 0 ? Math.round((done / all) * 100) : 0;

  return (
    <div className="p-4 rounded-xl bg-[#090c16] border border-[#1c2536] space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border"
            style={{ color: info.color, borderColor: `${info.color}30`, background: `${info.color}08` }}
          >
            STEP {info.step} / {String(all).padStart(2, '0')}
          </div>
          <span className="text-[12px] font-mono font-bold text-white">{info.label}</span>
        </div>
        <span className={`text-[10px] font-mono font-bold ${
          info.status === 'COMPLETE' ? 'text-[#34d399]' :
          info.status === 'READY' ? 'text-[#fbbf24]' : 'text-[#4a5568]'
        }`}>● {info.status}</span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-[#1c2536] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3b82f6, #22d3ee)' }}
          />
        </div>
        <span className="text-[10px] font-mono text-[#4a5568] w-8">{pct}%</span>
      </div>

      {/* INPUT → PROCESS → OUTPUT */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: 'INPUT', value: info.input, color: '#3b82f6' },
          { label: 'PROCESS', value: info.process, color: '#fbbf24' },
          { label: 'OUTPUT', value: info.output, color: '#34d399' },
        ].map(item => (
          <div key={item.label} className="space-y-1">
            <div className="text-[8px] font-mono font-bold tracking-widest" style={{ color: item.color }}>
              {item.label}
            </div>
            <div className="text-[10px] font-mono text-[#64748b] leading-relaxed">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pipeline status checklist ────────────────────────────────────────────────

function PipelineChecklist({
  activeStage,
  completedStages,
  onNavigate,
}: {
  activeStage: number;
  completedStages: Set<number>;
  onNavigate: (route: string) => void;
}) {
  return (
    <div className="p-4 rounded-xl bg-[#090c16] border border-[#1c2536]">
      <div className="text-[9px] font-mono font-bold text-[#4a5568] tracking-widest mb-3">INVESTIGATION STATUS</div>
      <div className="space-y-1.5">
        {PIPELINE_STAGES.map((s, i) => {
          const done = completedStages.has(i);
          const active = activeStage === i;
          const Icon = s.icon;
          return (
            <button
              key={s.num}
              onClick={() => onNavigate(s.route)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-mono text-left transition-all hover:bg-[#0c1326]"
            >
              <span className="text-[9px] font-bold text-[#2d3748] w-5 flex-shrink-0">{s.num}</span>
              {done ? (
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-[#34d399]" />
              ) : active ? (
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 animate-pulse" style={{ background: s.color }} />
              ) : (
                <Circle className="w-3.5 h-3.5 flex-shrink-0 text-[#2d3748]" />
              )}
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${done ? 'text-[#34d399]' : active ? '' : 'text-[#2d3748]'}`}
                style={active ? { color: s.color } : undefined}
              />
              <span className={done ? 'text-[#34d399]' : active ? 'text-white font-bold' : 'text-[#2d3748]'}
                style={active ? { color: s.color } : undefined}
              >
                {s.label}
              </span>
              {done && <span className="ml-auto text-[9px] text-[#34d399]">✓ Complete</span>}
              {active && <span className="ml-auto text-[9px] font-bold" style={{ color: s.color }}>● Running</span>}
              {!done && !active && <span className="ml-auto text-[9px] text-[#2d3748]">○ Pending</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { cases, evidence, investigators, reports, auditEvents, stats } = useApp();

  const activeCase = cases.length > 0 ? cases[0] : null;
  const { activeStage, completedStages } = usePipelineProgress(cases.length, evidence.length, reports.length);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto font-sans">

      {/* ════ 1. CASE / INVESTIGATION HEADER ════ */}
      {cases.length === 0 ? (
        /* First-launch onboarding */
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#091124] via-[#0b1530] to-[#0d1c40] border border-cyan-500/30 p-6 shadow-[0_0_40px_rgba(6,182,212,0.10)]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3 font-mono">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold tracking-widest">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              WORKSPACE READY
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-100 tracking-tight">
              TRACE X — DIGITAL FORENSICS PLATFORM
            </h1>
            <p className="text-[12px] text-slate-400 leading-relaxed font-sans">
              Your forensic workspace is initialized. Follow the 9-stage investigation pipeline below.
              Start by creating a case, then add evidence to begin analysis.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                onClick={() => navigate('/admin/cases')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
              >
                <Plus className="w-4 h-4" /> STEP 01 — CREATE CASE
              </button>
              <button
                onClick={() => navigate('/demo')}
                className="px-4 py-2 rounded-xl bg-[#101b33] hover:bg-[#162547] border border-[#1d2f54] text-slate-200 font-bold text-xs transition-all flex items-center gap-2"
              >
                ▶ WATCH DEMO
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Active case header */
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1020] via-[#091226] to-[#0d1733] border border-cyan-500/25 p-5">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  ACTIVE CASE
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  REF: <span className="text-slate-200">{activeCase!.case_number}</span>
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight font-mono">{activeCase!.case_title}</h1>
              <p className="text-[11px] text-slate-400 font-mono">
                Lead: <span className="text-cyan-300">{activeCase!.investigator}</span>
                {activeCase!.organization && <> · {activeCase!.organization}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/cases/${activeCase!.case_id}`)}
                className="px-3 py-2 rounded-xl bg-[#0f182c] hover:bg-[#16233f] border border-[#1e2f52] text-slate-200 text-xs font-mono transition-colors flex items-center gap-2"
              >
                Case Dossier <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </button>
              <button
                onClick={() => navigate('/admin/evidence')}
                className="px-3 py-2 rounded-xl bg-[#0f182c] hover:bg-[#16233f] border border-[#1e2f52] text-slate-200 text-xs font-mono transition-colors flex items-center gap-2"
              >
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                Evidence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ 1b. EXECUTION MODE NOTICE ════ */}
      <WebModeNotice compact={false} className="" />

      {/* ════ 2. INVESTIGATION PIPELINE ════ */}
      <div className="p-4 rounded-xl bg-[#090c16] border border-[#1c2536] space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[9px] font-mono font-bold text-[#4a5568] tracking-widest">
            TRACE X INVESTIGATION PIPELINE
          </div>
          <button
            onClick={() => navigate('/demo')}
            className="text-[10px] font-mono text-[#3b82f6] hover:text-[#60a5fa] flex items-center gap-1 transition-colors"
          >
            ▶ DEMO <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <InvestigationPipeline
          activeStage={activeStage}
          completedStages={completedStages}
          onStageClick={(route) => navigate(route)}
        />
      </div>

      {/* ════ 3+4. CURRENT STEP + STATUS ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Current step panel — takes 2 cols */}
        <div className="lg:col-span-2">
          <CurrentStepPanel
            activeStage={activeStage}
            completedStages={completedStages}
            casesLen={cases.length}
            evidenceLen={evidence.length}
          />
        </div>

        {/* KPI summary — 1 col */}
        <div className="grid grid-cols-2 gap-2 content-start">
          {[
            { label: 'CASES', value: stats.totalCases, icon: FolderOpen, color: '#3b82f6', route: '/admin/cases' },
            { label: 'EVIDENCE', value: stats.totalEvidence, icon: HardDrive, color: '#22d3ee', route: '/admin/evidence' },
            { label: 'REPORTS', value: stats.totalReports, icon: FileText, color: '#f97316', route: '/admin/reports' },
            { label: 'AUDIT', value: stats.totalAuditEvents, icon: ScrollText, color: '#8b5cf6', route: '/admin/audit' },
          ].map(kpi => (
            <button
              key={kpi.label}
              onClick={() => navigate(kpi.route)}
              className="p-3 rounded-xl bg-[#090c16] border border-[#1c2536] hover:border-opacity-60 text-left transition-all group"
              style={{ '--hover-color': kpi.color } as React.CSSProperties}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono text-[#4a5568]">{kpi.label}</span>
                <kpi.icon className="w-3.5 h-3.5 transition-transform group-hover:scale-110" style={{ color: kpi.color }} />
              </div>
              <div className="text-xl font-bold font-mono text-slate-100">{kpi.value}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ════ 5. MAIN WORKSPACE ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Pipeline checklist */}
        <div>
          <PipelineChecklist
            activeStage={activeStage}
            completedStages={completedStages}
            onNavigate={(route) => navigate(route)}
          />
        </div>

        {/* Recent investigations */}
        <div className="p-4 rounded-xl bg-[#090c16] border border-[#1c2536] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span className="text-[12px] font-bold text-slate-200 font-mono">Investigations</span>
            </div>
            <button onClick={() => navigate('/admin/cases')} className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {cases.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-slate-500 space-y-2 font-mono">
              <FolderOpen className="w-7 h-7 text-slate-600 mx-auto" />
              <p>No investigations yet.</p>
              <button
                onClick={() => navigate('/admin/cases')}
                className="px-3 py-1.5 rounded-lg bg-[#111a2f] hover:bg-[#16233f] text-cyan-300 text-[10px] border border-cyan-500/30 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3" /> CREATE CASE
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {cases.slice(0, 5).map(c => (
                <button
                  key={c.case_id}
                  onClick={() => navigate(`/cases/${c.case_id}`)}
                  className="w-full p-2.5 rounded-lg bg-[#0c1222] hover:bg-[#10182b] border border-[#162138] transition-colors text-left text-[11px] font-mono"
                >
                  <div className="font-semibold text-slate-200 truncate">{c.case_title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{c.case_number} · {c.investigator}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Evidence sources */}
        <div className="p-4 rounded-xl bg-[#090c16] border border-[#1c2536] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <HardDrive className="w-3.5 h-3.5 text-[#22d3ee]" />
              <span className="text-[12px] font-bold text-slate-200 font-mono">Evidence Sources</span>
            </div>
            <button onClick={() => navigate('/admin/evidence')} className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {evidence.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-slate-500 space-y-2 font-mono">
              <HardDrive className="w-7 h-7 text-slate-600 mx-auto" />
              <p>No evidence attached.</p>
              <button
                onClick={() => navigate('/admin/evidence')}
                className="px-3 py-1.5 rounded-lg bg-[#111a2f] hover:bg-[#16233f] text-cyan-300 text-[10px] border border-cyan-500/30 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3" /> ADD EVIDENCE
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {evidence.slice(0, 5).map(e => (
                <div
                  key={e.evidence_id}
                  className="p-2.5 rounded-lg bg-[#0c1222] border border-[#162138] text-[11px] font-mono"
                >
                  <div className="font-semibold text-slate-200 truncate">{e.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">{e.source_path}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-800/40">{e.format}</span>
                    <span className="text-[9px] text-[#34d399]">● Registered</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════ 6+7. AUDIT + SYSTEM STATUS ════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Audit trail */}
        <div className="p-4 rounded-xl bg-[#090c16] border border-[#1c2536] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <ScrollText className="w-3.5 h-3.5 text-[#8b5cf6]" />
              <span className="text-[12px] font-bold text-slate-200 font-mono">Audit Trail</span>
            </div>
            <button onClick={() => navigate('/admin/audit')} className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {auditEvents.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-slate-500 font-mono">
              <ScrollText className="w-7 h-7 text-slate-600 mx-auto mb-2" />
              <p>No audit events yet. Start an investigation.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {auditEvents.slice().reverse().slice(0, 5).map(a => (
                <div key={a.event_id} className="p-2 rounded-lg bg-[#0c1222] border border-[#152035] flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-[#8b5cf6] flex-shrink-0">{a.action}</span>
                    <span className="text-slate-400 truncate">{a.details}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 flex-shrink-0 ml-2">
                    {new Date(a.event_time).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System status */}
        <div className="p-4 rounded-xl bg-[#090c16] border border-[#1c2536] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#141f36]">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-[#34d399]" />
              <span className="text-[12px] font-bold text-slate-200 font-mono">Engine Status</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-[#34d399] border border-[#34d399]/30 px-2 py-0.5 rounded bg-[#052019]">
              READY
            </span>
          </div>
          <div className="space-y-2.5 text-[11px] font-mono">
            {[
              { label: 'Write-Block Mode', value: 'O_RDONLY ENFORCED', color: '#34d399' },
              { label: 'Filesystems', value: 'ext4 · XFS v5 · Btrfs', color: '#22d3ee' },
              { label: 'Hash Algorithms', value: 'SHA-256 + BLAKE3', color: '#a78bfa' },
              { label: 'Registered Examiners', value: `${stats.totalInvestigators} examiner(s)`, color: '#94a3b8' },
              { label: 'Audit Mode', value: 'Append-only · Active', color: '#fbbf24' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#141f36]">
            <button
              onClick={() => navigate('/demo')}
              className="w-full py-2 rounded-lg text-[10px] font-mono font-bold text-[#3b82f6] border border-[#3b82f6]/25 hover:bg-[#3b82f6]/08 transition-all flex items-center justify-center gap-2"
            >
              ▶ WATCH FORENSIC DEMO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
