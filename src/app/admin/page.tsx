import React from 'react';
import { requireUserWithRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';
import { Profile, Complaint } from '@/types/database';
import { COMPLAINT_COLUMNS, PROFILE_COLUMNS } from '@/lib/supabase/queries';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Chief Admin Command | CivicResolve',
  description: 'Citywide civic grievance administration and personnel management',
};

export default async function AdminPage() {
  const profile = await requireUserWithRole(['head']);
  const supabase = await createClient();

  // 1. Fetch staff roster (Head + Resolvers)
  const { data: staffData } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .in('role', ['head', 'resolver'])
    .order('created_at', { ascending: true });

  const staff = (staffData || []) as Profile[];

  // 2. Fetch all complaints for triage and review
  const { data: complaintsData, error: complaintsError } = await supabase
    .from('complaints')
    .select(COMPLAINT_COLUMNS)
    .order('created_at', { ascending: false });

  if (complaintsError) {
    console.error('Error fetching admin complaints:', complaintsError);
  }

  const initialComplaints = (complaintsData || []) as Complaint[];

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <Navbar profile={profile} />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboardClient
          profile={profile}
          initialStaff={staff}
          initialComplaints={initialComplaints}
        />
      </main>
    </div>
  );
}
