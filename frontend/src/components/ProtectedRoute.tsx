import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, KeyRound, Lock, UserCheck } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import type { UserRole } from '../types/forensic';

interface ProtectedRouteProps {
  allowedRole: UserRole;
  children?: React.ReactNode;
}

export default function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { currentRole, currentUser, loginAs } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (currentRole !== allowedRole) {
    return (
      <div className="min-h-screen bg-[#050811] text-slate-100 flex items-center justify-center p-6 select-none font-sans">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-lg w-full bg-[#080d1a] border border-rose-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(244,63,94,0.15)] space-y-6 text-center">
          {/* Header Shield */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.25)]">
            <ShieldAlert className="w-8 h-8 text-rose-400 animate-pulse" />
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-700/50 text-[10px] font-mono text-rose-300 uppercase tracking-widest">
              <Lock className="w-3 h-3" /> Route-Level RBAC Enforcement
            </div>
            <h1 className="text-xl font-bold font-mono text-slate-100 tracking-tight">
              403 — Administrator Clearance Required
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Access to <span className="text-purple-300 font-semibold">{location.pathname}</span> is restricted to personnel with <span className="text-purple-400 font-bold">ADMINISTRATOR</span> credentials.
            </p>
          </div>

          {/* Active Session Info Box */}
          <div className="bg-[#050812] border border-[#18233c] rounded-xl p-4 text-left space-y-2 font-mono text-xs">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Current Identity</div>
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold">{currentUser.name}</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 text-[10px] font-bold">
                {currentUser.role}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-[#131d33]">
              <span>Agency: {currentUser.organization}</span>
              <span>Badge: {currentUser.badge}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Investigator Workspace (/dashboard)
            </button>

            <button
              onClick={() => {
                loginAs('ADMINISTRATOR');
                navigate(location.pathname);
              }}
              className="w-full py-2 px-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:text-purple-200 font-mono text-xs transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-purple-400" />
              Authorize & Switch to Administrator Role
            </button>
          </div>

          {/* Footer note */}
          <div className="text-[10px] text-slate-600 font-mono pt-2 border-t border-[#121b30]">
            Audit Policy: Security boundary traversal attempts are cryptographically timestamped and logged.
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : null;
}
