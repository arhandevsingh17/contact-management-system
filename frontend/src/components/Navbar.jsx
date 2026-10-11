import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RoleBadge } from './RoleBadge';
import { getApiStatus } from '../services/api';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState(getApiStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setApiStatus(getApiStatus());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon">C</div>
          <div className="brand-text">
            <span className="brand-title">Contact Management</span>
            <span className="brand-subtitle">Assignment 4 • Role-based System</span>
          </div>
        </Link>

        <div className="navbar-actions">
          <div
            className="connection-indicator"
            title={`Connected to API at ${apiStatus.apiUrl}`}
          >
            <span className="status-dot online" />
            <span>API Live</span>
          </div>

          {isAuthenticated ? (
            <div className="user-profile-menu">
              <div className="user-avatar-badge" title={user?.email}>
                {getInitials(user?.name)}
              </div>
              <div className="user-meta">
                <span className="user-name">{user?.name || 'User'}</span>
                <RoleBadge role={user?.role} />
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleLogout}
                id="logout-btn"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
