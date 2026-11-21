import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Profile } from '@/types/database';

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  const userProfile = profile as Profile;

  if (userProfile.role === 'citizen') {
    redirect('/citizen');
  } else if (userProfile.role === 'resolver') {
    redirect('/resolver');
  } else if (userProfile.role === 'head') {
    redirect('/admin');
  }

  redirect('/login');
}
