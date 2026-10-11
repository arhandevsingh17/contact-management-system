import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatsOverview from '../components/StatsOverview'

describe('StatsOverview', () => {
  const mockStats = {
    total: 42,
    active: 35,
    groups: 7,
    recentlyAdded: 3,
  }

  // ── Rendering with real data ──────────────────────────────────────────────

  it('renders all four stat cards', () => {
    render(<StatsOverview stats={mockStats} />)

    expect(screen.getByLabelText(/total contacts/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/active/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/groups/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/recently added/i)).toBeInTheDocument()
  })

  it('displays the correct numeric values', () => {
    render(<StatsOverview stats={mockStats} />)

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('35')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays all four card labels', () => {
    render(<StatsOverview stats={mockStats} />)

    expect(screen.getByText(/total contacts/i)).toBeInTheDocument()
    expect(screen.getByText(/active/i)).toBeInTheDocument()
    expect(screen.getByText(/groups/i)).toBeInTheDocument()
    expect(screen.getByText(/recently added/i)).toBeInTheDocument()
  })

  // ── Loading state ─────────────────────────────────────────────────────────

  it('renders skeleton placeholders when loading=true', () => {
    render(<StatsOverview stats={mockStats} loading />)

    // No numeric values should appear while loading
    expect(screen.queryByText('42')).not.toBeInTheDocument()
    expect(screen.queryByText('35')).not.toBeInTheDocument()
    // Skeleton elements should be present
    const skeletons = document.querySelectorAll('.skeleton')
    // 2 skeleton spans per card × 4 cards = 8
    expect(skeletons).toHaveLength(8)
  })

  it('renders stat values after loading completes', () => {
    const { rerender } = render(<StatsOverview stats={mockStats} loading />)

    expect(screen.queryByText('42')).not.toBeInTheDocument()

    rerender(<StatsOverview stats={mockStats} loading={false} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  // ── Edge cases ────────────────────────────────────────────────────────────

  it('shows em-dash fallback when a stat value is undefined', () => {
    render(<StatsOverview stats={{ total: 10 }} />)

    // active, groups, recentlyAdded are undefined → show '—'
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBe(3)
  })

  it('renders without crashing when stats prop is null', () => {
    render(<StatsOverview stats={null} />)
    // Component should still show 4 cards, all with em-dash fallbacks
    expect(screen.getAllByText('—')).toHaveLength(4)
  })

  it('renders the section landmark with accessible label', () => {
    render(<StatsOverview stats={mockStats} />)
    expect(
      screen.getByRole('region', { name: /contact statistics/i }),
    ).toBeInTheDocument()
  })

  it('shows the emoji icons for each stat', () => {
    render(<StatsOverview stats={mockStats} />)
    expect(screen.getByText('👥')).toBeInTheDocument()
    expect(screen.getByText('✅')).toBeInTheDocument()
    // 🗂️ may render as multiple code points; check by class
    const icons = document.querySelectorAll('.stat-icon')
    expect(icons).toHaveLength(4)
  })

  it('does not render loading skeletons when loading is false (default)', () => {
    render(<StatsOverview stats={mockStats} />)
    expect(document.querySelectorAll('.skeleton')).toHaveLength(0)
  })
})
