import { NextResponse } from 'next/server';
import { getOpportunityRepository } from '@/lib/opportunityRepository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const opportunity = await getOpportunityRepository().getById(id);
  if (!opportunity || !['opening-soon', 'open', 'closing-soon', 'deadline-extended'].includes(opportunity.status)) {
    return NextResponse.json({ error: 'This opportunity is no longer accepting submissions.' }, { status: 410 });
  }
  if (!opportunity.submissionAvailable || !opportunity.submissionUrl) {
    return NextResponse.json({ error: 'A verified submission link is not available.' }, { status: 404 });
  }

  let destination: URL;
  try {
    destination = new URL(opportunity.submissionUrl);
  } catch {
    return NextResponse.json({ error: 'The submission link is invalid.' }, { status: 502 });
  }
  if (destination.protocol !== 'https:') {
    return NextResponse.json({ error: 'The submission link is not safe to open.' }, { status: 502 });
  }

  return NextResponse.redirect(destination, {
    status: 307,
    headers: { 'cache-control': 'no-store, private' },
  });
}
