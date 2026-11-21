import React from 'react';
import { requireUserWithRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { CitizenDashboardClient } from '@/components/citizen/CitizenDashboardClient';
import { Complaint } from '@/types/database';
import { COMPLAINT_COLUMNS } from '@/lib/supabase/queries';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Citizen Portal | CivicResolve',
  description: 'Submit civic complaints, monitor Gemini AI triage, and track resolution',
};

export default async function CitizenPage() {
  const profile = await requireUserWithRole(['citizen']);
  const supabase = await createClient();

  const { data: complaintsData, error } = await supabase
    .from('complaints')
    .select(COMPLAINT_COLUMNS)
    .eq('citizen_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading complaints for citizen:', error);
  }

  const initialComplaints = (complaintsData || []) as Complaint[];

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <Navbar profile={profile} />
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CitizenDashboardClient
          profile={profile}
          initialComplaints={initialComplaints}
        />
      </main>
    </div>
  );
}
