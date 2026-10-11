import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { contactService } from '../services/contactService';
import { StatsOverview } from '../components/StatsOverview';
import { SearchAndFilterBar } from '../components/SearchAndFilterBar';
import { ContactCard } from '../components/ContactCard';
import { ContactTable } from '../components/ContactTable';
import { ContactModal } from '../components/ContactModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { useDebounce } from '../hooks/useDebounce';

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();

  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');
  const [viewMode, setViewMode] = useState('grid');

  const debouncedSearch = useDebounce(searchQuery, 300);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const sortOptions = {
        'name-asc': { sortBy: 'name', order: 'asc' },
        'name-desc': { sortBy: 'name', order: 'desc' },
        company: { sortBy: 'company', order: 'asc' },
        newest: { sortBy: 'createdAt', order: 'desc' },
      };

      const sorting = sortOptions[sortBy] || sortOptions['name-asc'];

      const data = await contactService.getContacts({
        search: debouncedSearch.trim(),
        ...sorting,
        page: 1,
        limit: 100,
      });

      setContacts(data.contacts || []);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setLoadError(err.message || 'Could not load contacts from server.');
      toast.error(err.message || 'Unable to fetch contact records.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, sortBy, toast]);

  useEffect(() => {
    let ignore = false;
    queueMicrotask(() => {
      if (!ignore) {
        fetchContacts();
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchContacts]);

  const canModify = useCallback(
    (contact) => {
      if (isAdmin) return true;
      if (!contact.userId) return true;
      return contact.userId === user?.id;
    },
    [isAdmin, user?.id]
  );

  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    if (selectedCategory !== 'All') {
      result = result.filter(
        (contact) => contact.category === selectedCategory
      );
    }

    if (debouncedSearch.trim()) {
      const query = debouncedSearch.trim().toLowerCase();

      result = result.filter((contact) => {
        const nameMatch = contact.name?.toLowerCase().includes(query);
        const emailMatch = contact.email?.toLowerCase().includes(query);
        const phoneMatch = String(contact.phone || '')
          .toLowerCase()
          .includes(query);
        const companyMatch = contact.company?.toLowerCase().includes(query);
        const notesMatch = contact.notes?.toLowerCase().includes(query);

        return (
          nameMatch ||
          emailMatch ||
          phoneMatch ||
          companyMatch ||
          notesMatch
        );
      });
    }

    return result;
  }, [contacts, selectedCategory, debouncedSearch]);

  const categoryCounts = useMemo(() => {
    const counts = {
      All: contacts.length,
      Work: 0,
      Personal: 0,
      Family: 0,
      Client: 0,
      Other: 0,
    };

    contacts.forEach((contact) => {
      if (counts[contact.category] !== undefined) {
        counts[contact.category] += 1;
      } else {
        counts.Other += 1;
      }
    });

    return counts;
  }, [contacts]);

  const handleModalSubmit = async (formData) => {
    try {
      setIsSubmitting(true);

      if (editingContact) {
        await contactService.updateContact(editingContact._id, formData);
        toast.success(`Contact for "${formData.name}" updated successfully.`);
      } else {
        await contactService.createContact(formData);
        toast.success(`Contact for "${formData.name}" created successfully.`);
      }

      setIsModalOpen(false);
      setEditingContact(null);

      await fetchContacts();
    } catch (err) {
      console.error('Save failed:', err);
      toast.error(err.message || 'Failed to save contact record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingContact) return;

    try {
      setIsDeleting(true);

      await contactService.deleteContact(deletingContact._id);

      toast.success(`Contact for "${deletingContact.name}" was deleted.`);
      setIsDeleteOpen(false);
      setDeletingContact(null);

      await fetchContacts();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error(err.message || 'Failed to delete contact.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (contact) => {
    setDeletingContact(contact);
    setIsDeleteOpen(true);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
  };

  return (
    <main className="main-content">
      <StatsOverview contacts={contacts} />

      <SearchAndFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categoryCounts={categoryCounts}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddNewContact={handleOpenAdd}
      />

      {loadError && (
        <div className="alert-banner alert-banner-error" role="alert">
          <span>⚠️</span>
          <div style={{ flex: 1 }}>{loadError}</div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchContacts}
            disabled={isLoading}
          >
            {isLoading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      {isLoading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 1rem',
            gap: '1rem',
          }}
        >
          <div
            className="spinner"
            style={{
              width: '2.5rem',
              height: '2.5rem',
              color: 'var(--primary)',
            }}
          />
          <p style={{ color: 'var(--text-secondary)' }}>
            Loading contact directory...
          </p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-state-icon" aria-hidden="true">
            📇
          </div>

          <h2 className="empty-state-title">
            {searchQuery || selectedCategory !== 'All'
              ? 'No Matching Contacts Found'
              : 'Your Contact Directory is Empty'}
          </h2>

          <p className="empty-state-desc">
            {searchQuery || selectedCategory !== 'All'
              ? `No records matched your search query "${searchQuery}" in category "${selectedCategory}". Try clearing your filters.`
              : 'Keep track of your clients, colleagues, friends, and family by adding your first contact.'}
          </p>

          {searchQuery || selectedCategory !== 'All' ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetFilters}
            >
              Reset All Filters
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
            >
              + Add Your First Contact
            </button>
          )}
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>
              Showing <strong>{filteredContacts.length}</strong> of{' '}
              <strong>{contacts.length}</strong> loaded contacts
              {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
            </span>
          </div>

          {viewMode === 'grid' ? (
            <div className="contacts-grid">
              {filteredContacts.map((contact) => (
                <ContactCard
                  key={contact._id}
                  contact={contact}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                  canModify={canModify(contact)}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : (
            <ContactTable
              contacts={filteredContacts}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              canModify={canModify}
              isAdmin={isAdmin}
            />
          )}
        </>
      )}

      {isModalOpen && (
        <ContactModal
          key={editingContact ? editingContact._id : 'new-contact'}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingContact(null);
          }}
          onSubmit={handleModalSubmit}
          initialData={editingContact}
          isSubmitting={isSubmitting}
        />
      )}

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingContact(null);
        }}
        onConfirm={handleConfirmDelete}
        contact={deletingContact}
        isDeleting={isDeleting}
      />
    </main>
  );
}

export default DashboardPage;