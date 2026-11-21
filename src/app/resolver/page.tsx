import React from 'react';
import { requireUserWithRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { ResolverDashboardClient } from '@/components/resolver/ResolverDashboardClient';
import { Complaint } from '@/types/database';
import { COMPLAINT_COLUMNS } from '@/lib/supabase/queries';

export const dynamic = 'force-dynamic';

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
    .select(COMPLAINT_COLUMNS)
    .eq('department', department)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching department complaints for resolver:', error);
  }

  // Strictly filter to ensure only tickets belonging to this resolver's department are loaded
  const initialComplaints = ((complaintsData || []) as Complaint[]).filter(
    (c) => c.department === department
  );

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <Navbar profile={profile} />
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ResolverDashboardClient
          profile={profile}
          initialComplaints={initialComplaints}
        />
      </main>
    </div>
  );
}
