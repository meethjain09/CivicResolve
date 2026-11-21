import { NextRequest, NextResponse, after } from 'next/server';
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

export interface VerifiedImage {
  ext: string;
  mime: string;
}

export function verifyImageMagicBytes(buffer: Buffer): VerifiedImage | null {
  if (buffer.length < 12) return null;

  // JPEG: starts with 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }

  // PNG: starts with 0x89 0x50 0x4E 0x47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { ext: '.png', mime: 'image/png' };
  }

  // WebP: bytes 0..3 RIFF and bytes 8..11 WEBP
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return { ext: '.webp', mime: 'image/webp' };
  }

  // HEIC/HEIF: bytes 4..7 ftyp
  const ftyp = buffer.toString('ascii', 4, 8);
  if (ftyp === 'ftyp') {
    return { ext: '.heic', mime: 'image/heic' };
  }

  return null;
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
    const pincode = formData.get('pincode') as string | null;
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
    if (!pincode || !pincode.trim()) {
      return NextResponse.json({ error: 'Valid 6-digit postal pincode is required' }, { status: 400 });
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedAddress = address.trim();
    const trimmedPincode = pincode.trim();
    const trimmedCitizenCategory = citizenCategory?.trim() || null;

    // Enforce valid 6-digit numeric postal pincode
    if (!/^\d{6}$/.test(trimmedPincode)) {
      return NextResponse.json(
        { error: 'Invalid pincode format. Must be a valid 6-digit number.' },
        { status: 400 }
      );
    }

    // Enforce strict server-side string length limits
    if (trimmedTitle.length > 150) {
      return NextResponse.json({ error: 'Issue title cannot exceed 150 characters' }, { status: 400 });
    }
    if (trimmedDescription.length > 2500) {
      return NextResponse.json({ error: 'Detailed description cannot exceed 2500 characters' }, { status: 400 });
    }
    if (trimmedAddress.length > 300) {
      return NextResponse.json({ error: 'Street address or landmark cannot exceed 300 characters' }, { status: 400 });
    }
    if (trimmedCitizenCategory && trimmedCitizenCategory.length > 100) {
      return NextResponse.json({ error: 'Citizen category cannot exceed 100 characters' }, { status: 400 });
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

      // Validate image magic bytes from uploaded file buffer
      const verifiedImage = verifyImageMagicBytes(buffer);
      if (!verifiedImage) {
        return NextResponse.json(
          { error: 'Invalid image file content. Only JPEG, PNG, WebP, or HEIC images are allowed.' },
          { status: 400 }
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
        // We log but proceed with triage even if storage upload had issues
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
        title: trimmedTitle,
        description: trimmedDescription,
        address: trimmedAddress,
        pincode: trimmedPincode,
        citizen_category: trimmedCitizenCategory,
        image_url: imageUrl,
        ai_status: 'review_pending',
        department: 'Unassigned',
        priority: 'Medium',
        category: trimmedCitizenCategory || 'Uncategorized',
        urgency_reason: 'AI triage running in background...',
        ai_summary: trimmedDescription.slice(0, 180),
        status: 'Reported',
        reassignment_requested: false,
      })
      .select('*')
      .single();

    if (insertError || !complaint) {
      console.error('Database insert error for complaint:', insertError);
      return NextResponse.json(
        { error: `Failed to save complaint: ${insertError?.message || 'Insert failed'}` },
        { status: 500 }
      );
    }

    // Schedule background Gemini AI triage via next/server after()
    after(async () => {
      try {
        const triage = await analyzeComplaintWithGemini({
          title: trimmedTitle,
          description: trimmedDescription,
          address: trimmedAddress,
          pincode: trimmedPincode,
          citizenCategory: trimmedCitizenCategory,
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
    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/complaints:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
