"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  GripVertical,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type {
  ProfileSampleKind,
  ProfileSelectedWork,
  ProfileSocialLink,
  ProfileSocialService,
  PublicPortfolio,
  PublicUserProfile,
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@/components/ui/sortable";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import styles from "./profile-editor.module.css";

const SOCIAL_SERVICES = Object.keys(
  PROFILE_SOCIAL_LABELS,
) as ProfileSocialService[];

export interface ProfileEditorData {
  id: string;
  displayName: string;
  bio?: string;
  handle?: string;
  publicUrl?: string;
  handleNamespaceAvailable: boolean;
  handleClaimingOpen: boolean;
  published: boolean;
  publicPortfolio?: PublicPortfolio;
  libraryWorks: ProfileLibraryWork[];
}

export interface ProfileLibraryWork {
  id: string;
  title: string;
  description?: string;
  sampleKind?: ProfileSampleKind;
  file?: { id: string; filename: string; contentType: string };
}

interface ProfileSampleDraft {
  kind: ProfileSampleKind;
  excerpt?: string;
  publicAssetUrl?: string;
  contentType?: string;
  accessibilityText?: string;
  transcript?: string;
  rightsConfirmedAt?: string;
  rightsConfirmed?: boolean;
}

interface ProfileWorkDraft extends Omit<ProfileSelectedWork, "sample"> {
  sample?: ProfileSampleDraft;
  /** Owner-only handoff to the publish route. Never persisted or made public. */
  sampleSourceFileId?: string;
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
  sourceWork,
  featured,
  mobile,
  onChange,
  onRemove,
}: {
  work: ProfileWorkDraft;
  sourceWork?: ProfileLibraryWork;
  featured: boolean;
  mobile: boolean;
  onChange: (patch: Partial<ProfileWorkDraft>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(() => !mobile || featured);

  const title = work.title.trim() || "Untitled Work";
  const summary = [work.publication, work.year].filter(Boolean).join(" · ");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Item className={styles.editRow}>
        <div className={styles.workSummary}>
          <SortableItemHandle
            className={styles.dragHandle}
            role="button"
            tabIndex={0}
            aria-label={`Move ${title}`}
          >
            <GripVertical aria-hidden="true" />
          </SortableItemHandle>
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
                  readOnly={Boolean(work.workId)}
                  onChange={(event) => onChange({ title: event.target.value })}
                />
                {work.workId ? (
                  <FieldDescription>
                    This title comes from Library.
                  </FieldDescription>
                ) : null}
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
                  readOnly={Boolean(work.workId)}
                  onChange={(event) =>
                    onChange({ description: event.target.value || undefined })
                  }
                />
                {work.workId ? (
                  <FieldDescription>
                    This description comes from Library.
                  </FieldDescription>
                ) : null}
              </FieldContent>
            </Field>
          </div>
          {featured ? (
            <div className={styles.sampleEditor}>
              <div className={styles.sampleHeader}>
                <div>
                  <h3>Featured sample</h3>
                  <p>
                    Let visitors experience one part of this Work without
                    leaving your Profile.
                  </p>
                </div>
                {work.sample ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      onChange({
                        sample: undefined,
                        sampleSourceFileId: undefined,
                      })
                    }
                  >
                    Unpublish sample
                  </Button>
                ) : null}
              </div>
              {!work.sample ? (
                <div className={styles.sampleActions}>
                  {sourceWork?.sampleKind &&
                  sourceWork.sampleKind !== "text" &&
                  sourceWork.file ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        onChange({
                          sample: {
                            kind: sourceWork.sampleKind!,
                            contentType: sourceWork.file!.contentType,
                          },
                          sampleSourceFileId: sourceWork.file!.id,
                        })
                      }
                    >
                      Use {sourceWork.file.filename}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        onChange({ sample: { kind: "text", excerpt: "" } })
                      }
                    >
                      Add a passage
                    </Button>
                  )}
                </div>
              ) : (
                <div className={styles.sampleFields}>
                  {work.sample.kind === "text" ? (
                    <Field>
                      <FieldLabel htmlFor={`sample-excerpt-${work.id}`}>
                        Passage
                      </FieldLabel>
                      <FieldContent>
                        <Textarea
                          id={`sample-excerpt-${work.id}`}
                          value={work.sample.excerpt ?? ""}
                          maxLength={12000}
                          rows={10}
                          onChange={(event) =>
                            onChange({
                              sample: {
                                ...work.sample!,
                                excerpt: event.target.value,
                              },
                            })
                          }
                        />
                        <FieldDescription>
                          Up to 800 words. Only this passage becomes public.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  ) : null}
                  {work.sample.kind === "image" ||
                  work.sample.kind === "video" ? (
                    <Field>
                      <FieldLabel htmlFor={`sample-description-${work.id}`}>
                        {work.sample.kind === "image"
                          ? "Image description"
                          : "Video description"}
                      </FieldLabel>
                      <FieldContent>
                        <Textarea
                          id={`sample-description-${work.id}`}
                          value={work.sample.accessibilityText ?? ""}
                          maxLength={2000}
                          rows={4}
                          onChange={(event) =>
                            onChange({
                              sample: {
                                ...work.sample!,
                                accessibilityText: event.target.value,
                              },
                            })
                          }
                        />
                        <FieldDescription>
                          Describe what the sample shows for people who cannot
                          see it.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  ) : null}
                  {work.sample.kind === "audio" ||
                  work.sample.kind === "video" ? (
                    <Field>
                      <FieldLabel htmlFor={`sample-transcript-${work.id}`}>
                        {work.sample.kind === "video"
                          ? "Captions or transcript"
                          : "Transcript, if the audio includes speech"}
                      </FieldLabel>
                      <FieldContent>
                        <Textarea
                          id={`sample-transcript-${work.id}`}
                          value={work.sample.transcript ?? ""}
                          maxLength={20000}
                          rows={6}
                          onChange={(event) =>
                            onChange({
                              sample: {
                                ...work.sample!,
                                transcript: event.target.value,
                              },
                            })
                          }
                        />
                      </FieldContent>
                    </Field>
                  ) : null}
                  <Item className={styles.rightsOption}>
                    <ItemContent>
                      <ItemTitle>I can publish this sample</ItemTitle>
                      <ItemDescription>
                        I created it or have permission to share it publicly.
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <span className={styles.contactState}>
                        {work.sample.rightsConfirmedAt ||
                        work.sample.rightsConfirmed
                          ? "Confirmed"
                          : "Not confirmed"}
                      </span>
                      <Switch
                        aria-label="Confirm permission to publish this sample"
                        checked={Boolean(
                          work.sample.rightsConfirmedAt ||
                          work.sample.rightsConfirmed,
                        )}
                        disabled={Boolean(work.sample.rightsConfirmedAt)}
                        onCheckedChange={(checked) =>
                          onChange({
                            sample: {
                              ...work.sample!,
                              rightsConfirmed: checked,
                            },
                          })
                        }
                      />
                    </ItemActions>
                  </Item>
                </div>
              )}
            </div>
          ) : null}
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
      selectedWorks: (initialProfile.publicPortfolio?.selectedWorks ?? []).map(
        (work) => ({ ...work }),
      ) as ProfileWorkDraft[],
    }),
    [initialProfile],
  );
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [handle, setHandle] = useState(initialProfile.handle ?? "");
  const [savedHandle, setSavedHandle] = useState(initialProfile.handle ?? "");
  const [publicUrl, setPublicUrl] = useState(initialProfile.publicUrl);
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
  const [selectedWorks, setSelectedWorks] = useState<ProfileWorkDraft[]>(
    initial.selectedWorks,
  );
  const [workPickerOpen, setWorkPickerOpen] = useState(false);
  const [published, setPublished] = useState(initialProfile.published);
  const [savedValues, setSavedValues] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadedDraftPhoto, setUploadedDraftPhoto] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingHandle, setIsSavingHandle] = useState(false);
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
  const normalizedHandle = handle.trim().replace(/^@/u, "");
  const handleDirty = normalizedHandle !== savedHandle;

  function updateWork(id: string, patch: Partial<ProfileWorkDraft>) {
    setSelectedWorks((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function addLibraryWork(work: ProfileLibraryWork) {
    setSelectedWorks((items) => [
      ...items,
      {
        id: newId("work"),
        workId: work.id,
        title: work.title,
        ...(work.description ? { description: work.description } : {}),
      },
    ]);
    setWorkPickerOpen(false);
  }

  function addExternalWork() {
    setSelectedWorks((items) => [...items, { id: newId("work"), title: "" }]);
    setWorkPickerOpen(false);
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

  async function saveHandle() {
    if (!initialProfile.handleNamespaceAvailable) return;
    if (!normalizedHandle) {
      setError("Enter a handle before saving.");
      setMessage("");
      return;
    }
    setError("");
    setMessage("");
    setIsSavingHandle(true);
    try {
      const response = await fetch("/api/me/handles", {
        method: savedHandle ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: normalizedHandle }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        handle?: { handleKey: string; displayHandle: string };
      };
      if (!response.ok || !body.handle) {
        setError(body.error ?? "We could not save this handle.");
        return;
      }
      const nextHandle = body.handle.displayHandle.replace(/^@/u, "");
      setHandle(nextHandle);
      setSavedHandle(nextHandle);
      setPublicUrl(`/@${body.handle.handleKey}`);
      setMessage(`Your Profile is now at @${nextHandle}.`);
    } catch {
      setError("We could not save this handle.");
    } finally {
      setIsSavingHandle(false);
    }
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (initialProfile.handleNamespaceAvailable && !savedHandle) {
      setError("Claim a handle before publishing your Profile.");
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/me/profile/public", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        profile?: PublicUserProfile;
      };
      if (!response.ok) {
        setError(body.error ?? "We could not publish your Profile.");
        return;
      }
      const savedCurrent = {
        ...current,
        selectedWorks: (body.profile?.selectedWorks ??
          current.selectedWorks) as ProfileWorkDraft[],
      };
      setSelectedWorks(savedCurrent.selectedWorks);
      setSavedValues(savedCurrent);
      setPublished(true);
      setUploadedDraftPhoto("");
      setMessage("Your public Profile is updated.");
      toast("Profile published.");
    });
  }

  async function unpublish() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/me/profile/public", {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(body.error ?? "We could not unpublish your Profile.");
        return;
      }
      const privateWorks = selectedWorks.map((work) => {
        const next = { ...work };
        delete next.sample;
        delete next.sampleSourceFileId;
        return next;
      });
      const unpublishedValues = {
        ...current,
        profileImageUrl: "",
        selectedWorks: privateWorks,
      };
      setProfileImageUrl("");
      setSelectedWorks(privateWorks);
      setSavedValues(unpublishedValues);
      setUploadedDraftPhoto("");
      setPublished(false);
      setMessage("Your Profile is no longer public.");
      toast("Profile unpublished.");
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
          <p>
            {published
              ? "You are editing your public Profile. Save to publish changes."
              : "Your Profile is private. Save when you are ready to publish."}
          </p>
          <nav aria-label="Profile actions">
            {published && publicUrl ? (
              <Link
                href={publicUrl}
                target="_blank"
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                View as visitor <ArrowUpRight aria-hidden="true" />
              </Link>
            ) : null}
            <Link
              href="/settings"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Settings
            </Link>
            {published ? (
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button type="button" variant="ghost" />}
                >
                  Unpublish Profile
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unpublish your Profile?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Visitors will no longer be able to open it. Public media
                      copies and your Profile photo will be removed. Your text
                      and Work list will stay in this private editor.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="min-h-[44px]">
                      Keep Profile public
                    </AlertDialogCancel>
                    <AlertDialogAction
                      type="button"
                      variant="destructive"
                      className="min-h-[44px]"
                      onClick={unpublish}
                    >
                      Unpublish Profile
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </nav>
        </div>

        <form className={styles.editor} onSubmit={publish} noValidate>
          <Item
            render={<section aria-labelledby="identity-title" />}
            className={styles.identity}
          >
            <ItemMedia className={styles.photoEditor}>
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
            </ItemMedia>

            <ItemContent className={styles.identityFields}>
              <div className={styles.sectionHeader}>
                <div>
                  <h1 id="identity-title">Public identity</h1>
                  <p>Keep the introduction clear and in your own words.</p>
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
                    <div className={styles.handleField}>
                      <Input
                        id="profile-handle"
                        value={handle}
                        placeholder="your-name"
                        autoComplete="off"
                        readOnly={
                          !initialProfile.handleNamespaceAvailable ||
                          (!savedHandle && !initialProfile.handleClaimingOpen)
                        }
                        onChange={(event) => setHandle(event.target.value)}
                      />
                      {initialProfile.handleNamespaceAvailable &&
                      (savedHandle || initialProfile.handleClaimingOpen) ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            isSavingHandle || !normalizedHandle || !handleDirty
                          }
                          onClick={saveHandle}
                        >
                          {isSavingHandle
                            ? "Saving…"
                            : savedHandle
                              ? "Rename handle"
                              : "Claim handle"}
                        </Button>
                      ) : null}
                    </div>
                    <FieldDescription>
                      {!initialProfile.handleNamespaceAvailable
                        ? "Handle claiming is not available here."
                        : !savedHandle && !initialProfile.handleClaimingOpen
                          ? "Handle claiming is not open for this account yet."
                          : savedHandle
                            ? "Renames are limited to once every 30 days. Your old address will redirect."
                            : "Use 3–30 letters, numbers, or hyphens."}
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
            </ItemContent>
          </Item>

          <section className={styles.section} aria-labelledby="work-title">
            <header className={styles.sectionHeader}>
              <div>
                <h2 id="work-title">Selected Works</h2>
                <p>
                  Add public work people can read, watch, view, or listen to.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setWorkPickerOpen(true)}
              >
                <Plus aria-hidden="true" /> Add Work
              </Button>
            </header>
            {selectedWorks.length ? (
              <Sortable
                dndContextId="profile-work-order"
                className={styles.list}
                value={selectedWorks}
                onValueChange={setSelectedWorks}
                getItemValue={(work) => work.id}
                strategy="vertical"
                role="list"
              >
                {selectedWorks.map((work, index) => (
                  <SortableItem
                    key={`${work.id}-${mobileEditor ? "mobile" : "desktop"}`}
                    value={work.id}
                    role="listitem"
                  >
                    <WorkEditorRow
                      work={work}
                      sourceWork={initialProfile.libraryWorks.find(
                        (candidate) => candidate.id === work.workId,
                      )}
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
                  </SortableItem>
                ))}
              </Sortable>
            ) : (
              <Empty className={styles.emptyState}>
                <EmptyHeader>
                  <EmptyTitle>No Work is public yet</EmptyTitle>
                  <EmptyDescription>
                    Choose a Work from Library or add a public link.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
            <Dialog open={workPickerOpen} onOpenChange={setWorkPickerOpen}>
              <DialogContent className={styles.workPicker}>
                <DialogHeader>
                  <DialogTitle>Add Work to your Profile</DialogTitle>
                  <DialogDescription>
                    Choose from Library. Missa publishes a separate copy of the
                    details you save here.
                  </DialogDescription>
                </DialogHeader>
                {initialProfile.libraryWorks.length ? (
                  <ItemGroup className={styles.workPickerList}>
                    {initialProfile.libraryWorks.map((work, index) => {
                      const alreadyAdded = selectedWorks.some(
                        (item) => item.workId === work.id,
                      );
                      return (
                        <div key={work.id} role="listitem">
                          <Item className={styles.workPickerItem}>
                            <ItemContent>
                              <ItemTitle>{work.title}</ItemTitle>
                              <ItemDescription>
                                {work.file?.filename ??
                                  work.description ??
                                  "Saved in Library"}
                              </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={alreadyAdded}
                                onClick={() => addLibraryWork(work)}
                              >
                                {alreadyAdded ? "Added" : "Choose"}
                              </Button>
                            </ItemActions>
                          </Item>
                          {index < initialProfile.libraryWorks.length - 1 ? (
                            <ItemSeparator className={styles.separator} />
                          ) : null}
                        </div>
                      );
                    })}
                  </ItemGroup>
                ) : (
                  <Empty className={styles.emptyState}>
                    <EmptyHeader>
                      <EmptyTitle>Your Library has no Work yet</EmptyTitle>
                      <EmptyDescription>
                        Add a Work in Library, or add an external Work here.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        nativeButton={false}
                        render={<Link href="/library" />}
                        variant="outline"
                      >
                        Go to Library
                      </Button>
                    </EmptyContent>
                  </Empty>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={addExternalWork}
                  >
                    Add an external Work
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>

          <section className={styles.section} aria-labelledby="links-title">
            <header className={styles.sectionHeader}>
              <div>
                <h2 id="links-title">Links</h2>
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
