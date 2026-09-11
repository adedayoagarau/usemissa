import { put } from '@vercel/blob';
import { fileTypeFromBuffer } from 'file-type';
import { NextResponse } from 'next/server';
import { requireOrganizationAccess } from '@/lib/organizationAccess';

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOrganizationAccess(request, id, { roles: ['admin'] });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'Logo storage is not configured' }, { status: 503 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Choose a logo up to 5 MB.' }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(bytes);
  const svg = file.type === 'image/svg+xml' && bytes.toString('utf8').trimStart().startsWith('<svg');
  const mime = detected?.mime ?? (svg ? file.type : undefined);
  if (!mime || !acceptedTypes.includes(mime as typeof acceptedTypes[number])) return NextResponse.json({ error: 'Choose a JPG, PNG, WebP or SVG logo.' }, { status: 415 });
  const blob = await put(`missa/organizations/${id}/portal-logo-${crypto.randomUUID()}`, bytes, { access: 'public', contentType: mime, addRandomSuffix: false, token: process.env.BLOB_READ_WRITE_TOKEN });
  return NextResponse.json({ url: blob.url, mimeType: mime }, { status: 201 });
}
