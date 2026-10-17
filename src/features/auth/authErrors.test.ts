import { describe, it, expect } from 'vitest';
import { mapAuthError } from './authErrors';

describe('mapAuthError', () => {
  it('maps invalid credentials to generic anti-enumeration copy', () => {
    expect(mapAuthError({ code: 'invalid_credentials' })).toBe('Incorrect email or password.');
    expect(mapAuthError({ code: 'invalid_grant' })).toBe('Incorrect email or password.');
  });

  it('maps unconfirmed email status accurately', () => {
    expect(mapAuthError({ code: 'email_not_confirmed' })).toBe(
      'Please verify your email address before logging in.'
    );
  });

  it('maps rate limit statuses and codes to throttled message', () => {
    expect(mapAuthError({ status: 429 })).toBe(
      'Too many requests. Please wait a few moments before trying again.'
    );
    expect(mapAuthError({ code: 'over_request_rate_limit' })).toBe(
      'Too many requests. Please wait a few moments before trying again.'
    );
    expect(mapAuthError({ code: 'over_email_send_rate_limit' })).toBe(
      'Too many requests. Please wait a few moments before trying again.'
    );
  });

  it('maps expired or invalid links safely', () => {
    expect(mapAuthError({ code: 'otp_expired' })).toContain('expired or has already been used');
    expect(mapAuthError({ code: 'bad_code_verifier' })).toContain('expired or has already been used');
  });

  it('maps network timeouts accurately', () => {
    expect(mapAuthError({ name: 'AbortError' })).toContain('timed out');
  });

  it('maps crypto.subtle errors on insecure connections to helpful HTTPS guidance', () => {
    expect(mapAuthError(new Error('crypto.subtle is undefined'))).toContain('Secure connection (HTTPS) is required');
  });
});
