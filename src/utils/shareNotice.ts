export interface ShareNoticeData {
  id: string;
  title: string;
  body?: string | null;
  areaLabel?: string | null;
  price?: number | null;
}

/**
 * Share a notice with friends using the Native Web Share API
 * with automatic clipboard copy fallback on desktop/unsupported browsers.
 */
export async function shareNotice(notice: ShareNoticeData): Promise<{ shared: boolean; copied: boolean }> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/notice/${notice.id}`;
  const title = notice.title || 'NearNotice Post';

  let text = `Check out "${notice.title}" on NearNotice`;
  if (notice.areaLabel) {
    text += ` in ${notice.areaLabel}`;
  }
  if (notice.price != null && Number(notice.price) > 0) {
    text += ` (₹${Number(notice.price).toLocaleString('en-IN')})`;
  }

  // 1. Try Native Web Share API (Mobile Android, iOS, Modern Desktop)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text,
        url: shareUrl,
      });
      return { shared: true, copied: false };
    } catch (err: unknown) {
      // User cancelled/closed the native share sheet
      if ((err as Error)?.name === 'AbortError') {
        return { shared: false, copied: false };
      }
      // If error occurred (e.g. permission or unallowed), fall through to clipboard copy
    }
  }

  // 2. Clipboard copy fallback
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      return { shared: false, copied: true };
    }
  } catch {
    // Fallback for older environments
    const textarea = document.createElement('textarea');
    textarea.value = shareUrl;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return { shared: false, copied: true };
    } catch {
      document.body.removeChild(textarea);
    }
  }

  return { shared: false, copied: false };
}
