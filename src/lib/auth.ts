import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Profile, UserRole } from '@/types/database';

/**
 * Server-side guard that authenticates the user and verifies that
 * their profile role is included in allowedRoles.
 * If unauthenticated, redirects to /login.
 * If unauthorized for this specific page, redirects to their own role's home page.
 */
export async function requireUserWithRole(allowedRoles: UserRole[]): Promise<Profile> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login');
  }

  const userProfile = profile as Profile;

  if (!allowedRoles.includes(userProfile.role)) {
    // Redirect to the correct portal based on their actual role
    if (userProfile.role === 'citizen') redirect('/citizen');
    if (userProfile.role === 'resolver') redirect('/resolver');
    if (userProfile.role === 'head') redirect('/admin');
    redirect('/login');
  }

  return userProfile;
}
