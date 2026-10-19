import { calculateDistance } from './distance';

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

export interface ReverseGeocodeResult {
  city: string;
  primary: string;
  secondary: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export interface CachedReverseGeocodeEntry extends ReverseGeocodeResult {
  timestamp: number;
}

export const REVERSE_GEOCODE_CACHE_KEY = 'nearnotice_revgeo_cache';
export const REVERSE_GEOCODE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
export const MAX_MOVEMENT_KM_FOR_CACHE = 1.5; // Within 1.5 km, reuse cached location

let inMemoryRevGeoCache: CachedReverseGeocodeEntry | null = null;
let activeRevGeoPromise: Promise<ReverseGeocodeResult | null> | null = null;

const geocodeCache = new Map<string, GeocodeResult | null>();
const suggestionsCache = new Map<string, LocationSuggestion[]>();

/**
 * Format Nominatim reverse geocode response into structured city and locality
 */
export function formatReverseGeocodeData(
  data: any,
  lat: number,
  lng: number
): ReverseGeocodeResult {
  const address = data?.address || {};
  const primary =
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.road ||
    address.town ||
    address.village ||
    address.city ||
    address.municipality ||
    address.district ||
    address.county ||
    '';

  const secondary =
    (address.city && address.city !== primary ? address.city : '') ||
    (address.state_district && address.state_district !== primary ? address.state_district : '') ||
    (address.state && address.state !== primary ? address.state : '');

  const city =
    primary && secondary
      ? `${primary}, ${secondary}`
      : primary || secondary || 'Current Location';

  return {
    city,
    primary,
    secondary,
    displayName: data?.display_name || city,
    latitude: lat,
    longitude: lng,
  };
}

/**
 * Get cached reverse geocode result if within 1.5 km and under 6 hours old
 */
export function getCachedReverseGeocode(
  lat: number,
  lng: number
): ReverseGeocodeResult | null {
  if (typeof window === 'undefined') return null;
  const now = Date.now();

  const isEntryValid = (entry: CachedReverseGeocodeEntry | null): entry is CachedReverseGeocodeEntry => {
    if (!entry) return false;
    if (typeof entry.latitude !== 'number' || typeof entry.longitude !== 'number') return false;
    if (now - entry.timestamp > REVERSE_GEOCODE_TTL_MS) return false;
    const dist = calculateDistance(entry.latitude, entry.longitude, lat, lng);
    return dist !== null && dist <= MAX_MOVEMENT_KM_FOR_CACHE;
  };

  // 1. Check in-memory cache
  if (isEntryValid(inMemoryRevGeoCache)) {
    return inMemoryRevGeoCache;
  }

  // 2. Check localStorage
  try {
    const raw = localStorage.getItem(REVERSE_GEOCODE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedReverseGeocodeEntry;
      if (isEntryValid(parsed)) {
        inMemoryRevGeoCache = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse error
  }

  return null;
}

/**
 * Cache reverse geocode result in both memory and localStorage
 */
export function cacheReverseGeocode(
  lat: number,
  lng: number,
  data: ReverseGeocodeResult
): void {
  if (typeof window === 'undefined') return;
  const entry: CachedReverseGeocodeEntry = {
    ...data,
    latitude: lat,
    longitude: lng,
    timestamp: Date.now(),
  };
  inMemoryRevGeoCache = entry;
  try {
    localStorage.setItem(REVERSE_GEOCODE_CACHE_KEY, JSON.stringify(entry));
    if (data.city) {
      localStorage.setItem('nearnotice_city', data.city);
    }
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Clear reverse geocode cache (useful for testing or manual refresh)
 */
export function clearReverseGeocodeCache(): void {
  inMemoryRevGeoCache = null;
  activeRevGeoPromise = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(REVERSE_GEOCODE_CACHE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Reverse geocode latitude and longitude to a human-readable city/locality.
 * Uses persistent localStorage cache with a 6-hour TTL and 1.5 km proximity threshold,
 * in-flight request deduplication, and compliant Nominatim headers.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult | null> {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  // 1. Check cache first
  const cached = getCachedReverseGeocode(lat, lng);
  if (cached) {
    return cached;
  }

  // 2. Deduplicate in-flight requests
  if (activeRevGeoPromise) {
    return activeRevGeoPromise;
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          signal,
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'NearNotice/1.0',
          },
        }
      );

      if (!response.ok) {
        return inMemoryRevGeoCache;
      }

      const data = await response.json();
      const result = formatReverseGeocodeData(data, lat, lng);
      cacheReverseGeocode(lat, lng, result);
      return result;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return null;
      }
      console.warn('[NearNotice] Reverse geocoding error:', error);
      return inMemoryRevGeoCache;
    } finally {
      activeRevGeoPromise = null;
    }
  })();

  activeRevGeoPromise = fetchPromise;
  return fetchPromise;
}

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
