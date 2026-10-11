/**
 * StatsOverview – displays a summary row of key contact-management metrics.
 *
 * Props:
 *   stats  {object}  – { total, active, groups, recentlyAdded }
 *   loading {boolean} – when true, renders skeleton placeholders
 */
import PropTypes from 'prop-types'
import './StatsOverview.css'

const StatCard = ({ label, value, icon, loading }) => (
  <div className="stat-card" aria-label={`${label}: ${loading ? 'loading' : value}`}>
    <span className="stat-icon" aria-hidden="true">{icon}</span>
    <div className="stat-body">
      {loading ? (
        <>
          <span className="skeleton skeleton-value" />
          <span className="skeleton skeleton-label" />
        </>
      ) : (
        <>
          <span className="stat-value">{value ?? '—'}</span>
          <span className="stat-label">{label}</span>
        </>
      )}
    </div>
  </div>
)

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  icon: PropTypes.string.isRequired,
  loading: PropTypes.bool,
}

StatCard.defaultProps = {
  value: null,
  loading: false,
}

const StatsOverview = ({ stats, loading }) => {
  const cards = [
    { label: 'Total Contacts', value: stats?.total, icon: '👥' },
    { label: 'Active',         value: stats?.active, icon: '✅' },
    { label: 'Groups',         value: stats?.groups, icon: '🗂️' },
    { label: 'Recently Added', value: stats?.recentlyAdded, icon: '🆕' },
  ]

  return (
    <section className="stats-overview" aria-label="Contact statistics">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} loading={loading} />
      ))}
    </section>
  )
}

StatsOverview.propTypes = {
  stats: PropTypes.shape({
    total:         PropTypes.number,
    active:        PropTypes.number,
    groups:        PropTypes.number,
    recentlyAdded: PropTypes.number,
  }),
  loading: PropTypes.bool,
}

StatsOverview.defaultProps = {
  stats:   null,
  loading: false,
}

export default StatsOverview
