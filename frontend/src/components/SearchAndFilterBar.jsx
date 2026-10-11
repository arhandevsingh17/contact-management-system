const CATEGORIES = ['All', 'Work', 'Personal', 'Family', 'Client', 'Other'];

export function SearchAndFilterBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categoryCounts = {},
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onAddNewContact,
}) {
  return (
    <div className="toolbar-section">
      <div className="toolbar-top-row">
        {/* Search input with clean icon & clear button */}
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="form-input search-field"
            placeholder="Search by name, email, phone, or company..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            id="search-contacts-input"
            aria-label="Search contacts"
          />
          {searchQuery ? (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* Actions group: Sort, View Toggle, Add Contact button */}
        <div className="toolbar-actions-group">
          <select
            className="form-select sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            id="sort-contacts-select"
            aria-label="Sort contacts"
          >
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="company">Sort: Company</option>
            <option value="newest">Sort: Recently Added</option>
          </select>

          <div className="view-toggle-group" role="group" aria-label="View layout">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="Card Grid View"
              aria-label="Card Grid View"
            >
              ⊞ Cards
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => onViewModeChange('table')}
              title="Table View"
              aria-label="Table View"
            >
              ☰ Table
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onAddNewContact}
            id="add-contact-btn"
          >
            <span>+</span> Add Contact
          </button>
        </div>
      </div>

      {/* Category Pills with counts */}
      <div className="category-pills-row" role="radiogroup" aria-label="Filter by category">
        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat] || 0;
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={`category-pill ${isActive ? 'active' : ''}`}
              onClick={() => onCategoryChange(cat)}
            >
              <span>{cat}</span>
              <span className="category-pill-count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SearchAndFilterBar;
