import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import styles from "./profile-social-card.module.css";

export const metadata: Metadata = {
  title: "Profile social card · Missa design review",
  description: "The production Profile share image with a complete fixture.",
  robots: { index: false, follow: false },
};

const imagePath = "/design-system/profile-social-card/opengraph-image";

export default function ProfileSocialCardReviewPage() {
  return (
    <main className={styles.page} data-density="comfortable">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Profile · social preview</p>
          <h1>What appears when a Profile is shared</h1>
          <p className={styles.description}>
            This image uses the production renderer and a public Profile
            fixture. Private Library identifiers and unpublished details never
            enter the card.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href={imagePath} />}
          variant="outline"
        >
          Open full-size image
        </Button>
      </header>

      <section aria-labelledby="social-card-title" className={styles.review}>
        <div className={styles.reviewHeader}>
          <div>
            <p className={styles.eyebrow}>1200 × 630</p>
            <h2 id="social-card-title">Published Profile</h2>
          </div>
          <p>Photo, public identity, one line, and the first selected Work.</p>
        </div>
        <div className={styles.frame}>
          <Image
            src={imagePath}
            alt="Social preview for Amaka Obi's public Profile."
            width={1200}
            height={630}
            unoptimized
            priority
          />
        </div>
      </section>
    </main>
  );
}
