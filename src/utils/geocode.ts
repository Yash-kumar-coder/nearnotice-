// Use OpenStreetMap Nominatim API for geocoding and location suggestions

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
  shortName?: string;
}

export interface LocationSuggestion {
  id: string | number;
  displayName: string;
  shortName: string;
  latitude: number;
  longitude: number;
}

const geocodeCache = new Map<string, GeocodeResult | null>();
const suggestionsCache = new Map<string, LocationSuggestion[]>();

/**
 * Check if coordinates were previously resolved and cached in localStorage
 */
export function getCachedAreaCoordinates(areaLabel: string): { latitude: number; longitude: number } | null {
  if (!areaLabel || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`nearnotice_geo_${areaLabel.trim().toLowerCase()}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse issues
  }
  return null;
}

/**
 * Cache resolved coordinates in localStorage for fast repeated lookups
 */
export function cacheAreaCoordinates(areaLabel: string, latitude: number, longitude: number): void {
  if (!areaLabel || typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `nearnotice_geo_${areaLabel.trim().toLowerCase()}`,
      JSON.stringify({ latitude, longitude })
    );
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Format raw Nominatim address object into clean human-friendly short label
 * e.g. "Boring Road, Patna" instead of full 80-character postal address
 */
export function formatAddressLabel(item: { display_name: string; address?: Record<string, string> }): string {
  const address = item.address || {};
  const primary =
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.road ||
    address.city ||
    address.town ||
    address.village ||
    address.county ||
    '';
  const secondary =
    (address.city && address.city !== primary ? address.city : '') ||
    (address.state_district && address.state_district !== primary ? address.state_district : '') ||
    (address.state && address.state !== primary ? address.state : '');

  if (primary && secondary) {
    return `${primary}, ${secondary}`;
  }
  if (primary) return primary;
  if (secondary) return secondary;

  // Fallback: take first two comma-separated segments of display_name
  const parts = (item.display_name || '').split(',').map((p) => p.trim()).filter(Boolean);
  return parts.slice(0, 2).join(', ') || item.display_name;
}

/**
 * Geocode a human-readable location string into latitude & longitude coordinates
 */
export async function geocode(locationName: string): Promise<GeocodeResult | null> {
  const query = locationName?.trim();
  if (!query) return null;

  const normalized = query.toLowerCase();

  // 1. Check in-memory session cache
  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized)!;
  }

  // 2. Check localStorage persistent cache
  const stored = getCachedAreaCoordinates(query);
  if (stored) {
    const cachedResult: GeocodeResult = {
      latitude: stored.latitude,
      longitude: stored.longitude,
      displayName: query,
      shortName: query,
    };
    geocodeCache.set(normalized, cachedResult);
    return cachedResult;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'NearNotice/1.0',
        },
      }
    );

    if (!response.ok) return null;
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      const lat = parseFloat(first.lat);
      const lon = parseFloat(first.lon);

      if (!isNaN(lat) && !isNaN(lon)) {
        const shortName = formatAddressLabel(first);
        const result: GeocodeResult = {
          latitude: lat,
          longitude: lon,
          displayName: first.display_name,
          shortName,
        };
        geocodeCache.set(normalized, result);
        cacheAreaCoordinates(query, lat, lon);
        if (shortName && shortName.toLowerCase() !== normalized) {
          cacheAreaCoordinates(shortName, lat, lon);
        }
        return result;
      }
    }

    // Try fallback without secondary qualifiers if comma separated
    if (query.includes(',')) {
      const primaryPart = query.split(',')[0].trim();
      if (primaryPart.length >= 3 && primaryPart !== query) {
        return await geocode(primaryPart);
      }
    }

    geocodeCache.set(normalized, null);
    return null;
  } catch (error) {
    console.warn('[NearNotice] Geocoding lookup error:', error);
    return null;
  }
}

/**
 * Fetch autocomplete suggestions for location search
 */
export async function fetchLocationSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<LocationSuggestion[]> {
  const trimmed = query?.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const normalized = trimmed.toLowerCase();
  if (suggestionsCache.has(normalized)) {
    return suggestionsCache.get(normalized)!;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&limit=5&addressdetails=1`,
      {
        signal,
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'NearNotice/1.0',
        },
      }
    );

    if (!response.ok) return [];
    const data = await response.json();

    if (!Array.isArray(data)) return [];

    const results: LocationSuggestion[] = data
      .map((item: any) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        if (isNaN(lat) || isNaN(lon)) return null;

        const shortName = formatAddressLabel(item);
        // Also cache individual suggestions
        cacheAreaCoordinates(shortName, lat, lon);

        return {
          id: item.place_id || `${lat}_${lon}`,
          displayName: item.display_name,
          shortName,
          latitude: lat,
          longitude: lon,
        };
      })
      .filter((item): item is LocationSuggestion => item !== null);

    suggestionsCache.set(normalized, results);
    return results;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return [];
    }
    console.warn('[NearNotice] Location suggestion error:', error);
    return [];
  }
}
