// In-memory rate limiting and account lockout store for login attempts
// Blocks an IP after 3 failed attempts for 15 minutes.

type AttemptRecord = {
  count: number;
  lockedUntil: number | null; // timestamp in ms
};

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Global map surviving between requests in Node.js server runtime
const loginAttemptsMap = new Map<string, AttemptRecord>();

// Periodic cleanup of stale records every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of loginAttemptsMap.entries()) {
      if (record.lockedUntil && record.lockedUntil < now) {
        loginAttemptsMap.delete(key);
      } else if (!record.lockedUntil && now - (record.lockedUntil ?? 0) > LOCKOUT_DURATION_MS) {
        loginAttemptsMap.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export type RateLimitStatus = {
  isLocked: boolean;
  lockedUntil?: number; // timestamp in ms
  remainingSeconds?: number;
  remainingAttempts?: number;
};

/**
 * Check if the given identifier (client IP) is currently locked out.
 */
export function checkLoginLockout(identifier: string): RateLimitStatus {
  const record = loginAttemptsMap.get(identifier);
  if (!record) {
    return { isLocked: false, remainingAttempts: MAX_ATTEMPTS };
  }

  const now = Date.now();
  if (record.lockedUntil) {
    if (record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        isLocked: true,
        lockedUntil: record.lockedUntil,
        remainingSeconds,
        remainingAttempts: 0,
      };
    } else {
      // Lock has expired, reset completely
      loginAttemptsMap.delete(identifier);
      return { isLocked: false, remainingAttempts: MAX_ATTEMPTS };
    }
  }

  const remainingAttempts = Math.max(0, MAX_ATTEMPTS - record.count);
  return { isLocked: false, remainingAttempts };
}

/**
 * Record a failed login attempt. Returns the updated status.
 */
export function recordFailedLogin(identifier: string): RateLimitStatus {
  const now = Date.now();
  const record = loginAttemptsMap.get(identifier) ?? { count: 0, lockedUntil: null };

  // If already was locked and lock expired, reset count
  if (record.lockedUntil && record.lockedUntil <= now) {
    record.count = 0;
    record.lockedUntil = null;
  }

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_DURATION_MS;
    record.lockedUntil = lockedUntil;
    loginAttemptsMap.set(identifier, record);
    return {
      isLocked: true,
      lockedUntil,
      remainingSeconds: 15 * 60,
      remainingAttempts: 0,
    };
  }

  loginAttemptsMap.set(identifier, record);
  return {
    isLocked: false,
    remainingAttempts: MAX_ATTEMPTS - record.count,
  };
}

/**
 * Clear login attempts on successful login.
 */
export function clearLoginAttempts(identifier: string) {
  loginAttemptsMap.delete(identifier);
}

/**
 * Reset lockout manually (for testing or administrative unlock).
 */
export function resetLockout(identifier?: string) {
  if (identifier) {
    loginAttemptsMap.delete(identifier);
  } else {
    loginAttemptsMap.clear();
  }
}
