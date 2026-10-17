/**
 * Distance utilities for Hyperlocal Notice calculation & formatting.
 *
 * Distance display rules:
 * - Up to and including 10 km: show actual distance, e.g. 450 m, 1.2 km, 9.8 km, 10 km.
 * - Above 10 km: show distance bands in 10 km intervals:
 *     10+ km for distances greater than 10 km and up to 20 km (10 < d <= 20)
 *     20+ km for distances greater than 20 km and up to 30 km (20 < d <= 30)
 *     30+ km for distances greater than 30 km and up to 40 km (30 < d <= 40)
 *     and so on.
 */

// Calculate distance between two coordinates in kilometers using Haversine formula
export function calculateDistance(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number | null {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return null;
  }

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Returns raw numeric distance in kilometers for sorting.
 */
export function getNoticeDistanceKm(
  distanceKm?: number | null,
  userLat?: number | null,
  userLng?: number | null,
  noticeLat?: number | null,
  noticeLng?: number | null
): number | null {
  if (distanceKm != null && !isNaN(distanceKm) && distanceKm >= 0) {
    return distanceKm;
  }
  if (
    userLat != null &&
    userLng != null &&
    noticeLat != null &&
    noticeLng != null &&
    !isNaN(userLat) &&
    !isNaN(userLng) &&
    !isNaN(noticeLat) &&
    !isNaN(noticeLng)
  ) {
    return calculateDistance(userLat, userLng, noticeLat, noticeLng);
  }
  return null;
}

/**
 * Compact distance display matching the distance display rules:
 * - Up to and including 10 km: show actual distance (e.g. "450 m", "1.2 km", "9.8 km")
 * - Above 10 km: show distance bands in 10 km intervals ("10+ km", "20+ km", "30+ km", etc.)
 */
export function formatDistanceCompact(distanceInKm?: number | null): string {
  if (distanceInKm == null || isNaN(distanceInKm) || distanceInKm < 0) return '';

  // 1. Up to and including 10 km: show actual distance
  if (distanceInKm <= 10) {
    if (distanceInKm < 1) {
      const meters = Math.round(distanceInKm * 1000);
      return `${meters} m`;
    }
    const formatted = Number(distanceInKm.toFixed(1));
    return `${formatted} km`;
  }

  // 2. Above 10 km: show distance bands in 10 km intervals
  // 10+ km for 10 < d <= 20
  // 20+ km for 20 < d <= 30
  // 30+ km for 30 < d <= 40
  const band = (Math.ceil(distanceInKm / 10) - 1) * 10;
  return `${band}+ km`;
}

/**
 * Standard distance string with 'away' suffix
 */
export function formatDistance(distanceInKm?: number | null): string {
  if (distanceInKm == null || isNaN(distanceInKm) || distanceInKm < 0) return '';
  const compact = formatDistanceCompact(distanceInKm);
  return compact ? `${compact} away` : '';
}

/**
 * Returns distance label for a notice.
 * Prioritizes:
 * 1. Explicit distance_km (from Supabase/PostGIS or dataset)
 * 2. True Haversine calculation between user coordinates and notice coordinates
 * 3. Deterministic realistic distance covering various bands
 */
export function getEstimatedNoticeDistance(
  noticeId: string,
  userLat?: number | null,
  userLng?: number | null,
  noticeLat?: number | null,
  noticeLng?: number | null,
  distanceKm?: number | null
): string {
  // If user location is not enabled or coordinates are missing, distance is Unavailable
  if (userLat == null || userLng == null || isNaN(userLat) || isNaN(userLng)) {
    return 'Unavailable';
  }

  // 1. If explicit distance_km exists from database
  if (distanceKm != null && !isNaN(distanceKm) && distanceKm >= 0) {
    return formatDistanceCompact(distanceKm);
  }

  // 2. If both user and notice GPS coordinates exist, calculate true distance
  if (noticeLat != null && noticeLng != null && !isNaN(noticeLat) && !isNaN(noticeLng)) {
    const d = calculateDistance(userLat, userLng, noticeLat, noticeLng);
    if (d != null) {
      return formatDistanceCompact(d);
    }
  }

  // If notice coordinates are unavailable or calculation fails
  return 'Unavailable';
}
