import type { Metadata } from "next";
import Link from "next/link";
import { OpportunityEditorialHero } from "@/components/opportunity-editorial-hero";
import styles from "./opportunities-editorial.module.css";

export const metadata: Metadata = {
  title: "Opportunities editorial hero · Missa design archive",
  robots: { index: false, follow: false },
};

export default function OpportunitiesEditorialArchivePage() {
  return (
    <div className={styles.shell}>
      <div className={styles.banner} role="note">
        <span>
          Reserved editorial direction —{" "}
          <Link href="/design-system/opportunities-browse-v2">white index (current)</Link>
          {" · "}
          <Link href="/design-system/opportunities-browse">all directions</Link>
        </span>
        <Link href="/opportunities">Live /opportunities</Link>
      </div>
      <OpportunityEditorialHero />
    </div>
  );
}
