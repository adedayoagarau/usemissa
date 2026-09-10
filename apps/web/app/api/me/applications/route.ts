import { NextResponse } from "next/server";
import { getSessionAccount } from "@/lib/auth";
import { ApplicationWorkspaceRepository } from "@/lib/application-workspace";
const headers={"Cache-Control":"private, no-store"};
export async function GET(request:Request){
  const session=await getSessionAccount(request.headers.get("cookie"));
  if(!session)return NextResponse.json({error:"Sign in to view your applications."},{status:401,headers});
  try { return NextResponse.json({applications:await new ApplicationWorkspaceRepository().list(session.account.id)},{headers}); }
  catch {return NextResponse.json({error:"Your applications could not load. Try again."},{status:503,headers});}
}
