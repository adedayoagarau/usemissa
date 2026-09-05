"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CircleUserRound,
  Database,
  Eye,
  FileSearch,
  Link2,
  Shield,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MISSA_TAXONOMY,
  taxonomyDescendantIds,
  taxonomyLabelFor,
  type TaxonomyFacetKey,
} from "@missa/taxonomy";
import type { RadarProfile } from "@missa/radar-engine";
import type { UserHandle } from "@missa/radar-adapters";

import { EmailForwardingCard } from "@/components/email-forwarding-card";
import { FollowingList } from "@/components/following-list";
import { GmailSyncCard } from "@/components/gmail-sync-card";
import { HandleClaimCard } from "@/components/handle-claim-card";
import { SavedSearches } from "@/components/saved-searches";
import {
  TaxonomyBrowsePicker,
  type TaxonomyPreferenceSelection,
} from "@/components/taxonomy-browse-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ExportButtons } from "@/app/profile/export-buttons";
import styles from "./profile-product.module.css";

export const PROFILE_SECTIONS = [
  "overview",
  "identity",
  "preferences",
  "privacy",
  "integrations",
  "searches",
  "following",
  "data",
] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

type PrivacySettings = {
  displayName: "public" | "private";
  bio: "public" | "private";
};
type OpportunityPreferences = {
  types: string[];
  disciplines: string[];
  genres: string[];
  locations: string[];
  careerStages: string[];
  maxFeeCents?: number;
  noFeeOnly: boolean;
  deadlineWithinDays?: number;
  simultaneousRequired: boolean;
};

export type ProfileProductData = {
  id: string;
  displayName: string;
  bio?: string;
  publicUrl: string;
  handle: {
    namespaceAvailable: boolean;
    current: UserHandle | null;
    claimingOpen: boolean;
    promptDismissed: boolean;
    published: boolean;
  };
  privacy: PrivacySettings;
  taxonomyPreferences: TaxonomyPreferenceSelection[];
  opportunityPreferences: OpportunityPreferences;
  revision?: number;
  preferencesRevision?: number;
};

type Following = {
  organizationId: string;
  organizationName: string;
  followedAt: string;
};

const EMPTY_OPPORTUNITY_PREFERENCES: OpportunityPreferences = {
  types: [],
  disciplines: [],
  genres: [],
  locations: [],
  careerStages: [],
  noFeeOnly: false,
  simultaneousRequired: false,
};

const OPPORTUNITY_TYPES = [
  ["open-call", "Open call"],
  ["magazine", "Publication"],
  ["grant", "Grant"],
  ["award", "Award"],
  ["fellowship", "Fellowship"],
  ["residency", "Residency"],
  ["festival", "Festival"],
  ["scholarship", "Scholarship"],
  ["conference", "Conference"],
  ["rfp", "Request for proposals"],
  ["contest", "Contest"],
  ["pitch", "Pitch"],
  ["exhibition", "Exhibition"],
  ["commission", "Commission"],
  ["other", "Other"],
] as const;

const SECTION_DEFINITIONS = [
  {
    id: "overview",
    label: "Overview",
    copy: "What is public and where to continue",
    icon: CircleUserRound,
  },
  {
    id: "identity",
    label: "Identity",
    copy: "Your public name and biography",
    icon: BookOpen,
  },
  {
    id: "preferences",
    label: "Preferences",
    copy: "Private opportunity choices",
    icon: SlidersHorizontal,
  },
  {
    id: "privacy",
    label: "Privacy",
    copy: "Control public identity fields",
    icon: Shield,
  },
  {
    id: "integrations",
    label: "Integrations",
    copy: "Email connections and permissions",
    icon: Link2,
  },
  {
    id: "searches",
    label: "Saved searches",
    copy: "Repeatable Opportunity queries",
    icon: FileSearch,
  },
  {
    id: "following",
    label: "Following",
    copy: "Organizations you chose to follow",
    icon: UsersRound,
  },
  {
    id: "data",
    label: "Data",
    copy: "Private export and import",
    icon: Database,
  },
] as const;

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (
    parts.length > 1
      ? `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`
      : (parts[0]?.slice(0, 2) ?? "—")
  ).toUpperCase();
}

