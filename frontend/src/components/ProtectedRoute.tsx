import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../api/types';
import { LoadingState } from './ui/PageState';

export function ProtectedRoute({ allowedRoles }: { allowedRoles: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Route protection happens in three stages:
  // 1. wait for AuthContext to finish restoring any saved session
  // 2. send anonymous users to login
  // 3. send signed-in users away if their role is not allowed here
  if (loading) {
    return (
      <div className="page-shell">
        <LoadingState label="Loading your session..." />
      </div>
    );
  }

  if (!user) {
    // Preserve the original destination so the login flow can later send the user back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user.roles.some((role) => allowedRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
