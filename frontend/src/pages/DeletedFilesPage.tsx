import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileX2, Search, Filter, HardDrive, Plus, ArrowRight
} from 'lucide-react';
import {
  StatusBadge, ConfidenceBadge, FilesystemBadge, SignalChecklist,
  HashDisplay
} from '../components/ForensicUI';
import { INITIAL_ARTIFACTS } from '../store/forensicStore';
import type { Artifact } from '../types/forensic';

export default function DeletedFilesPage() {
  const navigate = useNavigate();
  const [artifacts] = useState<Artifact[]>(INITIAL_ARTIFACTS);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(artifacts[0] || null);
  const [search, setSearch] = useState('');
  const [fsFilter, setFsFilter] = useState<string>('ALL');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = artifacts.filter((a) => {
    const matchesSearch =
      a.filename.toLowerCase().includes(search.toLowerCase()) ||
      (a.path && a.path.toLowerCase().includes(search.toLowerCase())) ||
      (a.object_id && a.object_id.toString().includes(search));
    const matchesFs = fsFilter === 'ALL' || a.filesystem_type === fsFilter;
    const matchesConf = confidenceFilter === 'ALL' || a.confidence === confidenceFilter;
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesFs && matchesConf && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <FileX2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                Deleted Inodes &amp; Extent Reconstruction
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                XFS unlinked inode cores, Btrfs historical chunk trees &amp; free extent carve candidates
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#0a101f] border border-[#1b2742] text-xs font-mono text-slate-400">
            Catalog: <strong className="text-cyan-300 font-semibold">{filtered.length}</strong> Inodes
          </div>
        </div>
      </div>

      {artifacts.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <FileX2 className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200">NO DELETED INODES DETECTED</h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto font-sans">
            No filesystem remnants have been parsed yet. Attach an evidence image and run inode recovery to extract unlinked file records.
          </p>
          <button
            onClick={() => navigate('/admin/evidence')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <HardDrive className="w-4 h-4" />
            ADD EVIDENCE SOURCE
          </button>
        </div>
      ) : (
        <>
          {/* Filter Toolbar */}
          <div className="rounded-xl bg-[#080d19] border border-[#152138] p-3.5 flex flex-wrap items-center gap-3 shadow-inner">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search filename, absolute path, inode #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#050811] border border-[#19253d] rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.4)]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#060a14] border-b border-[#141f36] text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Inode ID</th>
                  <th className="p-3">Filename &amp; Path</th>
                  <th className="p-3">FS</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#121c33]/70">
                {filtered.map(art => (
                  <tr key={art.artifact_id} className="hover:bg-[#0c1426]">
                    <td className="p-3 text-cyan-400">#{art.object_id}</td>
                    <td className="p-3 text-slate-200">{art.filename}</td>
                    <td className="p-3">{art.filesystem_type}</td>
                    <td className="p-3">{art.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
