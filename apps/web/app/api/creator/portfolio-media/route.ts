import { NextResponse } from 'next/server';
import { getSessionAccount } from '@/lib/auth';
import { getCreatorProfileRepository } from '@/lib/creatorRepositories';
import { fileTypeFromBuffer } from 'file-type';
import { portfolioRequestBody } from '@/lib/portfolio-request';
export async function POST(request:Request) {
 const session=await getSessionAccount(request.headers.get('cookie'));
 if(!session) return NextResponse.json({error:'Sign in to upload media.'},{status:401});
 const repo=getCreatorProfileRepository();
 if(!repo) return NextResponse.json({error:'Media storage is unavailable.'},{status:503});
 try {
  const body=await portfolioRequestBody(request,21*1024*1024);
  const form=await new Response(body,{headers:{'Content-Type':request.headers.get('content-type')??''}}).formData(); const file=form.get('file');
  if(!(file instanceof File)||!file.size||file.size>20*1024*1024) return NextResponse.json({error:'Choose a file up to 20 MB.'},{status:400});
  const bytes=Buffer.from(await file.arrayBuffer()); const type=await fileTypeFromBuffer(bytes);
  if(!type||!['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/wav','audio/ogg','audio/flac','audio/mp4','audio/x-m4a'].includes(type.mime)) return NextResponse.json({error:'Choose a JPG, PNG, WebP, GIF, MP3, WAV, Ogg, FLAC or M4A file.'},{status:415});
  const id=crypto.randomUUID(); await repo.addPortfolioMedia(session.account.id,id,type.mime,bytes);
  return NextResponse.json({url:`/api/creator/portfolio-media/${id}`},{status:201});
 } catch(error) {return NextResponse.json({error:error instanceof Error&&error.message.includes('100 MB')?error.message:'Could not upload media. Please retry.'},{status:503});}
}
