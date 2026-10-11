import { useAuth } from '../hooks/useAuth';

export function StatsOverview({ contacts = [] }) {
  const { isAdmin } = useAuth();

  const totalCount = contacts.length;
  const workCount = contacts.filter((c) => c.category === 'Work').length;
  const personalCount = contacts.filter((c) => c.category === 'Personal').length;
  const clientCount = contacts.filter((c) => c.category === 'Client').length;

  return (
    <section className="stats-overview" aria-label="Directory statistics">
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Contacts</span>
            <span className="stat-icon" aria-hidden="true">👥</span>
          </div>
          <div className="stat-value">{totalCount}</div>
          <span className="stat-subtext">
            {isAdmin ? 'All users directory' : 'Your contacts'}
          </span>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">Work</span>
            <span className="stat-icon" aria-hidden="true">💼</span>
          </div>
          <div className="stat-value">{workCount}</div>
          <span className="stat-subtext">Colleagues & teams</span>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">Personal & Family</span>
            <span className="stat-icon" aria-hidden="true">🏠</span>
          </div>
          <div className="stat-value">{personalCount}</div>
          <span className="stat-subtext">Friends & relatives</span>
        </div>

        <div className="card stat-card">
          <div className="stat-header">
            <span className="stat-label">Clients & Partners</span>
            <span className="stat-icon" aria-hidden="true">🤝</span>
          </div>
          <div className="stat-value">{clientCount}</div>
          <span className="stat-subtext">External stakeholders</span>
        </div>
      </div>

      {isAdmin ? (
        <div className="alert-banner alert-banner-info">
          <span>🛡️</span>
          <div>
            <strong>Administrator Privileges:</strong> You have full system-wide access to view, edit, and delete contacts created by any user in accordance with assignment role specifications.
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default StatsOverview;
