"use client";
import { publicationCoverCaption } from "@/lib/publication-cover-caption";
import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Expand, ArrowUpRight, BookOpen, ShoppingBag, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";
import styles from "./institution-profile.module.css";

export type MediaGroupKey =
  | "all"
  | "issues"
  | "books"
  | "photos"
  | "exhibitions"
  | "projects";

export type InstitutionGalleryImage = {
  url: string;
  label: string;
  cover: boolean;
  group?: "issues" | "books" | "photos" | "exhibitions" | "projects" | "identity";
  dateLabel?: string;
  subtitle?: string;
  credit?: string;
  officialUrl?: string;
  readingUrl?: string;
  purchaseUrl?: string;
};

const GROUP_LABELS: Record<string, string> = {
  all: "All",
  issues: "Past Issues",
  books: "Published Titles",
  photos: "Photos",
  exhibitions: "Exhibitions",
  projects: "Projects",
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
  const [activeTab, setActiveTab] = useState<string>("all");

  const shelf = issues || books;
  const itemName = books ? "books" : "issues";

  // Discover which distinct groups exist
  const distinctGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const img of images) {
      if (img.group && img.group !== "identity") {
        groups.add(img.group);
      }
    }
    return Array.from(groups);
  }, [images]);

  const showTabs = distinctGroups.length > 1;

  // Filter items by active tab
  const displayedImages = useMemo(() => {
    if (!showTabs || activeTab === "all") {
      return images;
    }
    return images.filter((img) => img.group === activeTab);
  }, [images, showTabs, activeTab]);

  if (!images.length && !shelf && !photos) return null;

  const visibleImages = expanded ? displayedImages : displayedImages.slice(0, 6);

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
            `${images.length} ${shelf ? "items" : "images"}`}
        </span>
      </div>

      {shelf && (
        <p className={styles.issueIntro}>
          {books
            ? "Explore titles from the press’s catalogue."
            : "Explore the publication through its past issues and volumes."}
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

      {showTabs && (
        <div className="mb-6">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              if (val) {
                setActiveTab(val);
                setExpanded(false);
              }
            }}
          >
            <TabsList variant="line" className="border-b border-border w-full justify-start gap-3 pb-1">
              <TabsTrigger value="all" className="text-sm font-medium">
                All ({images.length})
              </TabsTrigger>
              {distinctGroups.map((grp) => {
                const count = images.filter((img) => img.group === grp).length;
                return (
                  <TabsTrigger key={grp} value={grp} className="text-sm font-medium">
                    {GROUP_LABELS[grp] || grp} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      )}

      <div
        className={styles.gallery}
        data-single={visibleImages.length === 1 || undefined}
      >
        {visibleImages.map((image, index) => {
          const caption = (shelf || image.cover)
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
                  {!shelf && !image.cover && (
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  )}
                  {caption.title}
                </p>
                {(caption.author || image.subtitle) && (
                  <div className={styles.issueAuthor}>
                    {caption.author || image.subtitle}
                  </div>
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
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      <BookOpen size={12} aria-hidden="true" />
                      Read ↗
                    </a>
                  )}
                  {image.purchaseUrl && (
                    <a
                      href={image.purchaseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      <ShoppingBag size={12} aria-hidden="true" />
                      Buy ↗
                    </a>
                  )}
                  {image.officialUrl && !image.readingUrl && !image.purchaseUrl && (
                    <a
                      href={image.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:underline"
                    >
                      <ExternalLink size={12} aria-hidden="true" />
                      Details ↗
                    </a>
                  )}
                  {shelf && !image.readingUrl && !image.purchaseUrl && !image.officialUrl && (
                    <span className={styles.issuePreview}>Preview cover</span>
                  )}
                </div>
              </div>
              <DialogContent className={styles.lightbox}>
                <DialogTitle>{caption.title}</DialogTitle>
                <DialogDescription className="sr-only">
                  Expanded view of {caption.title}
                </DialogDescription>
                <div className="flex flex-col gap-4">
                  <MediaImage image={image} expanded />
                  <div className="border-t border-border pt-4 flex flex-col gap-2">
                    <div className="text-base font-medium">{caption.title}</div>
                    {(caption.author || image.subtitle) && (
                      <div className="text-sm text-muted-foreground">
                        {caption.author || image.subtitle}
                      </div>
                    )}
                    {image.credit && (
                      <div className="text-xs text-muted-foreground">
                        Credit: {image.credit}
                      </div>
                    )}
                    {image.dateLabel && (
                      <div className="text-xs text-muted-foreground">
                        Date / Season: {image.dateLabel}
                      </div>
                    )}
                    {(image.readingUrl || image.purchaseUrl || image.officialUrl) && (
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {image.readingUrl && (
                          <Button
                            variant="default"
                            size="sm"
                            nativeButton={false}
                            render={
                              <a
                                href={image.readingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5"
                              />
                            }
                          >
                            <BookOpen size={14} aria-hidden="true" />
                            Read online
                            <ArrowUpRight size={14} aria-hidden="true" />
                          </Button>
                        )}
                        {image.purchaseUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={
                              <a
                                href={image.purchaseUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5"
                              />
                            }
                          >
                            <ShoppingBag size={14} aria-hidden="true" />
                            Buy copy
                            <ArrowUpRight size={14} aria-hidden="true" />
                          </Button>
                        )}
                        {image.officialUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={
                              <a
                                href={image.officialUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5"
                              />
                            }
                          >
                            <ExternalLink size={14} aria-hidden="true" />
                            Official page
                            <ArrowUpRight size={14} aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
      {displayedImages.length > 6 && (
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
            : `View all ${displayedImages.length} ${shelf ? itemName : "images"}`}
        </Button>
      )}
    </section>
  );
}
