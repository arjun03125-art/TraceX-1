import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAdminAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAdminAuthenticated) {
    // Redirect unauthenticated user directly to /admin/login with location state
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : null;
}
