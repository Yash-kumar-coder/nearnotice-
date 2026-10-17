import { describe, it, expect } from 'vitest';
import { sanitizeReturnPath } from './safeReturnPath';

describe('sanitizeReturnPath', () => {
  it('accepts valid relative internal paths', () => {
    expect(sanitizeReturnPath('/feed')).toBe('/feed');
    expect(sanitizeReturnPath('/saved')).toBe('/saved');
    expect(sanitizeReturnPath('/profile')).toBe('/profile');
    expect(sanitizeReturnPath('/notices/new')).toBe('/notices/new');
    expect(sanitizeReturnPath('/notice/123-abc')).toBe('/notice/123-abc');
    expect(sanitizeReturnPath('/notice/123?sort=desc#top')).toBe('/notice/123?sort=desc#top');
  });

  it('rejects at least 25 hostile and dangerous redirect inputs', () => {
    const hostileInputs = [
      '//evil.com',
      '//evil.com/path',
      '/\\evil.com',
      '\\evil.com',
      '\\\\evil.com',
      '/%2F%2Fevil.com',
      '/%252F%252Fevil.com',
      'https://evil.com',
      'http://evil.com',
      'http://evil.com/notice/1',
      'javascript:alert(1)',
      '/javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '/data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'blob:https://evil.com/uuid',
      'file:///etc/passwd',
      '///evil.com',
      '//localhost:3000@evil.com',
      'https://attacker.com/auth/callback',
      '/\t/evil.com',
      '/ evil.com',
      '/\n/evil.com',
      '/\r/evil.com',
      '/%00/evil.com',
      '/%0d%0aSet-Cookie:evil=1',
      'http:evil.com',
      'https:evil.com',
      '//',
      'a'.repeat(513),
      '/%2e%2e/evil.com',
      '/../etc/passwd',
      '/..',
    ];

    expect(hostileInputs.length).toBeGreaterThanOrEqual(25);

    hostileInputs.forEach((hostile) => {
      const sanitized = sanitizeReturnPath(hostile, '/');
      expect(sanitized).toBe('/');
    });
  });

  it('rejects auth routes to prevent redirection loops', () => {
    const authRoutes = [
      '/login',
      '/signup',
      '/auth',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/auth/callback',
      '/LOGIN',
      '/SignUp/',
      '/auth/callback?code=123',
    ];

    authRoutes.forEach((route) => {
      expect(sanitizeReturnPath(route, '/')).toBe('/');
    });
  });

  it('handles non-string or undefined inputs gracefully with fallback', () => {
    expect(sanitizeReturnPath(null, '/fallback')).toBe('/fallback');
    expect(sanitizeReturnPath(undefined, '/fallback')).toBe('/fallback');
    expect(sanitizeReturnPath(12345, '/fallback')).toBe('/fallback');
    expect(sanitizeReturnPath({}, '/fallback')).toBe('/fallback');
    expect(sanitizeReturnPath([], '/fallback')).toBe('/fallback');
  });
});
