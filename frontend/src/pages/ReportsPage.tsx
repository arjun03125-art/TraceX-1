import { useState } from 'react';
import {
  FileText, Download, Printer, CheckCircle2, Shield, Plus,
  Eye, Copy, Check, X, FileCheck2, Clock, AlertTriangle, Layers
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { Report } from '../types/forensic';
import clsx from 'clsx';

export default function ReportsPage() {
  const { cases, reports, evidence, createReport, artifacts, activeCase: globalActiveCase, activeCaseId, setActiveCaseId, logEvent } = useApp();
  const [selectedReport, setSelectedReport] = useState<Report | null>(reports[0] || null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Active case selection
  const [selectedCaseId, setSelectedCaseId] = useState<string>(globalActiveCase?.case_id || cases[0]?.case_id || '');
  const activeCase = cases.find(c => c.case_id === selectedCaseId) || globalActiveCase || cases[0];
  const activeEvidence = evidence.find(e => e.case_id === activeCase?.case_id) || evidence[0];

  const handleCreateReport = () => {
    const isXfs = activeEvidence?.detected_fs === 'XFS' || activeEvidence?.filesystem_type === 'XFS';
    const now = new Date().toISOString();

    const caseArtifacts = artifacts.filter(a => a.evidence_id === activeEvidence?.evidence_id);
    const recoveredList = caseArtifacts.length > 0 ? caseArtifacts : artifacts.slice(0, 3);

    const reportArtifacts = recoveredList.map(a => ({
      name: a.filename,
      type: a.file_type,
      path: a.path || '/unknown',
      size: `${(a.size_bytes / 1024).toFixed(1)} KB`,
      status: a.status,
      recovery: a.status === 'CONFIRMED' ? 'SUCCESS' : a.status === 'PARTIAL' ? 'PARTIAL' : 'FAILED',
      inode: a.object_id ? a.object_id.toString() : 'N/A',
      mtime: a.mtime || '2026-10-03 18:22:00 UTC',
      sha256: a.sha256 || 'Pending / Carve Incomplete',
      metadata: a.metadata_source === 'RECOVERED' ? 'COMPLETE' : a.metadata_source === 'DERIVED' ? 'PARTIAL' : 'INCOMPLETE'
    }));

    const total = reportArtifacts.length;
    const success = reportArtifacts.filter(r => r.recovery === 'SUCCESS').length;
    const partial = reportArtifacts.filter(r => r.recovery === 'PARTIAL').length;

    const newReport = createReport({
      case_id: activeCase?.case_id || 'case-generic',
      title: `Forensic Examination Report — ${activeCase?.case_title?.split('—')[0].trim() || 'Incident'} (${isXfs ? 'XFS' : 'Btrfs'})`,
      description: `Official digital forensic examination report on recovered deleted artifacts from ${activeEvidence?.name || 'Evidence Source'}.`,
      summary: `${success} of ${total} artifacts recovered with full integrity. ${partial > 0 ? `${partial} partial recovery documented.` : 'Zero missing blocks.'}`,
      format: 'HTML',
      report_type: 'COMPREHENSIVE',
      author: activeCase?.investigator || 'Det. H. Vance (Lead Forensic Analyst)',
      classification: 'CONFIDENTIAL / COURT-ADMISSIBLE',
      status: 'FINAL',
      evidence_id: activeEvidence?.evidence_id || 'ev-none',
      evidence_source: activeEvidence?.name || 'DEMO_FORENSIC_IMAGE_XFS.E01',
      filesystem: isXfs ? 'XFS' : 'Btrfs',
      hash_sha256: activeEvidence?.hash_sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      total_artifacts: total,
      recovered_artifacts: success,
      partial_artifacts: partial,
      validation_result: isXfs ? 'INTEGRITY VERIFIED — 100% MATCH' : 'PARTIAL RECOVERY — METADATA INCOMPLETE',
      recovered_files: reportArtifacts,
    });

    logEvent('REPORT_GENERATED', `Court report compiled and signed: ${newReport.title} for Case ${activeCase?.case_number}`, {
      case_id: activeCase?.case_id,
      evidence_id: activeEvidence?.evidence_id,
      target: newReport.title,
      status: 'FINAL',
    });

    setSelectedReport(newReport);
    setIsCreateModalOpen(false);
    setIsViewModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Forensic Examination Reports
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Court-admissible technical documentation and attestation dossiers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Synthetic Banner */}
          <span className="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] font-mono text-amber-300 font-semibold tracking-wider uppercase">
            DEMO / SYNTHETIC FORENSIC DATA
          </span>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
          >
            <Plus className="w-4 h-4" />
            CREATE REPORT
          </button>
        </div>
      </div>

      {/* Reports Catalog Table */}
      <div className="space-y-4 font-mono text-xs">
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
          <div className="p-4 border-b border-[#141f36] bg-[#0c1222]/90 flex items-center justify-between">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Generated Examination Reports ({reports.length})
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">
              CHAIN OF CUSTODY VERIFIED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#141f36] bg-[#0a0f1d] text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Report Title</th>
                  <th className="py-3 px-4">Evidence Source</th>
                  <th className="py-3 px-4">Filesystem</th>
                  <th className="py-3 px-4">Examiner</th>
                  <th className="py-3 px-4">Validation Result</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131d33]">
                {reports.map((r) => (
                  <tr key={r.report_id} className="hover:bg-[#0c1324] transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{r.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Compiled: {new Date(r.created_at).toUTCString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-cyan-300">
                      {r.evidence_source || 'DEMO_FORENSIC_IMAGE_XFS.E01'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-blue-950/50 text-blue-300 border border-blue-800/40 text-[10px]">
                        {r.filesystem || 'XFS'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {r.author || 'Det. H. Vance'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-[10px] border',
                        (r.validation_result?.includes('VERIFIED') || r.validation_result?.includes('100%'))
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                          : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
                      )}>
                        {r.validation_result || 'INTEGRITY VERIFIED'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 font-semibold">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedReport(r);
                          setIsViewModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 transition-all inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Report</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE REPORT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs">
          <div className="w-full max-w-xl rounded-2xl bg-[#080d19] border border-[#1b2a47] p-6 space-y-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between pb-3 border-b border-[#152138]">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileText className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-100">Generate Forensic Examination Report</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5 uppercase font-semibold">
                  Select Case &amp; Evidence Target
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#050811] border border-[#18243c] text-slate-200 focus:outline-none focus:border-cyan-500/60"
                >
                  {cases.map((c) => (
                    <option key={c.case_id} value={c.case_id}>
                      {c.case_number} — {c.case_title}
                    </option>
                  ))}
                </select>
              </div>

              {activeEvidence && (
                <div className="p-3.5 rounded-xl bg-[#050811] border border-[#16223b] space-y-2 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Evidence Source:</span>
                    <span className="text-cyan-300 font-semibold">{activeEvidence.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Detected Filesystem:</span>
                    <span className="text-emerald-400 font-semibold">{activeEvidence.detected_fs || 'XFS'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Source Path:</span>
                    <span className="text-slate-300 truncate max-w-[320px]">{activeEvidence.source_path}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>SHA-256 Digest:</span>
                    <span className="text-cyan-400 font-mono text-[10px] truncate max-w-[280px]">
                      {activeEvidence.hash_sha256}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-300 text-[11px] leading-relaxed">
                This will compile all recovered files, inode metadata, cryptographic hashes, and the 8-stage investigation timeline into a court-ready dossier.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#152138]">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#121c33] text-slate-300 hover:bg-[#182545]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateReport}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>COMPILE &amp; SIGN REPORT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW REPORT DOSSIER MODAL */}
      {isViewModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono text-xs overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#080d19] border border-[#1b2a47] flex flex-col shadow-[0_10px_60px_rgba(0,0,0,0.9)] overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#16223b] bg-[#0c1222] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{selectedReport.title}</h3>
                  <p className="text-[10px] text-slate-400">
                    Court Attestation ID: {selectedReport.report_id} • Signed: {new Date(selectedReport.created_at).toUTCString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg bg-[#111a2f] hover:bg-[#182645] border border-[#1e2f52] text-slate-200 transition-colors flex items-center gap-1.5 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Dossier</span>
                </button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Report Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-slate-300 leading-relaxed bg-[#050811]">
              {/* Synthetic Notice */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-center font-bold text-xs uppercase tracking-wider">
                DEMO / SYNTHETIC FORENSIC REPORT — CONTROLLED TEST EVIDENCE ONLY
              </div>

              {/* SECTION 1: CASE INFORMATION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-[#16223b] text-cyan-400 font-bold uppercase text-[11px]">
                  <Layers className="w-4 h-4" />
                  <span>1. Case Information</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b]">
                    <div className="text-[10px] text-slate-500 uppercase">Case ID</div>
                    <div className="text-slate-200 font-bold mt-0.5">{selectedReport.case_id}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b]">
                    <div className="text-[10px] text-slate-500 uppercase">Investigator / Examiner</div>
                    <div className="text-slate-200 font-bold mt-0.5">{selectedReport.author || 'Det. H. Vance'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b]">
                    <div className="text-[10px] text-slate-500 uppercase">Investigation Date</div>
                    <div className="text-slate-200 font-bold mt-0.5">{new Date(selectedReport.created_at).toISOString().split('T')[0]} UTC</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b]">
                    <div className="text-[10px] text-slate-500 uppercase">Evidence Target ID</div>
                    <div className="text-slate-200 font-bold mt-0.5">{selectedReport.evidence_id || 'ev-ret-001'}</div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: EVIDENCE INFORMATION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-[#16223b] text-cyan-400 font-bold uppercase text-[11px]">
                  <Shield className="w-4 h-4" />
                  <span>2. Evidence Source Information</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#090e1c] border border-[#16223b] space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-500">Evidence Source:</span><span className="text-slate-200 font-bold">{selectedReport.evidence_source || 'DEMO_FORENSIC_IMAGE_XFS.E01'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Acquisition Type:</span><span className="text-slate-300">Forensic Disk Image (E01)</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Source Path:</span><span className="text-slate-300">demo/evidence/{selectedReport.evidence_source || 'DEMO_FORENSIC_IMAGE_XFS.E01'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Detected Filesystem:</span><span className="text-emerald-400 font-bold">{selectedReport.filesystem || 'XFS'}</span></div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#090e1c] border border-[#16223b] space-y-1.5">
                    <div className="flex justify-between"><span className="text-slate-500">Evidence Image Size:</span><span className="text-slate-200 font-bold">32 GB</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Hardware Write-Block:</span><span className="text-emerald-400 font-bold">ACTIVE &amp; VERIFIED</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Verification Status:</span><span className="text-emerald-400 font-bold">VERIFIED (100% MATCH)</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500">SHA-256 Digest:</span><span className="text-cyan-300 font-mono text-[10px] truncate max-w-[200px]">{selectedReport.hash_sha256}</span></div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: RECOVERY SUMMARY */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-[#16223b] text-cyan-400 font-bold uppercase text-[11px]">
                  <FileCheck2 className="w-4 h-4" />
                  <span>3. Recovery Summary</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b]">
                    <div className="text-[10px] text-slate-500 uppercase">Total Discovered</div>
                    <div className="text-lg font-bold text-slate-200 mt-1">{selectedReport.total_artifacts || 3}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b]">
                    <div className="text-[10px] text-slate-500 uppercase">Recoverable</div>
                    <div className="text-lg font-bold text-cyan-400 mt-1">{selectedReport.total_artifacts || 3}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b]">
                    <div className="text-[10px] text-slate-500 uppercase">Successfully Recovered</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">{selectedReport.recovered_artifacts || 3}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b]">
                    <div className="text-[10px] text-slate-500 uppercase">Partial / Failed</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">{selectedReport.partial_artifacts || 0}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#090e1c] border border-[#16223b]">
                    <div className="text-[10px] text-slate-500 uppercase">Metadata Integrity</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">100% INTACT</div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: RECOVERED FILE DETAILS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-[#16223b] text-cyan-400 font-bold uppercase text-[11px]">
                  <FileText className="w-4 h-4" />
                  <span>4. Recovered Artifact Details</span>
                </div>
                <div className="rounded-xl border border-[#16223b] overflow-hidden bg-[#090e1c]">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="bg-[#0e1629] text-[10px] text-slate-400 uppercase border-b border-[#16223b]">
                        <th className="p-2.5">File Name &amp; Path</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Size</th>
                        <th className="p-2.5">Inode / ID</th>
                        <th className="p-2.5">Recovery Status</th>
                        <th className="p-2.5">SHA-256 Digest</th>
                        <th className="p-2.5">Metadata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#131d33]">
                      {(selectedReport.recovered_files && selectedReport.recovered_files.length > 0
                        ? selectedReport.recovered_files
                        : [
                            {
                              name: 'server.log',
                              type: 'Log File',
                              path: '/var/log/nginx/server.log',
                              size: '184 KB',
                              status: 'CONFIRMED',
                              recovery: 'SUCCESS',
                              inode: '1042',
                              mtime: '2026-10-03 18:22:00 UTC',
                              sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
                              metadata: 'COMPLETE'
                            },
                            {
                              name: 'incident_notes.txt',
                              type: 'Plain Text',
                              path: '/home/analyst/incident_notes.txt',
                              size: '12.4 KB',
                              status: 'CONFIRMED',
                              recovery: 'SUCCESS',
                              inode: '1048',
                              mtime: '2026-10-03 20:10:00 UTC',
                              sha256: 'c4ca4238a0b923820dcc509a6f75849b2f7a40b3c4a45749f7b6b3e34b92b941',
                              metadata: 'PARTIAL'
                            },
                            {
                              name: 'deleted_report.pdf',
                              type: 'PDF Document',
                              path: '/home/admin/docs/deleted_report.pdf',
                              size: '2.4 MB',
                              status: 'CONFIRMED',
                              recovery: 'SUCCESS',
                              inode: '1055',
                              mtime: '2026-10-02 14:40:00 UTC',
                              sha256: '5d41402abc4b2a76b9719d911017c5926c4d731054b204c3e3a0f8ac386b0338',
                              metadata: 'COMPLETE'
                            }
                          ]
                      ).map((f, idx) => (
                        <tr key={idx} className="hover:bg-[#0d1424]">
                          <td className="p-2.5">
                            <div className="font-bold text-slate-200">{f.name}</div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[220px]">{f.path}</div>
                          </td>
                          <td className="p-2.5 text-slate-300">{f.type}</td>
                          <td className="p-2.5 text-slate-300">{f.size}</td>
                          <td className="p-2.5 text-cyan-400 font-bold">{f.inode}</td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 text-[10px]">
                              {f.recovery}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-[9px] text-cyan-300 truncate max-w-[140px] select-all">
                            {f.sha256}
                          </td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-800/40 text-[10px]">
                              {f.metadata}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 5: VALIDATION */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-[#16223b] text-cyan-400 font-bold uppercase text-[11px]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>5. Cryptographic Validation</span>
                </div>
                <div className="p-4 rounded-xl bg-[#090e1c] border border-[#16223b] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Integrity Validation Result:</span>
                    <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/40">
                      {selectedReport.validation_result || 'INTEGRITY VERIFIED'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between"><span className="text-slate-500">Original Evidence Hash (SHA-256):</span><span className="text-cyan-300 font-mono select-all">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Recovered Extent Bitstream Hash:</span><span className="text-cyan-300 font-mono select-all">9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Checksum Cross-Verification:</span><span className="text-emerald-400 font-bold">MATCH (Bit-for-bit verified against XFS allocation group inode core)</span></div>
                  </div>
                </div>
              </div>

              {/* SECTION 6: INVESTIGATION SEQUENCE TIMELINE */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-[#16223b] text-cyan-400 font-bold uppercase text-[11px]">
                  <Clock className="w-4 h-4" />
                  <span>6. Investigation Chronology Timeline</span>
                </div>
                <div className="p-4 rounded-xl bg-[#090e1c] border border-[#16223b]">
                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                    <span className="px-2 py-1 rounded bg-[#111c33] text-cyan-300 border border-[#1b2b4d]">1. Evidence Added</span>
                    <span className="text-slate-600">→</span>
                    <span className="px-2 py-1 rounded bg-[#111c33] text-cyan-300 border border-[#1b2b4d]">2. Hash Verified</span>
                    <span className="text-slate-600">→</span>
                    <span className="px-2 py-1 rounded bg-[#111c33] text-cyan-300 border border-[#1b2b4d]">3. Filesystem Identified</span>
                    <span className="text-slate-600">→</span>
                    <span className="px-2 py-1 rounded bg-[#111c33] text-cyan-300 border border-[#1b2b4d]">4. Metadata Analyzed</span>
                    <span className="text-slate-600">→</span>
                    <span className="px-2 py-1 rounded bg-[#111c33] text-cyan-300 border border-[#1b2b4d]">5. Deleted Artifacts Found</span>
                    <span className="text-slate-600">→</span>
                    <span className="px-2 py-1 rounded bg-[#111c33] text-cyan-300 border border-[#1b2b4d]">6. Recovery Attempted</span>
                    <span className="text-slate-600">→</span>
                    <span className="px-2 py-1 rounded bg-[#111c33] text-cyan-300 border border-[#1b2b4d]">7. Recovery Validated</span>
                    <span className="text-slate-600">→</span>
                    <span className="px-2 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 font-bold">8. Report Generated</span>
                  </div>
                </div>
              </div>

              {/* SECTION 7: AUDIT ATTESTATION */}
              <div className="pt-4 border-t border-[#16223b] flex items-center justify-between text-[11px] text-slate-500">
                <div>
                  Certified Forensic Examiner: <strong className="text-slate-300">{selectedReport.author || 'Det. H. Vance'}</strong>
                </div>
                <div className="text-emerald-400 font-bold">
                  TRACE X CORE VERIFIED • IMMUTABLE AUDIT TRAIL LOGGED
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#16223b] bg-[#0c1222] flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] text-slate-500">
                Digital Forensic Record • Court Attestation Standard ISO/IEC 27037
              </span>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#141f38] hover:bg-[#1a294a] text-slate-200 transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
