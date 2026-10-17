// Calculate distance between two coordinates in kilometers using Haversine formula
export function calculateDistance(lat1, lon1, lat2, lon2) {
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

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

export function getNoticeDistanceKm(distanceKm, userLat, userLng, noticeLat, noticeLng) {
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
 * Compact distance display:
 * - Up to and including 10 km: show actual distance, e.g. 450 m, 1.2 km, 9.8 km
 * - Above 10 km: show distance bands in 10 km intervals (10+ km, 20+ km, 30+ km, etc.)
 */
export function formatDistanceCompact(distanceInKm) {
  if (distanceInKm == null || isNaN(distanceInKm) || distanceInKm < 0) return '';

  if (distanceInKm <= 10) {
    if (distanceInKm < 1) {
      const meters = Math.round(distanceInKm * 1000);
      return `${meters} m`;
    }
    const formatted = Number(distanceInKm.toFixed(1));
    return `${formatted} km`;
  }

  const band = (Math.ceil(distanceInKm / 10) - 1) * 10;
  return `${band}+ km`;
}

export function formatDistance(distanceInKm) {
  if (distanceInKm == null || isNaN(distanceInKm) || distanceInKm < 0) return '';
  const compact = formatDistanceCompact(distanceInKm);
  return compact ? `${compact} away` : '';
}

export function getEstimatedNoticeDistance(
  noticeId,
  userLat,
  userLng,
  noticeLat,
  noticeLng,
  distanceKm
) {
  if (userLat == null || userLng == null || isNaN(userLat) || isNaN(userLng)) {
    return 'Unavailable';
  }

  if (distanceKm != null && !isNaN(distanceKm) && distanceKm >= 0) {
    return formatDistanceCompact(distanceKm);
  }

  if (noticeLat != null && noticeLng != null && !isNaN(noticeLat) && !isNaN(noticeLng)) {
    const d = calculateDistance(userLat, userLng, noticeLat, noticeLng);
    if (d != null) {
      return formatDistanceCompact(d);
    }
  }

  return 'Unavailable';
}
