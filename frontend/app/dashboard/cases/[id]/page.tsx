'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderOpen,
  FileText,
  Search,
  Plus,
  Settings,
  LogOut,
  ArrowLeft,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  HardDrive,
  Hash,
  Eye,
  Trash2,
  Loader2,
} from 'lucide-react';

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'evidence' | 'analysis' | 'artifacts' | 'reports'>('evidence');

  const fetchCase = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCaseData(data);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to fetch case:', err);
    }
  };

  const fetchEvidence = async (token: string) => {
    setEvidenceLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases/${caseId}/evidence`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvidence(data.evidence || []);
      }
    } catch (err) {
      console.error('Failed to fetch evidence:', err);
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  const handleUploadEvidence = async (file: File) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases/${caseId}/evidence`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        fetchEvidence(token);
      } else {
        const data = await res.json();
        setError(data.detail?.message || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyEvidence = async (evidenceId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases/${caseId}/evidence/${evidenceId}/verify`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        fetchEvidence(token);
      } else {
        const data = await res.json();
        setError(data.detail?.message || 'Verification failed');
      }
    } catch (err) {
      setError('Verification failed');
    }
  };

  const handleDetectFilesystem = async (evidenceId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases/${caseId}/evidence/${evidenceId}/detect-filesystem`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        fetchEvidence(token);
      } else {
        const data = await res.json();
        setError(data.detail?.message || 'Filesystem detection failed');
      }
    } catch (err) {
      setError('Filesystem detection failed');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadEvidence(file);
      e.target.value = '';
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchCase(token);
    fetchEvidence(token);
  }, [caseId, router]);

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

  const getIntegrityStatus = (e: any) => {
    if (e.status === 'verified') return { label: 'Verified', icon: CheckCircle, className: 'text-green-600' };
    if (e.status === 'error') return { label: 'Failed', icon: XCircle, className: 'text-red-600' };
    if (e.status === 'imported') return { label: 'Pending', icon: Hash, className: 'text-gray-600' };
    return { label: e.status, icon: Hash, className: 'text-gray-600' };
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

  if (!caseData) {
    return (
      <div className="min-h-screen bg-forensic-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-forensic-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-forensic-700 mb-2">Case not found</h2>
          <Link href="/dashboard" className="text-forensic-600 hover:text-forensic-900">
            ← Back to cases
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forensic-50">
      {/* Header */}
      <header className="bg-white border-b border-forensic-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2 text-forensic-600 hover:text-forensic-900">
                <ArrowLeft className="w-5 h-5" />
                <span>Cases</span>
              </Link>
              <Link href={`/dashboard/cases/${caseId}`} className="flex items-center gap-2">
                <svg className="w-8 h-8 text-forensic-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xl font-bold text-forensic-900">{caseData.case_number}</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={handleLogout} className="text-forensic-600 hover:text-forensic-900 flex items-center gap-1">
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Case Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-forensic-900">{caseData.name}</h1>
            <p className="text-forensic-600 mt-1">{caseData.description || 'No description'}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-forensic-500">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(caseData.status)}`}>
                {caseData.status.replace('_', ' ')}
              </span>
              <span>Created: {new Date(caseData.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-forensic-200 overflow-hidden">
          <div className="border-b border-forensic-200">
            <nav className="flex gap-8 px-6" aria-label="Tabs">
              {[
                { id: 'evidence', label: 'Evidence', icon: HardDrive },
                { id: 'analysis', label: 'Analysis', icon: Search },
                { id: 'artifacts', label: 'Artifacts', icon: FileText },
                { id: 'reports', label: 'Reports', icon: FileText },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-forensic-700 text-forensic-900'
                      : 'border-transparent text-forensic-500 hover:text-forensic-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'evidence' && (
              <EvidenceTab
                caseId={caseId}
                evidence={evidence}
                loading={evidenceLoading}
                uploading={uploading}
                onUpload={handleFileSelect}
                onVerify={handleVerifyEvidence}
                onDetectFilesystem={handleDetectFilesystem}
                getIntegrityStatus={getIntegrityStatus}
                getStatusBadge={getStatusBadge}
                formatBytes={formatBytes}
              />
            )}
            {activeTab === 'analysis' && <AnalysisTab caseId={caseId} />}
            {activeTab === 'artifacts' && <ArtifactsTab caseId={caseId} />}
            {activeTab === 'reports' && <ReportsTab caseId={caseId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceTab({
  caseId,
  evidence,
  loading,
  uploading,
  onUpload,
  onVerify,
  onDetectFilesystem,
  getIntegrityStatus,
  getStatusBadge,
  formatBytes,
}: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-forensic-900">Evidence</h2>
        <label className="flex items-center gap-2 bg-forensic-700 text-white px-4 py-2 rounded-lg hover:bg-forensic-800 transition-colors cursor-pointer">
          <Upload className="w-5 h-5" />
          <span>Add Evidence</span>
          <input
            type="file"
            accept=".dd,.img,.raw,.iso,.vmdk,.vhd,.vhdx"
            onChange={onUpload}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forensic-700"></div>
        </div>
      ) : evidence.length === 0 ? (
        <div className="text-center py-16 bg-forensic-50 rounded-xl border border-forensic-200">
          <HardDrive className="w-16 h-16 text-forensic-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-forensic-700 mb-2">No evidence added</h3>
          <p className="text-forensic-500 mb-6">Upload a disk image to begin forensic analysis</p>
          <label className="flex items-center justify-center gap-2 bg-forensic-700 text-white px-6 py-2 rounded-lg hover:bg-forensic-800 transition-colors cursor-pointer inline-flex">
            <Upload className="w-5 h-5" />
            <span>Add Evidence</span>
            <input
              type="file"
              accept=".dd,.img,.raw,.iso,.vmdk,.vhd,.vhdx"
              onChange={onUpload}
              disabled={uploading}
              className="sr-only"
            />
          </label>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-forensic-50 border-b border-forensic-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Evidence #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Filename</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Size</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">SHA-256</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Filesystem</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Integrity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-forensic-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forensic-100">
              {evidence.map((e: any) => {
                const integrity = getIntegrityStatus(e);
                const IntegrityIcon = integrity.icon;
                return (
                  <tr key={e.id} className="hover:bg-forensic-50">
                    <td className="px-6 py-4 font-mono text-sm text-forensic-700">{e.evidence_number}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-forensic-400" />
                        <span className="font-medium text-forensic-900 truncate max-w-xs">{e.original_filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-forensic-600 font-mono text-sm">{formatBytes(e.size_bytes)}</td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-forensic-100 px-2 py-1 rounded font-mono truncate block max-w-[200px]">
                        {e.sha256_hash.substring(0, 16)}...
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        e.filesystem_type === 'unknown' ? 'bg-gray-100 text-gray-700' :
                        e.filesystem_type === 'xfs' ? 'bg-blue-100 text-blue-700' :
                        e.filesystem_type === 'btrfs' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {e.filesystem_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <IntegrityIcon className={`w-4 h-4 ${integrity.className}`} />
                        <span className={integrity.className}>{integrity.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(e.status)}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-forensic-600 text-sm">
                      {new Date(e.acquired_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onVerify(e.id)}
                          disabled={e.status === 'verified' || e.status === 'processing'}
                          className="p-2 text-forensic-600 hover:text-forensic-900 hover:bg-forensic-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Verify integrity"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onDetectFilesystem(e.id)}
                          disabled={e.filesystem_type !== 'unknown'}
                          className="p-2 text-forensic-600 hover:text-forensic-900 hover:bg-forensic-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Detect filesystem"
                        >
                          <Search className="w-5 h-5" />
                        </button>
                        <Link
                          href={`/dashboard/cases/${caseId}/evidence/${e.id}`}
                          className="p-2 text-forensic-600 hover:text-forensic-900 hover:bg-forensic-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AnalysisTab({ caseId }: { caseId: string }) {
  return (
    <div className="text-center py-16 text-forensic-500">
      <Search className="w-16 h-16 text-forensic-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-forensic-700 mb-2">Analysis</h3>
      <p>Analysis management coming in Phase 3</p>
    </div>
  );
}

function ArtifactsTab({ caseId }: { caseId: string }) {
  return (
    <div className="text-center py-16 text-forensic-500">
      <FileText className="w-16 h-16 text-forensic-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-forensic-700 mb-2">Artifacts</h3>
      <p>Artifact browser coming in Phase 9</p>
    </div>
  );
}

function ReportsTab({ caseId }: { caseId: string }) {
  return (
    <div className="text-center py-16 text-forensic-500">
      <FileText className="w-16 h-16 text-forensic-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-forensic-700 mb-2">Reports</h3>
      <p>Report viewer coming in Phase 8</p>
    </div>
  );
}