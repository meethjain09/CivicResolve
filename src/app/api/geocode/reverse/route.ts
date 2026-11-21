/**
 * @file route.ts
 * API route handler for reverse geocoding (GET /api/geocode/reverse).
 * Converts latitude and longitude coordinates into human-readable street addresses
 * and extracts 6-digit postal pincodes via Nominatim OSM and BigDataCloud fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

const PRIVATE_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

/**
 * Evaluates whether a user has exceeded the reverse geocoding rate limit (20 req / 60s).
 */
export function isUserGeocodeRateLimited(userId: string): boolean {
  return !checkRateLimit(`geocode:${userId}`, { limit: 20, windowMs: 60 * 1000 }).allowed;
}

/**
 * GET /api/geocode/reverse?lat=...&lon=...
 * Reverse geocodes coordinates with timeout abort and rate limiting.
 */
export async function GET(req: NextRequest) {
  try {
    // 0. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to use reverse geocoding' },
        { status: 401, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // 1. Enforce per-user rate limit (20 req / 60s)
    if (isUserGeocodeRateLimited(user.id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Maximum 20 reverse geocoding requests per minute allowed.' },
        {
          status: 429,
          headers: PRIVATE_CACHE_HEADERS,
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat');
    const lonStr = searchParams.get('lon');

    if (!latStr || !lonStr) {
      return NextResponse.json(
        { error: 'Missing lat or lon query parameters' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude coordinates' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    let resolvedAddress = '';
    let resolvedPincode: string | null = null;

    // 1. Primary: Nominatim OpenStreetMap (8s timeout)
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
      const res = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'CivicResolve-App/1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          display_name?: string;
          address?: { postcode?: string };
        };
        if (data && data.display_name) {
          resolvedAddress = data.display_name;
        }

        const rawPostcode = data?.address?.postcode;
        if (rawPostcode) {
          const digitsOnly = String(rawPostcode).replace(/\D/g, '');
          if (digitsOnly.length === 6) {
            resolvedPincode = digitsOnly;
          } else if (digitsOnly.length > 6) {
            resolvedPincode = digitsOnly.slice(0, 6);
          } else {
            resolvedPincode = String(rawPostcode).trim();
          }
        }
      }
    } catch (nomErr) {
      console.warn('Nominatim reverse geocoding error, falling back:', nomErr);
    }

    // 2. Fallback: BigDataCloud Reverse Geocoding (8s timeout)
    if (!resolvedAddress || !resolvedPincode) {
      try {
        const fallbackUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
        const res = await fetch(fallbackUrl, {
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            locality?: string;
            city?: string;
            principalSubdivision?: string;
            postcode?: string;
            countryName?: string;
          };
          if (!resolvedAddress) {
            const parts: string[] = [];
            if (data.locality) parts.push(data.locality);
            if (data.city && !parts.includes(data.city)) parts.push(data.city);
            if (data.principalSubdivision && !parts.includes(data.principalSubdivision)) {
              parts.push(data.principalSubdivision);
            }
            if (data.postcode) parts.push(data.postcode);
            if (data.countryName) parts.push(data.countryName);

            if (parts.length > 0) {
              resolvedAddress = parts.join(', ');
            }
          }

          if (!resolvedPincode && data.postcode) {
            const digitsOnly = String(data.postcode).replace(/\D/g, '');
            if (digitsOnly.length === 6) {
              resolvedPincode = digitsOnly;
            } else if (digitsOnly.length > 6) {
              resolvedPincode = digitsOnly.slice(0, 6);
            } else {
              resolvedPincode = String(data.postcode).trim();
            }
          }
        }
      } catch (fbErr) {
        console.warn('Fallback geocoding error:', fbErr);
      }
    }

    if (!resolvedAddress) {
      resolvedAddress = `Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }

    return NextResponse.json(
      { address: resolvedAddress, pincode: resolvedPincode },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Reverse geocode handler error:', error);
    return NextResponse.json(
      { error: 'Failed to reverse geocode coordinates' },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}
