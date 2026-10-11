import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="auth-page-wrapper">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🔍</div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Page Not Found</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          The page or directory view you are looking for does not exist or has been moved.
        </p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex' }}>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
