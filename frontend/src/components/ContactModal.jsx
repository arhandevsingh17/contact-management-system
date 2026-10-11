import { useState, useEffect } from 'react';

const CATEGORY_OPTIONS = ['Work', 'Personal', 'Family', 'Client', 'Other'];

export function ContactModal({ isOpen, onClose, onSubmit, initialData = null, isSubmitting = false }) {
  const [formData, setFormData] = useState(() => ({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
    category: initialData?.category || 'Work',
    notes: initialData?.notes || '',
  }));

  const [errors, setErrors] = useState({});

  // close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address (e.g., name@example.com)';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.trim().replace(/\D/g, '').length < 7) {
      newErrors.phone = 'Phone number must contain at least 7 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const isEdit = Boolean(initialData);

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="contact-modal-title" className="modal-title">
            {isEdit ? 'Edit Contact' : 'Add New Contact'}
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

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-body">
            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="contact-name-input" className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="contact-name-input"
                name="name"
                type="text"
                className={`form-input ${errors.name ? 'has-error' : ''}`}
                placeholder="e.g. Vikram Malhotra"
                value={formData.name}
                onChange={handleChange}
                autoFocus
              />
              {errors.name ? <div className="form-error">⚠️ {errors.name}</div> : null}
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="contact-email-input" className="form-label">
                Email Address <span className="required">*</span>
              </label>
              <input
                id="contact-email-input"
                name="email"
                type="email"
                className={`form-input ${errors.email ? 'has-error' : ''}`}
                placeholder="e.g. vikram@example.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email ? <div className="form-error">⚠️ {errors.email}</div> : null}
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label htmlFor="contact-phone-input" className="form-label">
                Phone Number <span className="required">*</span>
              </label>
              <input
                id="contact-phone-input"
                name="phone"
                type="tel"
                className={`form-input ${errors.phone ? 'has-error' : ''}`}
                placeholder="e.g. +91 98765 43210"
                value={formData.phone}
                onChange={handleChange}
              />
              {errors.phone ? <div className="form-error">⚠️ {errors.phone}</div> : null}
            </div>

            {/* Company / Organization */}
            <div className="form-group">
              <label htmlFor="contact-company-input" className="form-label">
                Company / Organization
              </label>
              <input
                id="contact-company-input"
                name="company"
                type="text"
                className="form-input"
                placeholder="e.g. Acme Innovations Ltd."
                value={formData.company}
                onChange={handleChange}
              />
              <div className="form-hint">Optional: Organization or business affiliation.</div>
            </div>

            {/* Category Select */}
            <div className="form-group">
              <label htmlFor="contact-category-select" className="form-label">
                Category Group
              </label>
              <select
                id="contact-category-select"
                name="category"
                className="form-select"
                value={formData.category}
                onChange={handleChange}
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes Textarea */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="contact-notes-textarea" className="form-label">
                Notes & Additional Context
              </label>
              <textarea
                id="contact-notes-textarea"
                name="notes"
                rows="3"
                className="form-textarea"
                placeholder="Optional notes, meeting takeaways, or follow-ups..."
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              id="save-contact-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                  Saving...
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create Contact'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContactModal;
