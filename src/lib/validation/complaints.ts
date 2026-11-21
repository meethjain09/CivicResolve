/**
 * @file complaints.ts
 * Centralized, strongly-typed domain constants, input sanitization, and validation
 * helpers for CivicResolve complaint tickets and file attachments.
 */

/**
 * Domain constants for string lengths and file size thresholds.
 */
export const FIELD_LIMITS = {
  TITLE_MAX: 150,
  DESCRIPTION_MAX: 2500,
  ADDRESS_MAX: 300,
  CATEGORY_MAX: 100,
  RESOLUTION_NOTE_MAX: 1500,
  REASSIGNMENT_REASON_MAX: 1000,
  MAX_IMAGE_BYTES: 5 * 1024 * 1024, // 5 MB
  PINCODE_REGEX: /^\d{6}$/,
} as const;

/**
 * Verified image attachment metadata detected from magic bytes.
 */
export interface VerifiedImageAttachment {
  ext: string;
  mime: string;
}

/**
 * Validated and sanitized complaint payload.
 */
export interface ValidatedComplaintData {
  title: string;
  description: string;
  address: string;
  pincode: string;
  citizen_category: string | null;
}

/**
 * Result of complaint payload validation.
 */
export type ComplaintValidationResult =
  | { valid: true; data: ValidatedComplaintData }
  | { valid: false; error: string };

/**
 * Validates whether an input string conforms to a 6-digit postal pincode.
 *
 * @param value - The input pincode string to validate.
 * @returns True if the string is exactly 6 decimal digits; false otherwise.
 */
export function isValidPincode(value: string): boolean {
  if (typeof value !== 'string') return false;
  return FIELD_LIMITS.PINCODE_REGEX.test(value.trim());
}

/**
 * Strips null bytes (\0) and non-printable ASCII control characters (chars < 32 except \n and \t),
 * trims surrounding whitespace, and optionally truncates to a maximum length.
 *
 * @param value - Raw text input.
 * @param maxLen - Optional maximum allowed character length.
 * @returns Cleaned and bounded string.
 */
export function sanitizeTextInput(value: string, maxLen?: number): string {
  if (typeof value !== 'string') return '';
  // Remove null bytes and non-printable ASCII control characters (keeping \t [9] and \n [10])
  const sanitized = value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  if (typeof maxLen === 'number' && maxLen > 0) {
    return sanitized.slice(0, maxLen);
  }
  return sanitized;
}

/**
 * Inspects a binary Buffer header to verify file type magic bytes.
 * Prevents file-extension spoofing and verifies legitimate image signatures.
 * Supports JPEG, PNG, WebP, and HEIC.
 *
 * @param buffer - File contents in a Node Buffer.
 * @returns Verified file extension and MIME type, or null if unrecognized/invalid.
 */
export function detectImageMagicBytes(buffer: Buffer): VerifiedImageAttachment | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: starts with 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }

  // PNG: starts with 0x89 0x50 0x4E 0x47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { ext: '.png', mime: 'image/png' };
  }

  // WebP: bytes 0..3 'RIFF' and bytes 8..11 'WEBP'
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return { ext: '.webp', mime: 'image/webp' };
  }

  // HEIC/HEIF: bytes 4..7 'ftyp'
  const ftyp = buffer.toString('ascii', 4, 8);
  if (ftyp === 'ftyp') {
    return { ext: '.heic', mime: 'image/heic' };
  }

  return null;
}

/**
 * Validates and sanitizes a raw complaint submission object or FormData map.
 * Enforces mandatory presence of title, description, address, and 6-digit pincode,
 * checks string length bounds, and sanitizes dangerous control characters.
 *
 * @param payload - Object containing complaint submission fields.
 * @returns Validation result with sanitized data or detailed user-facing error.
 */
export function validateComplaintPayload(payload: {
  title?: unknown;
  description?: unknown;
  address?: unknown;
  pincode?: unknown;
  citizen_category?: unknown;
}): ComplaintValidationResult {
  const rawTitle = typeof payload.title === 'string' ? payload.title : '';
  const rawDesc = typeof payload.description === 'string' ? payload.description : '';
  const rawAddress = typeof payload.address === 'string' ? payload.address : '';
  const rawPincode = typeof payload.pincode === 'string' ? payload.pincode : '';
  const rawCategory =
    typeof payload.citizen_category === 'string' ? payload.citizen_category : null;

  const title = sanitizeTextInput(rawTitle);
  const description = sanitizeTextInput(rawDesc);
  const address = sanitizeTextInput(rawAddress);
  const pincode = sanitizeTextInput(rawPincode);
  const citizen_category = rawCategory ? sanitizeTextInput(rawCategory) : null;

  if (!title) {
    return { valid: false, error: 'Issue title is required' };
  }
  if (!description) {
    return { valid: false, error: 'Detailed description is required' };
  }
  if (!address) {
    return { valid: false, error: 'Street address or landmark is required' };
  }
  if (!pincode) {
    return { valid: false, error: 'Valid 6-digit postal pincode is required' };
  }

  if (!isValidPincode(pincode)) {
    return {
      valid: false,
      error: 'Invalid pincode format. Must be a valid 6-digit number.',
    };
  }

  if (title.length > FIELD_LIMITS.TITLE_MAX) {
    return {
      valid: false,
      error: `Issue title cannot exceed ${FIELD_LIMITS.TITLE_MAX} characters`,
    };
  }
  if (description.length > FIELD_LIMITS.DESCRIPTION_MAX) {
    return {
      valid: false,
      error: `Detailed description cannot exceed ${FIELD_LIMITS.DESCRIPTION_MAX} characters`,
    };
  }
  if (address.length > FIELD_LIMITS.ADDRESS_MAX) {
    return {
      valid: false,
      error: `Street address or landmark cannot exceed ${FIELD_LIMITS.ADDRESS_MAX} characters`,
    };
  }
  if (citizen_category && citizen_category.length > FIELD_LIMITS.CATEGORY_MAX) {
    return {
      valid: false,
      error: `Citizen category cannot exceed ${FIELD_LIMITS.CATEGORY_MAX} characters`,
    };
  }

  return {
    valid: true,
    data: {
      title,
      description,
      address,
      pincode,
      citizen_category: citizen_category || null,
    },
  };
}
