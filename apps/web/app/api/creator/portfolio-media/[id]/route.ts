import { getSessionAccount } from '@/lib/auth';
import { getCreatorProfileRepository } from '@/lib/creatorRepositories';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/.test(id)) return new Response(null,{status:404});
 const session=await getSessionAccount(request.headers.get('cookie'));
 const repo=getCreatorProfileRepository();
 if(!repo) return new Response(null,{status:503});
 const media=await repo.portfolioMedia(id,session?.account.id);
 if(!media) return new Response(null,{status:404});
 return new Response(new Uint8Array(media.bytes),{headers:{'Content-Type':media.content_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Length':String(media.bytes.length)}});
}
