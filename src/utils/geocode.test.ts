import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  geocode,
  fetchLocationSuggestions,
  formatAddressLabel,
  getCachedAreaCoordinates,
  cacheAreaCoordinates,
  reverseGeocode,
  cacheReverseGeocode,
  clearReverseGeocodeCache,
} from './geocode';

describe('Geocode Utility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('formatAddressLabel', () => {
    it('formats address with primary and secondary elements', () => {
      const item = {
        display_name: 'Boring Road, Patna, Bihar, 800001, India',
        address: {
          road: 'Boring Road',
          city: 'Patna',
          state: 'Bihar',
        },
      };
      expect(formatAddressLabel(item)).toBe('Boring Road, Patna');
    });

    it('formats neighborhood and city', () => {
      const item = {
        display_name: 'Kankarbagh, Patna, Bihar, India',
        address: {
          suburb: 'Kankarbagh',
          city: 'Patna',
        },
      };
      expect(formatAddressLabel(item)).toBe('Kankarbagh, Patna');
    });

    it('falls back to city or state if only one is present', () => {
      const item = {
        display_name: 'Motihari, East Champaran, Bihar, India',
        address: {
          city: 'Motihari',
        },
      };
      expect(formatAddressLabel(item)).toBe('Motihari');
    });

    it('falls back to first two segments of display_name if address object is empty', () => {
      const item = {
        display_name: 'Shalimar Bagh, New Delhi, India',
      };
      expect(formatAddressLabel(item)).toBe('Shalimar Bagh, New Delhi');
    });
  });

  describe('cacheAreaCoordinates & getCachedAreaCoordinates', () => {
    it('persists and retrieves coordinates from storage', () => {
      cacheAreaCoordinates('Motihari, Bihar', 26.65, 84.91);
      const cached = getCachedAreaCoordinates('Motihari, Bihar');
      expect(cached).toEqual({ latitude: 26.65, longitude: 84.91 });
    });

    it('retrieves case-insensitively with trimmed whitespace', () => {
      cacheAreaCoordinates('Patna', 25.61, 85.12);
      const cached = getCachedAreaCoordinates('  patna  ');
      expect(cached).toEqual({ latitude: 25.61, longitude: 85.12 });
    });

    it('returns null for un-cached locations', () => {
      expect(getCachedAreaCoordinates('Unknown City')).toBeNull();
    });
  });

  describe('geocode', () => {
    it('returns null on empty input', async () => {
      const result = await geocode('');
      expect(result).toBeNull();
    });

    it('returns cached coordinates when available in localStorage', async () => {
      cacheAreaCoordinates('Ranchi', 23.34, 85.31);
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      const result = await geocode('Ranchi');
      expect(result).toEqual({
        latitude: 23.34,
        longitude: 85.31,
        displayName: 'Ranchi',
        shortName: 'Ranchi',
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fetches from Nominatim and returns coordinates on cache miss', async () => {
      const mockResponse = [
        {
          lat: '26.6506',
          lon: '84.9114',
          display_name: 'Motihari, East Champaran, Bihar, India',
          address: { city: 'Motihari', state: 'Bihar' },
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await geocode('Motihari');
      expect(result).not.toBeNull();
      expect(result?.latitude).toBeCloseTo(26.6506);
      expect(result?.longitude).toBeCloseTo(84.9114);
      expect(result?.shortName).toBe('Motihari, Bihar');

      // Verify cached in localStorage
      expect(getCachedAreaCoordinates('Motihari')).toEqual({
        latitude: 26.6506,
        longitude: 84.9114,
      });
    });

    it('handles network failure gracefully without throwing', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));
      const result = await geocode('NonExistentPlace123');
      expect(result).toBeNull();
    });
  });

  describe('fetchLocationSuggestions', () => {
    it('returns empty array when query is less than 2 characters', async () => {
      const results = await fetchLocationSuggestions('a');
      expect(results).toEqual([]);
    });

    it('parses suggestions list with clean short names', async () => {
      const mockResponse = [
        {
          place_id: 101,
          lat: '25.6165',
          lon: '85.1137',
          display_name: 'Boring Road, Patna, Bihar, 800001, India',
          address: { road: 'Boring Road', city: 'Patna' },
        },
        {
          place_id: 102,
          lat: '25.6204',
          lon: '85.1086',
          display_name: 'Boring Canal Road, Patna, Bihar, 800001, India',
          address: { road: 'Boring Canal Road', city: 'Patna' },
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const suggestions = await fetchLocationSuggestions('Boring');
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].shortName).toBe('Boring Road, Patna');
      expect(suggestions[0].latitude).toBeCloseTo(25.6165);
      expect(suggestions[1].shortName).toBe('Boring Canal Road, Patna');
    });
  });

  describe('reverseGeocode and caching', () => {
    beforeEach(() => {
      clearReverseGeocodeCache();
    });

    it('returns null on invalid coordinates', async () => {
      const res = await reverseGeocode(NaN, 85.12);
      expect(res).toBeNull();
    });

    it('fetches from Nominatim and caches result on initial lookup', async () => {
      const mockOsmData = {
        lat: '25.612',
        lon: '85.123',
        display_name: 'Boring Road, Patna, Bihar, India',
        address: {
          suburb: 'Boring Road',
          city: 'Patna',
          state: 'Bihar',
        },
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockOsmData,
      } as Response);

      const result = await reverseGeocode(25.612, 85.123);
      expect(result).not.toBeNull();
      expect(result?.city).toBe('Boring Road, Patna');
      expect(result?.latitude).toBe(25.612);
      expect(result?.longitude).toBe(85.123);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Verify request sent compliant headers
      const [calledUrl, calledOpts] = fetchSpy.mock.calls[0];
      expect(calledUrl).toContain('lat=25.612');
      expect((calledOpts as any)?.headers?.['User-Agent']).toBe('NearNotice/1.0');
    });

    it('returns cached result without network request when within 1.5 km and under 6 hours', async () => {
      cacheReverseGeocode(25.612, 85.123, {
        city: 'Boring Road, Patna',
        primary: 'Boring Road',
        secondary: 'Patna',
        displayName: 'Boring Road, Patna',
        latitude: 25.612,
        longitude: 85.123,
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      // Moved only ~150 meters (slight GPS drift)
      const result = await reverseGeocode(25.613, 85.124);
      expect(result).not.toBeNull();
      expect(result?.city).toBe('Boring Road, Patna');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('triggers a fresh fetch if user moved more than 1.5 km', async () => {
      cacheReverseGeocode(25.612, 85.123, {
        city: 'Boring Road, Patna',
        primary: 'Boring Road',
        secondary: 'Patna',
        displayName: 'Boring Road, Patna',
        latitude: 25.612,
        longitude: 85.123,
      });

      const mockNewPlace = {
        lat: '25.680',
        lon: '85.200',
        display_name: 'Danapur, Patna, Bihar, India',
        address: {
          town: 'Danapur',
          city: 'Patna',
        },
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockNewPlace,
      } as Response);

      // ~10 km away
      const result = await reverseGeocode(25.680, 85.200);
      expect(result).not.toBeNull();
      expect(result?.city).toBe('Danapur, Patna');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('deduplicates simultaneous concurrent reverse geocode calls', async () => {
      const mockOsmData = {
        display_name: 'Kankarbagh, Patna, Bihar, India',
        address: {
          suburb: 'Kankarbagh',
          city: 'Patna',
        },
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockOsmData,
                } as Response),
              20
            )
          )
      );

      const [res1, res2] = await Promise.all([
        reverseGeocode(25.594, 85.156),
        reverseGeocode(25.594, 85.156),
      ]);

      expect(res1?.city).toBe('Kankarbagh, Patna');
      expect(res2?.city).toBe('Kankarbagh, Patna');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('falls back gracefully to stale cache on network failure', async () => {
      cacheReverseGeocode(25.612, 85.123, {
        city: 'Boring Road, Patna',
        primary: 'Boring Road',
        secondary: 'Patna',
        displayName: 'Boring Road, Patna',
        latitude: 25.612,
        longitude: 85.123,
      });

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('504 Gateway Timeout'));

      // Even if moved far away, if network fails, falls back to stale cache instead of crashing
      const result = await reverseGeocode(25.750, 85.300);
      expect(result).not.toBeNull();
      expect(result?.city).toBe('Boring Road, Patna');
    });
  });
});
