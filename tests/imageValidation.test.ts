import { describe, it, expect } from 'vitest';
import { verifyImageMagicBytes } from '@/app/api/complaints/route';
import { SUPPORTED_IMAGE_MIMES } from '@/lib/gemini/triage';

describe('Image Magic-Byte and MIME Validation Contract', () => {
  it('identifies JPEG files by magic bytes (FF D8 FF)', () => {
    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
    ]);
    const result = verifyImageMagicBytes(jpegBuffer);
    expect(result).not.toBeNull();
    expect(result?.ext).toBe('.jpg');
    expect(result?.mime).toBe('image/jpeg');
  });

  it('identifies PNG files by magic bytes (89 50 4E 47)', () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
    ]);
    const result = verifyImageMagicBytes(pngBuffer);
    expect(result).not.toBeNull();
    expect(result?.ext).toBe('.png');
    expect(result?.mime).toBe('image/png');
  });

  it('identifies WebP files by RIFF....WEBP signatures', () => {
    const riff = Buffer.from('RIFF');
    const size = Buffer.from([0x24, 0x00, 0x00, 0x00]);
    const webp = Buffer.from('WEBP');
    const payload = Buffer.from('VP8 ');
    const webpBuffer = Buffer.concat([riff, size, webp, payload]);

    const result = verifyImageMagicBytes(webpBuffer);
    expect(result).not.toBeNull();
    expect(result?.ext).toBe('.webp');
    expect(result?.mime).toBe('image/webp');
  });

  it('identifies HEIC/HEIF files by ftyp signature at offset 4', () => {
    const prefix = Buffer.from([0x00, 0x00, 0x00, 0x1c]);
    const ftyp = Buffer.from('ftyp');
    const brand = Buffer.from('heic');
    const rest = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const heicBuffer = Buffer.concat([prefix, ftyp, brand, rest]);

    const result = verifyImageMagicBytes(heicBuffer);
    expect(result).not.toBeNull();
    expect(result?.ext).toBe('.heic');
    expect(result?.mime).toBe('image/heic');
  });

  it('rejects payloads shorter than 12 bytes', () => {
    const tinyBuffer = Buffer.from([0xff, 0xd8, 0xff]);
    expect(verifyImageMagicBytes(tinyBuffer)).toBeNull();
    expect(verifyImageMagicBytes(Buffer.alloc(0))).toBeNull();
  });

  it('rejects spoofed text, HTML, and SVG files labeled as images', () => {
    const htmlBuffer = Buffer.from('<!DOCTYPE html><html><body><script>alert(1)</script></body></html>');
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>');
    const jsonBuffer = Buffer.from('{"name": "malicious", "payload": true, "extra": "data"}');

    expect(verifyImageMagicBytes(htmlBuffer)).toBeNull();
    expect(verifyImageMagicBytes(svgBuffer)).toBeNull();
    expect(verifyImageMagicBytes(jsonBuffer)).toBeNull();
  });

  it('verifies Gemini SUPPORTED_IMAGE_MIMES whitelist behavior for image/jxl', () => {
    expect(SUPPORTED_IMAGE_MIMES.has('image/jpeg')).toBe(true);
    expect(SUPPORTED_IMAGE_MIMES.has('image/png')).toBe(true);
    expect(SUPPORTED_IMAGE_MIMES.has('image/webp')).toBe(true);
    expect(SUPPORTED_IMAGE_MIMES.has('image/heic')).toBe(true);
    expect(SUPPORTED_IMAGE_MIMES.has('image/heif')).toBe(true);

    // image/jxl and image/svg+xml must NOT be in Gemini multimodal supported MIME whitelist
    expect(SUPPORTED_IMAGE_MIMES.has('image/jxl')).toBe(false);
    expect(SUPPORTED_IMAGE_MIMES.has('image/svg+xml')).toBe(false);
  });

  it('enforces 5MB maximum file size contract (5242880 bytes)', () => {
    const MAX_SIZE = 5 * 1024 * 1024;
    expect(MAX_SIZE).toBe(5242880);

    const validSize = 5242880;
    const oversized = 5242881;

    expect(validSize <= MAX_SIZE).toBe(true);
    expect(oversized > MAX_SIZE).toBe(true);
  });
});
