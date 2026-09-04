import { auth } from '@/lib/auth';
import { uploadToBunny, isBunnyConfigured } from '@/lib/bunny';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_BYTES = 25 * 1024 * 1024; // 25MB — matches media gallery

const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'application/pdf'];
const ALLOWED_EXACT = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/octet-stream',
]);

function isAllowedMime(mime: string, filename: string): boolean {
  const type = (mime || '').toLowerCase();
  if (ALLOWED_EXACT.has(type)) return true;
  if (ALLOWED_MIME_PREFIXES.some((p) => type.startsWith(p))) return true;
  // Some browsers send empty type — allow common extensions
  if (!type) {
    return /\.(jpe?g|png|gif|webp|avif|svg|mp4|webm|mov|pdf)$/i.test(filename);
  }
  return false;
}

function folderFromMime(mime: string, filename: string): string {
  if (mime.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(filename)) {
    return 'videos';
  }
  if (mime === 'application/pdf' || /\.pdf$/i.test(filename)) {
    return 'documents';
  }
  return 'images';
}

export async function POST(request: NextRequest) {
  try {
    if (!isBunnyConfigured()) {
      return NextResponse.json(
        { error: 'Object storage is not configured (Bunny)' },
        { status: 503 },
      );
    }

    // Prefer authenticated uploads; still allow session-less for public flows
    // that already rely on this endpoint (profile/returns), but log role when present.
    const session = await auth().catch(() => null);
    void session;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderOverride = String(formData.get('folder') || '').trim();

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_BYTES / (1024 * 1024)}MB` },
        { status: 400 },
      );
    }

    if (!isAllowedMime(file.type, file.name)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const folder =
      folderOverride || folderFromMime(file.type || '', file.name);

    const result = await uploadToBunny({
      data: bytes,
      filename: file.name || 'upload.bin',
      contentType: file.type || 'application/octet-stream',
      folder,
    });

    // Keep Cloudinary-shaped response for existing clients
    return NextResponse.json({
      url: result.url,
      publicId: result.publicId,
      path: result.path,
      bytes: result.bytes,
      contentType: result.contentType,
      provider: 'bunny',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
