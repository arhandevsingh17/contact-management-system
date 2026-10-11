const CATEGORY_MAP = {
  Work: { className: 'badge-work', icon: '💼' },
  Personal: { className: 'badge-personal', icon: '🏠' },
  Family: { className: 'badge-family', icon: '❤️' },
  Client: { className: 'badge-client', icon: '🤝' },
  Other: { className: 'badge-other', icon: '📌' },
};

export function CategoryBadge({ category = 'Other' }) {
  const meta = CATEGORY_MAP[category] || CATEGORY_MAP.Other;

  return (
    <span className={`badge ${meta.className}`}>
      <span aria-hidden="true">{meta.icon}</span>
      {category}
    </span>
  );
}

export default CategoryBadge;
