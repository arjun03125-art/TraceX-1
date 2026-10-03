/**
 * AuthContext — Role-based access control and identity management for TRACE X.
 * 
 * Manages active user identity and enforces route protection between
 * INVESTIGATOR (normal forensic workspace) and ADMINISTRATOR (isolated admin portal).
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { UserRole, AuthUser } from '../types/forensic';

export const DEFAULT_USERS: Record<UserRole, AuthUser> = {
  INVESTIGATOR: {
    id: 'user-inv-01',
    name: 'Det. H. Vance',
    role: 'INVESTIGATOR',
    title: 'Lead Forensic Analyst',
    organization: 'Cyber Incident Response Unit',
    badge: 'CIRU-8824',
    email: 'h.vance@ciru.gov',
  },
  ADMINISTRATOR: {
    id: 'user-admin-01',
    name: 'Chief Admin Alex Mercer',
    role: 'ADMINISTRATOR',
    title: 'System Administrator',
    organization: 'TraceX Forensics Oversight',
    badge: 'ADM-001',
    email: 'admin@tracex.internal',
  },
};

interface AuthContextType {
  currentUser: AuthUser;
  currentRole: UserRole;
  isAdmin: boolean;
  isInvestigator: boolean;
  loginAs: (role: UserRole) => void;
  switchRole: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('tracex_auth_role');
      if (saved === 'ADMINISTRATOR' || saved === 'INVESTIGATOR') {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'INVESTIGATOR';
  });

  const currentUser = useMemo(() => DEFAULT_USERS[currentRole], [currentRole]);

  const loginAs = useCallback((role: UserRole) => {
    setCurrentRole(role);
    try {
      localStorage.setItem('tracex_auth_role', role);
    } catch {
      // ignore
    }
  }, []);

  const switchRole = useCallback(() => {
    loginAs(currentRole === 'ADMINISTRATOR' ? 'INVESTIGATOR' : 'ADMINISTRATOR');
  }, [currentRole, loginAs]);

  const logout = useCallback(() => {
    loginAs('INVESTIGATOR');
  }, [loginAs]);

  const value = useMemo(() => ({
    currentUser,
    currentRole,
    isAdmin: currentRole === 'ADMINISTRATOR',
    isInvestigator: currentRole === 'INVESTIGATOR',
    loginAs,
    switchRole,
    logout,
  }), [currentUser, currentRole, loginAs, switchRole, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
