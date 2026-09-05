"use client";
/* eslint-disable @next/next/no-img-element -- Local preview uploads use blob URLs. */
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Mail,
  Globe,
  ArrowUpRight,
  Expand,
  BookOpen,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Instagram from "@/assets/svg/instagram-icon";
import { InstitutionSocialLinks } from "./institution-social-links";
import { portfolioDraft, publicWebUrl } from "@/lib/creator-portfolio-draft";
import { Button, buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  PortfolioPublicationPicker,
  type PortfolioOrganization,
} from "./portfolio-publication-picker";
import { PortfolioLinkPreview } from "./portfolio-link-preview";
import "./design-system/creator-palette.css";
import styles from "./creator-portfolio-studio.module.css";
function MediaPicker({ label, value, audio = false, onSelect, onRemove }: {
  label: string; value: string; audio?: boolean;
  onSelect: (file?: File) => void; onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <div className={styles.mediaPicker}>
    <strong>{label}</strong>
    <input ref={input} className="sr-only" tabIndex={-1} aria-label={label} type="file" accept={audio ? "audio/*" : "image/*"} onChange={(event) => { onSelect(event.target.files?.[0]); event.target.value = ""; }} />
    <div className={styles.contactActions}>
      <Button variant="outline" onClick={() => input.current?.click()}>{value ? "Replace" : "Add"} {label.toLowerCase()}</Button>
      {value && <Button variant="ghost" onClick={onRemove}>Remove {label.toLowerCase()}</Button>}
    </div>
    <small>{value ? "Added · shown in your preview" : audio ? "Choose an audio file · up to 20 MB" : "JPG, PNG, WebP or GIF · up to 20 MB"}</small>
  </div>;
}
const practices = [
  "Writing",
  "Music",
  "Photography",
  "Visual art",
  "Performance",
  "Film",
];
type Work = {
  url?: string;
  title: string;
  text: string;
  image: string;
  audio: string;
  formats: string[];
};
export function CreatorPortfolioStudio({ ownerId }: { ownerId?: string }) {
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState(false);
  const [entryMode, setEntryMode] = useState("link");
  const [theme, setTheme] = useState("sage");
  const [name, setName] = useState(""),
    [bio, setBio] = useState(""),
    [photo, setPhoto] = useState(""),
    [selected, setSelected] = useState<string[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [activeWork, setActiveWork] = useState(0);
  const work = works[activeWork] ?? {
    title: "",
    text: "",
    image: "",
    audio: "",
    formats: [],
  };
  const setWork = (value: Work | ((current: Work) => Work)) =>
    setWorks((current) =>
      current.map((item, index) =>
        index === activeWork
          ? typeof value === "function"
            ? value(item)
            : value
          : item,
      ),
    );
  const [viewingWork, setViewingWork] = useState<Work | null>(null);
  const [book, setBook] = useState({ title: "", cover: "", year: "", url: "" }),
    [credit, setCredit] = useState<{
      title: string;
      venue: string;
      year: string;
      url: string;
      organization?: PortfolioOrganization;
    }>({ title: "", venue: "", year: "", url: "" });
  const [contact, setContact] = useState({
    email: "",
    website: "",
    instagram: "",
  });
  const [enlarged, setEnlarged] = useState(false);
  const [contactDemo, setContactDemo] = useState(false);
  const [sampleDetail, setSampleDetail] = useState<
    "book" | "publication" | null
  >(null);
  const [sections, setSections] = useState(["Books", "Selected publications"]);
  const [storage, setStorage] = useState(ownerId ? "Loading draft…" : "");
  const [ready, setReady] = useState(!ownerId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!ownerId) return;
    let active = true;
    portfolioDraft<{
      name: string;
      bio: string;
      photo: string;
      selected: string[];
      work?: Work;
      works?: Work[];
      book: typeof book;
      credit: typeof credit;
      contact: typeof contact;
      sections: string[];
      theme?: string;
    }>(ownerId)
      .then((draft) => {
        if (!active) return;
        if (draft) {
          setName(draft.name);
          setBio(draft.bio);
          setPhoto(draft.photo);
          setSelected(draft.selected);
          setWorks(draft.works ?? (draft.work ? [draft.work] : []));
          setActiveWork(0);
          setBook(draft.book);
          setCredit(draft.credit);
          setContact(draft.contact);
          setSections(draft.sections);
          setTheme(
            ["sage", "paper", "mineral", "night"].includes(draft.theme ?? "")
              ? draft.theme!
              : "sage",
          );
          setStorage("Draft restored · saved to your account");
        } else setStorage("Private draft · saved to your account");
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setStorage(
            "Draft storage is unavailable. You can preview, but changes will not survive a reload.",
          );
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [ownerId]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const saveDraft = async () => {
    if (!ownerId) return;
    setSaving(true);
    try {
      await portfolioDraft(ownerId, {
        name,
        bio,
        photo,
        selected,
        works,
        book,
        credit,
        contact,
        sections,
        theme,
      });
      setStorage("Draft saved · private draft in your account");
      setDirty(false);
    } catch {
      setStorage(
        "Could not save your draft. Keep this page open and try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    if (!ownerId || !ready || !dirty || uploading) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSaving(true);
      portfolioDraft(ownerId, {
        name,
        bio,
        photo,
        selected,
        works,
        book,
        credit,
        contact,
        sections,
        theme,
      })
        .then(() => {
          if (!cancelled) {
            setStorage("Saved · private draft in your account");
            setDirty(false);
          }
        })
        .catch(() => {
          if (!cancelled)
            setStorage("Could not save. Keep this page open and try Save now.");
        })
        .finally(() => {
          if (!cancelled) setSaving(false);
        });
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    ownerId,
    ready,
    dirty,
    uploading,
    name,
    bio,
    photo,
    selected,
    works,
    book,
    credit,
    contact,
    sections,
    theme,
  ]);
  const [filter, setFilter] = useState("All work"),
    [read, setRead] = useState(false),
    [error, setError] = useState("");
  const upload = async (
    file: File | undefined,
    kind: "photo" | "image" | "audio" | "cover",
  ) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("Choose a file smaller than 20 MB.");
      return;
    }
    if (
      !(kind === "audio"
        ? file.type.startsWith("audio/")
        : ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
            file.type,
          ))
    ) {
      setError("Choose a supported image (JPG, PNG, WebP, GIF) or audio file.");
      return;
    }
    setError("");
    let url: string;
    setUploading((count) => count + 1);
    try {
      url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    } catch {
      setError("This file could not be read. Try another file.");
      return;
    } finally {
      setUploading((count) => count - 1);
    }
    setDirty(true);
    if (kind === "photo") setPhoto(url);
    else if (kind === "cover")
      setBook((current) => ({ ...current, cover: url }));
    else
      setWork((current) => ({
        ...current,
        [kind]: url,
        formats: [
          ...new Set([
            ...current.formats,
            kind === "audio" ? "Sound" : "Images",
          ]),
        ],
      }));
  };
  const isSample = !ownerId;
  const creditOrganizationHref =
    credit.organization?.href &&
    /^\/(journal|press|residency|grant|org)\/[^/]+$/.test(
      credit.organization.href,
    )
      ? credit.organization.href
      : undefined;
  const displayName = isSample ? "Riley Chen" : name || "Your name";
  const title = isSample ? "An atlas of small departures" : work.title;
  const image = isSample ? "/media/creator-preview-landscape.png" : work.image;
  const portrait = isSample ? "/media/creator-preview-portrait.png" : photo;
  const workFormats = (item: Work) =>
    [
      item.text.trim() && "Writing",
      item.audio && "Sound",
      item.image && "Images",
    ].filter(Boolean) as string[];
  const displayWorks: Work[] = isSample
    ? [
        {
          title,
          image,
          text: "Sample poem",
          audio: "",
          formats: ["Writing", "Images"],
        },
      ]
    : works.filter((item) => item.title.trim());
  const formats = [...new Set(displayWorks.flatMap(workFormats))];
  const visibleWorks = displayWorks.filter(
    (item) => filter === "All work" || workFormats(item).includes(filter),
  );
  return (
    <div className={styles.world}>
      <main id="main-content" className={styles.main}>
        {ownerId ? (
          <section
            className={styles.ownerPanel}
            aria-label="Public profile settings"
          >
            <Link
              href={
                ownerId === "design-preview-only"
                  ? "/design-system/creator-profile-v2"
                  : "/profile"
              }
            >
              {ownerId === "design-preview-only"
                ? "← Public profile example"
                : "← Your account"}
            </Link>
            <h1>Your public profile</h1>
            <p>A place for your work, in your own time.</p>
            <p role="status">
              {saving
                ? "Saving your changes…"
                : dirty
                  ? "Changes will save shortly…"
                  : storage}
            </p>
            <div className={styles.contactActions}>
              <Button
                disabled={!ready}
                variant="outline"
                onClick={() => setPreview(!preview)}
              >
                {preview ? "Back to editing" : "Preview profile"}
              </Button>
              <Button
                variant="ghost"
                disabled={!ready || saving || uploading > 0}
                onClick={saveDraft}
              >
                {saving ? "Saving…" : "Save now"}
              </Button>
            </div>
            <p className={styles.hint}>
              Only you can see this draft. Publishing isn’t available in this
              preview.
            </p>
          </section>
        ) : (
          <p className={styles.top}>
            Design preview · fictional creator and work
          </p>
        )}
        <div className={ownerId ? styles.studioLayout : undefined}>
          {ownerId && (
            <section
              className={`${styles.editor} ${preview ? styles.hideOnPhone : ""}`}
              aria-label="Edit public profile"
            >
              <nav
                className={styles.editorNav}
                aria-label="Profile editor sections"
              >
                {[
                  [1, "About you"],
                  [0, "Your practices"],
                  [2, "Selected works"],
                  [3, "Books"],
                  [6, "Publications"],
                  [5, "Contact & links"],
                  [7, "Appearance"],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    disabled={!ready}
                    variant={step === value ? "default" : "ghost"}
                    aria-pressed={step === value}
                    onClick={() => {
                      setStep(Number(value));
                      setError("");
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </nav>
              <fieldset
                disabled={!ready}
                aria-busy={!ready}
                className={styles.editorFields}
                onChange={() => setDirty(true)}
              >
                <p className={styles.eyebrow}>YOUR SPACE</p>
                <h2>
                  {
                    [
                      "Your creative practices",
                      "A little about you",
                      "Your selected works",
                      "Your books",
                      "",
                      "Let people find you",
                      "Selected publications",
                      "Make it feel like you",
                    ][step]
                  }
                </h2>
                <p className={styles.hint}>
                  {step === 2
                    ? "Start with one work you love. Add more whenever you’re ready."
                    : "Take your time. Add what feels right now; you can always return."}
                </p>
                {step === 7 && (
                  <div className={styles.themeChoices}>
                    <p>
                      Choose a backdrop for your work. Your content and layout
                      stay yours.
                    </p>
                    {[
                      ["sage", "Sage studio", "Soft green, calm and familiar"],
                      ["paper", "Paper", "Warm cream, an editorial feel"],
                      ["mineral", "Mineral", "Cool blue, quiet and spacious"],
                      ["night", "After hours", "Deep ink with light type"],
                    ].map(([value, label, description]) => (
                      <Button
                        key={value}
                        variant="outline"
                        className={styles.themeChoice}
                        aria-pressed={theme === value}
                        onClick={() => {
                          setTheme(value);
                          setDirty(true);
                        }}
                      >
                        <span
                          className={styles.themeSwatch}
                          data-creator-theme={value}
                          aria-hidden="true"
                        >
                          Aa
                        </span>
                        <span>
                          <strong>{label}</strong>
                          <small>{description}</small>
                        </span>
                        {theme === value && <span aria-hidden="true">✓</span>}
                      </Button>
                    ))}
                  </div>
                )}
                {step === 0 && (
                  <div className={styles.choices}>
                    {practices.map((p) => (
                      <Button
                        key={p}
                        variant={selected.includes(p) ? "default" : "outline"}
                        aria-pressed={selected.includes(p)}
                        onClick={() => {
                          setDirty(true);
                          setSelected(
                            selected.includes(p)
                              ? selected.filter((x) => x !== p)
                              : [...selected, p],
                          );
                        }}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                )}
                {step === 1 && (
                  <>
                    <label>
                      Name
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                      />
                    </label>
                    <label>
                      Introduction
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={600}
                      />
                    </label>
                    <MediaPicker label="Profile photo" value={photo} onSelect={(file) => upload(file, "photo")} onRemove={() => setPhoto("")} />
                    {photo && <img src={photo} className={styles.uploadPreview} alt="Your profile photo preview" />}

                  </>
                )}
                {step === 2 && (
                  <>
                    <div className={styles.workList}>
                      {works.map((item, index) => (
                        <div className={styles.workRow} key={index}>
                          <Button
                            variant={
                              activeWork === index ? "default" : "outline"
                            }
                            disabled={uploading > 0}
                            aria-pressed={activeWork === index}
                            onClick={() => setActiveWork(index)}
                          >
                            {item.title || `Work ${index + 1}`}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Move work ${index + 1} up`}
                            disabled={uploading > 0 || index === 0}
                            onClick={() => {
                              const next = [...works];
                              [next[index - 1], next[index]] = [
                                next[index],
                                next[index - 1],
                              ];
                              setWorks(next);
                              setActiveWork(index - 1);
                              setDirty(true);
                            }}
                          >
                            <ArrowUp aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={uploading > 0}
                            aria-label={`Remove work ${index + 1}`}
                            onClick={() => {
                              setWorks(works.filter((_, i) => i !== index));
                              setActiveWork(0);
                              setDirty(true);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        disabled={uploading > 0}
                        onClick={() => {
                          setWorks([
                            ...works,
                            {
                              title: "",
                              text: "",
                              image: "",
                              audio: "",
                              formats: [],
                            },
                          ]);
                          setActiveWork(works.length);
                          setEntryMode("link");
                          setDirty(true);
                        }}
                      >
                        {works.length
                          ? "Add another work"
                          : "Add your first work"}
                      </Button>
                    </div>
                    {works.length > 0 && (
                      <div key={activeWork} className={styles.workFields}>
                        <label>
                          Work title
                          <Input
                            value={work.title}
                            onChange={(e) =>
                              setWork({ ...work, title: e.target.value })
                            }
                          />
                        </label>
                        <div
                          className={styles.choices}
                          aria-label="How to add this work"
                        >
                          {[
                            ["link", "Link"],
                            ["text", "Write text"],
                            ["media", "Upload media"],
                          ].map(([value, label]) => (
                            <Button
                              key={value}
                              variant={
                                entryMode === value ? "default" : "outline"
                              }
                              aria-pressed={entryMode === value}
                              onClick={() => setEntryMode(value)}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                        {entryMode === "link" && (
                          <>
                            <label>
                              Work link · optional
                              <Input
                                type="url"
                                placeholder="https://"
                                value={work.url ?? ""}
                                onChange={(e) =>
                                  setWork({ ...work, url: e.target.value })
                                }
                              />
                            </label>
                            <p className={styles.hint}>
                              Link to the published piece, project page,
                              recording or video.
                            </p>
                            <PortfolioLinkPreview
                              url={work.url ?? ""}
                              title={work.title}
                            />
                          </>
                        )}
                        {entryMode === "text" && (
                          <label>
                            Text or description
                            <Textarea
                              value={work.text}
                              onChange={(e) =>
                                setWork({
                                  ...work,
                                  text: e.target.value,
                                  formats: [
                                    ...new Set([...work.formats, "Writing"]),
                                  ],
                                })
                              }
                            />
                          </label>
                        )}
                        {entryMode === "media" && (
                          <>
                            <MediaPicker label="Image" value={work.image} onSelect={(file) => upload(file, "image")} onRemove={() => setWork({ ...work, image: "" })} />
                            <MediaPicker label="Audio" value={work.audio} audio onSelect={(file) => upload(file, "audio")} onRemove={() => setWork({ ...work, audio: "" })} />
                            {work.image && (
                              <img
                                src={work.image}
                                className={styles.uploadPreview}
                                alt={work.title || "Work image preview"}
                              />
                            )}
                            {work.audio && (
                              <audio
                                controls
                                src={work.audio}
                                aria-label="Work audio preview"
                              />
                            )}
                          </>
                        )}
                      </div>
                    )}
                    <p>
                      Choose a work above to edit it. Each work can combine
                      text, images and audio. Untitled works stay out of your
                      preview.
                    </p>
                  </>
                )}
                {step === 3 && (
                  <>
                    <p>
                      Books and publications are optional for every practice.
                      Empty sections stay hidden.
                    </p>
                    <div className={styles.choices}>
                      {["Books", "Selected publications"].map((section) => (
                        <Button
                          key={section}
                          variant={
                            sections.includes(section) ? "default" : "outline"
                          }
                          aria-pressed={sections.includes(section)}
                          onClick={() => {
                            setDirty(true);
                            setSections(
                              sections.includes(section)
                                ? sections.filter((s) => s !== section)
                                : [...sections, section],
                            );
                          }}
                        >
                          {section}
                        </Button>
                      ))}
                    </div>
                    {sections.length > 1 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDirty(true);
                          setSections([...sections].reverse());
                        }}
                      >
                        <ArrowUp aria-hidden="true" />
                        <ArrowDown aria-hidden="true" />
                        Show {sections[1]} first
                      </Button>
                    )}
                    <label>
                      Book title · optional
                      <Input
                        value={book.title}
                        onChange={(e) =>
                          setBook({ ...book, title: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Book year
                      <Input
                        value={book.year}
                        onChange={(e) =>
                          setBook({ ...book, year: e.target.value })
                        }
                        maxLength={4}
                      />
                    </label>
                    <label>
                      Book link
                      <Input
                        type="url"
                        value={book.url}
                        placeholder="https://"
                        onChange={(e) =>
                          setBook({ ...book, url: e.target.value })
                        }
                      />
                    </label>
                    <MediaPicker label="Book cover" value={book.cover} onSelect={(file) => upload(file, "cover")} onRemove={() => setBook({ ...book, cover: "" })} />
                    <PortfolioLinkPreview url={book.url} title={book.title} />
                    {book.cover && (
                      <img
                        src={book.cover}
                        className={styles.uploadPreview}
                        alt={book.title || "Book cover preview"}
                      />
                    )}
                  </>
                )}
                {step === 6 && (
                  <>
                    <label>
                      Published piece · optional
                      <Input
                        value={credit.title}
                        onChange={(e) =>
                          setCredit({ ...credit, title: e.target.value })
                        }
                      />
                    </label>
                    <PortfolioPublicationPicker
                      name={credit.venue}
                      organization={credit.organization}
                      onChange={(venue, organization) => {
                        setCredit((current) => ({
                          ...current,
                          venue,
                          organization,
                        }));
                        setDirty(true);
                      }}
                    />
                  </>
                )}
                {step === 6 && (
                  <>
                    <label>
                      Publication year
                      <Input
                        value={credit.year}
                        maxLength={4}
                        onChange={(e) =>
                          setCredit({ ...credit, year: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Publication link
                      <Input
                        type="url"
                        value={credit.url}
                        placeholder="https://"
                        onChange={(e) =>
                          setCredit({ ...credit, url: e.target.value })
                        }
                      />
                    </label>
                    <PortfolioLinkPreview
                      url={credit.url}
                      title={credit.title}
                    />
                  </>
                )}
                {step === 5 && (
                  <>
                    {" "}
                    <p className={styles.hint}>
                      Only add contact details you want visitors to see. These
                      are separate from your sign-in details.
                    </p>
                    <label>
                      Public contact email · optional
                      <Input
                        type="email"
                        value={contact.email}
                        onChange={(e) =>
                          setContact({ ...contact, email: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Website · optional
                      <Input
                        type="url"
                        placeholder="https://"
                        value={contact.website}
                        onChange={(e) =>
                          setContact({ ...contact, website: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Instagram URL · optional
                      <Input
                        type="url"
                        placeholder="https://instagram.com/…"
                        value={contact.instagram}
                        onChange={(e) =>
                          setContact({ ...contact, instagram: e.target.value })
                        }
                      />
                    </label>
                  </>
                )}
                {uploading > 0 && <p role="status">Preparing your media…</p>}
                {error && <p role="alert">{error}</p>}
              </fieldset>
            </section>
          )}

          <div
            data-creator-theme={theme}
            className={`${ownerId ? styles.livePreview : ""} ${ownerId && !preview ? styles.hideOnPhone : ""}`}
          >
            {ownerId && (
              <p className={styles.eyebrow}>
                LIVE PREVIEW · ONLY YOU CAN SEE THIS
              </p>
            )}
            <>
              <header className={styles.identity}>
                {portrait && (
                  <img
                    className={styles.portrait}
                    src={portrait}
                    alt={displayName}
                  />
                )}
                <div>
                  <h1 className="font-heading">{displayName}</h1>
                  <p className={styles.disciplines}>
                    {isSample
                      ? "poet / sound artist / photographer"
                      : selected.join(" / ") || "Your creative practice"}
                  </p>
                  <p className={styles.bio}>
                    {isSample
                      ? "I work across text, field recordings and photography to trace the quiet geographies that hold us and the ones we leave behind."
                      : bio || "A few words about you and what you make."}
                  </p>
                  <div className={styles.contactActions}>
                    {isSample ? (
                      <>
                        <Button onClick={() => setContactDemo(true)}>
                          <Mail aria-hidden="true" />
                          Contact Riley
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Website — sample link"
                          onClick={() => setContactDemo(true)}
                        >
                          <Globe aria-hidden="true" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Instagram — sample link"
                          onClick={() => setContactDemo(true)}
                        >
                          <Instagram aria-hidden="true" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && (
                          <Button
                            nativeButton={false}
                            role="link"
                            render={
                              <a
                                href={`mailto:${encodeURIComponent(contact.email)}`}
                              />
                            }
                          >
                            <Mail aria-hidden="true" />
                            Contact {displayName.split(" ")[0]}
                          </Button>
                        )}
                        <InstitutionSocialLinks
                          name={displayName}
                          links={{
                            website: publicWebUrl(contact.website) ?? null,
                            instagram: publicWebUrl(contact.instagram) ?? null,
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </header>
              {formats.length > 1 && <nav className={styles.tabs} aria-label="Work formats">
                {["All work", ...formats].map((f) => (
                  <Button
                    variant="ghost"
                    key={f}
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </Button>
                ))}
              </nav>}
              <p className="sr-only" role="status">
                {filter === "All work" ? "All formats" : filter} selected
              </p>
              {visibleWorks.length ? (
                visibleWorks.map((work, index) => {
                  const title = work.title;
                  const image = work.image;
                  return (
                    <article
                      key={`${index}-${title}`}
                      className={`${styles.project} ${filter === "Writing" || filter === "Sound" || !image ? styles.readingProject : ""}`}
                    >
                      {image && filter !== "Writing" && filter !== "Sound" && (
                        <button
                          className={styles.imageButton}
                          aria-label={`Enlarge image from ${title}`}
                          onClick={() => {
                            setViewingWork(work);
                            setEnlarged(true);
                          }}
                        >
                          <img
                            className={styles.art}
                            loading="lazy"
                            src={image}
                            alt={
                              isSample
                                ? "Landscape seen through a train window"
                                : work.title
                            }
                          />
                          <span className={styles.imageAffordance}>
                            <Expand aria-hidden="true" />
                            View image
                          </span>
                        </button>
                      )}
                      <div>
                        <h2 className="font-heading">{title}</h2>
                        <p className={styles.disciplines}>
                          {filter === "Images"
                            ? "Photography"
                            : filter === "Writing"
                              ? "Writing"
                              : filter === "Sound"
                                ? "Audio"
                                : isSample
                                  ? "Writing, field recordings & photography"
                                  : workFormats(work).join(" · ")}
                        </p>
                        {isSample && filter === "Images" && (
                          <p>Landscape seen through a train window.</p>
                        )}
                        {isSample && filter === "All work" && (
                          <p>
                            A study of places in transition—gathered in
                            notebooks, recordings and photographs made while
                            passing through.
                          </p>
                        )}
                        {work.audio &&
                          !isSample &&
                          filter !== "Writing" &&
                          filter !== "Images" && (
                            <audio
                              controls
                              src={work.audio}
                              aria-label={work.title}
                            />
                          )}
                        {filter !== "Images" && filter !== "Sound" && (
                          <p className={styles.poem}>
                            {isSample
                              ? "The train keeps a separate weather\nthan the one outside—\ncondensing, clearing,\nforgetting as we move."
                              : work.text.slice(0, 180)}
                          </p>
                        )}
                        {filter !== "Images" &&
                          filter !== "Sound" &&
                          (isSample || work.text) && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setViewingWork(work);
                                setRead(true);
                              }}
                            >
                              <BookOpen aria-hidden="true" />
                              {isSample ? "Read poem" : "Read full text"}
                            </Button>
                          )}
                        {!isSample && publicWebUrl(work.url ?? "") && (
                          <p>
                            <span className={styles.workSource}>{new URL(publicWebUrl(work.url ?? "")!).hostname.replace(/^www\./, "")}</span>
                            <a
                              className={buttonVariants({ variant: "outline" })}
                              href={publicWebUrl(work.url ?? "")}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${work.title} (opens in new tab)`}
                            >
                              Read work
                              <ArrowUpRight aria-hidden="true" />
                            </a>
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className={styles.empty}>
                  {displayWorks.length
                    ? "No work in this format yet."
                    : "Add your first work when you’re ready."}
                </p>
              )}
              {(filter === "All work" || filter === "Writing") && (
                <div className={styles.lower}>
                  {sections.includes("Books") && (isSample || book.title) && (
                    <section style={{ order: sections.indexOf("Books") }}>
                      <h2>Books</h2>
                      {(isSample || book.cover) &&
                        (isSample || publicWebUrl(book.url) ? (
                          <Button
                            variant="ghost"
                            className={styles.coverAction}
                            aria-label={`View ${isSample ? "Field notes from the in-between" : book.title}${!isSample ? " (opens in new tab)" : " — sample book"}`}
                            {...(isSample
                              ? { onClick: () => setSampleDetail("book") }
                              : {
                                  nativeButton: false,
                                  role: "link" as const,
                                  render: (
                                    <a
                                      href={publicWebUrl(book.url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    />
                                  ),
                                })}
                          >
                            <img
                              className={styles.cover}
                              src={
                                isSample
                                  ? "/media/creator-preview-book.png"
                                  : book.cover
                              }
                              alt=""
                            />
                          </Button>
                        ) : (
                          <img
                            className={styles.cover}
                            src={book.cover}
                            alt={`Cover of ${book.title}`}
                          />
                        ))}
                      <h3>
                        {isSample || publicWebUrl(book.url) ? (
                          <Button
                            variant="link"
                            className={styles.titleAction}
                            {...(isSample
                              ? { onClick: () => setSampleDetail("book") }
                              : {
                                  nativeButton: false,
                                  role: "link" as const,
                                  render: (
                                    <a
                                      href={publicWebUrl(book.url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    />
                                  ),
                                })}
                          >
                            {isSample
                              ? "Field notes from the in-between"
                              : book.title}
                            {!isSample && (
                              <ArrowUpRight aria-label="opens in new tab" />
                            )}
                          </Button>
                        ) : (
                          book.title
                        )}
                      </h3>
                      <p>
                        {displayName}
                        {(isSample || book.year) &&
                          ` · ${isSample ? "2025" : book.year}`}
                      </p>

                    </section>
                  )}
                  {sections.includes("Selected publications") &&
                    (isSample || credit.title) && (
                      <section
                        style={{
                          order: sections.indexOf("Selected publications"),
                        }}
                      >
                        <h2>Selected publications</h2>
                        <div className={styles.credit}>
                          <h3>{isSample ? "Station fragments" : credit.title}</h3>
                          <h3>
                            {isSample ||
                            (creditOrganizationHref ??
                              publicWebUrl(credit.url)) ? (
                              <Button
                                variant="link"
                                className={styles.titleAction}
                                {...(isSample
                                  ? {
                                      onClick: () =>
                                        setSampleDetail("publication"),
                                    }
                                  : {
                                      nativeButton: false,
                                      role: "link" as const,
                                      render: (
                                        <a
                                          href={
                                            creditOrganizationHref ??
                                            publicWebUrl(credit.url)
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        />
                                      ),
                                    })}
                              >
                                {isSample ? "The Quiet Review" : credit.venue}
                                {!isSample && (
                                  <ArrowUpRight aria-label="opens in new tab" />
                                )}
                              </Button>
                            ) : (
                              credit.venue
                            )}
                          </h3>
                          <p>
                            {isSample
                              ? "2025"
                              : credit.year}
                          </p>
                          {publicWebUrl(credit.url) && !isSample && (
                            <Button
                              variant="outline"
                              nativeButton={false}
                              role="link"
                              render={
                                <a
                                  href={publicWebUrl(credit.url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                />
                              }
                            >
                              Read work
                              <ArrowUpRight aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </section>
                    )}
                </div>
              )}
            </>
          </div>
        </div>
      </main>
      {ownerId && (
        <div className={styles.phonePreviewBar}><Button
          className={styles.phonePreviewToggle}
          disabled={!ready}
          onClick={() => {
            setPreview(!preview);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        >
          {preview ? "Return to editor" : "See your profile"}
        </Button></div>
      )}
      <Dialog
        open={sampleDetail !== null}
        onOpenChange={(value) => {
          if (!value) setSampleDetail(null);
        }}
      >
        <DialogContent className={styles.dialog}>
          <DialogTitle>
            {sampleDetail === "book"
              ? "Field notes from the in-between"
              : "Station fragments"}
          </DialogTitle>
          <DialogDescription>
            {sampleDetail === "book"
              ? "Riley Chen · 2025 · fictional sample book"
              : "The Quiet Review · 2025 · fictional sample publication"}
          </DialogDescription>
          {sampleDetail === "book" && (
            <img
              className={styles.cover}
              src="/media/creator-preview-book.png"
              alt="Field notes from the in-between cover"
            />
          )}
          <p>
            This is a design sample. On a published portfolio, this opens the
            creator’s supplied{" "}
            {sampleDetail === "book"
              ? "book or publisher page"
              : "published work"}{" "}
            in a new tab.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={contactDemo} onOpenChange={setContactDemo}>
        <DialogContent>
          <DialogTitle>Contact & social links</DialogTitle>
          <DialogDescription>
            Riley is a fictional creator. On a published profile, Contact opens
            the creator’s chosen email address; the icons open their website and
            social profiles.
          </DialogDescription>
        </DialogContent>
      </Dialog>
      <Dialog open={enlarged} onOpenChange={setEnlarged}>
        <DialogContent className={styles.galleryDialog}>
          <DialogTitle>{viewingWork?.title}</DialogTitle>
          <DialogDescription>Image from this project</DialogDescription>
          <img
            src={viewingWork?.image}
            alt={
              isSample
                ? "Landscape seen through a train window"
                : (viewingWork?.title ?? "")
            }
          />
        </DialogContent>
      </Dialog>
      <Dialog open={read} onOpenChange={setRead}>
        <DialogContent className={styles.dialog}>
          <DialogTitle>{viewingWork?.title}</DialogTitle>
          <DialogDescription>Text by {displayName}</DialogDescription>
          <p className={styles.poem}>
            {isSample
              ? "The train keeps a separate weather\nthan the one outside—\ncondensing, clearing,\nforgetting as we move.\n\nI write the names of stations\non the back of yesterday.\nEach valley holds its breath\nand lets us pass.\n\nAt home, I will remember\nnot the distance,\nbut the window—\nhow it made a room of leaving."
              : viewingWork?.text}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
