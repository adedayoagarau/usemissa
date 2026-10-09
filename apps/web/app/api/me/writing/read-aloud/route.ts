import { handleReadAloud } from "@/lib/writing-read-aloud-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleReadAloud(request);
}
