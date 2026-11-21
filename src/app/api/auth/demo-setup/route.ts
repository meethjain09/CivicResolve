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

export async function POST(req: NextRequest) {
  try {
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
      config = {
        email: process.env.HEAD_ADMIN_EMAIL || 'head@civicresolve.gov',
        password: process.env.HEAD_ADMIN_PASSWORD || 'HeadAdmin@2026',
        full_name: 'Chief Admin (Head)',
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
      // Profile exists: update auth password and ensure profile data is in sync
      try {
        await admin.auth.admin.updateUserById(existingProfile.id, {
          password: config.password,
          email_confirm: true,
          user_metadata: {
            full_name: config.full_name,
            role: config.role,
            department: config.department,
            is_protected: config.is_protected,
          },
        });
      } catch (authUpdateErr) {
        console.warn('Note: auth password update skipped or failed:', authUpdateErr);
      }

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
          try {
            await admin.auth.admin.updateUserById(profileAfterError.id, {
              password: config.password,
              email_confirm: true,
              user_metadata: {
                full_name: config.full_name,
                role: config.role,
                department: config.department,
                is_protected: config.is_protected,
              },
            });
          } catch (updateErr) {
            console.warn('Password update error for existing auth user:', updateErr);
          }

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

    // Upsert into public.profiles for the newly created user
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
