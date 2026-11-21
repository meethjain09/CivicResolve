/**
 * @file route.ts
 * API route handlers for citizen complaints (GET /api/complaints, POST /api/complaints).
 * Provides ticket creation with magic-byte verified photo attachments and non-blocking background AI triage.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { analyzeComplaintWithGemini } from '@/lib/gemini/triage';
import {
  FIELD_LIMITS,
  validateComplaintPayload,
  detectImageMagicBytes,
  type VerifiedImageAttachment,
} from '@/lib/validation/complaints';
import { COMPLAINT_COLUMNS } from '@/lib/supabase/queries';
import crypto from 'crypto';

/**
 * Backward compatibility export for image validation contract tests.
 */
export type VerifiedImage = VerifiedImageAttachment;
export const verifyImageMagicBytes = detectImageMagicBytes;

const PRIVATE_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

/**
 * Generates an unambiguous 6-character alphanumeric ticket code prefixed with CR-.
 */
function generateTicketCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // excludes ambiguous chars
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `CR-${code}`;
}

/**
 * GET /api/complaints
 * Fetches all complaints submitted by the currently authenticated citizen.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Session missing' },
        { status: 401, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const { data: complaints, error } = await supabase
      .from('complaints')
      .select(COMPLAINT_COLUMNS)
      .eq('citizen_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching citizen complaints:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve complaints' },
        { status: 500, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { complaints: complaints || [] },
      { headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/complaints:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}

/**
 * POST /api/complaints
 * Submits a new citizen complaint, validates magic bytes for photos, uploads to storage,
 * and schedules non-blocking Gemini AI triage via next/server after().
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Session missing' },
        { status: 401, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const formData = await req.formData();
    const title = formData.get('title');
    const description = formData.get('description');
    const address = formData.get('address');
    const pincode = formData.get('pincode');
    const citizenCategory = formData.get('citizen_category');
    const imageFile = formData.get('image') as File | null;

    // Validate complaint text payload
    const validation = validateComplaintPayload({
      title,
      description,
      address,
      pincode,
      citizen_category: citizenCategory,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    const {
      title: cleanTitle,
      description: cleanDesc,
      address: cleanAddress,
      pincode: cleanPincode,
      citizen_category: cleanCategory,
    } = validation.data;

    let imageUrl: string | null = null;
    let imageBase64: string | null = null;
    let imageMimeType: string | null = null;

    // Process image attachment if provided
    if (imageFile && imageFile.size > 0) {
      if (imageFile.size > FIELD_LIMITS.MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: 'Image exceeds maximum allowed size of 5MB' },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate image magic bytes from uploaded file buffer
      const verifiedImage = detectImageMagicBytes(buffer);
      if (!verifiedImage) {
        return NextResponse.json(
          { error: 'Invalid image file content. Only JPEG, PNG, WebP, or HEIC images are allowed.' },
          { status: 400, headers: PRIVATE_CACHE_HEADERS }
        );
      }

      imageBase64 = buffer.toString('base64');
      imageMimeType = verifiedImage.mime;

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

      // Generate storage filename strictly using verified extension and crypto UUID
      const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}${verifiedImage.ext}`;

      const { error: uploadError } = await admin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: imageMimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
      } else {
        const { data: publicUrlData } = admin.storage.from(bucketName).getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }
    }

    const ticketCode = generateTicketCode();
    const admin = createAdminClient();

    // Immediately insert record into public.complaints via admin client with review_pending
    const { data: complaint, error: insertError } = await admin
      .from('complaints')
      .insert({
        ticket_code: ticketCode,
        citizen_id: user.id,
        title: cleanTitle,
        description: cleanDesc,
        address: cleanAddress,
        pincode: cleanPincode,
        citizen_category: cleanCategory,
        image_url: imageUrl,
        ai_status: 'review_pending',
        department: 'Unassigned',
        priority: 'Medium',
        category: cleanCategory || 'Uncategorized',
        urgency_reason: 'AI triage running in background...',
        ai_summary: cleanDesc.slice(0, 180),
        status: 'Reported',
        reassignment_requested: false,
      })
      .select(COMPLAINT_COLUMNS)
      .single();

    if (insertError || !complaint) {
      console.error('Database insert error for complaint:', insertError);
      return NextResponse.json(
        { error: 'Failed to save complaint' },
        { status: 500, headers: PRIVATE_CACHE_HEADERS }
      );
    }

    // Schedule background Gemini AI triage via next/server after()
    after(async () => {
      try {
        const triage = await analyzeComplaintWithGemini({
          title: cleanTitle,
          description: cleanDesc,
          address: cleanAddress,
          pincode: cleanPincode,
          citizenCategory: cleanCategory,
          imageBase64,
          imageMimeType,
        });

        if (triage.ai_status === 'completed') {
          const bgAdmin = createAdminClient();
          await bgAdmin
            .from('complaints')
            .update({
              ai_status: 'completed',
              ai_model_used: triage.ai_model_used,
              category: triage.category,
              department: triage.department,
              priority: triage.priority,
              urgency_reason: triage.urgency_reason,
              ai_summary: triage.ai_summary,
              image_verified: triage.image_verified,
              updated_at: new Date().toISOString(),
            })
            .eq('id', complaint.id);
        }
      } catch (bgErr) {
        console.error('Background Gemini triage error for complaint:', complaint.id, bgErr);
      }
    });

    // Return immediately to citizen without waiting for Gemini AI triage
    return NextResponse.json(
      { complaint },
      { status: 201, headers: PRIVATE_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/complaints:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: PRIVATE_CACHE_HEADERS }
    );
  }
}
