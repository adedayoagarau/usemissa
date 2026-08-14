import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionAccountFromToken, SESSION_COOKIE } from "@/lib/auth";
import { PublicSiteShell } from "@/components/public-site-shell";

export default async function PublicationClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ handle?: string }>;
}) {
  const cookieStore = await cookies();
  const session = await getSessionAccountFromToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
  if (!session)
    redirect(`/login?next=${encodeURIComponent("/publication-claim")}`);
  const handle = (await searchParams).handle?.trim().replace(/^@/u, "");
  return (
    <PublicSiteShell>
      <main className="mx-auto min-h-[70vh] max-w-2xl px-6 py-16">
        <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
          Publication claim
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          This name needs verification first.
        </h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          {handle
            ? `@${handle} is currently held in Missa’s directory.`
            : "This name is currently held in Missa’s directory."}{" "}
          We need a domain-verification step before we can change that hold.
          Nothing has changed yet.
        </p>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Verification is not available in this release. We will keep the name
          protected until that process is complete.
        </p>
        <Link
          href="/profile"
          className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Return to Profile
        </Link>
      </main>
    </PublicSiteShell>
  );
}
