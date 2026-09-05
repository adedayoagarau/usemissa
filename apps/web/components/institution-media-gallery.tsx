"use client";
import { publicationCoverCaption } from "@/lib/publication-cover-caption";
import { useState } from "react";
import { Button } from "./ui/button";
import { Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";
import styles from "./institution-profile.module.css";
export type InstitutionGalleryImage = {
  url: string;
  label: string;
  cover: boolean;
  dateLabel?: string;
  subtitle?: string;
  credit?: string;
  officialUrl?: string;
  readingUrl?: string;
  purchaseUrl?: string;
};
function MediaImage({
  image,
  expanded = false,
}: {
  image: InstitutionGalleryImage;
  expanded?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return <span className={styles.mediaUnavailable}>Image unavailable</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={image.label}
      loading="lazy"
      onError={() => setFailed(true)}
      className={expanded ? styles.expandedImage : styles.galleryImage}
      data-cover={image.cover || undefined}
    />
  );
}
export function InstitutionMediaGallery({
  images,
  title,
  issues = false,
  books = false,
  website,
  photos = false,
  source,
}: {
  images: InstitutionGalleryImage[];
  title: string;
  issues?: boolean;
  books?: boolean;
  website?: string;
  photos?: boolean;
  source?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const shelf = issues || books;
  const itemName = books ? "books" : "issues";
  if (!images.length && !shelf && !photos) return null;
  return (
    <section
      id="profile-gallery"
      className={styles.gallerySection}
      data-issues={shelf || undefined}
      data-photos={photos || undefined}
      aria-labelledby="gallery-heading"
    >
      <div className={styles.sectionHeading}>
        <h2 id="gallery-heading" className="font-sans">
          {title}
        </h2>
        <span>
          {images.length > 0 &&
            `${images.length} ${shelf ? "covers" : "images"}`}
        </span>
      </div>
      {shelf && (
        <p className={styles.issueIntro}>
          {books
            ? "Explore books from the press’s catalogue."
            : "Explore the publication through its past issues."}
        </p>
      )}
      {photos && !images.length && (
        <div className={styles.issueEmpty}>
          <h3>Photos aren’t available yet</h3>
          {website && (
            <a href={website} target="_blank" rel="noreferrer">
              Explore the organization’s website ↗
            </a>
          )}
        </div>
      )}
      {photos && source && (
        <p className={styles.issueIntro}>
          Photos from{" "}
          <a href={source} target="_blank" rel="noreferrer">
            the organization’s official website ↗
          </a>
        </p>
      )}
      {shelf && !images.length && (
        <div className={styles.issueEmpty}>
          <h3>
            {books
              ? "Book covers aren’t available yet"
              : "Issue covers aren’t available yet"}
          </h3>
          <p>
            {books
              ? "Visit the press’s website to explore its catalogue."
              : "Visit the publication’s website to explore its archive."}
          </p>
          {website && (
            <a href={website} target="_blank" rel="noreferrer">
              {books ? "Visit press website ↗" : "Visit publication website ↗"}
            </a>
          )}
        </div>
      )}
      <div
        className={styles.gallery}
        data-single={images.length === 1 || undefined}
      >
        {(expanded ? images : images.slice(0, 3)).map((image, index) => {
          const caption = shelf
            ? publicationCoverCaption(image.label)
            : { title: image.label };
          return (
            <Dialog key={image.url}>
              <div className={styles.galleryCard}>
                <DialogTrigger
                  className={styles.galleryTrigger}
                  aria-label={`Preview ${caption.title}`}
                >
                  <MediaImage image={image} />
                  <span className={styles.expand}>
                    <Expand size={16} aria-hidden="true" />
                  </span>
                </DialogTrigger>
                <p>
                  {!shelf && <span>{String(index + 1).padStart(2, "0")}</span>}
                  {caption.title}
                </p>
                {(caption.author || image.subtitle) && (
                  <div className={styles.issueAuthor}>{caption.author || image.subtitle}</div>
                )}
                {image.credit && (
                  <div className={styles.issueAuthor}>{image.credit}</div>
                )}
                {image.dateLabel && (
                  <div className={styles.issueDate}>{image.dateLabel}</div>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-1 text-xs">
                  {image.readingUrl && (
                    <a
                      href={image.readingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Read ↗
                    </a>
                  )}
                  {image.purchaseUrl && (
                    <a
                      href={image.purchaseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Buy ↗
                    </a>
                  )}
                  {image.officialUrl && !image.readingUrl && !image.purchaseUrl && (
                    <a
                      href={image.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:underline"
                    >
                      Details ↗
                    </a>
                  )}
                  {shelf && (
                    <span className={styles.issuePreview}>Preview cover</span>
                  )}
                </div>
              </div>
              <DialogContent className={styles.lightbox}>
                <DialogTitle>{caption.title}</DialogTitle>
                <DialogDescription className="sr-only">
                  Expanded organization media. Press Escape to close.
                </DialogDescription>
                <MediaImage image={image} expanded />
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
      {images.length > 3 && (
        <Button
          className="mt-5"
          variant="outline"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded
            ? shelf
              ? `Show fewer ${itemName}`
              : "Show fewer images"
            : `View all ${images.length} ${shelf ? itemName : "images"}`}
        </Button>
      )}
    </section>
  );
}
