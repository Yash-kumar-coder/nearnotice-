import { describe, it, expect } from 'vitest';
import {
  formatDistanceCompact,
  formatDistance,
  calculateDistance,
  getEstimatedNoticeDistance,
} from './distance';

describe('Distance Display Rules', () => {
  describe('Up to and including 10 km: actual distance', () => {
    it('formats sub-kilometer distances in meters', () => {
      expect(formatDistanceCompact(0.45)).toBe('450 m');
      expect(formatDistanceCompact(0.05)).toBe('50 m');
      expect(formatDistanceCompact(0.85)).toBe('850 m');
    });

    it('formats distances between 1 km and 10 km with actual distance', () => {
      expect(formatDistanceCompact(1.2)).toBe('1.2 km');
      expect(formatDistanceCompact(5.0)).toBe('5 km');
      expect(formatDistanceCompact(9.8)).toBe('9.8 km');
      expect(formatDistanceCompact(10.0)).toBe('10 km');
    });
  });

  describe('Above 10 km: distance bands in 10 km intervals', () => {
    it('shows 10+ km for distances greater than 10 km and up to 20 km', () => {
      expect(formatDistanceCompact(10.1)).toBe('10+ km');
      expect(formatDistanceCompact(12.0)).toBe('10+ km');
      expect(formatDistanceCompact(15.5)).toBe('10+ km');
      expect(formatDistanceCompact(20.0)).toBe('10+ km');
    });

    it('shows 20+ km for distances greater than 20 km and up to 30 km', () => {
      expect(formatDistanceCompact(20.1)).toBe('20+ km');
      expect(formatDistanceCompact(25.0)).toBe('20+ km');
      expect(formatDistanceCompact(30.0)).toBe('20+ km');
    });

    it('shows 30+ km for distances greater than 30 km and up to 40 km', () => {
      expect(formatDistanceCompact(30.1)).toBe('30+ km');
      expect(formatDistanceCompact(35.0)).toBe('30+ km');
      expect(formatDistanceCompact(40.0)).toBe('30+ km');
    });

    it('continues for higher intervals (40+ km, 50+ km, 100+ km)', () => {
      expect(formatDistanceCompact(40.5)).toBe('40+ km');
      expect(formatDistanceCompact(50.0)).toBe('40+ km');
      expect(formatDistanceCompact(55.0)).toBe('50+ km');
      expect(formatDistanceCompact(100.5)).toBe('100+ km');
    });
  });

  describe('Edge cases and empty handling', () => {
    it('returns empty string for null, undefined, or invalid inputs', () => {
      expect(formatDistanceCompact(null)).toBe('');
      expect(formatDistanceCompact(undefined)).toBe('');
      expect(formatDistanceCompact(NaN)).toBe('');
      expect(formatDistanceCompact(-5)).toBe('');
    });

    it('formats with "away" suffix when formatDistance is called', () => {
      expect(formatDistance(0.45)).toBe('450 m away');
      expect(formatDistance(1.2)).toBe('1.2 km away');
      expect(formatDistance(15)).toBe('10+ km away');
      expect(formatDistance(null)).toBe('');
    });
  });

  describe('Without location enabled: returns Unavailable', () => {
    it('returns "Unavailable" when user location coordinates are null or undefined', () => {
      expect(getEstimatedNoticeDistance('notice-1', null, null, 25.612, 85.123)).toBe('Unavailable');
      expect(getEstimatedNoticeDistance('notice-2', undefined, undefined, 25.612, 85.123)).toBe('Unavailable');
      expect(getEstimatedNoticeDistance('notice-3', NaN, NaN, 25.612, 85.123)).toBe('Unavailable');
      expect(getEstimatedNoticeDistance('notice-4')).toBe('Unavailable');
    });

    it('returns "Unavailable" without location enabled even if distance_km is present', () => {
      expect(getEstimatedNoticeDistance('notice-1', null, null, null, null, 1.2)).toBe('Unavailable');
    });
  });

  describe('With location enabled: calculates distance or distance bands', () => {
    const userLat = 25.612;
    const userLng = 85.123;

    it('formats explicit distanceKm from PostGIS when location is enabled', () => {
      expect(getEstimatedNoticeDistance('notice-1', userLat, userLng, null, null, 0.45)).toBe('450 m');
      expect(getEstimatedNoticeDistance('notice-1', userLat, userLng, null, null, 1.2)).toBe('1.2 km');
      expect(getEstimatedNoticeDistance('notice-1', userLat, userLng, null, null, 15)).toBe('10+ km');
      expect(getEstimatedNoticeDistance('notice-1', userLat, userLng, null, null, 25)).toBe('20+ km');
    });

    it('calculates true Haversine distance between coordinates', () => {
      // Notice coords ~1 km away
      const res = getEstimatedNoticeDistance('notice-1', userLat, userLng, 25.621, 85.123);
      expect(res).toBe('1 km');
    });

    it('returns "Unavailable" if notice coordinates are missing', () => {
      expect(getEstimatedNoticeDistance('notice-1', userLat, userLng, null, null)).toBe('Unavailable');
    });
  });
});
