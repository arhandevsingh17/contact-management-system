import { CategoryBadge } from './CategoryBadge';


const AVATAR_COLORS = [
  { bg: '#dbeafe', color: '#1e40af' }, // soft blue
  { bg: '#d1fae5', color: '#065f46' }, // soft emerald
  { bg: '#fef3c7', color: '#92400e' }, // soft amber
  { bg: '#fce7f3', color: '#9d174d' }, // soft rose
  { bg: '#ede9fe', color: '#5b21b6' }, // soft purple
  { bg: '#e0f2fe', color: '#0369a1' }, // soft sky
];

function getAvatarStyle(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function ContactCard({ contact, onEdit, onDelete, canModify = true, isAdmin = false }) {
  const { name, email, phone, company, category, notes, createdBy } = contact;
  const avatarStyle = getAvatarStyle(name);
  const initials = name
    ? name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'C';

  return (
    <article className="card contact-card" data-testid={`contact-card-${contact._id}`}>
      <div>
        <div className="contact-card-header">
          <div
            className="contact-avatar"
            style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.color }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="contact-info-title">
            <h3 className="contact-name" title={name}>
              {name}
            </h3>
            <p className="contact-company" title={company || 'Independent'}>
              {company || 'No Company Specified'}
            </p>
          </div>
          <CategoryBadge category={category} />
        </div>

        <div className="contact-meta-list">
          <div className="contact-meta-item">
            <span className="contact-meta-icon" aria-hidden="true">✉️</span>
            <a href={`mailto:${email}`} title={`Email ${email}`}>
              {email}
            </a>
          </div>
          <div className="contact-meta-item">
            <span className="contact-meta-icon" aria-hidden="true">📞</span>
            <a href={`tel:${phone}`} title={`Call ${phone}`}>
              {phone}
            </a>
          </div>
        </div>

        {notes ? (
          <div className="contact-notes-box">
            <span>"{notes}"</span>
          </div>
        ) : null}
      </div>

      <div className="contact-card-footer">
        {isAdmin && createdBy ? (
          <span className="contact-owner-indicator" title={`Created by ${createdBy}`}>
            By: {createdBy}
          </span>
        ) : (
          <span className="contact-owner-indicator">
            {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'Active'}
          </span>
        )}

        <div className="contact-card-actions">
          {canModify ? (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onEdit(contact)}
                aria-label={`Edit ${name}`}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ color: '#dc2626' }}
                onClick={() => onDelete(contact)}
                aria-label={`Delete ${name}`}
              >
                Delete
              </button>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Read Only</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default ContactCard;
