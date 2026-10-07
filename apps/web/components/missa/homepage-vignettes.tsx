import {
  ArrowUpRight,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  CircleCheck,
  Mail,
  MapPin,
  Plus,
  Search,
} from "lucide-react";

import type { ReactNode } from "react";

import { CallCover } from "@/components/illustrations/missa-illustrations";
import type { VignetteCall } from "@/lib/homepageShowcase";
import styles from "./homepage-vignettes.module.css";

/**
 * Still copies of shipped Missa UI, drawn at homepage scale for the hero tour
 * and the feature cards. Each mirrors its source; keep them in step when the
 * source changes:
 * - SearchVignette: the browse search in design-system/opportunities-browse-v2-preview.tsx
 * - CallCardVignette: design-system/opportunity-browse-project-card.tsx
 * - SavedToast: the save toast from save-to-tracker-button.tsx ("Opportunity saved")
 * - TrackerItemVignette: the item card in tracker-product.tsx
 * - ReminderEmailVignette: reminder() in emails/deadline-moments.ts
 * - ProfileVignette: IdentityHeader in creator-profile/public-profile.tsx with profile-connect.tsx
 * Decorative: every use is aria-hidden and the page says the same in text.
 */

export type { VignetteCall } from "@/lib/homepageShowcase";

function asDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`);
}

/** "12 Oct 2026", the card's fact-row format. */
export function longDate(iso: string) {
  return asDate(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "12 Oct", the Tracker's timing format. */
function shortDate(iso: string) {
  return asDate(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}


function daysLeftLabel(days: number) {
  return days === 1 ? "Tomorrow" : `${days} days left`;
}

function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

export function SearchVignette({
  query,
  pressed = false,
}: {
  query: ReactNode;
  pressed?: boolean;
}) {
  return (
    <div className={styles.search}>
      <Search size={16} aria-hidden="true" />
      <span className={styles.searchText}>{query}</span>
      <span className={styles.searchGo} data-cursor-target data-pressed={pressed || undefined}>
        <ArrowUpRight size={18} aria-hidden="true" />
      </span>
    </div>
  );
}

export function CallCardVignette({
  call,
  saved = false,
  pressed = false,
}: {
  call: VignetteCall;
  saved?: boolean;
  pressed?: boolean;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.plate}>
        <span className={styles.plateArt}>
          <CallCover type={call.type} title={call.title} />
        </span>
        <span className={styles.badges}>
          <span className={styles.badge}>{call.typeLabel}</span>
          {call.daysLeft <= 7 ? (
            <span className={styles.badge} data-tone="ochre">
              Closing soon
            </span>
          ) : null}
        </span>
        <span
          className={styles.save}
          data-cursor-target
          data-saved={saved || undefined}
          data-pressed={pressed || undefined}
        >
          {saved ? <Check size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
        </span>
      </div>
      <div className={styles.cardBody}>
        <strong className={styles.cardTitle}>{call.title}</strong>
        {call.organizationName ? (
          <span className={styles.cardOrg}>{call.organizationName}</span>
        ) : null}
        <span className={styles.fact}>
          <CalendarDays size={12} aria-hidden="true" /> {longDate(call.date)}
        </span>
      </div>
    </div>
  );
}

export function SavedToast() {
  return (
    <div className={styles.toast}>
      <CircleCheck size={18} aria-hidden="true" />
      <span>Opportunity saved</span>
    </div>
  );
}

export function TrackerItemVignette({ call }: { call: VignetteCall }) {
  const soon = call.daysLeft <= 7;
  return (
    <div className={styles.tracker}>
      <span className={`${styles.monogram} font-mono`}>
        {monogram(call.organizationName ?? call.title)}
      </span>
      <span className={styles.trackerMain}>
        <span className={styles.pills}>
          <span className={styles.pill} data-tone="stage">
            Saved
          </span>
          <span className={styles.pill}>{call.typeLabel}</span>
        </span>
        <strong className={`${styles.trackerTitle} font-heading`}>{call.title}</strong>
        <span className={styles.trackerFacts}>
          <span className={styles.fact}>
            <CalendarDays size={12} aria-hidden="true" /> Closes {shortDate(call.date)}
          </span>
          <span className={styles.urgency} data-soon={soon || undefined}>
            {daysLeftLabel(call.daysLeft)}
          </span>
          <span className={styles.fact}>
            <Bell size={12} aria-hidden="true" /> Reminders on
          </span>
        </span>
      </span>
    </div>
  );
}

export function ReminderEmailVignette({ call }: { call: VignetteCall }) {
  return (
    <div className={styles.email}>
      <span className={styles.emailContext}>Reminder you set</span>
      <span className={styles.emailHero}>
        <strong className="font-heading">{call.daysLeft}</strong>
        <span>{call.daysLeft === 1 ? "day left." : "days left."}</span>
      </span>
      <span className={styles.emailLede}>
        {call.title}
        {call.organizationName ? ` from ${call.organizationName}` : ""} closes on{" "}
        {longDate(call.date)}.
      </span>
      <span className={styles.emailPanel}>
        <strong>In your Tracker: Saved</strong>
        <span>
          {call.typeLabel} · Closes {shortDate(call.date)}
        </span>
      </span>
      <span className={styles.emailButton}>View opportunity</span>
    </div>
  );
}

export function ProfileVignette({
  following = false,
  pressed = false,
}: {
  following?: boolean;
  pressed?: boolean;
}) {
  return (
    <div className={styles.profile}>
      <span className={styles.profileMeta}>
        <span className={styles.avatar} />
        <span className={styles.profileMetaText}>
          <span className={`${styles.handle} font-mono`}>@rileychen</span>
          <span className={styles.fact}>
            <MapPin size={12} aria-hidden="true" /> Vancouver ↔ Taipei
          </span>
        </span>
      </span>
      <strong className={`${styles.profileName} font-heading`}>Riley Chen</strong>
      <span className={styles.profileLine}>Poet, sound artist and photographer</span>
      <span className={styles.profileActions}>
        <span className={styles.primaryButton}>
          <Mail size={14} aria-hidden="true" /> Get in touch
        </span>
        <span
          className={styles.outlineButton}
          data-cursor-target
          data-on={following || undefined}
          data-pressed={pressed || undefined}
        >
          {following ? (
            <>
              <Check size={14} aria-hidden="true" /> Following
            </>
          ) : (
            <>
              <Plus size={14} aria-hidden="true" /> Follow
            </>
          )}
        </span>
      </span>
    </div>
  );
}
