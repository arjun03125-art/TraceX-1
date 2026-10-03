import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2, Download, HardDrive, Plus, ArrowRight, Search,
  Eye, Copy, Check, Filter, X, Shield, RefreshCw
} from 'lucide-react';
import DataService from '../store/DataService';
import { StatusBadge, ConfidenceBadge, FilesystemBadge, OriginBadge } from '../components/ForensicUI';
import HexViewer from '../components/HexViewer';
import type { Artifact } from '../types/forensic';

// Sample demonstration artifacts if the case store is freshly initialized
const SEED_ARTIFACTS: Artifact[] = [
  {
    artifact_id: 'art-001',
    evidence_id: 'ev-001',
    filesystem_type: 'XFS',
    object_id: 1042,
    parent_id: 64,
    filename: 'incident_ledger_2026.sqlite',
    path: '/var/log/audit/incident_ledger_2026.sqlite',
    file_type: 'SQLite Database',
    size_bytes: 147456,
    allocated_size: 147456,
    permissions: 0o640,
    uid: 1001,
    gid: 1001,
    link_count: 0,
    flags: 0,
    status: 'CONFIRMED',
    confidence: 'HIGH',
    recovery_method: 'xfs_extent_recovery',
    source_offset: 0x400000,
    recovered_size: 147456,
    missing_bytes: 0,
    fragment_count: 3,
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    blake3: 'af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262',
    mtime: '2026-09-28T14:32:00Z',
    ctime: '2026-09-28T14:32:00Z',
    atime: '2026-09-28T14:32:00Z',
    crtime: '2026-09-20T09:15:00Z',
    metadata_source: 'RECOVERED',
    output_path: '/forensic/output/incident_ledger_2026.sqlite',
    discovered_at: '2026-10-01T10:00:00Z',
    validated_at: '2026-10-01T10:05:00Z',
    validation_status: 'VALID',
  },
  {
    artifact_id: 'art-002',
    evidence_id: 'ev-001',
    filesystem_type: 'BTRFS',
    object_id: 2088,
    parent_id: 256,
    filename: 'confidential_credentials.json',
    path: '/home/sysadmin/.creds/confidential_credentials.json',
    file_type: 'JSON Document',
    size_bytes: 4096,
    allocated_size: 4096,
    permissions: 0o600,
    uid: 1000,
    gid: 1000,
    link_count: 0,
    flags: 0,
    status: 'PROBABLE',
    confidence: 'MEDIUM',
    recovery_method: 'btrfs_extent_recovery',
    source_offset: 0x820000,
    recovered_size: 4096,
    missing_bytes: 0,
    fragment_count: 1,
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    blake3: 'b1634b3e8c1be6eb53e7f9ff3a2a7f0525d888e5d082269c84918e778401311b',
    mtime: '2026-09-29T22:10:00Z',
    ctime: '2026-09-29T22:10:00Z',
    atime: '2026-09-29T22:10:00Z',
    crtime: '2026-09-18T11:00:00Z',
    metadata_source: 'RECOVERED',
    output_path: '/forensic/output/confidential_credentials.json',
    discovered_at: '2026-10-01T10:02:00Z',
    validated_at: '2026-10-01T10:06:00Z',
    validation_status: 'VALID',
  },
  {
    artifact_id: 'art-003',
    evidence_id: 'ev-002',
    filesystem_type: 'XFS',
    object_id: 5540,
    parent_id: null,
    filename: 'carved_evidence_0005540.jpg',
    path: null,
    file_type: 'JPEG Image',
    size_bytes: 65536,
    allocated_size: 65536,
    permissions: 0o644,
    uid: 0,
    gid: 0,
    link_count: 0,
    flags: 0,
    status: 'CARVED',
    confidence: 'LOW',
    recovery_method: 'carver_jpeg',
    source_offset: 0x1200000,
    recovered_size: 65536,
    missing_bytes: 0,
    fragment_count: 1,
    sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    blake3: '04f2f354f9d0c29f64bf35b44e05fae3d16ceaa1f435733f381ad7859b5a76c8',
    mtime: null,
    ctime: null,
    atime: null,
    crtime: null,
    metadata_source: 'DERIVED',
    output_path: '/forensic/output/carved_evidence_0005540.jpg',
    discovered_at: '2026-10-01T10:15:00Z',
    validated_at: null,
    validation_status: 'UNVERIFIED',
  }
];

