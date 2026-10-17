/**
 * Resend Cooldown and Rate-limit tracker
 *
 * Rules:
 * - 60s cooldown surviving page refresh (stored as timestamp).
 * - Capped at 5 resends per session.
 * - In-memory fallback if sessionStorage is blocked/unavailable.
 */

const memoryStore = new Map<string, string>();

function safeGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return memoryStore.get(key) || null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function safeRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    memoryStore.delete(key);
  }
}

export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_RESEND_ATTEMPTS = 5;

export interface CooldownStatus {
  allowed: boolean;
  remainingSeconds: number;
  attemptsLeft: number;
  attemptsExhausted: boolean;
}

export function getCooldownStatus(flow: string = 'signup'): CooldownStatus {
  const expiryRaw = safeGet(`nearnotice:cooldown:${flow}`);
  const countRaw = safeGet(`nearnotice:resend_count:${flow}`);

  const now = Date.now();
  const expiry = expiryRaw ? parseInt(expiryRaw, 10) : 0;
  const attempts = countRaw ? parseInt(countRaw, 10) : 0;

  const remainingMs = Math.max(0, expiry - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const attemptsLeft = Math.max(0, MAX_RESEND_ATTEMPTS - attempts);
  const attemptsExhausted = attempts >= MAX_RESEND_ATTEMPTS;

  const allowed = remainingSeconds === 0 && !attemptsExhausted;

  return {
    allowed,
    remainingSeconds,
    attemptsLeft,
    attemptsExhausted,
  };
}

export function triggerCooldown(flow: string = 'signup', durationSec: number = RESEND_COOLDOWN_SECONDS): number {
  const expiryTime = Date.now() + durationSec * 1000;
  safeSet(`nearnotice:cooldown:${flow}`, expiryTime.toString());

  const currentCount = parseInt(safeGet(`nearnotice:resend_count:${flow}`) || '0', 10);
  safeSet(`nearnotice:resend_count:${flow}`, (currentCount + 1).toString());

  return durationSec;
}

export function resetCooldown(flow: string = 'signup'): void {
  safeRemove(`nearnotice:cooldown:${flow}`);
  safeRemove(`nearnotice:resend_count:${flow}`);
}
