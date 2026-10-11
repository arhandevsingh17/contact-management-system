import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

function renderWithProviders(ui) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('LoginPage Component', () => {
  it('renders login form with email, password, and sign-in button', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('populates fields when demo user and admin buttons are clicked', () => {
    renderWithProviders(<LoginPage />);

    const fillUserBtn = screen.getByRole('button', { name: /Fill Demo User/i });
    fireEvent.click(fillUserBtn);

    const emailInput = screen.getByLabelText(/Email Address/i);
    expect(emailInput.value).toBe('user@contacthub.com');

    const fillAdminBtn = screen.getByRole('button', { name: /Fill Demo Admin/i });
    fireEvent.click(fillAdminBtn);

    expect(emailInput.value).toBe('admin@contacthub.com');
  });

  it('displays error if submitted with empty credentials', async () => {
    renderWithProviders(<LoginPage />);

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Please fill in both email and password/i)
    ).toBeInTheDocument();
  });
});
