"use client";
import { useState } from "react";
import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileConnect, requestInquiry } from "../profile-connect";
import styles from "./work-page.module.css";

/**
 * Get in touch, follow and share, as on the profile. The message form is the
 * profile's own, so a message from here arrives in the same inbox.
 */
export function WorkPageActions({
  title,
  name,
  handle,
  inquiries,
  contactHref,
  sample,
}: {
  title: string;
  name: string;
  handle: string;
  inquiries: boolean;
  contactHref?: string;
  sample: boolean;
}) {
  const [shared, setShared] = useState("");
  const share = async () => {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared("Link copied.");
      }
    } catch {
      setShared("");
    }
  };
  return (
    <div className={styles.actions}>
      <ProfileConnect
        handle={handle || undefined}
        name={name}
        inquiries={inquiries}
        contactHref={sample ? undefined : contactHref}
        live={!sample}
        sample={sample}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Share this work"
        onClick={share}
      >
        <Share aria-hidden="true" />
      </Button>
      <span role="status" className={styles.status}>
        {shared}
      </span>
    </div>
  );
}

/**
 * The foot of the page: the creator's rights line, and, when a visitor can
 * write, a way to ask about permissions that opens the profile's message form.
 */
export function RightsLine({
  notice,
  ask,
  title,
  address,
}: {
  notice: string;
  ask: string;
  title: string;
  address: string;
}) {
  return (
    <div className={styles.rights}>
      <p>
        {notice}{" "}
        {ask && (
          <Button
            type="button"
            variant="link"
            size="inline"
            onClick={() =>
              requestInquiry({
                topic: "publication",
                message: `About “${title}”: `,
              })
            }
          >
            {ask}
          </Button>
        )}
      </p>
      <p className={`${styles.address} font-mono`}>{address}</p>
    </div>
  );
}
