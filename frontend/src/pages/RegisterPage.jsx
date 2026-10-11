import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'User',
  });
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = 'Please provide a valid email';
    }

    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await register(formData.name, formData.email, formData.password, formData.role);
      toast.success(`Account created as ${formData.role}! Welcome to Contact Management.`);
      navigate('/');
    } catch (err) {
      setGeneralError(err.message || 'Registration failed. Please try again.');
      toast.error('Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <div className="brand-icon">C</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join the Contact Directory to organize your network</p>
        </div>

        {generalError ? (
          <div className="alert-banner alert-banner-error" role="alert">
            <span>⚠️</span>
            <div>{generalError}</div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="reg-name"
              name="name"
              type="text"
              className={`form-input ${errors.name ? 'has-error' : ''}`}
              placeholder="e.g. Aryan Singh"
              value={formData.name}
              onChange={handleChange}
              required
            />
            {errors.name ? <div className="form-error">⚠️ {errors.name}</div> : null}
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              Email Address <span className="required">*</span>
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              className={`form-input ${errors.email ? 'has-error' : ''}`}
              placeholder="e.g. aryan@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {errors.email ? <div className="form-error">⚠️ {errors.email}</div> : null}
          </div>

          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">
              Password <span className="required">*</span>
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              className={`form-input ${errors.password ? 'has-error' : ''}`}
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {errors.password ? <div className="form-error">⚠️ {errors.password}</div> : null}
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm-password" className="form-label">
              Confirm Password <span className="required">*</span>
            </label>
            <input
              id="reg-confirm-password"
              name="confirmPassword"
              type="password"
              className={`form-input ${errors.confirmPassword ? 'has-error' : ''}`}
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            {errors.confirmPassword ? (
              <div className="form-error">⚠️ {errors.confirmPassword}</div>
            ) : null}
          </div>

          <div className="form-group">
            <label htmlFor="reg-role" className="form-label">
              Role Permission
            </label>
            <select
              id="reg-role"
              name="role"
              className="form-select"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="User">Standard User (Manages own contacts)</option>
              <option value="Admin">Administrator (Manages all team contacts)</option>
            </select>
            <div className="form-hint">
              {formData.role === 'Admin'
                ? 'Admin accounts can view, edit, and delete contacts created by any user.'
                : 'Standard users can create and manage their personal contact records.'}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem' }}
            disabled={isSubmitting}
            id="register-submit-btn"
          >
            {isSubmitting ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                Registering...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
