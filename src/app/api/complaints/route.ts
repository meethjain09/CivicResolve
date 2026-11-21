import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { analyzeComplaintWithGemini } from '@/lib/gemini/triage';
import crypto from 'crypto';

function generateTicketCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // excludes ambiguous chars
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `CR-${code}`;
}

// GET: Fetch complaints submitted by current citizen
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('citizen_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching citizen complaints:', error);
      return NextResponse.json({ error: 'Failed to retrieve complaints' }, { status: 500 });
    }

    return NextResponse.json({ complaints: complaints || [] });
  } catch (error: any) {
    console.error('Error in GET /api/complaints:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Submit a new complaint, upload photo to storage, and run AI triage
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    const formData = await req.formData();
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const address = formData.get('address') as string | null;
    const ward = formData.get('ward') as string | null;
    const citizenCategory = formData.get('citizen_category') as string | null;
    const imageFile = formData.get('image') as File | null;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Issue title is required' }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Detailed description is required' }, { status: 400 });
    }
    if (!address || !address.trim()) {
      return NextResponse.json({ error: 'Street address or landmark is required' }, { status: 400 });
    }
    if (!ward || !ward.trim()) {
      return NextResponse.json({ error: 'Ward selection is required' }, { status: 400 });
    }

    let imageUrl: string | null = null;
    let imageBase64: string | null = null;
    let imageMimeType: string | null = null;

    // Process image attachment if provided
    if (imageFile && imageFile.size > 0) {
      // 5MB limit
      if (imageFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image exceeds maximum allowed size of 5MB' }, { status: 400 });
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageBase64 = buffer.toString('base64');
      imageMimeType = imageFile.type || 'image/jpeg';

      const admin = createAdminClient();
      const bucketName = 'complaint-images';

      // Ensure storage bucket exists
      try {
        const { data: buckets } = await admin.storage.listBuckets();
        const bucketExists = buckets?.some((b) => b.name === bucketName);

        if (!bucketExists) {
          await admin.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          });
        }
      } catch (bucketErr) {
        console.warn('Bucket verification warning:', bucketErr);
      }

      // Upload file to bucket
      const sanitizedName = (imageFile.name || 'photo.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await admin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: imageMimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // We log but proceed with triage even if storage upload had issues
      } else {
        const { data: publicUrlData } = admin.storage.from(bucketName).getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }
    }

    // Run resilient multi-model Gemini triage
    const triage = await analyzeComplaintWithGemini({
      title: title.trim(),
      description: description.trim(),
      address: address.trim(),
      ward: ward.trim(),
      citizenCategory: citizenCategory?.trim() || null,
      imageBase64,
      imageMimeType,
    });

    const ticketCode = generateTicketCode();

    // Insert record into public.complaints
    const { data: complaint, error: insertError } = await supabase
      .from('complaints')
      .insert({
        ticket_code: ticketCode,
        citizen_id: user.id,
        title: title.trim(),
        description: description.trim(),
        address: address.trim(),
        ward: ward.trim(),
        citizen_category: citizenCategory?.trim() || null,
        image_url: imageUrl,
        ai_status: triage.ai_status,
        ai_model_used: triage.ai_model_used,
        category: triage.category,
        priority: triage.priority,
        urgency_reason: triage.urgency_reason,
        ai_summary: triage.ai_summary,
        image_verified: triage.image_verified,
        department: triage.department,
        status: 'Reported',
        reassignment_requested: false,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Database insert error for complaint:', insertError);
      return NextResponse.json(
        { error: `Failed to save complaint: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/complaints:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
