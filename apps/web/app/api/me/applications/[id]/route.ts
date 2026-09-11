import { NextResponse } from "next/server";
import { creatorCommandEnvelope, CreatorConflictError, CreatorIdempotencyConflictError, CreatorCommandValidationError } from "@missa/radar-adapters";
import { getSessionAccount } from "@/lib/auth";
import { ApplicationWorkspaceRepository, applicationCommand } from "@/lib/application-workspace";
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await getSessionAccount(request.headers.get("cookie"));
  if(!session)return NextResponse.json({error:"Sign in to view this application."},{status:401,headers});
  try {const detail=await new ApplicationWorkspaceRepository().detail(session.account.id,(await params).id);return detail?NextResponse.json(detail,{headers}):NextResponse.json({error:"Application not found."},{status:404,headers});}
  catch {return NextResponse.json({error:"This application could not load. Try again."},{status:503,headers});}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await getSessionAccount(request.headers.get("cookie"));
  if(!session)return NextResponse.json({error:"Sign in to update this application."},{status:401,headers});
  const body=applicationCommand.safeParse(await request.json().catch(()=>null));
  if(!body.success)return NextResponse.json({error:"Check the status, date and text, then try again."},{status:400,headers});
  try {
    const {id}=await params;
    const envelope=creatorCommandEnvelope(session.account.id,`application.${body.data.action}`,request.headers.get("Idempotency-Key")??"",{opportunityId:id,...body.data},Number(request.headers.get("If-Match")));
    const receipt=await new ApplicationWorkspaceRepository().change(envelope,id,body.data);
    return NextResponse.json({receipt},{headers});
  } catch(error) {
    if(error instanceof CreatorConflictError || error instanceof CreatorIdempotencyConflictError)return NextResponse.json({error:"This application changed. Refresh it before saving again."},{status:409,headers});
    if(error instanceof CreatorCommandValidationError || (error instanceof Error && error.message==='A recorded update cannot be in the future.'))return NextResponse.json({error:error.message},{status:400,headers});
    return NextResponse.json({error:"Your update could not be saved. Please try again."},{status:503,headers});
  }
}
