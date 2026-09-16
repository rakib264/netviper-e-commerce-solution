import { BRAND } from '@/lib/seo/brand';
import { randomUUID } from 'crypto';

export type BunnyUploadResult = {
  /** CDN URL for delivery (public) */
  url: string;
  /** Storage object key (path within the zone) */
  path: string;
  /** Alias for path — keeps older clients that expected Cloudinary publicId working */
  publicId: string;
  contentType: string;
  bytes: number;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export function getBunnyConfig() {
  const storageZone = requiredEnv('BUNNY_STORAGE_ZONE_NAME');
  const accessKey = requiredEnv('BUNNY_STORAGE_ACCESS_KEY');
  const storageHostname =
    process.env.BUNNY_STORAGE_HOSTNAME?.trim() || 'storage.bunnycdn.com';
  const cdnBase = (
    process.env.NEXT_PUBLIC_BUNNY_CDN_URL || ''
  )
    .trim()
    .replace(/\/$/, '');

  if (!cdnBase) {
    throw new Error('Missing required env: NEXT_PUBLIC_BUNNY_CDN_URL');
  }

  return { storageZone, accessKey, storageHostname, cdnBase };
}

export function isBunnyConfigured(): boolean {
  return Boolean(
    process.env.BUNNY_STORAGE_ZONE_NAME &&
      process.env.BUNNY_STORAGE_ACCESS_KEY &&
      process.env.NEXT_PUBLIC_BUNNY_CDN_URL,
  );
}

export function getBunnyCdnHostname(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_BUNNY_CDN_URL;
    if (!url) return null;
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function slugifyFolder(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'uploads';
}

function sanitizeFilename(filename: string): string {
  const base = filename.split('/').pop() || 'file';
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  return cleaned.slice(0, 120) || 'file';
}

/**
 * Build a stable object key under the storage zone.
 * Example: ramen-bhai/products/1712345678901-a1b2c3d4-bag.jpg
 *
 * The prefix follows the brand. Objects already uploaded keep their existing
 * keys — their URLs are stored absolute — so changing it moves new uploads
 * without breaking a single existing image.
 */
export function buildBunnyObjectKey(
  folder: string,
  originalFilename: string,
): string {
  const site = slugifyFolder(process.env.NEXT_PUBLIC_SITE_NAME || BRAND.name);
  const safeFolder = slugifyFolder(folder || 'uploads');
  const safeName = sanitizeFilename(originalFilename);
  const id = randomUUID().replace(/-/g, '').slice(0, 10);
  return `${site}/${safeFolder}/${Date.now()}-${id}-${safeName}`;
}

export function toBunnyCdnUrl(objectPath: string): string {
  const { cdnBase } = getBunnyConfig();
  const path = objectPath.replace(/^\/+/, '');
  return `${cdnBase}/${path}`;
}

function storageUrlFor(objectPath: string): string {
  const { storageZone, storageHostname } = getBunnyConfig();
  const path = objectPath.replace(/^\/+/, '');
  return `https://${storageHostname}/${storageZone}/${path}`;
}

/**
 * Upload a binary buffer/Blob to Bunny Storage and return the CDN URL.
 */
export async function uploadToBunny(options: {
  data: Buffer | ArrayBuffer | Uint8Array;
  filename: string;
  contentType?: string;
  folder?: string;
  /** Override full object key (skips auto path generation) */
  objectKey?: string;
}): Promise<BunnyUploadResult> {
  const { accessKey } = getBunnyConfig();
  const objectKey =
    options.objectKey ||
    buildBunnyObjectKey(options.folder || 'uploads', options.filename);

  const body =
    options.data instanceof Buffer
      ? options.data
      : Buffer.from(options.data as ArrayBuffer);

  const contentType = options.contentType || 'application/octet-stream';
  const url = storageUrlFor(objectKey);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: accessKey,
      'Content-Type': contentType,
      'Content-Length': String(body.byteLength),
    },
    // Undici prefers Uint8Array over Node Buffer in some runtimes
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Bunny upload failed (${response.status}): ${text || response.statusText}`,
    );
  }

  return {
    url: toBunnyCdnUrl(objectKey),
    path: objectKey,
    publicId: objectKey,
    contentType,
    bytes: body.byteLength,
  };
}

/** Delete an object from Bunny Storage by its zone-relative path */
export async function deleteFromBunny(objectPath: string): Promise<void> {
  const { accessKey } = getBunnyConfig();
  const path = objectPath
    .replace(/^https?:\/\/[^/]+\//, '') // strip CDN host if a full URL was passed
    .replace(/^\/+/, '');

  const response = await fetch(storageUrlFor(path), {
    method: 'DELETE',
    headers: { AccessKey: accessKey },
  });

  // 404 = already gone — treat as success
  if (!response.ok && response.status !== 404) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Bunny delete failed (${response.status}): ${text || response.statusText}`,
    );
  }
}

/** Lightweight connectivity check used by admin Test button */
export async function testBunnyConnection(): Promise<{
  ok: boolean;
  message: string;
  cdnUrl?: string;
  storageZone?: string;
}> {
  if (!isBunnyConfigured()) {
    return {
      ok: false,
      message:
        'Bunny is not configured. Set BUNNY_STORAGE_ZONE_NAME, BUNNY_STORAGE_ACCESS_KEY, and NEXT_PUBLIC_BUNNY_CDN_URL.',
    };
  }

  const { storageZone, accessKey, storageHostname, cdnBase } = getBunnyConfig();
  const listUrl = `https://${storageHostname}/${storageZone}/`;

  const response = await fetch(listUrl, {
    method: 'GET',
    headers: {
      AccessKey: accessKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return {
      ok: false,
      message: `Storage auth failed (${response.status}): ${text || response.statusText}`,
      storageZone,
      cdnUrl: cdnBase,
    };
  }

  return {
    ok: true,
    message: 'Bunny Storage + CDN credentials are valid.',
    storageZone,
    cdnUrl: cdnBase,
  };
}
