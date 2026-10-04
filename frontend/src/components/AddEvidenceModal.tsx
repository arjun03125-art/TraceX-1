import React, { useState } from 'react';
import {
  HardDrive, X, Shield, Lock, CheckCircle2, FileSearch,
  Sparkles, AlertCircle, Info, Database, Hash
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { EvidenceFormat, FilesystemType } from '../types/forensic';
import clsx from 'clsx';

interface AddEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCaseId?: string;
  onSuccess?: (evidenceId: string) => void;
}

export default function AddEvidenceModal({
  isOpen,
  onClose,
  targetCaseId,
  onSuccess,
}: AddEvidenceModalProps) {
  const { cases, activeCaseId, createEvidence } = useApp();

  const caseIdToUse = targetCaseId || activeCaseId || (cases.length > 0 ? cases[0].case_id : '');

  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseIdToUse);
  const [evidenceName, setEvidenceName] = useState('Ransomware_XFS_Disk01');
  const [evidenceType, setEvidenceType] = useState('Forensic Disk Image');
  const [format, setFormat] = useState<EvidenceFormat>('E01');
  const [sourcePath, setSourcePath] = useState('/demo/evidence/DEMO_FORENSIC_IMAGE_XFS.E01');
  const [acquisitionMethod, setAcquisitionMethod] = useState('Bit-by-bit physical forensic imaging (Write-Block Hardware)');
  const [filesystem, setFilesystem] = useState<'XFS' | 'BTRFS'>('XFS');
  const [hashAlgorithm, setHashAlgorithm] = useState('SHA-256');
  const [hashSha256, setHashSha256] = useState('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  const [description, setDescription] = useState('Seized primary database partition containing XFS volume with unlinked inodes');
  const [isWriteProtected, setIsWriteProtected] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyTemplate = (type: 'xfs' | 'btrfs' | 'xfs_fixture' | 'btrfs_fixture') => {
    if (type === 'xfs') {
      setEvidenceName('Ransomware_XFS_Disk01');
      setEvidenceType('Forensic Disk Image');
      setFormat('E01');
      setSourcePath('/demo/evidence/DEMO_FORENSIC_IMAGE_XFS.E01');
      setAcquisitionMethod('Bit-by-bit physical forensic imaging (Write-Block Hardware)');
      setFilesystem('XFS');
      setHashSha256('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      setDescription('Seized server volume containing XFS unlinked inode cores for extent reconstruction');
    } else if (type === 'btrfs') {
      setEvidenceName('Vault_Btrfs_Image02');
      setEvidenceType('Forensic Disk Image');
      setFormat('E01');
      setSourcePath('/demo/evidence/DEMO_FORENSIC_IMAGE_BTRFS.E01');
      setAcquisitionMethod('Bit-by-bit physical forensic imaging (Write-Block Hardware)');
      setFilesystem('BTRFS');
      setHashSha256('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
      setDescription('Btrfs chunk tree snapshot with damaged generations and fragmented deleted extents');
    } else if (type === 'xfs_fixture') {
      setEvidenceName('xfs_deleted_demo.img');
      setEvidenceType('Local Raw Image Fixture');
      setFormat('RAW');
      setSourcePath('fixtures/xfs_deleted_demo.img');
      setAcquisitionMethod('Raw disk image acquisition from local repository fixture');
      setFilesystem('XFS');
      setHashSha256('e0712dbd69c8716ce14da9ca374d925c592785ae2de2158e68e9aa32bacabf06');
      setDescription('Local fixture disk image with XFS allocation groups and deleted files');
    } else if (type === 'btrfs_fixture') {
      setEvidenceName('btrfs_deleted_demo.img');
      setEvidenceType('Local Raw Image Fixture');
      setFormat('RAW');
      setSourcePath('fixtures/btrfs_deleted_demo.img');
      setAcquisitionMethod('Raw disk image acquisition from local repository fixture');
      setFilesystem('BTRFS');
      setHashSha256('c2fc33a99d39045fb8f2dd0d7e7980faf54e045c92f703996237eca4ee3aba0f');
      setDescription('Local fixture disk image with Btrfs chunk tree and leaf fragments');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceName.trim()) {
      setError('Evidence name is required.');
      return;
    }
    if (!selectedCaseId) {
      setError('Please select a target case for this evidence.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const isXfs = filesystem === 'XFS';
      const created = createEvidence({
        case_id: selectedCaseId,
        name: evidenceName.trim(),
        source_path: sourcePath.trim(),
        source_type: 'RAW_IMAGE',
        format,
        status: 'READY',
        detected_fs: filesystem,
        filesystem_type: filesystem as FilesystemType,
        hash_sha256: hashSha256.trim(),
        hash_algorithm: hashAlgorithm,
        acquisition_method: acquisitionMethod,
        size_bytes: isXfs ? 34359738368 : 17179869184, // 32 GB or 16 GB
        description: description.trim(),
        read_only_verified: isWriteProtected,
        added_by: 'Det. H. Vance',
      });

      setIsSubmitting(false);
      onClose();
      if (onSuccess) {
        onSuccess(created.evidence_id);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Failed to ingest evidence.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#090e1c] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden font-mono text-xs my-8">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#141f36] bg-[#0c1426] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Ingest Forensic Evidence Image
              </h2>
              <p className="text-[11px] text-slate-400">
                Bit-by-bit forensic image mounting &amp; chain of custody registration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#111c33] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Synthetic Data Disclaimer Banner */}
        <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-[11px] text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>DEMO / SYNTHETIC FORENSIC DATA:</strong> Ingested images are simulated bitstream files or local fixtures for reproducible verification.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-900/50 border border-amber-600/40 text-[9px] font-bold uppercase tracking-wider">
            DEMO MODE
          </span>
        </div>

        {/* Quick Preset Selector */}
        <div className="px-5 pt-4">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Quick Ingest Templates:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleApplyTemplate('xfs')}
              className={clsx(
                'p-2 rounded-lg border text-left transition-colors text-[10px]',
                filesystem === 'XFS' && sourcePath.includes('DEMO')
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                  : 'bg-[#0f172a] border-slate-800 text-slate-400 hover:border-slate-700'
              )}
            >
              <div className="font-bold text-slate-200">XFS Demo (32 GB)</div>
              <div className="text-[9px] text-slate-500 truncate">E01 Disk Image</div>
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('btrfs')}
              className={clsx(
                'p-2 rounded-lg border text-left transition-colors text-[10px]',
                filesystem === 'BTRFS' && sourcePath.includes('DEMO')
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                  : 'bg-[#0f172a] border-slate-800 text-slate-400 hover:border-slate-700'
              )}
            >
              <div className="font-bold text-slate-200">Btrfs Demo (16 GB)</div>
              <div className="text-[9px] text-slate-500 truncate">E01 Disk Image</div>
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('xfs_fixture')}
              className={clsx(
                'p-2 rounded-lg border text-left transition-colors text-[10px]',
                sourcePath.includes('fixtures/xfs')
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                  : 'bg-[#0f172a] border-slate-800 text-slate-400 hover:border-slate-700'
              )}
            >
              <div className="font-bold text-slate-200">XFS Fixture (.img)</div>
              <div className="text-[9px] text-slate-500 truncate">Real Local File</div>
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate('btrfs_fixture')}
              className={clsx(
                'p-2 rounded-lg border text-left transition-colors text-[10px]',
                sourcePath.includes('fixtures/btrfs')
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                  : 'bg-[#0f172a] border-slate-800 text-slate-400 hover:border-slate-700'
              )}
            >
              <div className="font-bold text-slate-200">Btrfs Fixture (.img)</div>
              <div className="text-[9px] text-slate-500 truncate">Real Local File</div>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Case */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                Attach to Case <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedCaseId}
                onChange={e => setSelectedCaseId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500/60"
              >
                {cases.map(c => (
                  <option key={c.case_id} value={c.case_id}>
                    {c.case_number} — {c.case_title}
                  </option>
                ))}
              </select>
            </div>

            {/* Evidence Name */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                Evidence Name / Label <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={evidenceName}
                onChange={e => setEvidenceName(e.target.value)}
                placeholder="e.g. Ransomware_XFS_Disk01"
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500/60"
                required
              />
            </div>

            {/* Evidence Type */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                Evidence Type
              </label>
              <select
                value={evidenceType}
                onChange={e => setEvidenceType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500/60"
              >
                <option value="Forensic Disk Image">Forensic Disk Image (Bit-by-bit)</option>
                <option value="Physical Drive Mount">Physical Drive / Block Device</option>
                <option value="Logical Volume Image">Logical Volume Image</option>
                <option value="Local Raw Image Fixture">Local Raw Image Fixture</option>
                <option value="Memory Dump">Volatile Memory Dump</option>
              </select>
            </div>

            {/* Filesystem */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                Target Filesystem
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFilesystem('XFS')}
                  className={clsx(
                    'py-2 px-3 rounded-lg border text-center font-bold text-xs transition-colors',
                    filesystem === 'XFS'
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                      : 'bg-[#0d1527] border-[#1b2a47] text-slate-400'
                  )}
                >
                  XFS (v5 Inodes)
                </button>
                <button
                  type="button"
                  onClick={() => setFilesystem('BTRFS')}
                  className={clsx(
                    'py-2 px-3 rounded-lg border text-center font-bold text-xs transition-colors',
                    filesystem === 'BTRFS'
                      ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                      : 'bg-[#0d1527] border-[#1b2a47] text-slate-400'
                  )}
                >
                  Btrfs (Chunk Tree)
                </button>
              </div>
            </div>

            {/* Source Path */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                Image Source Path
              </label>
              <input
                type="text"
                value={sourcePath}
                onChange={e => setSourcePath(e.target.value)}
                placeholder="/demo/evidence/DEMO_FORENSIC_IMAGE_XFS.E01"
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            {/* Acquisition Method */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                Acquisition Method (Chain of Custody)
              </label>
              <input
                type="text"
                value={acquisitionMethod}
                onChange={e => setAcquisitionMethod(e.target.value)}
                placeholder="Bit-by-bit physical forensic imaging (Write-Block Hardware)"
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            {/* Hash Algorithm & Digest */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                Hash Algorithm
              </label>
              <select
                value={hashAlgorithm}
                onChange={e => setHashAlgorithm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500/60"
              >
                <option value="SHA-256">SHA-256 (Court Standard)</option>
                <option value="Blake3">Blake3 (High Speed)</option>
                <option value="MD5">MD5 (Legacy Compatibility)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                Cryptographic Ingest Digest
              </label>
              <input
                type="text"
                value={hashSha256}
                onChange={e => setHashSha256(e.target.value)}
                placeholder="64-character SHA-256 hex string"
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-cyan-300 font-mono text-[11px] focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                Evidence Notes / Custody Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Details of seizure, write-block hardware device, and imaging environment"
                className="w-full px-3 py-2 rounded-lg bg-[#0d1527] border border-[#1b2a47] text-slate-200 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>

          {/* Write-Block Protection Checkbox */}
          <div className="p-3 rounded-xl bg-[#0d1527] border border-[#1b2a47] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-slate-200 text-xs">
                  Enforce Hardware &amp; Loopback Write-Block
                </div>
                <div className="text-[10px] text-slate-500">
                  Read-only bitstream mount: prevents any write mutation to evidence disk image
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isWriteProtected}
              onChange={e => setIsWriteProtected(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-[#070b16] border-[#1f2e4d]"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#141f36]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-[#152342] text-slate-300 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)] disabled:opacity-50"
            >
              <HardDrive className="w-4 h-4" />
              <span>{isSubmitting ? 'Mounting Evidence...' : 'INGEST & ATTACH EVIDENCE'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
