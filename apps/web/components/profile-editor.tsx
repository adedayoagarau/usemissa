"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowUpRight, Plus, Trash2 } from "lucide-react";
import type {
  ProfileSelectedWork,
  ProfileSocialLink,
  ProfileSocialService,
  PublicPortfolio,
} from "@missa/radar-engine";

import { AppNav } from "@/components/app-nav";
import { PROFILE_SOCIAL_LABELS } from "@/components/public-profile-view";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemGroup, ItemSeparator } from "@/components/ui/item";
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

export function ProfileEditor({
  initialProfile,
  nav,
}: {
  initialProfile: ProfileEditorData;
  nav: React.ComponentProps<typeof AppNav>;
}) {
  const initial = useMemo(
    () => ({
      displayName: initialProfile.displayName,
      bio: initialProfile.bio ?? "",
      profileImageUrl: initialProfile.publicPortfolio?.profileImageUrl ?? "",
      headline: initialProfile.publicPortfolio?.headline ?? "",
      oneLine: initialProfile.publicPortfolio?.oneLine ?? "",
      openTo: initialProfile.publicPortfolio?.openTo ?? "",
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
  const [socialLinks, setSocialLinks] = useState<ProfileSocialLink[]>(
    initial.socialLinks,
  );
  const [selectedWorks, setSelectedWorks] = useState<ProfileSelectedWork[]>(
    initial.selectedWorks,
  );
  const [savedValues, setSavedValues] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const current = {
    displayName,
    bio,
    profileImageUrl,
    headline,
    oneLine,
    openTo,
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
      setMessage("Your public Profile is updated.");
    });
  }

  function discard() {
    setDisplayName(savedValues.displayName);
    setBio(savedValues.bio);
    setProfileImageUrl(savedValues.profileImageUrl);
    setHeadline(savedValues.headline);
    setOneLine(savedValues.oneLine);
    setOpenTo(savedValues.openTo);
    setSocialLinks(savedValues.socialLinks);
    setSelectedWorks(savedValues.selectedWorks);
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
              {profileImageUrl ? (
                // Creator-supplied remote images cannot be restricted to one Next image host.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.photo}
                  src={profileImageUrl}
                  alt="Current Profile photo"
                  width="96"
                  height="120"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className={styles.photoFallback} aria-hidden="true">
                  {initials(displayName || "Profile")}
                </span>
              )}
              <Field>
                <FieldLabel htmlFor="profile-image">Photo link</FieldLabel>
                <FieldContent>
                  <Input
                    id="profile-image"
                    type="url"
                    value={profileImageUrl}
                    onChange={(event) => setProfileImageUrl(event.target.value)}
                    placeholder="https://"
                  />
                  <FieldDescription>
                    Use a public image link. Leave blank to show your initials.
                  </FieldDescription>
                </FieldContent>
              </Field>
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
                  <div key={work.id}>
                    <Item className={styles.editRow}>
                      <div className={styles.workFields}>
                        <Field>
                          <FieldLabel htmlFor={`work-title-${work.id}`}>
                            Title
                          </FieldLabel>
                          <FieldContent>
                            <Input
                              id={`work-title-${work.id}`}
                              value={work.title}
                              maxLength={160}
                              onChange={(event) =>
                                updateWork(work.id, {
                                  title: event.target.value,
                                })
                              }
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
                                updateWork(work.id, {
                                  publication: event.target.value || undefined,
                                })
                              }
                            />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor={`work-year-${work.id}`}>
                            Year
                          </FieldLabel>
                          <FieldContent>
                            <Input
                              id={`work-year-${work.id}`}
                              type="number"
                              inputMode="numeric"
                              value={work.year ?? ""}
                              onChange={(event) =>
                                updateWork(work.id, {
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
                                updateWork(work.id, {
                                  url: event.target.value || undefined,
                                })
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
                                updateWork(work.id, {
                                  description: event.target.value || undefined,
                                })
                              }
                            />
                          </FieldContent>
                        </Field>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${work.title || "selected Work"}`}
                        onClick={() =>
                          setSelectedWorks((items) =>
                            items.filter((item) => item.id !== work.id),
                          )
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </Item>
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
                  <div key={link.id}>
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
                <Button type="button" variant="ghost" onClick={discard}>
                  Discard
                </Button>
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
