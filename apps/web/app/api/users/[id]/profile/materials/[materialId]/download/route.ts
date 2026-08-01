import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { requireSelf } from '@/lib/auth';
import { getEngine } from '@/lib/engine';

export async function GET(request: Request, { params }: { params: Promise<{ id: string; materialId: string }> }) {
  const { id, materialId } = await params;
  const auth = await requireSelf(request, id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'File storage is not configured' }, { status: 503 });
  const engine = await getEngine();
  const material = engine.getProfile(id).materials.find((candidate) => candidate.id === materialId);
  if (!material?.storageKey) return NextResponse.json({ error: 'File not found' }, { status: 404 });
  const result = await get(material.storageKey, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN });
  if (!result || !result.stream) return NextResponse.json({ error: 'File not found' }, { status: 404 });
  return new NextResponse(result.stream, { headers: { 'content-type': material.mimeType ?? result.blob.contentType ?? 'application/octet-stream', 'content-disposition': `inline; filename="${material.title.replace(/"/g, '')}"`, 'cache-control': 'private, no-store' } });
}
