import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, Check, Navigation, X } from 'lucide-react';
import {
  fetchLocationSuggestions,
  geocode,
  LocationSuggestion,
  reverseGeocode,
} from '../../utils/geocode';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  latitude: number | null;
  longitude: number | null;
  onCoordinatesChange: (lat: number | null, lng: number | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  debounceMs?: number;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  latitude,
  longitude,
  onCoordinatesChange,
  label = 'Location',
  placeholder = 'e.g. Motihari, Bihar or Connaught Place, Delhi',
  required = true,
  disabled = false,
  id = 'location-input',
  debounceMs = 250,
}) => {
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [isResolvingCoords, setIsResolvingCoords] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasCoordinates =
    latitude != null &&
    longitude != null &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced autocomplete suggestions search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    // Invalidate previous coordinates when the user manually alters the location text
    if (hasCoordinates) {
      onCoordinatesChange(null, null);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const trimmed = newVal.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearchingSuggestions(false);
      return;
    }

    setIsSearchingSuggestions(true);
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const results = await fetchLocationSuggestions(trimmed, controller.signal);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setHighlightedIndex(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, debounceMs);
  };

  // Handle selecting a suggested place
  const handleSelectSuggestion = (item: LocationSuggestion) => {
    onChange(item.shortName || item.displayName);
    onCoordinatesChange(item.latitude, item.longitude);
    setShowDropdown(false);
    setSuggestions([]);
  };

  // Auto-geocode on blur if user typed without selecting a suggestion
  const handleBlur = async () => {
    // Wait slightly so click on suggestion dropdown fires first
    setTimeout(async () => {
      if (!value.trim()) return;
      if (latitude == null || longitude == null) {
        setIsResolvingCoords(true);
        try {
          const geo = await geocode(value.trim());
          if (geo) {
            onCoordinatesChange(geo.latitude, geo.longitude);
          }
        } finally {
          setIsResolvingCoords(false);
        }
      }
    }, 200);
  };

  // Handle keyboard navigation in suggestions dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // "Use current" browser geolocation handler
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onCoordinatesChange(lat, lng);

        try {
          const rev = await reverseGeocode(lat, lng);
          onChange(rev?.city || 'Current Location');
        } catch {
          onChange('Current Location');
        } finally {
          setLocating(false);
          setShowDropdown(false);
        }
      },
      () => {
        alert('Could not retrieve current location. Please type your location manually.');
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, [onChange, onCoordinatesChange]);

  return (
    <div ref={containerRef} className="relative">
      {/* Top Header Row with Label & Use Current Action */}
      <div className="flex justify-between items-center mb-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-gray-800">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating || disabled}
          className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          aria-label="Use my current GPS location"
        >
          {locating ? (
            <Loader2 size={13} className="animate-spin text-primary shrink-0" />
          ) : (
            <Navigation size={12} className="text-primary shrink-0" />
          )}
          <span>{locating ? 'Locating...' : 'Use current'}</span>
        </button>
      </div>

      {/* Input Field Container */}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => {
            if (suggestions.length > 0 && !hasCoordinates) {
              setShowDropdown(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className="w-full bg-gray-100/80 border border-transparent rounded-2xl py-3.5 pl-4 pr-11 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        />

        {/* Right Status Indicator / Icon */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {isSearchingSuggestions || isResolvingCoords ? (
            <Loader2 size={16} className="text-blue-500 animate-spin" />
          ) : hasCoordinates ? (
            <span
              title={`Coordinates verified: ${latitude?.toFixed(3)}°, ${longitude?.toFixed(3)}°`}
              className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs"
            >
              <Check size={13} className="stroke-[2.5]" />
            </span>
          ) : (
            <MapPin size={16} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Location suggestions"
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-200/90 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-gray-100 animate-in fade-in duration-150"
        >
          {suggestions.map((item, index) => {
            const isHighlighted = highlightedIndex === index;
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={isHighlighted}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur before selection
                  handleSelectSuggestion(item);
                }}
                className={`p-3 cursor-pointer flex items-start gap-2.5 transition-colors ${
                  isHighlighted ? 'bg-blue-50/80' : 'hover:bg-gray-50'
                }`}
              >
                <MapPin size={15} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs sm:text-sm text-gray-900 leading-tight">
                    {item.shortName}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">
                    {item.displayName}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Verified Coordinates Helper Badge */}
      {hasCoordinates && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium px-1">
          <Check size={12} className="text-emerald-600 shrink-0" />
          <span>
            Distance enabled for neighbors ({latitude?.toFixed(2)}°, {longitude?.toFixed(2)}°)
          </span>
        </div>
      )}
    </div>
  );
};
