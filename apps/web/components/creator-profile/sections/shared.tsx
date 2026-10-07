import type { HTMLAttributes, ReactNode } from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requestInquiry, type InquiryRequest } from "../profile-connect";
import styles from "../public-profile.module.css";

/** The profile's own stylesheet, shared so every section reads as one page. */
export { styles as profileStyles };

export function Heading({
  level,
  ...props
}: { level: number } & HTMLAttributes<HTMLHeadingElement>) {
  const Tag = `h${Math.min(6, Math.max(1, level))}` as "h2";
  return <Tag {...props} />;
}

export function SectionHead({
  level,
  title,
  count,
  children,
}: {
  level: number;
  title: string;
  count?: number;
  children?: ReactNode;
}) {
  return (
    <div className={styles.sectionHead}>
      <Heading
        level={level}
        className={cn(styles.sectionTitle, "font-heading")}
      >
        {title}
        {count !== undefined && (
          <span className={cn(styles.count, "font-mono")}>
            {String(count).padStart(2, "0")}
          </span>
        )}
      </Heading>
      {children}
    </div>
  );
}

/** Only http(s) links are followed from a profile. */
export function safeHref(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

/**
 * An action that opens the profile's message form with a topic and a first
 * line filled in. Render nothing when the visitor has no way to write.
 */
export function EnquireButton({
  canContact,
  request,
  variant = "outline",
  children,
}: {
  canContact: boolean;
  request?: InquiryRequest;
  variant?: NonNullable<Parameters<typeof buttonVariants>[0]>["variant"];
  children: ReactNode;
}) {
  if (!canContact) return null;
  return (
    <Button
      type="button"
      variant={variant}
      onClick={() => requestInquiry(request)}
    >
      {children}
    </Button>
  );
}
