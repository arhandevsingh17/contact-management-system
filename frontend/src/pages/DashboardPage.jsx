import { useState, useEffect, useRef, useMemo } from 'react';
import { contactService } from '../services/api';
import { ContactModal } from '../components/ContactModal';

const MAX_COMPANY_PAGES = 10; // Bounded multi-page retrieval: up to 10 pages * 100 contacts = 1000 contacts

export const DashboardPage = () => {
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [knownCompanies, setKnownCompanies] = useState([]);

  // Sorting state
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [submittingModal, setSubmittingModal] = useState(false);

  // Delete confirmation state
  const [contactToDelete, setContactToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Request race condition prevention
  const latestRequestId = useRef(0);
  const isInitialMount = useRef(true);

  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset to page 1 when search, company filter, sorting, or page size changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch, companyFilter, sortBy, order, limit]);

  // Fetch unique companies across pages for dropdown suggestions on initial load (bounded by MAX_COMPANY_PAGES)
  useEffect(() => {
    let isMounted = true;

    const loadAllCompanies = async () => {
      try {
        const firstPageData = await contactService.getContacts({ page: 1, limit: 100 });
        if (!isMounted || !firstPageData) return;

        const collectedCompanies = new Set();
        (firstPageData.contacts || []).forEach((c) => {
          if (c.company && c.company.trim()) {
            collectedCompanies.add(c.company.trim());
          }
        });

        const totalPages = firstPageData.pagination?.totalPages || 1;
        const pagesToFetch = Math.min(totalPages, MAX_COMPANY_PAGES);

        if (pagesToFetch > 1) {
          const subsequentRequests = [];
          for (let p = 2; p <= pagesToFetch; p++) {
            subsequentRequests.push(contactService.getContacts({ page: p, limit: 100 }));
          }

          const subsequentResponses = await Promise.all(subsequentRequests);
          if (!isMounted) return;

          subsequentResponses.forEach((res) => {
            (res?.contacts || []).forEach((c) => {
              if (c.company && c.company.trim()) {
                collectedCompanies.add(c.company.trim());
              }
            });
          });
        }

        if (isMounted) {
          setKnownCompanies((prev) => {
            const merged = new Set([...prev, ...collectedCompanies]);
            return Array.from(merged).sort();
          });
        }
      } catch {
        // Non-blocking background fetch
      }
    };

    loadAllCompanies();

    return () => {
      isMounted = false;
    };
  }, []);

  // Main data fetch effect - all setState calls happen asynchronously in promise callbacks
  useEffect(() => {
    let isCancelled = false;
    const reqId = ++latestRequestId.current;

    contactService
      .getContacts({
        search: debouncedSearch,
        company: companyFilter,
        sortBy,
        order,
        page,
        limit,
      })
      .then((data) => {
        if (isCancelled || reqId !== latestRequestId.current) return;

        const fetchedContacts = Array.isArray(data?.contacts) ? data.contacts : [];
        setContacts(fetchedContacts);

        const pag = data?.pagination || {};
        const total = typeof pag.total === 'number' ? pag.total : fetchedContacts.length;
        const totalPages =
          typeof pag.totalPages === 'number'
            ? pag.totalPages
            : Math.ceil(total / limit) || 1;

        setPagination({
          total,
          page: typeof pag.page === 'number' ? pag.page : page,
          limit: typeof pag.limit === 'number' ? pag.limit : limit,
          totalPages: Math.max(1, totalPages),
        });

        if (fetchedContacts.length > 0) {
          setKnownCompanies((prev) => {
            const set = new Set(prev);
            fetchedContacts.forEach((c) => {
              if (c.company && c.company.trim()) {
                set.add(c.company.trim());
              }
            });
            return Array.from(set).sort();
          });
        }
        setError('');
        setLoading(false);
      })
      .catch((err) => {
        if (isCancelled || reqId !== latestRequestId.current) return;
        setError(err.message || 'Failed to load contacts');
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch, companyFilter, sortBy, order, page, limit, refreshKey]);

  const showNotification = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback({ message: '', type: '' });
    }, 4000);
  };

  const handleOpenAdd = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleSaveContact = async (payload) => {
    setSubmittingModal(true);
    try {
      if (editingContact) {
        await contactService.updateContact(editingContact._id, payload);
        showNotification('Contact updated successfully!');
      } else {
        await contactService.createContact(payload);
        showNotification('Contact added successfully!');
        setPage(1);
      }
      handleCloseModal();
      setLoading(true);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showNotification(err.message || 'Operation failed', 'error');
    } finally {
      setSubmittingModal(false);
    }
  };

  const confirmDelete = (contact) => {
    setContactToDelete(contact);
  };

  const cancelDelete = () => {
    setContactToDelete(null);
  };

  const executeDelete = async () => {
    if (!contactToDelete) return;
    const id = contactToDelete._id;
    setDeletingId(id);
    try {
      await contactService.deleteContact(id);
      showNotification('Contact deleted successfully!');
      setContactToDelete(null);

      // If the deleted contact was the only one on a subsequent page, move back one page
      if (contacts.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        setLoading(true);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      showNotification(err.message || 'Failed to delete contact', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSortHeader = (field) => {
    setLoading(true);
    if (sortBy === field) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setOrder('asc');
    }
  };

  const handleResetFilters = () => {
    setLoading(true);
    setSearchTerm('');
    setDebouncedSearch('');
    setCompanyFilter('');
    setPage(1);
  };

  const availableCompanies = useMemo(() => {
    const set = new Set(knownCompanies);
    if (companyFilter.trim()) {
      set.add(companyFilter.trim());
    }
    return Array.from(set).sort();
  }, [knownCompanies, companyFilter]);

  const hasActiveFilters = Boolean(searchTerm.trim() || companyFilter.trim());
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const totalCount = pagination.total ?? contacts.length;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">My Contacts</h1>
          <p className="dashboard-subtitle">
            Manage your personal and professional connections
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-add"
          onClick={handleOpenAdd}
        >
          + Add Contact
        </button>
      </div>

      {feedback.message && (
        <div
          className={`alert ${
            feedback.type === 'error' ? 'alert-error' : 'alert-success'
          }`}
          role="alert"
        >
          {feedback.message}
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => {
              setLoading(true);
              setRefreshKey((k) => k + 1);
            }}
            style={{ marginLeft: '12px' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Search, Filter, and Sort Controls */}
      <div className="filter-bar">
        <div className="search-box">
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by name, email, phone, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search contacts"
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
              title="Clear search"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-select-wrapper">
          <select
            className="form-input select-input"
            value={companyFilter}
            onChange={(e) => {
              setLoading(true);
              setCompanyFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by company"
          >
            <option value="">
              All Companies {availableCompanies.length > 0 ? `(${availableCompanies.length})` : ''}
            </option>
            {availableCompanies.map((comp) => (
              <option key={comp} value={comp}>
                {comp}
              </option>
            ))}
          </select>
        </div>

        <div className="sort-controls">
          <div className="sort-group">
            <label htmlFor="sort-by-select" className="control-label">
              Sort:
            </label>
            <select
              id="sort-by-select"
              className="form-input select-input-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort by field"
            >
              <option value="createdAt">Date Added</option>
              <option value="name">Name</option>
              <option value="company">Company</option>
            </select>
          </div>

          <div className="sort-group">
            <label htmlFor="sort-order-select" className="control-label">
              Order:
            </label>
            <select
              id="sort-order-select"
              className="form-input select-input-sm"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              aria-label="Sort order"
            >
              <option value="asc">Ascending (A–Z / Oldest)</option>
              <option value="desc">Descending (Z–A / Newest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="state-card loading-state" aria-live="polite">
          <div className="spinner"></div>
          <p>Loading your contacts...</p>
        </div>
      ) : contacts.length === 0 ? (
        <div className="state-card empty-state">
          {hasActiveFilters ? (
            <>
              <h3>No matching contacts</h3>
              <p>No contacts found matching your current search or filter criteria.</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetFilters}
                style={{ marginTop: '16px' }}
              >
                Reset Filters
              </button>
            </>
          ) : (
            <>
              <h3>No contacts yet</h3>
              <p>You haven&apos;t added any contacts to your address book.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAdd}
                style={{ marginTop: '16px' }}
              >
                Add Your First Contact
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <div className="table-responsive">
            <table className="contacts-table" aria-label="Contacts list">
              <thead>
                <tr>
                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'name'
                        ? order === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="sort-header-btn"
                      onClick={() => handleSortHeader('name')}
                      aria-label={`Sort by Name${
                        sortBy === 'name'
                          ? order === 'asc'
                            ? ', currently ascending'
                            : ', currently descending'
                          : ''
                      }`}
                    >
                      <span>Name</span>
                      <span className="sort-indicator" aria-hidden="true">
                        {sortBy === 'name' ? (order === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th scope="col">Phone</th>
                  <th scope="col">Email</th>
                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'company'
                        ? order === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="sort-header-btn"
                      onClick={() => handleSortHeader('company')}
                      aria-label={`Sort by Company${
                        sortBy === 'company'
                          ? order === 'asc'
                            ? ', currently ascending'
                            : ', currently descending'
                          : ''
                      }`}
                    >
                      <span>Company</span>
                      <span className="sort-indicator" aria-hidden="true">
                        {sortBy === 'company' ? (order === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                  <th scope="col" className="actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact._id}>
                    <td className="col-name">
                      <strong>{contact.name}</strong>
                    </td>
                    <td className="col-phone">
                      <a href={`tel:${contact.phone}`} className="contact-link">
                        {contact.phone}
                      </a>
                    </td>
                    <td className="col-email">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="contact-link">
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="col-company">
                      {contact.company ? (
                        <span className="badge badge-company">{contact.company}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="col-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleOpenEdit(contact)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => confirmDelete(contact)}
                        disabled={deletingId === contact._id}
                      >
                        {deletingId === contact._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination and Summary Footer */}
          <div className="pagination-bar">
            <div className="pagination-summary">
              Showing {contacts.length > 0 ? (page - 1) * limit + 1 : 0}–
              {Math.min(page * limit, totalCount)} of {totalCount} contacts
            </div>

            <div className="pagination-controls">
              <div className="page-size-selector">
                <label htmlFor="limit-select" className="control-label">
                  Per page:
                </label>
                <select
                  id="limit-select"
                  className="form-input select-input-xs"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  aria-label="Contacts per page"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="page-navigation">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  aria-label="Previous page"
                >
                  ‹ Prev
                </button>
                <span className="page-indicator">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  aria-label="Next page"
                >
                  Next ›
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSaveContact}
        initialData={editingContact}
        isSubmitting={submittingModal}
      />

      {/* Delete Confirmation Modal */}
      {contactToDelete && (
        <div
          className="modal-backdrop"
          onClick={cancelDelete}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="modal-card modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-dialog-title" className="modal-title">Delete Contact</h3>
            <p style={{ margin: '16px 0', color: 'var(--text)' }}>
              Are you sure you want to delete <strong>{contactToDelete.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelDelete}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={executeDelete}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
