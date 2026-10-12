import { useState } from 'react';

const ContactModalForm = ({
  initialData,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
    };
    if (formData.email.trim()) {
      payload.email = formData.email.trim();
    } else if (initialData) {
      payload.email = '';
    }
    if (formData.company.trim()) {
      payload.company = formData.company.trim();
    } else if (initialData) {
      payload.company = '';
    }

    onSubmit(payload);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title">
            {initialData ? 'Edit Contact' : 'Add New Contact'}
          </h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="form-stack">
          <div className="form-group">
            <label htmlFor="contact-name" className="form-label">
              Name *
            </label>
            <input
              id="contact-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Sarah Connor"
              className={`form-input ${errors.name ? 'input-error' : ''}`}
              disabled={isSubmitting}
              required
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="contact-phone" className="form-label">
              Phone *
            </label>
            <input
              id="contact-phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +1 555-0199"
              className={`form-input ${errors.phone ? 'input-error' : ''}`}
              disabled={isSubmitting}
              required
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="contact-email" className="form-label">
              Email Address
            </label>
            <input
              id="contact-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. sarah@example.com"
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              disabled={isSubmitting}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="contact-company" className="form-label">
              Company / Organization
            </label>
            <input
              id="contact-company"
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="e.g. Acme Corp"
              className="form-input"
              disabled={isSubmitting}
            />
          </div>

          <div className="modal-actions">
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
            >
              {isSubmitting
                ? 'Saving...'
                : initialData
                ? 'Update Contact'
                : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ContactModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <ContactModalForm
      key={initialData?._id || 'new'}
      initialData={initialData}
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
};
