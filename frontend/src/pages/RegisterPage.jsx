import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      navigate('/login', {
        state: { registeredMessage: 'Registration successful! Please log in with your credentials.' },
      });
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">Create an Account</h2>
      <p className="auth-subtitle">Get started with ContactHub to manage your personal & work contacts</p>

      {serverError && <div className="alert alert-error">{serverError}</div>}

      <form onSubmit={handleSubmit} noValidate className="form-stack">
        <div className="form-group">
          <label htmlFor="register-name" className="form-label">
            Full Name
          </label>
          <input
            id="register-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Jane Doe"
            className={`form-input ${formErrors.name ? 'input-error' : ''}`}
            disabled={submitting}
            autoComplete="name"
            required
          />
          {formErrors.name && <span className="field-error">{formErrors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="register-email" className="form-label">
            Email Address
          </label>
          <input
            id="register-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={`form-input ${formErrors.email ? 'input-error' : ''}`}
            disabled={submitting}
            autoComplete="email"
            required
          />
          {formErrors.email && <span className="field-error">{formErrors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="register-password" className="form-label">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="At least 6 characters"
            className={`form-input ${formErrors.password ? 'input-error' : ''}`}
            disabled={submitting}
            autoComplete="new-password"
            required
          />
          {formErrors.password && <span className="field-error">{formErrors.password}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="register-confirm-password" className="form-label">
            Confirm Password
          </label>
          <input
            id="register-confirm-password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
            className={`form-input ${formErrors.confirmPassword ? 'input-error' : ''}`}
            disabled={submitting}
            autoComplete="new-password"
            required
          />
          {formErrors.confirmPassword && (
            <span className="field-error">{formErrors.confirmPassword}</span>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <p className="auth-footer-text">
        Already have an account?{' '}
        <Link to="/login" className="text-link">
          Log in
        </Link>
      </p>
    </div>
  );
};
