import { useEffect } from 'react';

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, contact, isDeleting = false }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !contact) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2 id="delete-modal-title" className="modal-title" style={{ color: '#dc2626' }}>
            Delete Contact
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-main)', marginBottom: '0.75rem' }}>
            Are you sure you want to permanently delete <strong>{contact.name}</strong>?
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            This will remove the contact record from the directory. This action cannot be reversed.
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
            id="confirm-delete-btn"
          >
            {isDeleting ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                Deleting...
              </>
            ) : (
              'Confirm Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
