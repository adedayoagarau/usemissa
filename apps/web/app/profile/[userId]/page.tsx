import { notFound, redirect } from "next/navigation";
import { readUserHandle } from "@missa/radar-adapters";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
export const dynamic = "force-dynamic";
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  if (!userId || userId.length > 200 || !process.env.DATABASE_URL) notFound();
  const repo = getCreatorProfileRepository();
  if (!(await repo?.publicPortfolio(userId))) notFound();
  const handle = await readUserHandle(process.env.DATABASE_URL, userId);
  if (!handle) notFound();
  redirect(`/@${handle.handleKey}`);
}
