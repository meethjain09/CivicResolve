import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit, resetRateLimitStore } from '@/lib/security/rateLimit';

describe('Sliding Window Rate Limiter Contract Tests', () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.useRealTimers();
  });

  afterEach(() => {
    resetRateLimitStore();
    vi.useRealTimers();
  });

  it('allows requests within the configured limit and decrements remaining counter', () => {
    const id = 'client-user-1';
    const limit = 3;
    const windowMs = 60_000;

    const res1 = checkRateLimit(id, { limit, windowMs });
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);
    expect(res1.retryAfterSec).toBe(0);

    const res2 = checkRateLimit(id, { limit, windowMs });
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit(id, { limit, windowMs });
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it('blocks requests exceeding the configured limit and calculates positive retryAfterSec', () => {
    const id = 'client-user-2';
    const limit = 2;
    const windowMs = 10_000;

    checkRateLimit(id, { limit, windowMs });
    checkRateLimit(id, { limit, windowMs });

    const blocked = checkRateLimit(id, { limit, windowMs });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(10);
  });

  it('strictly isolates quotas across distinct identifiers', () => {
    const userA = 'client-user-a';
    const userB = 'client-user-b';
    const limit = 1;
    const windowMs = 60_000;

    const resA1 = checkRateLimit(userA, { limit, windowMs });
    expect(resA1.allowed).toBe(true);

    // userA should now be blocked
    const resA2 = checkRateLimit(userA, { limit, windowMs });
    expect(resA2.allowed).toBe(false);

    // userB must still be allowed
    const resB1 = checkRateLimit(userB, { limit, windowMs });
    expect(resB1.allowed).toBe(true);
  });

  it('allows new requests once the sliding window expires', () => {
    vi.useFakeTimers();
    const id = 'client-user-timer';
    const limit = 1;
    const windowMs = 5_000;

    const res1 = checkRateLimit(id, { limit, windowMs });
    expect(res1.allowed).toBe(true);

    const res2 = checkRateLimit(id, { limit, windowMs });
    expect(res2.allowed).toBe(false);

    // Advance time past the sliding window
    vi.advanceTimersByTime(5_100);

    const res3 = checkRateLimit(id, { limit, windowMs });
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it('resets all buckets completely on resetRateLimitStore', () => {
    const id = 'client-user-reset';
    const limit = 1;
    const windowMs = 60_000;

    checkRateLimit(id, { limit, windowMs });
    expect(checkRateLimit(id, { limit, windowMs }).allowed).toBe(false);

    resetRateLimitStore();

    expect(checkRateLimit(id, { limit, windowMs }).allowed).toBe(true);
  });
});
