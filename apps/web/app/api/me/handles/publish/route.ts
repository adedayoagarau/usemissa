import { NextResponse } from "next/server";
// Publishing now requires reviewing the portfolio snapshot in the owner editor.
export async function POST() {
 return NextResponse.json({error:"Open Public profile settings to review and publish your portfolio.",href:"/profile/portfolio"},{status:409});
}
