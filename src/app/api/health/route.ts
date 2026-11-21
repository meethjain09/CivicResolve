/**
 * @file route.ts
 * Health check endpoint for monitoring, uptime verification, and CI validation (GET /api/health).
 * Responds with system operational status without leaking any environmental secrets or database config.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * Public health check probe.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'CivicResolve',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    }
  );
}
