/**
 * NearNotice Password Policy
 *
 * Requirements:
 * - Length: 6 - 72 characters (minimum 6 characters)
 * - Must not be equal to or trivially match the user's email address
 * - Contains at least one lowercase letter, one uppercase letter, one number, and one symbol
 * - Mirrors Supabase Auth dashboard security settings
 */

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 72;

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePassword(password: string, email?: string): PasswordValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
    };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long`,
    };
  }

  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim().toLowerCase();
    const emailPrefix = cleanEmail.split('@')[0];

    if (cleanPass === cleanEmail || (emailPrefix.length >= 3 && cleanPass === emailPrefix)) {
      return {
        isValid: false,
        error: 'Password cannot be your email address or username',
      };
    }
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  if (!hasLower || !hasUpper || !hasNumber || !hasSymbol) {
    return {
      isValid: false,
      error: 'Password must include uppercase, lowercase, a number, and a symbol (@, #, $, etc.)',
    };
  }

  return { isValid: true };
}
