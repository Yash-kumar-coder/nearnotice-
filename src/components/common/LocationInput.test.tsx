import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LocationInput } from './LocationInput';
import * as geocodeUtil from '../../utils/geocode';

describe('LocationInput Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input field with label and placeholder', () => {
    render(
      <LocationInput
        value=""
        onChange={vi.fn()}
        latitude={null}
        longitude={null}
        onCoordinatesChange={vi.fn()}
        label="Post Location"
        placeholder="Enter city or neighborhood"
      />
    );

    expect(screen.getByLabelText(/post location/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter city or neighborhood')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use my current gps location/i })).toBeInTheDocument();
  });

  it('displays verified badge when valid coordinates are present', () => {
    render(
      <LocationInput
        value="Motihari, Bihar"
        onChange={vi.fn()}
        latitude={26.65}
        longitude={84.91}
        onCoordinatesChange={vi.fn()}
      />
    );

    expect(screen.getByText(/distance enabled for neighbors/i)).toBeInTheDocument();
    expect(screen.getByText(/26.65°, 84.91°/i)).toBeInTheDocument();
  });

  it('calls onChange and clears stale coordinates when user types a new location', () => {
    const handleCoordinatesChange = vi.fn();
    const handleChange = vi.fn();

    render(
      <LocationInput
        value="Patna"
        onChange={handleChange}
        latitude={25.61}
        longitude={85.12}
        onCoordinatesChange={handleCoordinatesChange}
      />
    );

    const input = screen.getByDisplayValue('Patna');
    fireEvent.change(input, { target: { value: 'Delhi' } });

    expect(handleChange).toHaveBeenCalledWith('Delhi');
    expect(handleCoordinatesChange).toHaveBeenCalledWith(null, null);
  });

  it('shows autocomplete suggestions and updates location coordinates when clicked', async () => {
    const handleCoordinatesChange = vi.fn();
    const handleChange = vi.fn();

    vi.spyOn(geocodeUtil, 'fetchLocationSuggestions').mockResolvedValueOnce([
      {
        id: 1,
        displayName: 'Connaught Place, New Delhi, Delhi, India',
        shortName: 'Connaught Place, Delhi',
        latitude: 28.6315,
        longitude: 77.2167,
      },
    ]);

    render(
      <LocationInput
        value="Conna"
        onChange={handleChange}
        latitude={null}
        longitude={null}
        onCoordinatesChange={handleCoordinatesChange}
        debounceMs={0}
      />
    );

    const input = screen.getByDisplayValue('Conna');
    fireEvent.change(input, { target: { value: 'Connaught' } });

    await waitFor(() => {
      expect(screen.getByText('Connaught Place, Delhi')).toBeInTheDocument();
    });

    const suggestion = screen.getByText('Connaught Place, Delhi');
    fireEvent.mouseDown(suggestion);

    expect(handleChange).toHaveBeenCalledWith('Connaught Place, Delhi');
    expect(handleCoordinatesChange).toHaveBeenCalledWith(28.6315, 77.2167);
  });
});
