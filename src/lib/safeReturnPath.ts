/**
 * Return-path safety utility for NearNotice.
 * Prevents Open Redirects, header injection, auth redirect loops, and malicious URI schemes.
 */

const AUTH_PATHS = new Set([
  '/auth',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
]);

/**
 * Sanitizes and validates an arbitrary input for use as an internal redirect target.
 *
 * @param input - The untrusted candidate path from query string, router state, or email redirect.
 * @param fallback - The safe fallback path to return when input is invalid (default: '/')
 * @returns A safe, strictly same-origin relative path starting with '/'
 */
export function sanitizeReturnPath(input: unknown, fallback: string = '/'): string {
  if (typeof input !== 'string') {
    return fallback;
  }

  // 1. Length guard (prevent DoS / buffer issues)
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 512) {
    return fallback;
  }

  // 2. Reject any whitespace or ASCII control characters
  // Controls: \x00-\x1F, \x7F
  if (/[\s\x00-\x1F\x7F]/.test(trimmed)) {
    return fallback;
  }

  // 3. Reject backslashes outright (common browser bypass for domain redirection: /\evil.com)
  if (trimmed.includes('\\')) {
    return fallback;
  }

  // 4. Must start with exactly one forward slash, not '//'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback;
  }

  // 5. Check against recursive URL-encoded variants (decode up to 3 times)
  let decoded = trimmed;
  for (let i = 0; i < 3; i++) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) break;
      decoded = nextDecoded;
    } catch {
      // Malformed URI encoding (e.g. %E0%A4)
      return fallback;
    }
  }

  // Re-check decoded value for malicious patterns
  if (
    decoded.includes('\\') ||
    decoded.startsWith('//') ||
    decoded.includes('..') ||
    /[\s\x00-\x1F\x7F]/.test(decoded)
  ) {
    return fallback;
  }

  // 6. Reject any scheme prefix (http:, https:, javascript:, data:, vbscript:, file:, etc.)
  // Matches any scheme pattern like "foo:" anywhere or at root
  if (
    /^(?:[a-z0-9+.-]+:)/i.test(decoded) ||
    /^(?:[a-z0-9+.-]+:)/i.test(trimmed) ||
    /^(?:\/+)?[a-z0-9+.-]+:/i.test(decoded)
  ) {
    return fallback;
  }

  // Check common dangerous schemes explicitly
  const dangerousPatterns = [
    'javascript:',
    'data:',
    'vbscript:',
    'blob:',
    'about:',
    'file:',
  ];
  const lowerDecoded = decoded.toLowerCase();
  for (const scheme of dangerousPatterns) {
    if (lowerDecoded.includes(scheme)) {
      return fallback;
    }
  }

  // 7. Verify same-origin URL parsing
  const baseOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://nearnotice.local';

  try {
    const parsed = new URL(trimmed, baseOrigin);
    // Origin must strictly match
    if (parsed.origin !== baseOrigin) {
      return fallback;
    }
    // Must be a relative path without protocol spoofing
    if (!parsed.pathname.startsWith('/')) {
      return fallback;
    }

    // 8. Reject auth paths to prevent infinite redirection loops
    const normalizedPath = parsed.pathname.toLowerCase().replace(/\/+$/, '');
    if (AUTH_PATHS.has(normalizedPath)) {
      return fallback;
    }

    // Keep search and hash if safe
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
