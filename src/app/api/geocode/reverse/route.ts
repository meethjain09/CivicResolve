import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
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
      }
    } catch (nomErr) {
      console.warn('Nominatim reverse geocoding error, falling back:', nomErr);
    }

    // 2. Fallback: BigDataCloud Reverse Geocoding
    if (!resolvedAddress) {
      try {
        const fallbackUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
        const res = await fetch(fallbackUrl, {
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const data = await res.json();
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
      } catch (fbErr) {
        console.warn('Fallback geocoding error:', fbErr);
      }
    }

    if (!resolvedAddress) {
      resolvedAddress = `Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }

    return NextResponse.json({ address: resolvedAddress });
  } catch (error: any) {
    console.error('Reverse geocode handler error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to reverse geocode coordinates' },
      { status: 500 }
    );
  }
}
