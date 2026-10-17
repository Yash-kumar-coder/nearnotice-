import { describe, it, expect } from 'vitest';
import { validatePassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from './passwordPolicy';

describe('validatePassword', () => {
  const email = 'user@example.com';

  it('rejects passwords shorter than 6 characters', () => {
    const short = 'Aa1!';
    const result = validatePassword(short, email);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain(`${PASSWORD_MIN_LENGTH} characters`);
  });

  it('rejects passwords longer than 72 characters', () => {
    const tooLong = 'A1!'.repeat(25); // 75 chars
    const result = validatePassword(tooLong, email);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain(`${PASSWORD_MAX_LENGTH} characters`);
  });

  it('rejects passwords that equal the email or email username', () => {
    expect(validatePassword('user@example.com', email).isValid).toBe(false);
    expect(validatePassword('User@Example.com', email).isValid).toBe(false);
    expect(validatePassword('user', email).isValid).toBe(false);
  });

  it('rejects passwords missing character classes', () => {
    // Missing uppercase
    expect(validatePassword('allloweranddigits1234!', email).isValid).toBe(false);
    // Missing lowercase
    expect(validatePassword('ALLUPPERANDDIGITS1234!', email).isValid).toBe(false);
    // Missing symbol
    expect(validatePassword('AllLettersAndDigits1234', email).isValid).toBe(false);
    // Missing number
    expect(validatePassword('AllLettersAndSymbol!', email).isValid).toBe(false);
  });

  it('accepts strong valid passwords with min 6 chars, upper, lower, number, and symbol', () => {
    expect(validatePassword('Ab1!xy', email).isValid).toBe(true);
    expect(validatePassword('Pass#1', email).isValid).toBe(true);
    expect(validatePassword('Correct-Horse-Battery-Staple-42', email).isValid).toBe(true);
    expect(validatePassword('HyperLocal#Notice2026', email).isValid).toBe(true);
    expect(validatePassword('SecurePassword!99', email).isValid).toBe(true);
  });
});
