import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/engine';
import { getCreatorProfileRepository } from '@/lib/creatorRepositories';

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId || userId.length > 200 || /[^a-zA-Z0-9_-]/.test(userId)) return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const repository = getCreatorProfileRepository();
  const profile = repository ? await repository.publicProfile(userId) : (await getEngine()).publicUserProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return NextResponse.json(profile, { headers: { 'Cache-Control': 'no-store' } });
}
