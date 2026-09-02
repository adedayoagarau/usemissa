import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { PublicSiteShell } from "@/components/public-site-shell";
import { getEngine } from "@/lib/engine";
import { getCreatorProfileRepository } from "@/lib/creatorRepositories";
import styles from "../../public-editorial.module.css";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  if (!userId || userId.length > 200 || /[^a-zA-Z0-9_-]/u.test(userId))
    notFound();
  const repository = getCreatorProfileRepository();
  const profile = repository ? await repository.publicProfile(userId) : (await getEngine()).publicUserProfile(userId);
  if (!profile) notFound();

  return (
    <PublicSiteShell>
      <main id="main-content" className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Public Profile</p>
          {profile.isPrivate ? (
            <>
              <h1>This Profile is private.</h1>
              <p>The creator has chosen not to publish Profile details.</p>
            </>
          ) : (
            <>
              <h1>{profile.displayName ?? "Creator Profile"}</h1>
              <p>
                {profile.bio || "This creator has not published a biography."}
              </p>
            </>
          )}
        </header>
        <section className={styles.section} aria-labelledby="published-content">
          <header className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Published by the creator</p>
            <h2 id="published-content">
              {profile.isPrivate ? "No public content" : "Profile information"}
            </h2>
            <p>
              {profile.isPrivate
                ? "Private Profile preferences, Tracker activity, applications, messages, and Organization memberships are never shown here."
                : "Only information this creator has chosen to make public belongs on this page. Private Tracker activity and matching preferences are not part of the public Profile."}
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
