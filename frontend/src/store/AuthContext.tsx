/**
 * AuthContext — Role-based access control and Administrator Authentication for TRACE X.
 * 
 * Manages active user identity and enforces route protection between
 * INVESTIGATOR (normal forensic workspace) and ADMINISTRATOR (isolated admin portal).
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { UserRole, AuthUser } from '../types/forensic';
import DataService from './DataService';

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
  isAdminAuthenticated: boolean;
  isAdmin: boolean;
  isInvestigator: boolean;
  adminLogin: (username: string, password: string) => { success: boolean; error?: string };
  adminLogout: () => void;
  loginAs: (role: UserRole) => void;
  switchRole: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('tracex_admin_authenticated') === 'true';
    } catch {
      return false;
    }
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      if (sessionStorage.getItem('tracex_admin_authenticated') === 'true') {
        return 'ADMINISTRATOR';
      }
    } catch {
      // fallback
    }
    return 'INVESTIGATOR';
  });

  const currentUser = useMemo(() => DEFAULT_USERS[currentRole], [currentRole]);

  const adminLogin = useCallback((username: string, password: string) => {
    const u = username.trim().toLowerCase();
    const p = password.trim();
    if (
      (u === 'admin@tracex.local' || u === 'admin') &&
      (p === 'TraceX@123' || p === 'admin123')
    ) {
      setIsAdminAuthenticated(true);
      setCurrentRole('ADMINISTRATOR');
      try {
        sessionStorage.setItem('tracex_admin_authenticated', 'true');
        localStorage.setItem('tracex_auth_role', 'ADMINISTRATOR');
      } catch {
        // ignore
      }
      try {
        DataService.logEvent('ADMIN_LOGIN', 'Administrator authenticated successfully via demo portal', {
          actor: 'admin@tracex.local',
          target: 'Administrator Portal (/admin)',
          status: 'SUCCESS',
          details: { role: 'ADMINISTRATOR', method: 'DEMO_AUTHENTICATION' },
        });
      } catch {
        // ignore
      }
      return { success: true };
    }
    return { success: false, error: 'Invalid credentials. Use admin@tracex.local / TraceX@123' };
  }, []);

  const adminLogout = useCallback(() => {
    setIsAdminAuthenticated(false);
    setCurrentRole('INVESTIGATOR');
    try {
      sessionStorage.removeItem('tracex_admin_authenticated');
      localStorage.setItem('tracex_auth_role', 'INVESTIGATOR');
    } catch {
      // ignore
    }
    try {
      DataService.logEvent('ADMIN_LOGOUT', 'Administrator logged out of session', {
        actor: 'admin@tracex.local',
        target: 'Administrator Portal (/admin)',
        status: 'SUCCESS',
      });
    } catch {
      // ignore
    }
  }, []);

  const loginAs = useCallback((role: UserRole) => {
    setCurrentRole(role);
    if (role === 'ADMINISTRATOR') {
      setIsAdminAuthenticated(true);
      try {
        sessionStorage.setItem('tracex_admin_authenticated', 'true');
        localStorage.setItem('tracex_auth_role', 'ADMINISTRATOR');
      } catch {}
    } else {
      setIsAdminAuthenticated(false);
      try {
        sessionStorage.removeItem('tracex_admin_authenticated');
        localStorage.setItem('tracex_auth_role', 'INVESTIGATOR');
      } catch {}
    }
  }, []);

  const switchRole = useCallback(() => {
    loginAs(currentRole === 'ADMINISTRATOR' ? 'INVESTIGATOR' : 'ADMINISTRATOR');
  }, [currentRole, loginAs]);

  const logout = useCallback(() => {
    adminLogout();
  }, [adminLogout]);

  const value = useMemo(() => ({
    currentUser,
    currentRole,
    isAdminAuthenticated,
    isAdmin: currentRole === 'ADMINISTRATOR' && isAdminAuthenticated,
    isInvestigator: currentRole === 'INVESTIGATOR',
    adminLogin,
    adminLogout,
    loginAs,
    switchRole,
    logout,
  }), [currentUser, currentRole, isAdminAuthenticated, adminLogin, adminLogout, loginAs, switchRole, logout]);

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
