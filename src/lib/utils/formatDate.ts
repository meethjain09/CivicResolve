/**
 * @file formatDate.ts
 * Hydration-safe UTC date formatting utility for CivicResolve timestamps.
 */

/**
 * Formats an ISO 8601 date string into a consistent, locale-independent display format
 * (e.g. "Nov 21, 2026") avoiding SSR/client timezone mismatch hydration errors.
 *
 * @param isoString - ISO date string to format.
 * @returns Human-readable date string or "N/A" if invalid.
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return 'N/A';
  }
}
