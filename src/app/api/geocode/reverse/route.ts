import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// In-memory per-user rate limiter (max 20 requests per minute)
interface UserRateLimitEntry {
  count: number;
  resetAt: number;
}
const userGeocodeRateLimits = new Map<string, UserRateLimitEntry>();

function isUserGeocodeRateLimited(userId: string, limit = 20, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const entry = userGeocodeRateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    userGeocodeRateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) {
    return true;
  }
  entry.count++;
  return false;
}

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
        { status: 401 }
      );
    }

    // 1. Enforce per-user rate limit
    if (isUserGeocodeRateLimited(user.id, 20, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Maximum 20 reverse geocoding requests per minute allowed.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get('lat');
    const lonStr = searchParams.get('lon');

    if (!latStr || !lonStr) {
      return NextResponse.json(
        { error: 'Missing lat or lon query parameters' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Invalid latitude or longitude coordinates' },
        { status: 400 }
      );
    }

    let resolvedAddress = '';
    let resolvedPincode: string | null = null;

    // 1. Primary: Nominatim OpenStreetMap
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
      const res = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'CivicResolve-App/1.0',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
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

    // 2. Fallback: BigDataCloud Reverse Geocoding
    if (!resolvedAddress || !resolvedPincode) {
      try {
        const fallbackUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
        const res = await fetch(fallbackUrl, {
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const data = await res.json();
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

    return NextResponse.json({ address: resolvedAddress, pincode: resolvedPincode });
  } catch (error: any) {
    console.error('Reverse geocode handler error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to reverse geocode coordinates' },
      { status: 500 }
    );
  }
}
