import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRole } from '@/types/database';

interface DemoConfig {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  is_protected: boolean;
}

// In-memory per-IP rate limiter (max 15 requests per minute)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const ipRateLimits = new Map<string, RateLimitEntry>();

function isIpRateLimited(ip: string, limit = 15, windowMs = 60 * 1000): boolean {
  const now = Date.now();
  const entry = ipRateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) {
    return true;
  }
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    // 0. Rate limiting check
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (isIpRateLimited(clientIp, 15, 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute before trying demo login again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { accountType } = body as { accountType?: UserRole };

    if (!accountType || !['citizen', 'resolver', 'head'].includes(accountType)) {
      return NextResponse.json(
        { error: 'Invalid account type. Expected citizen, resolver, or head.' },
        { status: 400 }
      );
    }

    let config: DemoConfig;

    if (accountType === 'head') {
      // Use dedicated demo head account to prevent exposing or overwriting real production head admin
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
      .select('*')
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

      return NextResponse.json({
        success: true,
        email: config.email,
        password: config.password,
        role: config.role,
      });
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
      const isAlreadyExists =
        createError.message?.toLowerCase().includes('already') ||
        (createError as any).status === 422;

      // 3. If createUser returns an error saying user already exists in Auth, ensure public.profiles row exists
      if (isAlreadyExists) {
        const { data: profileAfterError } = await admin
          .from('profiles')
          .select('*')
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

        return NextResponse.json({
          success: true,
          email: config.email,
          password: config.password,
          role: config.role,
        });
      }

      throw new Error(`Failed to create demo user: ${createError.message}`);
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

    return NextResponse.json({
      success: true,
      email: config.email,
      password: config.password,
      role: config.role,
    });
  } catch (error: any) {
    console.error('Error in demo-setup route:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
