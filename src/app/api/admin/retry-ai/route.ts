import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { analyzeComplaintWithGemini } from '@/lib/gemini/triage';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user & verify Head role
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'head') {
      return NextResponse.json(
        { error: 'Forbidden: Chief Administrator privileges required' },
        { status: 403 }
      );
    }

    let complaintId: string | null = null;
    try {
      const body = await req.json();
      complaintId = body?.complaintId || null;
    } catch {
      // Body may be empty if retrying all pending
    }

    const admin = createAdminClient();

    // 2. Fetch pending complaints
    let query = admin
      .from('complaints')
      .select('*')
      .eq('ai_status', 'review_pending');

    if (complaintId) {
      query = query.eq('id', complaintId);
    }

    const { data: pendingComplaints, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching pending complaints:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch pending complaints' }, { status: 500 });
    }

    const items = pendingComplaints || [];
    let updatedCount = 0;

    // 3. Process each pending complaint sequentially through Gemini triage
    for (const item of items) {
      let imageBase64: string | null = null;
      let imageMimeType: string | null = null;

      if (item.image_url) {
        try {
          const imgRes = await fetch(item.image_url);
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            imageBase64 = Buffer.from(arrayBuffer).toString('base64');
            imageMimeType = imgRes.headers.get('content-type') || 'image/jpeg';
          }
        } catch (imgErr) {
          console.warn(`Could not retrieve image for complaint ${item.id} during retry:`, imgErr);
        }
      }

      const triage = await analyzeComplaintWithGemini({
        title: item.title,
        description: item.description,
        address: item.address,
        ward: item.ward,
        citizenCategory: item.citizen_category,
        imageBase64,
        imageMimeType,
      });

      if (triage.ai_status === 'completed') {
        const { error: updateError } = await admin
          .from('complaints')
          .update({
            ai_status: triage.ai_status,
            ai_model_used: triage.ai_model_used,
            category: triage.category,
            department: triage.department,
            priority: triage.priority,
            urgency_reason: triage.urgency_reason,
            ai_summary: triage.ai_summary,
            image_verified: triage.image_verified,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (!updateError) {
          updatedCount++;
        }
      }
    }

    const remainingCount = items.length - updatedCount;

    return NextResponse.json({
      processed: items.length,
      updated: updatedCount,
      remaining: remainingCount,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/retry-ai:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
