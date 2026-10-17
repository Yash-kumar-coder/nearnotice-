import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCooldownStatus,
  triggerCooldown,
  resetCooldown,
  RESEND_COOLDOWN_SECONDS,
  MAX_RESEND_ATTEMPTS,
} from './cooldown';

describe('cooldown and resend tracker', () => {
  beforeEach(() => {
    resetCooldown('test');
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('allows resend initially with zero cooldown', () => {
    const status = getCooldownStatus('test');
    expect(status.allowed).toBe(true);
    expect(status.remainingSeconds).toBe(0);
    expect(status.attemptsLeft).toBe(MAX_RESEND_ATTEMPTS);
  });

  it('sets a 60-second cooldown on trigger', () => {
    vi.useFakeTimers();
    triggerCooldown('test', RESEND_COOLDOWN_SECONDS);

    const status1 = getCooldownStatus('test');
    expect(status1.allowed).toBe(false);
    expect(status1.remainingSeconds).toBe(60);
    expect(status1.attemptsLeft).toBe(MAX_RESEND_ATTEMPTS - 1);

    // Fast forward 30 seconds
    vi.advanceTimersByTime(30000);
    const status2 = getCooldownStatus('test');
    expect(status2.allowed).toBe(false);
    expect(status2.remainingSeconds).toBe(30);

    // Fast forward another 31 seconds
    vi.advanceTimersByTime(31000);
    const status3 = getCooldownStatus('test');
    expect(status3.allowed).toBe(true);
    expect(status3.remainingSeconds).toBe(0);
  });

  it('enforces maximum 5 attempts per session', () => {
    vi.useFakeTimers();
    for (let i = 0; i < MAX_RESEND_ATTEMPTS; i++) {
      triggerCooldown('test', 1);
      vi.advanceTimersByTime(2000);
    }

    const status = getCooldownStatus('test');
    expect(status.attemptsExhausted).toBe(true);
    expect(status.attemptsLeft).toBe(0);
    expect(status.allowed).toBe(false);
  });
});
