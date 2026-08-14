import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { resolveHandle } from "@missa/radar-adapters";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getEngine } from "@/lib/engine";
import styles from "../public-editorial.module.css";

export default async function PublicHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const rawHandle = (await params).handle;
  if (!rawHandle.startsWith("@") || !process.env.DATABASE_URL) notFound();
  const resolved = await resolveHandle(
    process.env.DATABASE_URL,
    rawHandle.slice(1),
  ).catch(() => null);
  if (
    !resolved ||
    resolved.resolution !== "canonical" ||
    resolved.state !== "claimed" ||
    resolved.subjectType !== "user"
  )
    notFound();
  const engine = await getEngine();
  const user = engine.store.users.get(resolved.subjectId);
  const profile = user ? engine.publicUserProfile(user.id) : undefined;
  if (!user?.publicProfilePublishedAt || !profile || profile.isPrivate)
    notFound();

  return (
    <PublicSiteShell>
      <main id="main-content" className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Public Profile</p>
          <h1>{profile.displayName ?? "Creator Profile"}</h1>
          <p>{profile.bio || "This creator has not published a biography."}</p>
        </header>
        <section className={styles.section} aria-labelledby="published-content">
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Published by the creator</p>
            <h2 id="published-content">Profile information</h2>
            <p>
              Only information this creator has chosen to make public belongs on
              this page. Private Tracker activity and matching preferences are
              not part of the public Profile.
            </p>
          </header>
        </section>
        <nav
          className={styles.actions}
          aria-label="Continue from public Profile"
        >
          <Link href="/opportunities">
            Explore Opportunities <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/signup">
            Create your Profile <ArrowRight aria-hidden="true" />
          </Link>
        </nav>
      </main>
    </PublicSiteShell>
  );
}
