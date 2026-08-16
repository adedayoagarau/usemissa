"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowUpRight, ChevronDown, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import type {
  ProfileSelectedWork,
  ProfileSocialLink,
  ProfileSocialService,
  PublicPortfolio,
} from "@missa/radar-engine";

import { AppNav } from "@/components/app-nav";
import { PROFILE_SOCIAL_LABELS } from "@/components/public-profile-view";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import styles from "./profile-editor.module.css";

const SOCIAL_SERVICES = Object.keys(
  PROFILE_SOCIAL_LABELS,
) as ProfileSocialService[];

export interface ProfileEditorData {
  id: string;
  displayName: string;
  bio?: string;
  handle?: string;
  publicUrl: string;
  published: boolean;
  publicPortfolio?: PublicPortfolio;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function useMobileEditor(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return mobile;
}

function WorkEditorRow({
  work,
  featured,
  mobile,
  onChange,
  onRemove,
}: {
  work: ProfileSelectedWork;
  featured: boolean;
  mobile: boolean;
  onChange: (patch: Partial<ProfileSelectedWork>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(() => !mobile || featured);

  const title = work.title.trim() || "Untitled Work";
  const summary = [work.publication, work.year].filter(Boolean).join(" · ");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Item className={styles.editRow}>
        <div className={styles.workSummary}>
          <CollapsibleTrigger className={styles.workTrigger}>
            <span className={styles.workSummaryText}>
              <span className={styles.workSummaryTitle}>{title}</span>
              {summary ? (
                <span className={styles.workSummaryMeta}>{summary}</span>
              ) : null}
            </span>
            {featured ? <Badge variant="outline">Featured</Badge> : null}
            <ChevronDown
              className={styles.workChevron}
              data-open={open || undefined}
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${title}`}
                />
              }
            >
              <Trash2 aria-hidden="true" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Remove this Work from your Profile?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {title} will leave this public Profile draft. The original
                  Work will stay where it is.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-[44px]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  variant="destructive"
                  className="min-h-[44px]"
                  onClick={onRemove}
                >
                  Remove Work
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <CollapsibleContent className={styles.workPanel}>
          <div className={styles.workFields}>
            <Field>
              <FieldLabel htmlFor={`work-title-${work.id}`}>Title</FieldLabel>
              <FieldContent>
                <Input
                  id={`work-title-${work.id}`}
                  value={work.title}
                  maxLength={160}
                  onChange={(event) => onChange({ title: event.target.value })}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor={`work-publication-${work.id}`}>
                Publication or venue
              </FieldLabel>
              <FieldContent>
                <Input
                  id={`work-publication-${work.id}`}
                  value={work.publication ?? ""}
                  maxLength={160}
                  onChange={(event) =>
                    onChange({
                      publication: event.target.value || undefined,
                    })
                  }
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor={`work-year-${work.id}`}>Year</FieldLabel>
              <FieldContent>
                <Input
                  id={`work-year-${work.id}`}
                  type="number"
                  inputMode="numeric"
                  value={work.year ?? ""}
                  onChange={(event) =>
                    onChange({
                      year: event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    })
                  }
                />
              </FieldContent>
            </Field>
            <Field className={styles.wide}>
              <FieldLabel htmlFor={`work-url-${work.id}`}>
                Public link
              </FieldLabel>
              <FieldContent>
                <Input
                  id={`work-url-${work.id}`}
                  type="url"
                  value={work.url ?? ""}
                  placeholder="https://"
                  onChange={(event) =>
                    onChange({ url: event.target.value || undefined })
                  }
                />
              </FieldContent>
            </Field>
            <Field className={styles.wide}>
              <FieldLabel htmlFor={`work-description-${work.id}`}>
                Short description
              </FieldLabel>
              <FieldContent>
                <Textarea
                  id={`work-description-${work.id}`}
                  value={work.description ?? ""}
                  maxLength={500}
                  rows={3}
                  onChange={(event) =>
                    onChange({ description: event.target.value || undefined })
                  }
                />
              </FieldContent>
            </Field>
          </div>
        </CollapsibleContent>
      </Item>
    </Collapsible>
  );
}

export function ProfileEditor({
  initialProfile,
  nav,
}: {
  initialProfile: ProfileEditorData;
  nav: React.ComponentProps<typeof AppNav>;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const mobileEditor = useMobileEditor();
  const initial = useMemo(
    () => ({
      displayName: initialProfile.displayName,
      bio: initialProfile.bio ?? "",
      profileImageUrl: initialProfile.publicPortfolio?.profileImageUrl ?? "",
      headline: initialProfile.publicPortfolio?.headline ?? "",
      oneLine: initialProfile.publicPortfolio?.oneLine ?? "",
      openTo: initialProfile.publicPortfolio?.openTo ?? "",
      contactEnabled: initialProfile.publicPortfolio?.contactEnabled ?? false,
      socialLinks: initialProfile.publicPortfolio?.socialLinks ?? [],
      selectedWorks: initialProfile.publicPortfolio?.selectedWorks ?? [],
    }),
    [initialProfile],
  );
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [profileImageUrl, setProfileImageUrl] = useState(
    initial.profileImageUrl,
  );
  const [headline, setHeadline] = useState(initial.headline);
  const [oneLine, setOneLine] = useState(initial.oneLine);
  const [openTo, setOpenTo] = useState(initial.openTo);
  const [contactEnabled, setContactEnabled] = useState(initial.contactEnabled);
  const [socialLinks, setSocialLinks] = useState<ProfileSocialLink[]>(
    initial.socialLinks,
  );
  const [selectedWorks, setSelectedWorks] = useState<ProfileSelectedWork[]>(
    initial.selectedWorks,
  );
  const [savedValues, setSavedValues] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadedDraftPhoto, setUploadedDraftPhoto] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const current = {
    displayName,
    bio,
    profileImageUrl,
    headline,
    oneLine,
    openTo,
    contactEnabled,
    socialLinks,
    selectedWorks,
  };
  const dirty = JSON.stringify(current) !== JSON.stringify(savedValues);

  function updateWork(id: string, patch: Partial<ProfileSelectedWork>) {
    setSelectedWorks((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function updateLink(id: string, patch: Partial<ProfileSocialLink>) {
    setSocialLinks((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function deleteDraftPhoto(url: string) {
    if (!url) return;
    try {
      await fetch("/api/me/profile/photo", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
    } catch {
      // Draft cleanup is best effort. Publishing never depends on this request.
    }
  }

  async function uploadPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setMessage("");
    setIsUploadingPhoto(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/me/profile/photo", {
        method: "POST",
        body: form,
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!response.ok || !body.url) {
        setError(body.error ?? "We could not upload that photo.");
        return;
      }
      if (uploadedDraftPhoto && uploadedDraftPhoto !== body.url)
        void deleteDraftPhoto(uploadedDraftPhoto);
      setUploadedDraftPhoto(body.url);
      setProfileImageUrl(body.url);
      setMessage("Photo added to this draft.");
    } catch {
      setError("We could not upload that photo.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function removePhoto() {
    if (uploadedDraftPhoto && profileImageUrl === uploadedDraftPhoto) {
      void deleteDraftPhoto(uploadedDraftPhoto);
      setUploadedDraftPhoto("");
    }
    setProfileImageUrl("");
    setMessage("Photo removed from this draft.");
    setError("");
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/me/profile/public", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(body.error ?? "We could not publish your Profile.");
        return;
      }
      setSavedValues(current);
      setUploadedDraftPhoto("");
      setMessage("Your public Profile is updated.");
      toast("Profile published.");
    });
  }

  function discard() {
    if (uploadedDraftPhoto) void deleteDraftPhoto(uploadedDraftPhoto);
    setDisplayName(savedValues.displayName);
    setBio(savedValues.bio);
    setProfileImageUrl(savedValues.profileImageUrl);
    setHeadline(savedValues.headline);
    setOneLine(savedValues.oneLine);
    setOpenTo(savedValues.openTo);
    setContactEnabled(savedValues.contactEnabled);
    setSocialLinks(savedValues.socialLinks);
    setSelectedWorks(savedValues.selectedWorks);
    setUploadedDraftPhoto("");
    setError("");
    setMessage("");
  }

  return (
    <div className={styles.shell} data-density="comfortable">
      <AppNav {...nav} />
      <main id="main-content" className={styles.main}>
        <div className={styles.ownerRibbon}>
          <p>You are editing your public Profile. Save to publish changes.</p>
          <nav aria-label="Profile actions">
            <Button
              nativeButton={false}
              render={<Link href={initialProfile.publicUrl} target="_blank" />}
              variant="ghost"
            >
              View as visitor <ArrowUpRight aria-hidden="true" />
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/settings" />}
              variant="ghost"
            >
              Settings
            </Button>
          </nav>
        </div>

        <form className={styles.editor} onSubmit={publish} noValidate>
          <section className={styles.identity} aria-labelledby="identity-title">
            <div className={styles.photoEditor}>
              <Avatar className={styles.photo}>
                {profileImageUrl ? (
                  <AvatarImage
                    key={profileImageUrl}
                    className={styles.photoImage}
                    src={profileImageUrl}
                    alt="Current Profile photo"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <AvatarFallback
                  className={styles.photoFallback}
                  aria-hidden="true"
                >
                  {initials(displayName || "Profile")}
                </AvatarFallback>
              </Avatar>
              <div className={styles.photoControls}>
                <input
                  ref={photoInputRef}
                  className={styles.fileInput}
                  type="file"
                  aria-label="Profile photo"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={uploadPhoto}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload aria-hidden="true" />
                  {isUploadingPhoto
                    ? "Uploading…"
                    : profileImageUrl
                      ? "Change photo"
                      : "Choose photo"}
                </Button>
                {profileImageUrl ? (
                  <Button type="button" variant="ghost" onClick={removePhoto}>
                    Remove photo
                  </Button>
                ) : null}
                <p>JPEG, PNG, WebP, or AVIF. Up to 5 MB.</p>
              </div>
            </div>

            <div className={styles.identityFields}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1 id="identity-title">Public identity</h1>
                  <p>Name the work clearly and keep the introduction yours.</p>
                </div>
              </div>
              <div className={styles.fieldGrid}>
                <Field>
                  <FieldLabel htmlFor="profile-name">Name</FieldLabel>
                  <FieldContent>
                    <Input
                      id="profile-name"
                      value={displayName}
                      maxLength={120}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="profile-handle">Handle</FieldLabel>
                  <FieldContent>
                    <Input
                      id="profile-handle"
                      value={
                        initialProfile.handle
                          ? `@${initialProfile.handle}`
                          : "Not claimed"
                      }
                      readOnly
                    />
                    <FieldDescription>
                      Manage your handle in Settings.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="profile-headline">Headline</FieldLabel>
                <FieldContent>
                  <Input
                    id="profile-headline"
                    value={headline}
                    maxLength={80}
                    onChange={(event) => setHeadline(event.target.value)}
                    placeholder="Essayist · Screenwriter · Lagos"
                  />
                  <FieldDescription>
                    {headline.length}/80 characters
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-one-line">One line</FieldLabel>
                <FieldContent>
                  <Input
                    id="profile-one-line"
                    value={oneLine}
                    maxLength={100}
                    onChange={(event) => setOneLine(event.target.value)}
                    placeholder="What are you making or thinking about now?"
                  />
                  <FieldDescription>
                    {oneLine.length}/100 characters
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-bio">About</FieldLabel>
                <FieldContent>
                  <Textarea
                    id="profile-bio"
                    value={bio}
                    maxLength={1000}
                    rows={6}
                    onChange={(event) => setBio(event.target.value)}
                  />
                  <FieldDescription>
                    {bio.length}/1,000 characters
                  </FieldDescription>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-open-to">Open to</FieldLabel>
                <FieldContent>
                  <Input
                    id="profile-open-to"
                    value={openTo}
                    maxLength={240}
                    onChange={(event) => setOpenTo(event.target.value)}
                    placeholder="Commissions, residencies, collaborations"
                  />
                </FieldContent>
              </Field>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="work-title">
            <header className={styles.sectionHeader}>
              <div>
                <h2 id="work-title">Selected Work</h2>
                <p>
                  Add public work people can read, watch, view, or listen to.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setSelectedWorks((items) => [
                    ...items,
                    { id: newId("work"), title: "" },
                  ])
                }
              >
                <Plus aria-hidden="true" /> Add Work
              </Button>
            </header>
            {selectedWorks.length ? (
              <ItemGroup className={styles.list}>
                {selectedWorks.map((work, index) => (
                  <div
                    key={`${work.id}-${mobileEditor ? "mobile" : "desktop"}`}
                    role="listitem"
                  >
                    <WorkEditorRow
                      work={work}
                      featured={index === 0}
                      mobile={mobileEditor}
                      onChange={(patch) => updateWork(work.id, patch)}
                      onRemove={() =>
                        setSelectedWorks((items) =>
                          items.filter((item) => item.id !== work.id),
                        )
                      }
                    />
                    {index < selectedWorks.length - 1 ? (
                      <ItemSeparator className={styles.separator} />
                    ) : null}
                  </div>
                ))}
              </ItemGroup>
            ) : (
              <p className={styles.helper}>No Work is public yet.</p>
            )}
          </section>

          <section className={styles.section} aria-labelledby="links-title">
            <header className={styles.sectionHeader}>
              <div>
                <h2 id="links-title">Elsewhere</h2>
                <p>Add the places where people can find more of your work.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setSocialLinks((items) => [
                    ...items,
                    { id: newId("link"), service: "website", url: "" },
                  ])
                }
              >
                <Plus aria-hidden="true" /> Add link
              </Button>
            </header>
            {socialLinks.length ? (
              <ItemGroup className={styles.list}>
                {socialLinks.map((link, index) => (
                  <div key={link.id} role="listitem">
                    <Item className={styles.editRow}>
                      <div className={styles.linkFields}>
                        <Field>
                          <FieldLabel htmlFor={`link-service-${link.id}`}>
                            Service
                          </FieldLabel>
                          <FieldContent>
                            <select
                              id={`link-service-${link.id}`}
                              className={styles.select}
                              value={link.service}
                              onChange={(event) =>
                                updateLink(link.id, {
                                  service: event.target
                                    .value as ProfileSocialService,
                                })
                              }
                            >
                              {SOCIAL_SERVICES.map((service) => (
                                <option key={service} value={service}>
                                  {PROFILE_SOCIAL_LABELS[service]}
                                </option>
                              ))}
                            </select>
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`link-url-${link.id}`}>
                            Public link
                          </FieldLabel>
                          <FieldContent>
                            <Input
                              id={`link-url-${link.id}`}
                              type="url"
                              value={link.url}
                              placeholder="https://"
                              onChange={(event) =>
                                updateLink(link.id, { url: event.target.value })
                              }
                            />
                          </FieldContent>
                        </Field>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${PROFILE_SOCIAL_LABELS[link.service]}`}
                        onClick={() =>
                          setSocialLinks((items) =>
                            items.filter((item) => item.id !== link.id),
                          )
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </Item>
                    {index < socialLinks.length - 1 ? (
                      <ItemSeparator className={styles.separator} />
                    ) : null}
                  </div>
                ))}
              </ItemGroup>
            ) : (
              <p className={styles.helper}>No links are public yet.</p>
            )}
          </section>

          <section className={styles.section} aria-labelledby="contact-title">
            <header className={styles.sectionHeader}>
              <div>
                <h2 id="contact-title">Contact</h2>
                <p>
                  Choose whether visitors can send you a message through Missa.
                </p>
              </div>
            </header>
            <Item className={styles.contactOption}>
              <ItemContent>
                <ItemTitle>Get in touch</ItemTitle>
                <ItemDescription>
                  Your email address stays private. Messages are sent to the
                  email connected to your Missa account.
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <span className={styles.contactState}>
                  {contactEnabled ? "Shown on your Profile" : "Not shown"}
                </span>
                <Switch
                  checked={contactEnabled}
                  onCheckedChange={setContactEnabled}
                  aria-label="Allow messages through your Profile"
                />
              </ItemActions>
            </Item>
          </section>

          <p
            className={`${styles.status} ${error ? styles.error : ""}`}
            role={error ? "alert" : "status"}
          >
            {error || message}
          </p>

          {dirty || isPending ? (
            <div className={styles.saveBar}>
              <span>Unsaved public Profile changes</span>
              <div>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={<Button type="button" variant="ghost" />}
                  >
                    Discard
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Discard these Profile changes?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Your last published Profile will stay as it is.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="min-h-[44px]">
                        Keep editing
                      </AlertDialogCancel>
                      <AlertDialogAction
                        type="button"
                        variant="destructive"
                        className="min-h-[44px]"
                        onClick={discard}
                      >
                        Discard changes
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Publishing…" : "Save and publish"}
                </Button>
              </div>
            </div>
          ) : null}
        </form>
      </main>
    </div>
  );
}
