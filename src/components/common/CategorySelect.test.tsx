import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CategorySelect, CATEGORIES } from './CategorySelect';

describe('CategorySelect', () => {
  it('renders with default category and label', () => {
    const handleChange = vi.fn();
    render(<CategorySelect value="Items for Sale" onChange={handleChange} />);

    expect(screen.getByText('Select category')).toBeInTheDocument();
    // Trigger button should show selected category name
    const triggerButtons = screen.getAllByRole('button');
    expect(triggerButtons[0]).toHaveTextContent('Items for Sale');
  });

  it('opens animated dropdown when clicked and lists all categories with simple names', () => {
    const handleChange = vi.fn();
    render(<CategorySelect value="Items for Sale" onChange={handleChange} />);

    const trigger = screen.getAllByRole('button')[0];
    fireEvent.click(trigger);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    // Verify all categories exist in dropdown
    for (const catName of CATEGORIES) {
      expect(screen.getAllByText(catName).length).toBeGreaterThan(0);
    }
  });

  it('selects a category from dropdown and triggers onChange', () => {
    const handleChange = vi.fn();
    render(<CategorySelect value="Items for Sale" onChange={handleChange} />);

    const trigger = screen.getAllByRole('button')[0];
    fireEvent.click(trigger);

    // Click on Services option
    const servicesOption = screen.getByRole('option', { name: /services/i });
    fireEvent.click(servicesOption);

    expect(handleChange).toHaveBeenCalledWith('Services');
    // Dropdown should close
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects category via quick chip', () => {
    const handleChange = vi.fn();
    render(<CategorySelect value="Items for Sale" onChange={handleChange} />);

    // Quick chip for Events
    const eventsChip = screen.getByText('Events');
    fireEvent.click(eventsChip);

    expect(handleChange).toHaveBeenCalledWith('Events');
  });

  it('closes dropdown on Escape key', () => {
    const handleChange = vi.fn();
    render(<CategorySelect value="Items for Sale" onChange={handleChange} />);

    const trigger = screen.getAllByRole('button')[0];
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
