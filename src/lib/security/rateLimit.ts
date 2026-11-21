/**
 * @file rateLimit.ts
 * Memory-safe sliding-window rate limiter with automatic expired-entry cleanup.
 * Designed for serverless and Node.js route handlers.
 */

interface RateLimitBucket {
  timestamps: number[];
  lastAccessed: number;
}

const memoryStore = new Map<string, RateLimitBucket>();

// Automatic cleanup threshold
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

/**
 * Sweeps and deletes buckets whose entries have completely expired.
 * Prevents memory leaks in long-running Node.js processes.
 */
function sweepExpiredBuckets(windowMs: number, now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS && memoryStore.size < 500) {
    return;
  }
  lastCleanup = now;
  for (const [key, bucket] of memoryStore.entries()) {
    const activeTimestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);
    if (activeTimestamps.length === 0) {
      memoryStore.delete(key);
    } else {
      bucket.timestamps = activeTimestamps;
    }
  }
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Sliding window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is permitted. */
  allowed: boolean;
  /** Seconds until the client may retry if blocked, or 0 if allowed. */
  retryAfterSec: number;
  /** Remaining permitted requests in current window. */
  remaining: number;
}

/**
 * Checks and records a rate-limit attempt for a given identifier (e.g. IP address or user ID).
 *
 * @param identifier - Key identifying the client/source (e.g. IP address).
 * @param options - Limit and window configuration.
 * @returns RateLimitResult with `allowed` and `retryAfterSec`.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 30, windowMs: 60 * 1000 }
): RateLimitResult {
  const now = Date.now();
  const { limit, windowMs } = options;

  sweepExpiredBuckets(windowMs, now);

  let bucket = memoryStore.get(identifier);
  if (!bucket) {
    bucket = { timestamps: [], lastAccessed: now };
    memoryStore.set(identifier, bucket);
  }

  bucket.lastAccessed = now;
  // Retain only timestamps within the current sliding window
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      retryAfterSec,
      remaining: 0,
    };
  }

  bucket.timestamps.push(now);
  const remaining = Math.max(0, limit - bucket.timestamps.length);

  return {
    allowed: true,
    retryAfterSec: 0,
    remaining,
  };
}

/**
 * Clears the rate limit store (useful in automated tests).
 */
export function resetRateLimitStore(): void {
  memoryStore.clear();
  lastCleanup = Date.now();
}
