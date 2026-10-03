'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FolderOpen, FileText, Search, Plus, Settings, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchCases(token);
  }, [router]);

  const fetchCases = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  };

  const handleCreateCase = async () => {
    const name = prompt('Case name:');
    if (!name) return;
    const description = prompt('Description (optional):') || '';

    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        fetchCases(token!);
      }
    } catch (err) {
      alert('Failed to create case');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-forensic-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-forensic-700"></div>
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
              <Link href="/dashboard" className="flex items-center gap-2">
                <svg className="w-8 h-8 text-forensic-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xl font-bold text-forensic-900">Forensic Console</span>
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

      {/* Sidebar + Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2 text-forensic-700 bg-forensic-100 rounded-lg font-medium"
              >
                <FolderOpen className="w-5 h-5" />
                <span>Cases</span>
              </Link>
              <Link
                href="/dashboard/evidence"
                className="flex items-center gap-3 px-3 py-2 text-forensic-600 hover:bg-forensic-50 hover:text-forensic-900 rounded-lg"
              >
                <FileText className="w-5 h-5" />
                <span>Evidence</span>
              </Link>
              <Link
                href="/dashboard/analysis"
                className="flex items-center gap-3 px-3 py-2 text-forensic-600 hover:bg-forensic-50 hover:text-forensic-900 rounded-lg"
              >
                <Search className="w-5 h-5" />
                <span>Analysis</span>
              </Link>
              <Link
                href="/dashboard/reports"
                className="flex items-center gap-3 px-3 py-2 text-forensic-600 hover:bg-forensic-50 hover:text-forensic-900 rounded-lg"
              >
                <FileText className="w-5 h-5" />
                <span>Reports</span>
              </Link>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-3 py-2 text-forensic-600 hover:bg-forensic-50 hover:text-forensic-900 rounded-lg"
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-forensic-900">Cases</h1>
              <button onClick={handleCreateCase} className="flex items-center gap-2 bg-forensic-700 text-white px-4 py-2 rounded-lg hover:bg-forensic-800 transition-colors">
                <Plus className="w-5 h-5" />
                <span>New Case</span>
              </button>
            </div>

            {cases.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-forensic-200">
                <FolderOpen className="w-16 h-16 text-forensic-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-forensic-700 mb-2">No cases yet</h2>
                <p className="text-forensic-500 mb-6">Create your first forensic case to begin investigation</p>
                <button onClick={handleCreateCase} className="bg-forensic-700 text-white px-6 py-2 rounded-lg hover:bg-forensic-800 transition-colors">
                  Create Case
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-forensic-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-forensic-50 border-b border-forensic-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Case #</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Evidence</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-forensic-600 uppercase">Created</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-forensic-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forensic-100">
                    {cases.map((c: any) => (
                      <tr key={c.id} className="hover:bg-forensic-50">
                        <td className="px-6 py-4 font-mono text-sm text-forensic-700">{c.case_number}</td>
                        <td className="px-6 py-4">
                          <Link href={`/dashboard/cases/${c.id}`} className="font-medium text-forensic-900 hover:text-forensic-700">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            c.status === 'open' ? 'bg-green-100 text-green-700' :
                            c.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            c.status === 'completed' ? 'bg-forensic-100 text-forensic-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-forensic-600">—</td>
                        <td className="px-6 py-4 text-forensic-600">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/dashboard/cases/${c.id}`} className="text-forensic-600 hover:text-forensic-900 text-sm font-medium">
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}