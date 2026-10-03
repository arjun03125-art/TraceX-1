import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2, Download, HardDrive, Plus, ArrowRight
} from 'lucide-react';
import { INITIAL_ARTIFACTS } from '../store/forensicStore';
import type { Artifact } from '../types/forensic';

export default function RecoveredFilesPage() {
  const navigate = useNavigate();
  const [artifacts] = useState<Artifact[]>(INITIAL_ARTIFACTS);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Recovered Files &amp; Carved Data
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Validated file extractions with SHA-256 integrity verification
              </p>
            </div>
          </div>
        </div>
      </div>

      {artifacts.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <FileCheck2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200">NO RECOVERED FILES</h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto font-sans">
            No files have been recovered yet. Attach an evidence image and initiate the carving engine to extract deleted files.
          </p>
          <button
            onClick={() => navigate('/admin/evidence')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <HardDrive className="w-4 h-4" />
            VIEW EVIDENCE SOURCES
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-6 font-mono text-xs">
          {/* Table for artifacts if any */}
        </div>
      )}
    </div>
  );
}
