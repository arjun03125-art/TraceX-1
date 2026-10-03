import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Filter, Download, Calendar, Search, Layers, ShieldCheck, ArrowRight, HardDrive } from 'lucide-react';
import { INITIAL_TIMELINE } from '../store/forensicStore';
import type { TimelineEvent } from '../types/forensic';

export default function TimelinePage() {
  const navigate = useNavigate();
  const [events] = useState<TimelineEvent[]>(INITIAL_TIMELINE);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
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
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200">NO TIMELINE EVENTS</h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto font-sans">
            Chronological forensic events will populate automatically as metadata (MACB timestamps) is extracted from evidence inodes.
          </p>
          <button
            onClick={() => navigate('/admin/evidence')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <HardDrive className="w-4 h-4" />
            ATTACH EVIDENCE IMAGE
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-6 font-mono text-xs">
          {/* Timeline events */}
        </div>
      )}
    </div>
  );
}
