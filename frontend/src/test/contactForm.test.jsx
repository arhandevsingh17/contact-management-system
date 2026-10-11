import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContactModal } from '../components/ContactModal';

describe('ContactModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ContactModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal inputs when isOpen is true', () => {
    render(<ContactModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category Group/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Contact/i })).toBeInTheDocument();
  });

  it('validates required fields on submission', () => {
    const handleSubmit = vi.fn();
    render(<ContactModal isOpen={true} onClose={vi.fn()} onSubmit={handleSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /Create Contact/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Full name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Phone number is required/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits valid contact details successfully', () => {
    const handleSubmit = vi.fn();
    render(<ContactModal isOpen={true} onClose={vi.fn()} onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Aarav Sharma' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'aarav@techcorp.in' },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { value: '+91 98201 44521' },
    });
    fireEvent.change(screen.getByLabelText(/Company \/ Organization/i), {
      target: { value: 'TechCorp' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create Contact/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Aarav Sharma',
        email: 'aarav@techcorp.in',
        phone: '+91 98201 44521',
        company: 'TechCorp',
      })
    );
  });
});
