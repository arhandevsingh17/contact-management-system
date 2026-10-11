import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link to="/" className="brand-link">
          <span className="brand-title">ContactHub</span>
        </Link>
      </div>
      <nav className="nav-links">
        {isAuthenticated ? (
          <div className="nav-user-actions">
            <span className="nav-welcome">
              Hello, <strong>{user?.name || user?.email || 'User'}</strong>
            </span>
            <Link to="/dashboard" className="nav-link">
              Contacts
            </Link>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="nav-guest-actions">
            <Link to="/login" className="nav-link">
              Log In
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Register
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
};
