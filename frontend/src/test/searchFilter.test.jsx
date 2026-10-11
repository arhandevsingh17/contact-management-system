import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchAndFilterBar } from '../components/SearchAndFilterBar';

describe('SearchAndFilterBar Component', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    selectedCategory: 'All',
    onCategoryChange: vi.fn(),
    categoryCounts: { All: 10, Work: 4, Personal: 3, Family: 1, Client: 2, Other: 0 },
    sortBy: 'name-asc',
    onSortChange: vi.fn(),
    viewMode: 'grid',
    onViewModeChange: vi.fn(),
    onAddNewContact: vi.fn(),
  };

  it('renders search input, category pills, and add contact button', () => {
    render(<SearchAndFilterBar {...defaultProps} />);

    expect(screen.getByPlaceholderText(/Search by name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Contact/i })).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('calls onSearchChange when user types in search box', () => {
    const handleSearch = vi.fn();
    render(<SearchAndFilterBar {...defaultProps} onSearchChange={handleSearch} />);

    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    fireEvent.change(searchInput, { target: { value: 'Priya' } });

    expect(handleSearch).toHaveBeenCalledWith('Priya');
  });

  it('calls onCategoryChange when a category pill is clicked', () => {
    const handleCategory = vi.fn();
    render(<SearchAndFilterBar {...defaultProps} onCategoryChange={handleCategory} />);

    const workBtn = screen.getByRole('radio', { name: /Work/i });
    fireEvent.click(workBtn);

    expect(handleCategory).toHaveBeenCalledWith('Work');
  });

  it('toggles view layout between grid and table', () => {
    const handleView = vi.fn();
    render(<SearchAndFilterBar {...defaultProps} onViewModeChange={handleView} />);

    const tableToggle = screen.getByRole('button', { name: /Table View/i });
    fireEvent.click(tableToggle);

    expect(handleView).toHaveBeenCalledWith('table');
  });
});
