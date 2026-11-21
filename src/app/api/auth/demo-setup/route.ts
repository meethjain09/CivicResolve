/**
 * @file route.ts
 * API route handler for automated 1-click Demo accounts provisioning (POST /api/auth/demo-setup).
 * Provisions pre-configured Citizen, Resolver, and Chief Admin demo credentials with rate-limiting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRole } from '@/types/database';
import { PROFILE_COLUMNS } from '@/lib/supabase/queries';
import { checkRateLimit } from '@/lib/security/rateLimit';

interface DemoConfig {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  is_protected: boolean;
}

const PRIVATE_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

/**
 * Evaluates whether a client IP has exceeded the demo setup rate limit.
 */
export function isIpRateLimited(ip: string): boolean {
  return !checkRateLimit(`demo-setup:${ip}`, { limit: 15, windowMs: 60 * 1000 }).allowed;
}

/**
 * POST /api/auth/demo-setup
 * Idempotently provisions demo accounts for testing without manual verification.
 */
export async function POST(req: NextRequest) {
  try {
    // 0. Rate limiting check (15 requests per 60s per client IP)
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (isIpRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute before trying demo login again.' },
        {
          status: 429,
          headers: PRIVATE_CACHE_HEADERS,
        }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const accountType = body?.accountType as UserRole | undefined;

    if (!accountType || !['citizen', 'resolver', 'head'].includes(accountType)) {
      return NextResponse.json(
        { error: 'Invalid account type. Expected citizen, resolver, or head.' },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    let config: DemoConfig;

    if (accountType === 'head') {
      config = {
        email: 'demo.head@civicresolve.gov',
        password: 'DemoHead@2026',
        full_name: 'Demo Chief Admin (Head)',
        role: 'head',
        department: null,
        is_protected: true,
      };
    } else if (accountType === 'resolver') {
      config = {
        email: 'demo.resolver@civicresolve.gov',
        password: 'DemoResolver@2026',
        full_name: 'Demo Roads Resolver',
        role: 'resolver',
        department: 'Roads & Infrastructure',
        is_protected: false,
      };
    } else {
      config = {
        email: 'demo.citizen@civicresolve.gov',
        password: 'DemoCitizen@2026',
        full_name: 'Demo Citizen',
        role: 'citizen',
        department: null,
        is_protected: false,
      };
    }

    const admin = createAdminClient();

    // 1. Check public.profiles by email first
    const { data: existingProfile } = await admin
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('email', config.email)
      .maybeSingle();

    if (existingProfile) {
      // Profile exists: sync profile data without overwriting password
      await admin.from('profiles').upsert(
        {
          id: existingProfile.id,
          full_name: config.full_name,
          email: config.email,
          role: config.role,
          department: config.department,
          is_protected: config.is_protected,
        },
        { onConflict: 'id' }
      );

      return NextResponse.json(
        {
          success: true,
          email: config.email,
          password: config.password,
          role: config.role,
        },
        { headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // 2. Profile does not exist: create user in Supabase Auth
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: config.email,
      password: config.password,
      email_confirm: true,
      user_metadata: {
        full_name: config.full_name,
        role: config.role,
        department: config.department,
        is_protected: config.is_protected,
      },
    });

    if (createError) {
      const errorObj = createError as unknown as { status?: number };
      const isAlreadyExists =
        createError.message?.toLowerCase().includes('already') ||
        errorObj.status === 422;

      // 3. If createUser returns an error saying user already exists in Auth, ensure public.profiles row exists
      if (isAlreadyExists) {
        const { data: profileAfterError } = await admin
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('email', config.email)
          .maybeSingle();

        if (profileAfterError) {
          await admin.from('profiles').upsert(
            {
              id: profileAfterError.id,
              full_name: config.full_name,
              email: config.email,
              role: config.role,
              department: config.department,
              is_protected: config.is_protected,
            },
            { onConflict: 'id' }
          );
        }

        return NextResponse.json(
          {
            success: true,
            email: config.email,
            password: config.password,
            role: config.role,
          },
          { headers: PRIVATE_CACHE_HEADERS }
        );
      }

      console.error('Failed to create demo auth user:', createError);
      return NextResponse.json(
        { error: 'Failed to create demo user' },
        { status: 500, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // 4. Explicitly upsert into public.profiles for the newly created user using admin client
    if (createData?.user?.id) {
      await admin.from('profiles').upsert(
        {
          id: createData.user.id,
          full_name: config.full_name,
          email: config.email,
          role: config.role,
          department: config.department,
          is_protected: config.is_protected,
        },
        { onConflict: 'id' }
      );
    }

    return NextResponse.json(
      {
        success: true,
        email: config.email,
        password: config.password,
        role: config.role,
      },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Error in demo-setup route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}
