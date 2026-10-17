/**
 * Onboarding Completion Persistence
 *
 * Rules:
 * - Versioned key: 'nearnotice:onboarding:v1'
 * - Value: 'done'
 * - Graceful in-memory fallback if localStorage is blocked or throws
 * - Store NO personal data
 */

export const ONBOARDING_STORAGE_KEY = 'nearnotice:onboarding:v1';
export const ONBOARDING_DONE_VALUE = 'done';

let memoryFlag: boolean = false;

export function isOnboardingCompleted(): boolean {
  try {
    const val = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    return val === ONBOARDING_DONE_VALUE;
  } catch {
    return memoryFlag;
  }
}

export function setOnboardingCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, ONBOARDING_DONE_VALUE);
  } catch {
    memoryFlag = true;
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    memoryFlag = false;
  }
}
