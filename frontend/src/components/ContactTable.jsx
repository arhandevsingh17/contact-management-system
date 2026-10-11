import { CategoryBadge } from './CategoryBadge';

export function ContactTable({ contacts, onEdit, onDelete, canModify = () => true, isAdmin = false }) {
  return (
    <div className="table-responsive-wrapper">
      <table className="contact-table">
        <thead>
          <tr>
            <th>Contact Name</th>
            <th>Category</th>
            <th>Email</th>
            <th>Phone</th>
            {isAdmin ? <th>Owner</th> : <th>Date Added</th>}
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => {
            const allowed = canModify(contact);
            return (
              <tr key={contact._id} data-testid={`contact-row-${contact._id}`}>
                <td>
                  <div style={{ fontWeight: 600 }}>{contact.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {contact.company || '—'}
                  </div>
                </td>
                <td>
                  <CategoryBadge category={contact.category} />
                </td>
                <td>
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </td>
                <td>
                  <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                </td>
                <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {isAdmin
                    ? contact.createdBy || 'User'
                    : contact.createdAt
                    ? new Date(contact.createdAt).toLocaleDateString()
                    : '—'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {allowed ? (
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onEdit(contact)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#dc2626' }}
                        onClick={() => onDelete(contact)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>View Only</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ContactTable;
