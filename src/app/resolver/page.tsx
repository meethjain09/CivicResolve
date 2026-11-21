import React from 'react';
import { requireUserWithRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { ResolverDashboardClient } from '@/components/resolver/ResolverDashboardClient';
import { Complaint } from '@/types/database';

export const metadata = {
  title: 'Department Operations | CivicResolve',
  description: 'Departmental grievance action queue and resolution workspace',
};

export default async function ResolverPage() {
  const profile = await requireUserWithRole(['resolver']);
  const supabase = await createClient();

  const department = profile.department || 'Unassigned';

  const { data: complaintsData, error } = await supabase
    .from('complaints')
    .select('*')
    .eq('department', department)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching department complaints for resolver:', error);
  }

  const initialComplaints = (complaintsData || []) as Complaint[];

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col">
      <Navbar profile={profile} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ResolverDashboardClient
          profile={profile}
          initialComplaints={initialComplaints}
        />
      </main>
    </div>
  );
}
