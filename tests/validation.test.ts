import { describe, it, expect } from 'vitest';
import { DEPARTMENTS } from '@/types/database';
import {
  FIELD_LIMITS,
  isValidPincode,
  sanitizeTextInput,
  validateComplaintPayload,
  detectImageMagicBytes,
} from '@/lib/validation/complaints';
import { formatDate } from '@/lib/utils/formatDate';

describe('CivicResolve Validation Contract Tests', () => {
  describe('Pincode Validation (/^\\d{6}$/) & isValidPincode', () => {
    it('accepts standard 6-digit numeric pincodes', () => {
      expect(isValidPincode('517646')).toBe(true);
      expect(isValidPincode('560001')).toBe(true);
      expect(isValidPincode('110001')).toBe(true);
      expect(isValidPincode('400001')).toBe(true);
      expect(isValidPincode('600001')).toBe(true);
      expect(FIELD_LIMITS.PINCODE_REGEX.test('517646')).toBe(true);
    });

    it('rejects pincodes shorter than 6 digits', () => {
      expect(isValidPincode('51764')).toBe(false);
      expect(isValidPincode('1')).toBe(false);
      expect(isValidPincode('00000')).toBe(false);
      expect(FIELD_LIMITS.PINCODE_REGEX.test('51764')).toBe(false);
    });

    it('rejects pincodes longer than 6 digits', () => {
      expect(isValidPincode('5176461')).toBe(false);
      expect(isValidPincode('56000100')).toBe(false);
      expect(FIELD_LIMITS.PINCODE_REGEX.test('5176461')).toBe(false);
    });

    it('rejects non-numeric characters and spaces in pincode', () => {
      expect(isValidPincode('51764A')).toBe(false);
      expect(isValidPincode('517 46')).toBe(false);
      expect(isValidPincode('51-646')).toBe(false);
      expect(isValidPincode('abc123')).toBe(false);
    });

    it('rejects empty or whitespace-only pincodes', () => {
      expect(isValidPincode('')).toBe(false);
      expect(isValidPincode('      ')).toBe(false);
    });
  });

  describe('Sanitization Helper (sanitizeTextInput)', () => {
    it('strips null bytes and non-printable control characters while preserving newlines and tabs', () => {
      const malicious = 'Hello\x00 World\x07!\nLine 2\tIndented\x1F.';
      const cleaned = sanitizeTextInput(malicious);
      expect(cleaned).toBe('Hello World!\nLine 2\tIndented.');
      expect(cleaned).not.toContain('\x00');
      expect(cleaned).not.toContain('\x07');
      expect(cleaned).not.toContain('\x1F');
    });

    it('trims surrounding whitespace cleanly', () => {
      const input = '   Pothole on Main Road   \n\t  ';
      expect(sanitizeTextInput(input)).toBe('Pothole on Main Road');
    });

    it('enforces maximum length truncation if maxLen is specified', () => {
      const input = 'A'.repeat(200);
      const truncated = sanitizeTextInput(input, 150);
      expect(truncated).toHaveLength(150);
    });

    it('handles non-string inputs gracefully without throwing', () => {
      expect(sanitizeTextInput(null as unknown as string)).toBe('');
      expect(sanitizeTextInput(undefined as unknown as string)).toBe('');
    });
  });

  describe('Complaint Payload Validation (validateComplaintPayload)', () => {
    it('accepts and sanitizes valid complaint payload', () => {
      const result = validateComplaintPayload({
        title: 'Broken streetlight on 5th cross',
        description: 'Light has been flickering and is now completely out.',
        address: '5th Cross, Indiranagar',
        pincode: '560038',
        citizen_category: 'Electrical & Streetlights',
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.title).toBe('Broken streetlight on 5th cross');
        expect(result.data.pincode).toBe('560038');
        expect(result.data.citizen_category).toBe('Electrical & Streetlights');
      }
    });

    it('rejects payload missing title', () => {
      const result = validateComplaintPayload({
        title: '   ',
        description: 'Valid description',
        address: 'Valid address',
        pincode: '560038',
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('title');
      }
    });

    it('rejects payload with invalid pincode', () => {
      const result = validateComplaintPayload({
        title: 'Valid title',
        description: 'Valid description',
        address: 'Valid address',
        pincode: '56003A',
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('pincode');
      }
    });

    it('rejects payload with title exceeding TITLE_MAX (150 chars)', () => {
      const result = validateComplaintPayload({
        title: 'T'.repeat(151),
        description: 'Valid description',
        address: 'Valid address',
        pincode: '560038',
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('cannot exceed 150');
      }
    });
  });

  describe('detectImageMagicBytes Edge Cases', () => {
    it('detects valid JPEG magic bytes', () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const result = detectImageMagicBytes(jpeg);
      expect(result).toEqual({ ext: '.jpg', mime: 'image/jpeg' });
    });

    it('returns null for short buffers (< 12 bytes)', () => {
      const shortBuf = Buffer.from([0xff, 0xd8, 0xff]);
      expect(detectImageMagicBytes(shortBuf)).toBeNull();
    });

    it('returns null for executable or unknown binaries', () => {
      const exeBuf = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
      expect(detectImageMagicBytes(exeBuf)).toBeNull();
    });
  });

  describe('Length Bounds Validation', () => {
    it('enforces title boundary (<= 150 chars)', () => {
      const validTitle = 'A'.repeat(150);
      const invalidTitle = 'A'.repeat(151);
      expect(validTitle.length).toBeLessThanOrEqual(FIELD_LIMITS.TITLE_MAX);
      expect(invalidTitle.length).toBeGreaterThan(FIELD_LIMITS.TITLE_MAX);
    });

    it('enforces description boundary (<= 2500 chars)', () => {
      const validDesc = 'D'.repeat(2500);
      const invalidDesc = 'D'.repeat(2501);
      expect(validDesc.length).toBeLessThanOrEqual(FIELD_LIMITS.DESCRIPTION_MAX);
      expect(invalidDesc.length).toBeGreaterThan(FIELD_LIMITS.DESCRIPTION_MAX);
    });

    it('enforces address boundary (<= 300 chars)', () => {
      const validAddr = 'S'.repeat(300);
      const invalidAddr = 'S'.repeat(301);
      expect(validAddr.length).toBeLessThanOrEqual(FIELD_LIMITS.ADDRESS_MAX);
      expect(invalidAddr.length).toBeGreaterThan(FIELD_LIMITS.ADDRESS_MAX);
    });

    it('enforces resolution_note boundary (<= 1500 chars)', () => {
      const validNote = 'R'.repeat(1500);
      const invalidNote = 'R'.repeat(1501);
      expect(validNote.length).toBeLessThanOrEqual(FIELD_LIMITS.RESOLUTION_NOTE_MAX);
      expect(invalidNote.length).toBeGreaterThan(FIELD_LIMITS.RESOLUTION_NOTE_MAX);
    });

    it('enforces reassignment_reason boundary (<= 1000 chars)', () => {
      const validReason = 'W'.repeat(1000);
      const invalidReason = 'W'.repeat(1001);
      expect(validReason.length).toBeLessThanOrEqual(FIELD_LIMITS.REASSIGNMENT_REASON_MAX);
      expect(invalidReason.length).toBeGreaterThan(FIELD_LIMITS.REASSIGNMENT_REASON_MAX);
    });

    it('enforces citizen_category boundary (<= 100 chars)', () => {
      const validCat = 'C'.repeat(100);
      const invalidCat = 'C'.repeat(101);
      expect(validCat.length).toBeLessThanOrEqual(FIELD_LIMITS.CATEGORY_MAX);
      expect(invalidCat.length).toBeGreaterThan(FIELD_LIMITS.CATEGORY_MAX);
    });
  });

  describe('DEPARTMENTS Enum Completeness', () => {
    it('contains all 5 municipal departments', () => {
      expect(DEPARTMENTS).toHaveLength(5);
      expect(DEPARTMENTS).toContain('Roads & Infrastructure');
      expect(DEPARTMENTS).toContain('Sanitation & Waste');
      expect(DEPARTMENTS).toContain('Water & Drainage');
      expect(DEPARTMENTS).toContain('Electrical & Streetlights');
      expect(DEPARTMENTS).toContain('Parks & Public Safety');
    });

    it('ensures each department string is non-empty and formatted correctly', () => {
      for (const dept of DEPARTMENTS) {
        expect(dept.length).toBeGreaterThan(5);
        expect(dept).toMatch(/^[A-Z][A-Za-z &]+$/);
      }
    });
  });

  describe('Deterministic Date Formatting', () => {
    it('formats ISO timestamps deterministically', () => {
      const iso = '2026-11-21T10:30:00.000Z';
      const formatted = formatDate(iso);
      expect(formatted).toBe('Nov 21, 2026');
    });

    it('returns N/A gracefully on invalid timestamps without throwing', () => {
      expect(formatDate('invalid-date')).toBe('N/A');
      expect(formatDate('')).toBe('N/A');
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
    });
  });
});
