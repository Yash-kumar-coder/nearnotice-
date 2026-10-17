/**
 * NearNotice Image URL Utilities
 *
 * Provides optimized thumbnail URLs for feed cards without modifying original stored images:
 * - Supabase Storage: utilizes Supabase Image Transformation endpoint if available
 * - Unsplash / CDNs: optimizes dimensions, format, and compression parameters
 * - Local / Data URLs: returns original untouched
 */

export function getOptimizedThumbnailUrl(
  url: string | null | undefined,
  width = 256,
  height = 256,
  quality = 75
): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
    return url;
  }

  // Supabase Storage URLs: map /storage/v1/object/public/ to /storage/v1/render/image/public/
  if (url.includes('/storage/v1/object/public/')) {
    const transformed = url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    const separator = transformed.includes('?') ? '&' : '?';
    return `${transformed}${separator}width=${width}&height=${height}&resize=cover&quality=${quality}`;
  }

  // Unsplash images: optimize query parameters
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', width.toString());
      parsed.searchParams.set('h', height.toString());
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('q', quality.toString());
      parsed.searchParams.set('auto', 'format');
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
}
