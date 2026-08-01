import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getEngine, persistRadar } from '@/lib/engine';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'text/plain', 'application/rtf', 'image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'File storage is not configured yet. Add BLOB_READ_WRITE_TOKEN to enable uploads.' }, { status: 503 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file is required' }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'Files must be 10 MB or smaller' }, { status: 413 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: 'This file type is not supported' }, { status: 415 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'material';
  try {
    const blob = await put(`profiles/${id}/${crypto.randomUUID()}-${safeName}`, file, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN, contentType: file.type, addRandomSuffix: false });
    const engine = await getEngine();
    const material = engine.addProfileMaterial(id, { kind: 'work', title: file.name, url: blob.url, storageKey: blob.pathname, mimeType: file.type, sizeBytes: file.size, status: 'ready', visibility: 'submission-only' });
    await persistRadar();
    return NextResponse.json(material, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not upload file' }, { status: 502 }); }
}
