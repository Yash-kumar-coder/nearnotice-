/**
 * Supabase Auth Error Mapping
 *
 * Rules:
 * - Branch strictly on code/status, never on localized message text strings.
 * - Map technical error codes to clear, secure, user-friendly copy.
 */

export interface AuthErrorLike {
  code?: string;
  status?: number;
  message?: string;
  name?: string;
}

export function mapAuthError(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  const err = error as AuthErrorLike;
  const code = (err.code || '').toLowerCase();
  const status = err.status;

  // Rate Limiting (429)
  if (
    status === 429 ||
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    code === 'rate_limit_exceeded'
  ) {
    return 'Too many requests. Please wait a few moments before trying again.';
  }

  // Network / Abort
  if (err.name === 'AbortError' || code === 'abort_error') {
    return 'The request timed out. Please check your internet connection and try again.';
  }

  // Invalid credentials (generic anti-enumeration message)
  if (code === 'invalid_credentials' || code === 'invalid_grant') {
    return 'Incorrect email or password.';
  }

  // Unverified email
  if (code === 'email_not_confirmed') {
    return 'Please verify your email address before logging in.';
  }

  // Weak password
  if (code === 'weak_password') {
    return 'Password does not meet security requirements. Please choose a stronger password.';
  }

  // Same password
  if (code === 'same_password') {
    return 'Your new password must be different from your current password.';
  }

  // Expired / used link
  if (
    code === 'otp_expired' ||
    code === 'token_expired' ||
    code === 'access_denied' ||
    code === 'bad_code_verifier'
  ) {
    return 'This link has expired or has already been used. Please request a new one.';
  }

  // User already exists (defense-in-depth)
  if (code === 'user_already_exists') {
    return 'Unable to create account. If you already have an account, please try logging in.';
  }

  const rawMsg = (err.message || (err as any).msg || (err as any).error_description || '').toLowerCase();
  const rawCode = (err.code || (err as any).error_code || '').toString().toLowerCase();

  // Unsupported or disabled OAuth provider
  if (
    rawMsg.includes('provider is not enabled') ||
    rawMsg.includes('unsupported provider') ||
    rawCode === 'unsupported_provider' ||
    (rawCode === 'validation_failed' && rawMsg.includes('provider'))
  ) {
    return 'Google sign-in is not enabled in your Supabase project yet. Please enable it in Authentication > Providers > Google, or sign in with email below.';
  }

  // Insecure context / missing Web Crypto (common on HTTP on mobile devices)
  if (
    rawMsg.includes('subtle') ||
    rawMsg.includes('digest') ||
    rawMsg.includes('crypto')
  ) {
    return 'Secure connection (HTTPS) is required for mobile authentication. Please ensure your website is accessed via https://';
  }

  // Generic fallback without exposing internal stack traces
  return 'Unable to complete request. Please verify your details and try again.';
}
