import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', color: 'var(--primary)' }} />
      </div>
    );
  }

  // login nahi hai to login page pe bhejo
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // agar admin-only page hai aur user admin nahi
  if (adminOnly && !isAdmin) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <h2>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          This page requires Administrator permissions.
        </p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
