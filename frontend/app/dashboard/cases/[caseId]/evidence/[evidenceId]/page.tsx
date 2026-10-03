'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Hash,
  HardDrive,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  Clock,
  Shield,
  Copy,
} from 'lucide-react';

export default function EvidenceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.caseId as string;
  const evidenceId = params.evidenceId as string;

  const [evidence, setEvidence] = useState<any>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const [caseRes, evidenceRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases/${caseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases/${caseId}/evidence/${evidenceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (caseRes.ok) {
        setCaseData(await caseRes.json());
      }
      if (evidenceRes.ok) {
        setEvidence(await evidenceRes.json());
      } else if (evidenceRes.status === 404) {
        router.push(`/dashboard/cases/${caseId}`);
      }
    } catch (err) {
      console.error('Failed to fetch evidence:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!evidence) return;
    setVerifying(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases/${caseId}/evidence/${evidenceId}/verify`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        setError(data.detail?.message || 'Verification failed');
      }
    } catch (err) {
      setError('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleDetectFilesystem = async () => {
    if (!evidence) return;
    setDetecting(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases/${caseId}/evidence/${evidenceId}/detect-filesystem`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        setError(data.detail?.message || 'Filesystem detection failed');
      }
    } catch (err) {
      setError('Filesystem detection failed');
    } finally {
      setDetecting(false);
    }
  };

  const copyHash = () => {
    if (evidence) {
      navigator.clipboard.writeText(evidence.sha256_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getIntegrityStatus = () => {
    if (!evidence) return { label: 'Unknown', icon: Hash, className: 'text-gray-600' };
    if (evidence.status === 'verified') return { label: 'Verified', icon: CheckCircle, className: 'text-green-600' };
    if (evidence.status === 'error') return { label: 'Failed', icon: XCircle, className: 'text-red-600' };
    if (evidence.status === 'imported') return { label: 'Pending Verification', icon: Hash, className: 'text-gray-600' };
    return { label: evidence.status, icon: Hash, className: 'text-gray-600' };
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      imported: 'bg-gray-100 text-gray-700',
      verified: 'bg-green-100 text-green-700',
      processing: 'bg-blue-100 text-blue-700',
      processed: 'bg-forensic-100 text-forensic-700',
      error: 'bg-red-100 text-red-700',
      archived: 'bg-gray-100 text-gray-700',
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  const getFilesystemBadge = (fs: string) => {
    const badges: Record<string, string> = {
      unknown: 'bg-gray-100 text-gray-700',
      xfs: 'bg-blue-100 text-blue-700',
      btrfs: 'bg-green-100 text-green-700',
      ext4: 'bg-yellow-100 text-yellow-700',
      ntfs: 'bg-purple-100 text-purple-700',
      fat32: 'bg-orange-100 text-orange-700',
    };
    return badges[fs] || 'bg-gray-100 text-gray-700';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-forensic-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forensic-700"></div>
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="min-h-screen bg-forensic-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-forensic-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-forensic-700 mb-2">Evidence not found</h2>
          <Link href={`/dashboard/cases/${caseId}`} className="text-forensic-600 hover:text-forensic-900">
            ← Back to case
          </Link>
        </div>
      </div>
    );
  }

  const integrity = getIntegrityStatus();
  const IntegrityIcon = integrity.icon;

  return (
    <div className="min-h-screen bg-forensic-50">
      {/* Header */}
      <header className="bg-white border-b border-forensic-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href={`/dashboard/cases/${caseId}`} className="flex items-center gap-2 text-forensic-600 hover:text-forensic-900">
                <ArrowLeft className="w-5 h-5" />
                <span>{caseData?.case_number || 'Case'}</span>
              </Link>
              <Link href={`/dashboard/cases/${caseId}`} className="flex items-center gap-2">
                <svg className="w-8 h-8 text-forensic-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xl font-bold text-forensic-900">{evidence.evidence_number}</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Info Card */}
            <div className="bg-white rounded-xl border border-forensic-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-forensic-900">File Information</h2>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(evidence.status)}`}>
                    {evidence.status}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getFilesystemBadge(evidence.filesystem_type)}`}>
                    {evidence.filesystem_type.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-forensic-500 uppercase mb-1">Original Filename</label>
                  <p className="text-forensic-900 font-medium">{evidence.original_filename}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-forensic-500 uppercase mb-1">Evidence ID</label>
                  <p className="text-forensic-900 font-mono text-sm">{evidence.evidence_number}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-forensic-500 uppercase mb-1">Size</label>
                  <p className="text-forensic-900 font-mono">{formatBytes(evidence.size_bytes)} ({evidence.size_bytes.toLocaleString()} bytes)</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-forensic-500 uppercase mb-1">MIME Type</label>
                  <p className="text-forensic-900">{evidence.mime_type || 'Unknown'}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-forensic-500 uppercase mb-1">SHA-256 Hash</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-forensic-100 px-3 py-2 rounded font-mono text-sm break-all">
                      {evidence.sha256_hash}
                    </code>
                    <button
                      onClick={copyHash}
                      className="p-2 text-forensic-600 hover:text-forensic-900 hover:bg-forensic-100 rounded-lg transition-colors"
                      title={copied ? 'Copied!' : 'Copy hash'}
                    >
                      {copied ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Integrity Card */}
            <div className="bg-white rounded-xl border border-forensic-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-forensic-900 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Integrity Verification
                </h2>
                <div className="flex items-center gap-2">
                  <IntegrityIcon className={`w-5 h-5 ${integrity.className}`} />
                  <span className={`font-medium ${integrity.className}`}>{integrity.label}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={handleVerify}
                  disabled={verifying || evidence.status === 'verified'}
                  className="flex items-center gap-2 px-4 py-2 bg-forensic-700 text-white rounded-lg hover:bg-forensic-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  <span>{verifying ? 'Verifying...' : 'Verify Integrity'}</span>
                </button>
                {evidence.status !== 'verified' && (
                  <span className="text-sm text-forensic-500">Run SHA-256 verification against stored hash</span>
                )}
              </div>

              {evidence.status === 'verified' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Integrity verified</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">The evidence file matches the stored SHA-256 hash.</p>
                </div>
              )}

              {evidence.status === 'error' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Integrity check failed</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">The evidence file does not match the stored SHA-256 hash. Analysis is blocked.</p>
                </div>
              )}

              {evidence.status === 'imported' && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Hash className="w-5 h-5" />
                    <span className="font-medium">Verification pending</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Run verification to confirm evidence integrity before analysis.</p>
                </div>
              )}
            </div>

            {/* Filesystem Detection Card */}
            <div className="bg-white rounded-xl border border-forensic-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-forensic-900 flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Filesystem Detection
                </h2>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getFilesystemBadge(evidence.filesystem_type)}`}>
                  {evidence.filesystem_type.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={handleDetectFilesystem}
                  disabled={detecting || evidence.filesystem_type !== 'unknown'}
                  className="flex items-center gap-2 px-4 py-2 bg-forensic-700 text-white rounded-lg hover:bg-forensic-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {detecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  <span>{detecting ? 'Detecting...' : 'Detect Filesystem'}</span>
                </button>
                {evidence.filesystem_type === 'unknown' && (
                  <span className="text-sm text-forensic-500">Analyze superblock signatures to identify filesystem</span>
                )}
              </div>

              {evidence.filesystem_type !== 'unknown' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <HardDrive className="w-5 h-5" />
                    <span className="font-medium">Filesystem identified: {evidence.filesystem_type.toUpperCase()}</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">Ready for filesystem-specific analysis engines.</p>
                </div>
              )}
            </div>

            {/* Storage Info Card */}
            <div className="bg-white rounded-xl border border-forensic-200 p-6">
              <h2 className="text-lg font-semibold text-forensic-900 mb-4 flex items-center gap-2">
                <HardDrive className="w-5 h-5" />
                Storage Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-forensic-50 rounded-lg">
                  <label className="block text-xs font-medium text-forensic-500 uppercase mb-1">Stored Path</label>
                  <code className="text-forensic-900 font-mono text-xs break-all">{evidence.stored_path}</code>
                </div>
                <div className="p-3 bg-forensic-50 rounded-lg">
                  <label className="block text-xs font-medium text-forensic-500 uppercase mb-1">Acquired</label>
                  <p className="text-forensic-900">{new Date(evidence.acquired_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Actions & Audit */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-forensic-200 p-6">
              <h2 className="text-lg font-semibold text-forensic-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href={`/dashboard/cases/${caseId}`}
                  className="flex items-center gap-3 p-3 bg-forensic-50 hover:bg-forensic-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-forensic-600" />
                  <span className="text-forensic-700">Back to Case</span>
                </Link>
                <Link
                  href={`/dashboard/cases/${caseId}/analysis`}
                  className="flex items-center gap-3 p-3 bg-forensic-50 hover:bg-forensic-100 rounded-lg transition-colors"
                >
                  <Search className="w-5 h-5 text-forensic-600" />
                  <span className="text-forensic-700">Start Analysis</span>
                </Link>
              </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-white rounded-xl border border-forensic-200 p-6">
              <h2 className="text-lg font-semibold text-forensic-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Audit Trail
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 p-3 bg-forensic-50 rounded-lg">
                  <FileText className="w-5 h-5 text-forensic-400" />
                  <div>
                    <p className="text-forensic-900">Evidence Added</p>
                    <p className="text-forensic-500 text-xs">{new Date(evidence.acquired_at).toLocaleString()}</p>
                  </div>
                </div>
                {evidence.status === 'verified' && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-forensic-900">Integrity Verified</p>
                      <p className="text-forensic-500 text-xs">SHA-256 hash matches stored value</p>
                    </div>
                  </div>
                )}
                {evidence.status === 'error' && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-forensic-900">Integrity Check Failed</p>
                      <p className="text-forensic-500 text-xs">Hash mismatch detected - analysis blocked</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusBadge(status: string) {
  const badges: Record<string, string> = {
    imported: 'bg-gray-100 text-gray-700',
    verified: 'bg-green-100 text-green-700',
    processing: 'bg-blue-100 text-blue-700',
    processed: 'bg-forensic-100 text-forensic-700',
    error: 'bg-red-100 text-red-700',
    archived: 'bg-gray-100 text-gray-700',
  };
  return badges[status] || 'bg-gray-100 text-gray-700';
}

function getFilesystemBadge(fs: string) {
  const badges: Record<string, string> = {
    unknown: 'bg-gray-100 text-gray-700',
    xfs: 'bg-blue-100 text-blue-700',
    btrfs: 'bg-green-100 text-green-700',
    ext4: 'bg-yellow-100 text-yellow-700',
    ntfs: 'bg-purple-100 text-purple-700',
    fat32: 'bg-orange-100 text-orange-700',
  };
  return badges[fs] || 'bg-gray-100 text-gray-700';
}