import { NextResponse } from 'next/server';
import { readUserHandle } from '@missa/radar-adapters';
import { getSessionAccount } from '@/lib/auth';
import { getCreatorProfileRepository } from '@/lib/creatorRepositories';
import { portfolioSchema, portfolioMediaIds, publicationIssue } from '@/lib/creator-portfolio-schema';
export async function POST(request:Request) {
 const session=await getSessionAccount(request.headers.get('cookie'));
 if(!session?.account.userId) return NextResponse.json({error:'Sign in to publish.'},{status:401});
 const repo=getCreatorProfileRepository();
 if(!repo||!process.env.DATABASE_URL) return NextResponse.json({error:'Publishing is unavailable.'},{status:503});
 try {
  const body=await request.json();
  const handle=await readUserHandle(process.env.DATABASE_URL,session.account.userId);
  if(!handle) return NextResponse.json({error:'Choose and claim a handle first.'},{status:409});
  const state=await repo.portfolioState(session.account.id);
  const parsed=portfolioSchema.safeParse(state.draft);
  if(!parsed.success||!parsed.data.name.trim()) return NextResponse.json({error:'Add your display name before publishing.'},{status:400});
  const issue=publicationIssue(parsed.data);if(issue)return NextResponse.json({error:issue},{status:400});
  if(body.revision!==state.revision) return NextResponse.json({error:'Your draft changed. Save and review it again.'},{status:409});
  const publishedAt=await repo.publishPortfolio(session.account.id,state.revision,portfolioMediaIds(parsed.data));
  return NextResponse.json({publishedAt,href:`/@${handle.handleKey}`});
 } catch {return NextResponse.json({error:'Could not publish. Save and review your draft, then retry.'},{status:409});}
}
export async function DELETE(request:Request) {
 const session=await getSessionAccount(request.headers.get('cookie'));
 if(!session) return NextResponse.json({error:'Sign in to unpublish.'},{status:401});
 const repo=getCreatorProfileRepository();
 if(!repo) return NextResponse.json({error:'Publishing is unavailable.'},{status:503});
 try {await repo.unpublishPortfolio(session.account.id);return NextResponse.json({publishedAt:null});}
 catch {return NextResponse.json({error:'Could not unpublish. Please retry.'},{status:503});}
}
