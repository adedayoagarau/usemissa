import { Download, FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Sp } from "@/components/missa/spelling";
import { downloadHref, fileFacts } from "@/lib/portfolio-booking-files";
import { cn } from "@/lib/utils";
import { BookingBio } from "./booking-bio";
import { SectionHead, profileStyles as profile } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";
import styles from "./booking-section.module.css";

/**
 * What a programmer needs to book this creator: bios to paste and files to
 * download. Bios are plain text. A file shows the type and size the server
 * found in the stored file (never a name or a client claim), and always
 * downloads; the server never lets the browser open it in the page.
 */
function BookingSection({ id, portfolio, level }: AddonSectionProps) {
  const { shortBio, longBio, files } = portfolio.booking;
  const bios = [
    { label: "Short bio", text: shortBio.trim() },
    { label: "Long bio", text: longBio.trim() },
  ].filter((bio) => bio.text);
  const downloads = files.filter((file) => file.label.trim() && file.file);
  return (
    <section
      id={id}
      className={cn(profile.section, styles.booking)}
      aria-label="Booking kit"
    >
      <div className={styles.intro}>
        <SectionHead level={level} title="Booking kit" />
        <p>
          <Sp>Bios to paste into a program, and files to download.</Sp>
        </p>
      </div>
      <div className={styles.body}>
        {bios.map((bio) => (
          <BookingBio
            key={bio.label}
            label={bio.label}
            text={bio.text}
            level={level + 1}
          />
        ))}
        {downloads.length > 0 && (
          <ul className={styles.files} aria-label="Files to download">
            {downloads.map((file) => {
              const facts = fileFacts(file);
              return (
                <li key={file.id ?? file.file}>
                  <FileText aria-hidden="true" className={styles.fileIcon} />
                  <span className={styles.fileText}>
                    <span className={styles.fileName}>{file.label}</span>
                    {facts && (
                      <span className={cn(styles.fileFacts, "font-mono")}>
                        {facts}
                      </span>
                    )}
                  </span>
                  <a
                    href={downloadHref(file)}
                    download
                    className={buttonVariants({ variant: "outline" })}
                  >
                    <Download aria-hidden="true" />
                    Download
                    <span className="sr-only">
                      {" "}
                      {file.label}
                      {facts ? `, ${facts}` : ""}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export const bookingSection: AddonSectionDefinition = {
  filled: (portfolio) =>
    portfolio.booking.files.some((file) => file.label.trim() && file.file) ||
    Boolean(
      portfolio.booking.shortBio.trim() || portfolio.booking.longBio.trim(),
    ),
  Section: BookingSection,
};
