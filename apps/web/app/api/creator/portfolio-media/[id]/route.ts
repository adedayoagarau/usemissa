import { getSessionAccount } from "@/lib/auth";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const session = await getSessionAccount(request.headers.get("cookie"));
  const repo = getCreatorProfileRepository();
  if (!repo) return new Response(null, { status: 503 });
  const media = await repo.portfolioMedia(id, session?.account.id);
  if (!media) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(media.bytes), {
    headers: {
      "Content-Type": media.content_type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Length": String(media.bytes.length),
    },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Media not found." }, { status: 404 });
  const session = await getSessionAccount(request.headers.get("cookie"));
  if (!session) return Response.json({ error: "Not authenticated." }, { status: 401 });
  const repo = getCreatorProfileRepository();
  if (!repo) return Response.json({ error: "Media storage is unavailable." }, { status: 503 });
  const result = await repo.deletePortfolioMedia(id, session.account.id);
  if (result === "published") {
    return Response.json({ error: "This media is in your published profile. Publish an updated profile before removing it." }, { status: 409 });
  }
  if (result === "missing") return Response.json({ error: "Media not found." }, { status: 404 });
  return Response.json({ deleted: true });
}
