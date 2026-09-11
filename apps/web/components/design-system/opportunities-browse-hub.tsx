import Link from "next/link";

import styles from "./opportunities-browse-hub.module.css";

const options = [
  {
    href: "/design-system/opportunities-browse-v2",
    title: "A · White index",
    summary:
      "No photo band. Caption title, quiet search, collections as text links. Homepage owns the brand moment.",
    status: "Recommended",
  },
  {
    href: "/design-system/opportunities-browse-forest",
    title: "B · Forest band",
    summary:
      "Short knit plate with caption type (homepage continuity), then white catalogue below.",
    status: "Continuity",
  },
  {
    href: "/design-system/opportunities-browse-postal",
    title: "C · Postal types",
    summary:
      "Postcard grid for opportunity kinds — Grant, Residency, Fellowship — then search and live cards.",
    status: "Discovery",
  },
  {
    href: "/opportunities",
    title: "Live · Current",
    summary:
      "Field-photo hero, display-scale H1, primary search. Baseline to compare against.",
    status: "Production",
  },
] as const;

export function OpportunitiesBrowseHub() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1>Opportunities browse directions</h1>
        <p>
          Compare brand alignment with{" "}
          <Link href="/design-system/homepage-hero">homepage hero</Link>.
        </p>
      </header>
      <ul className={styles.list}>
        {options.map((option) => (
          <li key={option.href}>
            <Link href={option.href} className={styles.card}>
              <span className={styles.status}>{option.status}</span>
              <h2>{option.title}</h2>
              <p>{option.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