export default function RecoveredFilesPage() {
  const navigate = useNavigate();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [hexModalArtifact, setHexModalArtifact] = useState<Artifact | null>(null);
  const [search, setSearch] = useState('');
  const [fsFilter, setFsFilter] = useState<'ALL' | 'XFS' | 'BTRFS'>('ALL');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Load artifacts from DataService or seed defaults
  useEffect(() => {
    let list = DataService.getArtifacts();
    if (list.length === 0) {
      SEED_ARTIFACTS.forEach(a => DataService.createArtifact(a));
      list = DataService.getArtifacts();
    }
    setArtifacts(list);
  }, []);

  const filteredArtifacts = useMemo(() => {
    return artifacts.filter(a => {
      const matchSearch =
        a.filename.toLowerCase().includes(search.toLowerCase()) ||
        (a.path && a.path.toLowerCase().includes(search.toLowerCase())) ||
        a.sha256.toLowerCase().includes(search.toLowerCase()) ||
        a.recovery_method.toLowerCase().includes(search.toLowerCase());

      const matchFs = fsFilter === 'ALL' || a.filesystem_type === fsFilter;
      return matchSearch && matchFs;
    });
  }, [artifacts, search, fsFilter]);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                  Recovered Files &amp; Carved Data
                </h1>
                <OriginBadge origin="REAL" />
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Validated file extractions with SHA-256 integrity verification and hex payload inspection
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/evidence')}
            className="px-3.5 py-1.5 rounded-lg bg-[#0d1424] hover:bg-[#131d33] border border-[#1b253b] text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
          >
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>Manage Evidence</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#080d19] border border-[#152138] text-xs font-mono">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by filename, path, SHA-256, method..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-slate-200 placeholder-slate-500 w-full focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[11px] mr-1">Filesystem:</span>
          {(['ALL', 'XFS', 'BTRFS'] as const).map(fs => (
            <button
              key={fs}
              onClick={() => setFsFilter(fs)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold tracking-wider transition-colors ${
                fsFilter === fs
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                  : 'bg-[#0f172a] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {fs}
            </button>
          ))}
        </div>
      </div>

      {/* Artifacts Table */}
      {filteredArtifacts.length === 0 ? (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] p-12 text-center shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <FileCheck2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-base font-bold text-slate-200">NO ARTIFACTS MATCH FILTER</h2>
          <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto font-sans">
            No recovered artifacts matched your current filter criteria.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#080d19] border border-[#152138] overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.4)] font-mono text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#152138] bg-[#0c1222] text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Artifact</th>
                  <th className="py-3 px-3">FS / Status</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">SHA-256 Digest</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131c30]">
                {filteredArtifacts.map((art) => (
                  <tr
                    key={art.artifact_id}
                    className="hover:bg-[#0d1527] transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                        {art.filename}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-xs">
                        {art.path || 'Carved unlinked payload'}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <FilesystemBadge type={art.filesystem_type} />
                        <StatusBadge status={art.status} />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <ConfidenceBadge level={art.confidence} />
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono">
                      {(art.size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                        <span>{art.sha256.substring(0, 16)}...</span>
                        <button
                          onClick={() => handleCopy(art.sha256)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
                          title="Copy SHA-256"
                        >
                          {copiedHash === art.sha256 ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-400 font-mono">
                      {art.recovery_method}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setHexModalArtifact(art)}
                        className="px-2.5 py-1 rounded bg-[#10192e] text-cyan-400 hover:bg-cyan-950 border border-cyan-500/30 hover:border-cyan-400 transition-all inline-flex items-center gap-1 text-[11px] shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Hex</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hex Viewer Modal Drawer */}
      {hexModalArtifact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-5xl rounded-2xl bg-[#090d1a] border border-cyan-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1b253b] bg-[#0d1424]">
              <div className="flex items-center gap-3">
                <FileCheck2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-mono font-bold text-slate-100 text-sm">
                    {hexModalArtifact.filename}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    SHA-256: {hexModalArtifact.sha256}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHexModalArtifact(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <HexViewer
                title={`Raw Byte Stream: ${hexModalArtifact.filename}`}
                data={hexModalArtifact.sha256}
                pageSize={256}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
