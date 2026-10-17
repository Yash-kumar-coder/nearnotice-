import { describe, it, expect } from 'vitest';
import { getOptimizedThumbnailUrl } from './imageUrl';

describe('getOptimizedThumbnailUrl', () => {
  it('returns empty string for null or empty input', () => {
    expect(getOptimizedThumbnailUrl(null)).toBe('');
    expect(getOptimizedThumbnailUrl('')).toBe('');
    expect(getOptimizedThumbnailUrl(undefined)).toBe('');
  });

  it('preserves local paths, data urls and blob urls', () => {
    expect(getOptimizedThumbnailUrl('/logo.png')).toBe('/logo.png');
    expect(getOptimizedThumbnailUrl('data:image/png;base64,123')).toBe('data:image/png;base64,123');
    expect(getOptimizedThumbnailUrl('blob:http://localhost/abc')).toBe('blob:http://localhost/abc');
  });

  it('converts Supabase object URL to render transformation URL with thumbnail dimensions', () => {
    const raw =
      'https://xyz.supabase.co/storage/v1/object/public/notice-images/user-1/sample.jpg';
    const optimized = getOptimizedThumbnailUrl(raw, 256, 256, 75);

    expect(optimized).toContain('/storage/v1/render/image/public/notice-images/user-1/sample.jpg');
    expect(optimized).toContain('width=256');
    expect(optimized).toContain('height=256');
    expect(optimized).toContain('resize=cover');
    expect(optimized).toContain('quality=75');
  });

  it('optimizes Unsplash URLs with width, height, crop and auto format', () => {
    const raw =
      'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=600&q=80';
    const optimized = getOptimizedThumbnailUrl(raw, 256, 256, 75);

    expect(optimized).toContain('w=256');
    expect(optimized).toContain('h=256');
    expect(optimized).toContain('q=75');
    expect(optimized).toContain('auto=format');
  });
});