function SectionHeading({ section }: { section: ProfileSection }) {
  const item = SECTION_DEFINITIONS.find(
    (candidate) => candidate.id === section,
  )!;
  return (
    <header className={styles.sectionHeading}>
      <p>Profile · {item.label}</p>
      <h2 id="profile-section-heading" tabIndex={-1}>
        {item.label}
      </h2>
      <span>{item.copy}.</span>
    </header>
  );
}

function SwitchRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: "public" | "private";
  onChange: (value: "public" | "private") => void;
}) {
  return (
    <div className={styles.switchRow}>
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
        <span>{value === "public" ? "Public" : "Private"}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value === "public"}
        aria-label={`Make ${label.toLowerCase()} ${value === "public" ? "private" : "public"}`}
        onClick={() => onChange(value === "public" ? "private" : "public")}
        data-checked={value === "public"}
      >
        <span />
      </button>
    </div>
  );
}

function FacetRefinement({
  preferences,
  onChange,
}: {
  preferences: TaxonomyPreferenceSelection[];
  onChange: (value: TaxonomyPreferenceSelection[]) => void;
}) {
  const [facet, setFacet] = useState<TaxonomyFacetKey>("role");
  const [query, setQuery] = useState("");
  const terms = useMemo(() => {
    const selected = new Set(preferences.map((item) => item.termId));
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];
    return MISSA_TAXONOMY.terms
      .filter(
        (term) =>
          term.selectable &&
          term.facet === facet &&
          !selected.has(term.id) &&
          (term.preferredLabel.toLocaleLowerCase().includes(normalized) ||
            term.aliases.some((alias) =>
              alias.toLocaleLowerCase().includes(normalized),
            )),
      )
      .slice(0, 16);
  }, [facet, query, preferences]);

  function add(termId: string) {
    onChange([...preferences, { termId, preference: "include", weight: 100 }]);
    setQuery("");
  }

  return (
    <div className={styles.refinement}>
      <div className={styles.refinementIntro}>
        <div>
          <h3>Refine by facet</h3>
          <p>
            Use this only when a broad field is not enough. Each facet remains
            independent.
          </p>
        </div>
        <Badge variant="outline">12-facet model</Badge>
      </div>
      <div className={styles.refinementControls}>
        <div>
          <Label htmlFor="profile-facet">Facet</Label>
          <select
            id="profile-facet"
            value={facet}
            onChange={(event) => {
              setFacet(event.target.value as TaxonomyFacetKey);
              setQuery("");
            }}
          >
            {MISSA_TAXONOMY.facets
              .filter((item) => item.userVisible)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
          </select>
        </div>
        <div>
          <Label htmlFor="profile-term-search">
            Find a term in{" "}
            {MISSA_TAXONOMY.facets.find((item) => item.key === facet)?.label}
          </Label>
          <Input
            id="profile-term-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a known term"
          />
        </div>
      </div>
      <div className={styles.termResults} aria-live="polite">
        {terms.length ? (
          terms.map((term) => (
            <button key={term.id} type="button" onClick={() => add(term.id)}>
              <strong>{term.preferredLabel}</strong>
              {term.description ? <span>{term.description}</span> : null}
            </button>
          ))
        ) : (
          <p>
            {query
              ? "No matching selectable terms in this facet."
              : "Type a known term to see matching choices in this facet."}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProfileProduct({
  initialSection,
  initialProfile,
  savedSearches,
  following,
}: {
  initialSection: ProfileSection;
  initialProfile: ProfileProductData;
  savedSearches: RadarProfile[];
  following: Following[];
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialSection);
  const [profile, setProfile] = useState(initialProfile);
  const [revision, setRevision] = useState(initialProfile.revision);
  const [preferencesRevision, setPreferencesRevision] = useState(initialProfile.preferencesRevision);
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [savedIdentity, setSavedIdentity] = useState({
    displayName: initialProfile.displayName,
    bio: initialProfile.bio ?? "",
  });
  const [taxonomyPreferences, setTaxonomyPreferences] = useState(
    initialProfile.taxonomyPreferences,
  );
  const [opportunityPreferences, setOpportunityPreferences] = useState(
    initialProfile.opportunityPreferences ?? EMPTY_OPPORTUNITY_PREFERENCES,
  );
  const [savedPreferences, setSavedPreferences] = useState({
    taxonomyPreferences: initialProfile.taxonomyPreferences,
    opportunityPreferences:
      initialProfile.opportunityPreferences ?? EMPTY_OPPORTUNITY_PREFERENCES,
  });
  const [privacy, setPrivacy] = useState(initialProfile.privacy);
  const [savedPrivacy, setSavedPrivacy] = useState(initialProfile.privacy);
  const [pendingSection, setPendingSection] = useState<ProfileSection>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [confirmedExclusions, setConfirmedExclusions] = useState(false);
  const [isPending, startTransition] = useTransition();

  const identityDirty = !same({ displayName, bio }, savedIdentity);
  const preferencesDirty = !same(
    { taxonomyPreferences, opportunityPreferences },
    savedPreferences,
  );
  const privacyDirty = !same(privacy, savedPrivacy);
  const currentDirty =
    active === "identity"
      ? identityDirty
      : active === "preferences"
        ? preferencesDirty
        : active === "privacy"
          ? privacyDirty
          : false;
  const exclusions = taxonomyPreferences.filter(
    (item) => item.preference === "exclude",
  );
  const conflict = exclusions.find((excluded) => {
    const descendants = new Set(taxonomyDescendantIds(excluded.termId));
    return taxonomyPreferences.some(
      (item) =>
        item.termId !== excluded.termId &&
        descendants.has(item.termId) &&
        item.preference !== "exclude",
    );
  });

  function destination(section: ProfileSection) {
    return section === "overview" ? "/profile" : `/profile?section=${section}`;
  }
  function commitNavigation(section: ProfileSection) {
    setActive(section);
    setPendingSection(undefined);
    setMessage(undefined);
    setError(undefined);
    router.replace(destination(section), { scroll: false });
    window.setTimeout(
      () => document.getElementById("profile-section-heading")?.focus(),
      0,
    );
  }
  function navigate(section: ProfileSection) {
    if (section === active) return;
    if (currentDirty) {
      setPendingSection(section);
      return;
    }
    commitNavigation(section);
  }
  function discardCurrent() {
    if (active === "identity") {
      setDisplayName(savedIdentity.displayName);
      setBio(savedIdentity.bio);
    }
    if (active === "preferences") {
      setTaxonomyPreferences(savedPreferences.taxonomyPreferences);
      setOpportunityPreferences(savedPreferences.opportunityPreferences);
      setConfirmedExclusions(false);
    }
    if (active === "privacy") setPrivacy(savedPrivacy);
    if (pendingSection) commitNavigation(pendingSection);
  }
  function updateTaxonomy(next: TaxonomyPreferenceSelection[]) {
    setTaxonomyPreferences(next);
    setConfirmedExclusions(false);
    setMessage(undefined);
    setError(undefined);
  }

  function saveIdentity(event: React.FormEvent) {
    event.preventDefault();
    setMessage(undefined);
    setError(undefined);
    const name = displayName.trim();
    const cleanBio = bio.trim();
    if (!name || name.length > 120) {
      setError("Display name must be between 1 and 120 characters.");
      return;
    }
    if (cleanBio.length > 1_000) {
      setError("Bio must be 1,000 characters or fewer.");
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/profile", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            ...(revision ? { "Idempotency-Key": crypto.randomUUID() } : {}),
          },
          body: JSON.stringify({ displayName: name, bio: cleanBio, ...(revision ? { expectedRevision: revision } : {}) }),
        });
        const body = (await response
          .json()
          .catch(() => ({}))) as Partial<ProfileProductData> & {
          error?: string;
        };
        if (!response.ok || typeof body.displayName !== "string")
          throw new Error(body.error ?? "We could not save your identity.");
        setDisplayName(body.displayName);
        setBio(body.bio ?? "");
        setSavedIdentity({
          displayName: body.displayName,
          bio: body.bio ?? "",
        });
        if (typeof body.revision === "number") setRevision(body.revision);
        setProfile((current) => ({
          ...current,
          displayName: body.displayName!,
          bio: body.bio,
        }));
        setMessage("Identity saved");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "We could not save your identity.",
        );
      }
    });
  }

  function savePreferences(event: React.FormEvent) {
    event.preventDefault();
    setMessage(undefined);
    setError(undefined);
    if (conflict) {
      setError(
        `Resolve the conflict beneath ${taxonomyLabelFor(conflict.termId)} before saving.`,
      );
      return;
    }
    if (exclusions.length && !confirmedExclusions) {
      setError("Confirm the effect of excluded fields before saving.");
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/profile", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            ...(preferencesRevision ? { "Idempotency-Key": crypto.randomUUID() } : {}),
          },
          body: JSON.stringify({ taxonomyPreferences, opportunityPreferences, ...(preferencesRevision ? { expectedRevision: preferencesRevision } : {}) }),
        });
        const body = (await response
          .json()
          .catch(() => ({}))) as Partial<ProfileProductData> & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(body.error ?? "We could not save your preferences.");
        const nextTaxonomy = body.taxonomyPreferences ?? taxonomyPreferences;
        const nextOpportunity =
          body.opportunityPreferences ?? opportunityPreferences;
        setTaxonomyPreferences(nextTaxonomy);
        setOpportunityPreferences(nextOpportunity);
        setSavedPreferences({
          taxonomyPreferences: nextTaxonomy,
          opportunityPreferences: nextOpportunity,
        });
        if (typeof body.preferencesRevision === "number") setPreferencesRevision(body.preferencesRevision);
        setMessage("Private preferences saved");
        setConfirmedExclusions(false);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "We could not save your preferences.",
        );
      }
    });
  }

  function savePrivacy() {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/profile/privacy", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            ...(revision ? { "Idempotency-Key": crypto.randomUUID() } : {}),
          },
          body: JSON.stringify({ ...privacy, ...(revision ? { expectedRevision: revision } : {}) }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          settings?: PrivacySettings;
          revision?: number;
          error?: string;
        };
        if (!response.ok || !body.settings)
          throw new Error(
            body.error ?? "We could not save your privacy settings.",
          );
        const next = {
          displayName: body.settings.displayName,
          bio: body.settings.bio,
        };
        setPrivacy(next);
        setSavedPrivacy(next);
        setProfile((current) => ({ ...current, privacy: next }));
        if (typeof body.revision === "number") setRevision(body.revision);
        setMessage("Privacy settings saved");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "We could not save your privacy settings.",
        );
      }
    });
  }

  const publicFields = [
    profile.privacy.displayName === "public" && profile.displayName
      ? "Name"
      : "",
    profile.privacy.bio === "public" && profile.bio ? "Bio" : "",
  ].filter(Boolean);
  const nextStep: { section: ProfileSection; title: string; copy: string } =
    !profile.bio
      ? {
          section: "identity",
          title: "Add a short public biography",
          copy: "Describe your field and work in your own words. You can keep it private until you are ready.",
        }
      : taxonomyPreferences.length === 0 &&
          opportunityPreferences.types.length === 0
        ? {
            section: "preferences",
            title: "Set private opportunity preferences",
            copy: "Start broad, then refine only the facets that matter to your work.",
          }
        : publicFields.length === 0
          ? {
              section: "privacy",
              title: "Review your public Profile",
              copy: "Nothing is public. That is valid; review the field-level choices when you want to publish.",
            }
          : {
              section: "searches",
              title: "Create a focused saved search",
              copy: "Profile preferences stay broad. A saved search can hold one narrower repeatable query.",
            };

  function sectionStatus(section: ProfileSection): string {
    if (section === "identity")
      return publicFields.length ? `${publicFields.length} public` : "Private";
    if (section === "preferences")
      return taxonomyPreferences.length || opportunityPreferences.types.length
        ? "Set privately"
        : "Not set";
    if (section === "privacy")
      return publicFields.length ? "Public identity" : "Everything private";
    if (section === "integrations") return "Manage";
    if (section === "searches") return `${savedSearches.length} saved`;
    if (section === "following") return `${following.length} following`;
    if (section === "data") return "Owner only";
    return "Current";
  }

  return (
    <div className={styles.page}>
      <header className={styles.profileHeader}>
        <div className={styles.identity}>
          <span aria-hidden="true">
            {profile.privacy.displayName === "private"
              ? "—"
              : initials(profile.displayName)}
          </span>
          <div>
            <p>Your account</p>
            <h1>Profile</h1>
            <small>
              Public identity and private opportunity preferences stay separate.
            </small>
          </div>
        </div>
        <Link
          href={profile.publicUrl}
          aria-label="Preview public Profile"
          className={cn(
            buttonVariants({ variant: "outline" }),
            styles.previewLink,
          )}
        >
          <Eye aria-hidden="true" />
          <span>Preview public Profile</span>
        </Link>
      </header>

      <nav className={styles.sectionNav} aria-label="Profile sections">
        <Link href="/profile/portfolio" className={buttonVariants({ variant: "ghost" })}><Eye aria-hidden="true" />Public profile</Link>
        {SECTION_DEFINITIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={active === item.id ? "page" : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.contentLayout}>
        <aside aria-label="Profile section index">
          <Link href="/profile/portfolio">
            <Eye aria-hidden="true" />
            <span><strong>Public profile</strong><small>Build and preview your portfolio</small></span>
          </Link>
          {SECTION_DEFINITIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                onClick={() => navigate(item.id)}
                aria-current={active === item.id ? "page" : undefined}
              >
                <Icon aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.copy}</small>
                </span>
                <Badge variant="outline">{sectionStatus(item.id)}</Badge>
              </button>
            );
          })}
        </aside>
        <main className={styles.sectionSurface}>
          <SectionHeading section={active} />
          {active === "overview" ? (
            <div className={styles.overview}>
              <HandleClaimCard
                initialHandle={profile.handle.current}
                initialNamespaceAvailable={profile.handle.namespaceAvailable}
                claimingOpen={profile.handle.claimingOpen}
                promptDismissed={profile.handle.promptDismissed}
                displayName={profile.displayName}
                published={profile.handle.published}
              />
              <Alert>
                <CircleUserRound aria-hidden="true" />
                <AlertTitle>{nextStep.title}</AlertTitle>
                <AlertDescription>{nextStep.copy}</AlertDescription>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(nextStep.section)}
                >
                  Review{" "}
                  {
                    SECTION_DEFINITIONS.find(
                      (item) => item.id === nextStep.section,
                    )?.label
                  }
                  <ArrowRight aria-hidden="true" />
                </Button>
              </Alert>
              <section className={styles.publicSummary}>
                <div>
                  <p>Public preview</p>
                  <h3>
                    {publicFields.length
                      ? profile.displayName
                      : "Nothing is public"}
                  </h3>
                  <span>
                    {publicFields.length
                      ? profile.bio ||
                        "Your public name is visible without a public biography."
                      : "Your public link does not reveal your name, biography, preferences, or private activity."}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Public fields</dt>
                    <dd>{publicFields.join(" · ") || "None"}</dd>
                  </div>
                  <div>
                    <dt>Always private</dt>
                    <dd>
                      Preferences · eligibility · Tracker · Library drafts ·
                      connections
                    </dd>
                  </div>
                </dl>
              </section>
              <section className={styles.sectionRows}>
                <header>
                  <h3>Profile sections</h3>
                  <p>Each consequential area has its own save boundary.</p>
                </header>
                {SECTION_DEFINITIONS.filter(
                  (item) => item.id !== "overview",
                ).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.id)}
                    >
                      <Icon aria-hidden="true" />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.copy}</small>
                      </span>
                      <Badge variant="outline">{sectionStatus(item.id)}</Badge>
                      <ArrowRight aria-hidden="true" />
                    </button>
                  );
                })}
              </section>
            </div>
          ) : null}

          {active === "identity" ? (
            <form className={styles.form} onSubmit={saveIdentity} noValidate>
              <div className={styles.visibilityNote}>
                <span>{initials(displayName)}</span>
                <div>
                  <h3>Public identity</h3>
                  <p>
                    Only fields marked public in Privacy appear to visitors.
                    Organizations do not receive private Profile fields through
                    this form.
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    setError(undefined);
                    setMessage(undefined);
                  }}
                  aria-describedby="display-name-help"
                />
                <p id="display-name-help">
                  Up to 120 characters. Current visibility:{" "}
                  {privacy.displayName}.
                </p>
              </div>
              <div>
                <Label htmlFor="bio">Short bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(event) => {
                    setBio(event.target.value);
                    setError(undefined);
                    setMessage(undefined);
                  }}
                  rows={8}
                  aria-describedby="bio-help"
                />
                <p id="bio-help">
                  Write in your own words. {bio.length}/1,000 · Current
                  visibility: {privacy.bio}.
                </p>
              </div>
              <div className={styles.unavailable}>
                <h3>Images, links, and public Works</h3>
                <p>
                  These are not published from Profile yet. Missa will not
                  present a private Library Work or an unverified link as public
                  content.
                </p>
              </div>
              {error ? (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              ) : null}
              {message ? (
                <p role="status" className={styles.success}>
                  {message}
                </p>
              ) : null}
              <div className={styles.formActions}>
                <Button type="submit" disabled={isPending || !identityDirty}>
                  {isPending ? "Saving…" : "Save changes"}
                </Button>
                {identityDirty ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDisplayName(savedIdentity.displayName);
                      setBio(savedIdentity.bio);
                    }}
                  >
                    Discard changes
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}

          {active === "preferences" ? (
            <form className={styles.form} onSubmit={savePreferences} noValidate>
              <Alert>
                <Shield aria-hidden="true" />
                <AlertTitle>Private matching inputs</AlertTitle>
                <AlertDescription>
                  These choices can explain why Missa shows an Opportunity. They
                  do not prove eligibility, artistic fit, or selection
                  likelihood.
                </AlertDescription>
              </Alert>
              <section className={styles.preferenceGroup}>
                <div>
                  <h3>Field, form, and role</h3>
                  <p>
                    Start with a broad branch. Refine other facets only when
                    they help describe what you want to find.
                  </p>
                </div>
                <TaxonomyBrowsePicker
                  idPrefix="profile-practice"
                  preferences={taxonomyPreferences}
                  onPreferencesChange={updateTaxonomy}
                  description="Choose ordinary-language preferences. Labels may change while your canonical selection remains stable."
                />
                <FacetRefinement
                  preferences={taxonomyPreferences}
                  onChange={updateTaxonomy}
                />
                {conflict ? (
                  <Alert variant="destructive">
                    <AlertTitle>Preference conflict</AlertTitle>
                    <AlertDescription>
                      {taxonomyLabelFor(conflict.termId)} is set to “Do not
                      show,” but a narrower selected term is still wanted.
                      Change one of those choices before saving.
                    </AlertDescription>
                  </Alert>
                ) : null}
                {exclusions.length ? (
                  <label className={styles.confirmation}>
                    <Checkbox
                      checked={confirmedExclusions}
                      onCheckedChange={(value) =>
                        setConfirmedExclusions(value === true)
                      }
                    />
                    <span>
                      I understand that “Do not show this field” suppresses that
                      branch and its narrower terms from my results.
                    </span>
                  </label>
                ) : null}
              </section>
              <section className={styles.preferenceGroup}>
                <div>
                  <h3>Opportunity types</h3>
                  <p>
                    Type stays separate from field, role, eligibility, and
                    geography.
                  </p>
                </div>
                <div className={styles.checkboxGrid}>
                  {OPPORTUNITY_TYPES.map(([value, label]) => (
                    <label key={value}>
                      <Checkbox
                        checked={opportunityPreferences.types.includes(value)}
                        onCheckedChange={(checked) =>
                          setOpportunityPreferences((current) => ({
                            ...current,
                            types: checked
                              ? [...current.types, value]
                              : current.types.filter((item) => item !== value),
                          }))
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </section>
              <section className={styles.preferenceGroup}>
                <div>
                  <h3>Geography and career stage</h3>
                  <p>
                    A preferred place is not a statement of eligibility. Unknown
                    Opportunity rules remain unknown.
                  </p>
                </div>
                <div className={styles.twoColumns}>
                  <div>
                    <Label htmlFor="profile-locations">
                      Places or participation modes
                    </Label>
                    <Input
                      id="profile-locations"
                      value={opportunityPreferences.locations.join(", ")}
                      onChange={(event) =>
                        setOpportunityPreferences((current) => ({
                          ...current,
                          locations: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="Remote, Nigeria, West Africa"
                    />
                    <p>Separate entries with commas.</p>
                  </div>
                  <div>
                    <Label htmlFor="profile-career-stage">Career stage</Label>
                    <select
                      id="profile-career-stage"
                      value={opportunityPreferences.careerStages[0] ?? ""}
                      onChange={(event) =>
                        setOpportunityPreferences((current) => ({
                          ...current,
                          careerStages: event.target.value
                            ? [event.target.value]
                            : [],
                        }))
                      }
                    >
                      <option value="">No preference</option>
                      <option value="emerging">Emerging</option>
                      <option value="mid-career">Mid-career</option>
                      <option value="established">Established</option>
                    </select>
                  </div>
                </div>
              </section>
              <section className={styles.preferenceGroup}>
                <div>
                  <h3>Cost, timing, and submission behavior</h3>
                  <p>
                    Hard preferences may exclude Opportunities whose fee or
                    policy is unknown. Missa will say when a fact is not stated.
                  </p>
                </div>
                <div className={styles.twoColumns}>
                  <div>
                    <Label htmlFor="profile-max-fee">
                      Maximum application fee
                    </Label>
                    <Input
                      id="profile-max-fee"
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={opportunityPreferences.noFeeOnly}
                      value={
                        opportunityPreferences.maxFeeCents === undefined
                          ? ""
                          : opportunityPreferences.maxFeeCents / 100
                      }
                      onChange={(event) => {
                        const value = event.target.value.trim();
                        setOpportunityPreferences((current) => ({
                          ...current,
                          noFeeOnly: false,
                          maxFeeCents: value
                            ? Math.round(Number(value) * 100)
                            : undefined,
                        }));
                      }}
                      placeholder="No maximum"
                    />
                    <label className={styles.inlineCheck}>
                      <Checkbox
                        checked={opportunityPreferences.noFeeOnly}
                        onCheckedChange={(checked) =>
                          setOpportunityPreferences((current) => ({
                            ...current,
                            noFeeOnly: checked === true,
                            maxFeeCents: checked
                              ? undefined
                              : current.maxFeeCents,
                          }))
                        }
                      />
                      No-fee Opportunities only
                    </label>
                  </div>
                  <div>
                    <Label htmlFor="profile-deadline-window">
                      Deadline window
                    </Label>
                    <select
                      id="profile-deadline-window"
                      value={opportunityPreferences.deadlineWithinDays ?? ""}
                      onChange={(event) =>
                        setOpportunityPreferences((current) => ({
                          ...current,
                          deadlineWithinDays: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        }))
                      }
                    >
                      <option value="">Any stated deadline</option>
                      <option value="7">Next 7 days</option>
                      <option value="30">Next 30 days</option>
                      <option value="90">Next 90 days</option>
                    </select>
                    <label className={styles.inlineCheck}>
                      <Checkbox
                        checked={opportunityPreferences.simultaneousRequired}
                        onCheckedChange={(checked) =>
                          setOpportunityPreferences((current) => ({
                            ...current,
                            simultaneousRequired: checked === true,
                          }))
                        }
                      />
                      Only where simultaneous submissions are allowed
                    </label>
                  </div>
                </div>
              </section>
              {error ? (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              ) : null}
              {message ? (
                <p role="status" className={styles.success}>
                  {message}
                </p>
              ) : null}
              <div className={styles.formActions}>
                <Button
                  type="submit"
                  disabled={
                    isPending ||
                    !preferencesDirty ||
                    Boolean(conflict) ||
                    Boolean(exclusions.length && !confirmedExclusions)
                  }
                >
                  {isPending ? "Saving…" : "Save private preferences"}
                </Button>
                {preferencesDirty ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setTaxonomyPreferences(
                        savedPreferences.taxonomyPreferences,
                      );
                      setOpportunityPreferences(
                        savedPreferences.opportunityPreferences,
                      );
                      setConfirmedExclusions(false);
                    }}
                  >
                    Discard changes
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}

          {active === "privacy" ? (
            <div className={styles.form}>
              <Alert>
                <Shield aria-hidden="true" />
                <AlertTitle>Private by product boundary</AlertTitle>
                <AlertDescription>
                  Preferences, eligibility information, Tracker activity,
                  Library drafts, Saved Answers, following, integrations, and
                  account data are never public Profile fields.
                </AlertDescription>
              </Alert>
              <section className={styles.preferenceGroup}>
                <div>
                  <h3>Publishable identity</h3>
                  <p>
                    Choose each field explicitly. Making a field private removes
                    it from the public projection without deleting the private
                    value.
                  </p>
                </div>
                <SwitchRow
                  label="Display name"
                  description="Visitors can identify whose Profile they are viewing."
                  value={privacy.displayName}
                  onChange={(value) => {
                    setPrivacy((current) => ({
                      ...current,
                      displayName: value,
                    }));
                    setMessage(undefined);
                    setError(undefined);
                  }}
                />
                <SwitchRow
                  label="Short bio"
                  description="Visitors can read the biography saved in Identity."
                  value={privacy.bio}
                  onChange={(value) => {
                    setPrivacy((current) => ({ ...current, bio: value }));
                    setMessage(undefined);
                    setError(undefined);
                  }}
                />
              </section>
              <section className={styles.unavailable}>
                <h3>Public Works</h3>
                <p>
                  Library content remains private until an explicit Work
                  publication model exists. Privacy settings cannot publish a
                  Work by inference.
                </p>
              </section>
              {error ? (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              ) : null}
              {message ? (
                <p role="status" className={styles.success}>
                  {message}
                </p>
              ) : null}
              <div className={styles.formActions}>
                <Button
                  type="button"
                  disabled={isPending || !privacyDirty}
                  onClick={savePrivacy}
                >
                  {isPending ? "Saving…" : "Save privacy settings"}
                </Button>
                {privacyDirty ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPrivacy(savedPrivacy)}
                  >
                    Restore saved settings
                  </Button>
                ) : null}
                <Link
                  href={profile.publicUrl}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Preview public Profile
                </Link>
              </div>
            </div>
          ) : null}

          {active === "integrations" ? (
            <div className={styles.embedded}>
              <Alert>
                <Link2 aria-hidden="true" />
                <AlertTitle>Connections are private</AlertTitle>
                <AlertDescription>
                  Each connection has its own permission and removal boundary.
                  Organizations cannot see connected accounts or forwarded email
                  history.
                </AlertDescription>
              </Alert>
              <GmailSyncCard />
              <EmailForwardingCard />
            </div>
          ) : null}
          {active === "searches" ? (
            <div className={styles.embedded}>
              <SavedSearches userId={profile.id} profiles={savedSearches} />
            </div>
          ) : null}
          {active === "following" ? (
            <div className={styles.embedded}>
              <FollowingList userId={profile.id} following={following} />
            </div>
          ) : null}
          {active === "data" ? (
            <div className={styles.dataSection}>
              <div className={styles.unavailable}>
                <h3>Owner-scoped exports</h3>
                <p>
                  Downloads include only the signed-in owner’s data. Export
                  scope cannot be changed by supplying another account ID.
                </p>
              </div>
              <ExportButtons />
              <div className={styles.importCallout}>
                <div>
                  <h3>Bring in an existing Tracker</h3>
                  <p>
                    Import previews and maps your file before anything is
                    written.
                  </p>
                </div>
                <Link
                  href="/import"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Open Tracker import
                </Link>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      <AlertDialog
        open={Boolean(pendingSection)}
        onOpenChange={(open) => {
          if (!open) setPendingSection(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave with unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your edits in{" "}
              {SECTION_DEFINITIONS.find((item) => item.id === active)?.label}{" "}
              have not been saved. Discard them only if you do not need them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={discardCurrent}>
              Discard and continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
