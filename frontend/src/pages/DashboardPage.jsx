import { useState, useEffect, useMemo, useCallback } from 'react';
import { contactService } from '../services/api';
import { ContactModal } from '../components/ContactModal';
import {
  extractContacts,
  filterContacts,
  getUniqueCompanies,
} from '../utils/contactHelpers';

export const DashboardPage = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [submittingModal, setSubmittingModal] = useState(false);

  // Delete confirmation state
  const [contactToDelete, setContactToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await contactService.getContacts();
      setContacts(extractContacts(data));
    } catch (err) {
      setError(err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await contactService.getContacts();
        if (isMounted) {
          setContacts(extractContacts(data));
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load contacts');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const showNotification = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback({ message: '', type: '' });
    }, 4000);
  };

  // Distinct company list for filter dropdown
  const uniqueCompanies = useMemo(() => {
    return getUniqueCompanies(contacts);
  }, [contacts]);

  // Filtered contacts based on search and company filter
  const filteredContacts = useMemo(() => {
    return filterContacts(contacts, searchQuery, companyFilter);
  }, [contacts, searchQuery, companyFilter]);

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
        const response = await contactService.updateContact(editingContact._id, payload);
        const updated = response.contact || { ...editingContact, ...payload };
        setContacts((prev) =>
          prev.map((c) => (c._id === editingContact._id ? updated : c))
        );
        showNotification('Contact updated successfully!');
      } else {
        const response = await contactService.createContact(payload);
        const created = response.contact;
        if (created) {
          setContacts((prev) => [created, ...prev]);
        } else {
          await fetchContacts();
        }
        showNotification('Contact added successfully!');
      }
      handleCloseModal();
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
      setContacts((prev) => prev.filter((c) => c._id !== id));
      showNotification('Contact deleted successfully!');
      setContactToDelete(null);
    } catch (err) {
      showNotification(err.message || 'Failed to delete contact', 'error');
    } finally {
      setDeletingId(null);
    }
  };

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
        >
          {feedback.message}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={fetchContacts}
            style={{ marginLeft: '12px' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="filter-bar">
        <div className="search-box">
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by name, email, phone, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {uniqueCompanies.length > 0 && (
          <div className="filter-select-wrapper">
            <select
              className="form-input select-input"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="">All Companies ({uniqueCompanies.length})</option>
              {uniqueCompanies.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="state-card loading-state">
          <div className="spinner"></div>
          <p>Loading your contacts...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="state-card empty-state">
          {contacts.length === 0 ? (
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
          ) : (
            <>
              <h3>No matching contacts</h3>
              <p>No contacts found matching your current search or filter criteria.</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setCompanyFilter('');
                }}
                style={{ marginTop: '16px' }}
              >
                Reset Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="contacts-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Company</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
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
          <div className="table-footer">
            Showing {filteredContacts.length} of {contacts.length} total contacts
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
        >
          <div className="modal-card modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Contact</h3>
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
