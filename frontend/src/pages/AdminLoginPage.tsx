import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Lock, ArrowLeft, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../store/AuthContext';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { adminLogin, isAdminAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect to /admin
  React.useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const result = adminLogin(username, password);
      setLoading(false);
      if (result.success) {
        const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';
        navigate(destination, { replace: true });
      } else {
        setError(result.error || 'Authentication failed. Please verify credentials.');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col items-center justify-center p-4 font-sans select-none relative overflow-hidden">
      {/* Background ambient lighting — TraceX signature cyan/blue glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="relative w-full max-w-md bg-[#080d19] border border-[#152138] rounded-2xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.6)] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>

          <div>
            <div className="text-sm font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">
              TRACE X
            </div>
            <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              DIGITAL FORENSICS
            </div>
          </div>

          <div className="pt-2">
            <h1 className="text-base font-bold font-mono text-slate-100 tracking-tight">
              ADMINISTRATOR ACCESS
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Enter authorized administrator credentials to continue.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">
              Username
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Administrator username"
              className="w-full px-3.5 py-2.5 bg-[#050811] border border-[#152138] rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 bg-[#050811] border border-[#152138] rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-mono font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>SIGN IN</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Policy Note */}
        <div className="pt-2 border-t border-[#131d33] text-center space-y-3 font-mono text-[11px]">
          <p className="text-slate-500 text-[10px]">
            Authentication required for system administration.
          </p>

          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Investigator Workspace</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
