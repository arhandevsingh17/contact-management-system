export function RoleBadge({ role }) {
  const isAdmin = role === 'Admin';
  return (
    <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-user'}`}>
      <span aria-hidden="true">{isAdmin ? '🛡️' : '👤'}</span>
      {role || 'User'}
    </span>
  );
}

export default RoleBadge;
