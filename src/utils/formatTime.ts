/**
 * Format relative time using standard browser Intl.RelativeTimeFormat.
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    const absDiff = Math.abs(diffSeconds);
    if (absDiff < 60) {
      return 'just now';
    }
    if (absDiff < 3600) {
      return rtf.format(Math.round(diffSeconds / 60), 'minute');
    }
    if (absDiff < 86400) {
      return rtf.format(Math.round(diffSeconds / 3600), 'hour');
    }
    if (absDiff < 2592000) {
      return rtf.format(Math.round(diffSeconds / 86400), 'day');
    }
    return rtf.format(Math.round(diffSeconds / 2592000), 'month');
  } catch {
    return 'recently';
  }
}
