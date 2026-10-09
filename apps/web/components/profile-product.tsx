"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  LockKeyhole,
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
import type {
  CreatorNotificationPreferences,
  UserHandle,
} from "@missa/radar-adapters";

import { EmailForwardingCard } from "@/components/email-forwarding-card";
import { FollowingList } from "@/components/following-list";
import { GmailSyncCard } from "@/components/gmail-sync-card";
import { HandleClaimCard } from "@/components/handle-claim-card";
import { NotificationPreferencesPanel } from "@/components/notification-preferences-panel";
import { SavedSearches } from "@/components/saved-searches";
import {
  TaxonomyBrowsePicker,
  type TaxonomyPreferenceSelection,
} from "@/components/taxonomy-browse-picker";
import { ApplicationStateBadge } from "@/components/missa/application-state-badge";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ExportButtons } from "@/app/profile/export-buttons";
import {
  CAREER_STAGES,
  matchingSummary,
  OPPORTUNITY_TYPES,
  typeLabel,
  type OpportunityPreferences,
  type ProfileSection,
} from "@/lib/profile-settings";
import { useSp, Sp } from "@/components/missa/spelling";

export type { ProfileSection } from "@/lib/profile-settings";

type Visibility = "public" | "private";
type PrivacySettings = { displayName: Visibility; bio: Visibility };
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

const SECTION_LABELS: Record<ProfileSection, string> = {
  profile: "Public profile",
  matching: "Matching",
  notifications: "Notifications",
  connections: "Connections",
  searches: "Saved searches",
  following: "Following",
  account: "Account and data",
};

const NAV_GROUPS: Array<{ label: string; sections: ProfileSection[] }> = [
  { label: "Profile", sections: ["profile"] },
  { label: "Settings", sections: ["matching", "notifications", "connections"] },
  { label: "Discovery", sections: ["searches", "following"] },
  { label: "Account", sections: ["account"] },
];

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

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5">
      <div>
        <h4 className="text-sm font-semibold">Narrow it further</h4>
        <p className="text-sm text-muted-foreground">
          Optional. Add a role, subject, or style when a broad field is not
          enough.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-facet">Kind</Label>
          <NativeSelect
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
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-term-search">
            Find a{" "}
            {MISSA_TAXONOMY.facets
              .find((item) => item.key === facet)
              ?.label.toLowerCase()}
          </Label>
          <Input
            id="profile-term-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Start typing"
          />
        </div>
      </div>
      <div aria-live="polite" className="flex flex-wrap gap-2">
        {terms.length ? (
          terms.map((term) => (
            <Button
              key={term.id}
              type="button"
              variant="outline"
              onClick={() => {
                onChange([
                  ...preferences,
                  { termId: term.id, preference: "include", weight: 100 },
                ]);
                setQuery("");
              }}
            >
              {term.preferredLabel}
            </Button>
          ))
        ) : query ? (
          <p className="text-sm text-muted-foreground">
            Nothing matches that here. Try another word or kind.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function VisibilityChoice({
  id,
  field,
  value,
  onChange,
}: {
  id: string;
  field: string;
  value: Visibility;
  onChange: (value: Visibility) => void;
}) {
  return (
    <RadioGroup
      aria-label={`Who can see your ${field}`}
      value={value}
      onValueChange={(next) => onChange(next as Visibility)}
      className="flex flex-wrap gap-4"
    >
      {(
        [
          ["public", "Public"],
          ["private", "Only you"],
        ] as const
      ).map(([option, label]) => (
        <label
          key={option}
          htmlFor={`${id}-${option}`}
          className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
        >
          <RadioGroupItem id={`${id}-${option}`} value={option} />
          {label}
        </label>
      ))}
    </RadioGroup>
  );
}

function MatchingGroup({
  title,
  summary,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: string;
  hint: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} variant="divided">
      <CollapsibleTrigger
        render={
          <Button variant="outline" size="sm"
            type="button" className="w-full"
          />
        }
      >
        <span className="flex min-w-0 flex-[1_1_12rem] flex-col gap-0.5">
          <span className="text-base font-semibold">{title}</span>
          <span className="text-sm text-muted-foreground">{hint}</span>
        </span>
        <span className="min-w-0 flex-[1_1_14rem] text-sm">{summary}</span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          {open ? "Close" : "Edit"}
          <ChevronDown
            aria-hidden="true"
            className={`size-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-5 pt-2 pb-6">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SaveBar({
  label,
  saving,
  disabled,
  onDiscard,
  onSave,
  saveLabel = "Save changes",
}: {
  label: string;
  saving: boolean;
  disabled?: boolean;
  onDiscard: () => void;
  onSave?: () => void;
  saveLabel?: string;
}) {
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 ps-4 shadow-lg"
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onDiscard}
          disabled={saving}
        >
          Discard
        </Button>
        <Button
          type={onSave ? "button" : "submit"}
          onClick={onSave}
          disabled={saving || disabled}
        >
          {saving ? "Saving…" : saveLabel}
        </Button>
      </span>
    </div>
  );
}

export function ProfileProduct({
  initialSection,
  initialProfile,
  savedSearches,
  following,
  email,
  notificationPreferences,
  integrations = { gmailSync: false, emailForwarding: false },
}: {
  initialSection: ProfileSection;
  initialProfile: ProfileProductData;
  savedSearches: RadarProfile[];
  following: Following[];
  /** The sign-in email, shown only on this private page. */
  email?: string;
  /** Account-backed notification settings; absent without account storage. */
  notificationPreferences?: CreatorNotificationPreferences;
  /** Email integrations turned on for this deployment. */
  integrations?: { gmailSync: boolean; emailForwarding: boolean };
}) {
  const sp = useSp();
  const router = useRouter();
  const [active, setActive] = useState<ProfileSection>(initialSection);
  const [profile, setProfile] = useState(initialProfile);
  const [revision, setRevision] = useState(initialProfile.revision);
  const [preferencesRevision, setPreferencesRevision] = useState(
    initialProfile.preferencesRevision,
  );
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [privacy, setPrivacy] = useState(initialProfile.privacy);
  const [saved, setSaved] = useState({
    displayName: initialProfile.displayName,
    bio: initialProfile.bio ?? "",
    privacy: initialProfile.privacy,
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
  const [pendingSection, setPendingSection] = useState<ProfileSection>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [confirmedExclusions, setConfirmedExclusions] = useState(false);
  const [closeAccountOpen, setCloseAccountOpen] = useState(false);
  const [closeAccountText, setCloseAccountText] = useState("");
  const [closingAccount, setClosingAccount] = useState(false);
  const [signOutEverywhereOpen, setSignOutEverywhereOpen] = useState(false);
  const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
  const [signOutEverywhereError, setSignOutEverywhereError] =
    useState<string>();
  const [isPending, startTransition] = useTransition();

  const identityDirty = !same(
    { displayName, bio },
    { displayName: saved.displayName, bio: saved.bio },
  );
  const privacyDirty = !same(privacy, saved.privacy);
  const profileDirty = identityDirty || privacyDirty;
  const preferencesDirty = !same(
    { taxonomyPreferences, opportunityPreferences },
    savedPreferences,
  );
  const currentDirty =
    active === "profile"
      ? profileDirty
      : active === "matching"
        ? preferencesDirty
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

  function commitNavigation(section: ProfileSection) {
    setActive(section);
    setPendingSection(undefined);
    setMessage(undefined);
    setError(undefined);
    router.replace(
      section === "profile" ? "/profile" : `/profile?section=${section}`,
      { scroll: false },
    );
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
  function discardProfile() {
    setDisplayName(saved.displayName);
    setBio(saved.bio);
    setPrivacy(saved.privacy);
    setError(undefined);
  }
  function discardPreferences() {
    setTaxonomyPreferences(savedPreferences.taxonomyPreferences);
    setOpportunityPreferences(savedPreferences.opportunityPreferences);
    setConfirmedExclusions(false);
    setError(undefined);
  }
  function discardCurrent() {
    if (active === "profile") discardProfile();
    if (active === "matching") discardPreferences();
    if (pendingSection) commitNavigation(pendingSection);
  }
  function updateTaxonomy(next: TaxonomyPreferenceSelection[]) {
    setTaxonomyPreferences(next);
    setConfirmedExclusions(false);
    setMessage(undefined);
    setError(undefined);
  }

  /** Saves name and bio, then visibility, each against the latest revision. */
  function saveProfile(event?: React.FormEvent) {
    event?.preventDefault();
    setMessage(undefined);
    setError(undefined);
    const name = displayName.trim();
    const cleanBio = bio.trim();
    if (!name || name.length > 120) {
      setError("Your display name needs 1 to 120 characters.");
      return;
    }
    if (cleanBio.length > 1_000) {
      setError("Your bio can be up to 1,000 characters.");
      return;
    }
    startTransition(async () => {
      try {
        let nextRevision = revision;
        let next = {
          displayName: saved.displayName,
          bio: saved.bio,
          privacy: saved.privacy,
        };
        if (identityDirty) {
          const response = await fetch("/api/me/profile", {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              ...(nextRevision
                ? { "Idempotency-Key": crypto.randomUUID() }
                : {}),
            },
            body: JSON.stringify({
              displayName: name,
              bio: cleanBio,
              ...(nextRevision ? { expectedRevision: nextRevision } : {}),
            }),
          });
          const body = (await response
            .json()
            .catch(() => ({}))) as Partial<ProfileProductData> & {
            error?: string;
          };
          if (!response.ok || typeof body.displayName !== "string")
            throw new Error(
              body.error ?? "Your name and bio could not be saved.",
            );
          if (typeof body.revision === "number") nextRevision = body.revision;
          next = {
            ...next,
            displayName: body.displayName,
            bio: body.bio ?? "",
          };
          setDisplayName(body.displayName);
          setBio(body.bio ?? "");
        }
        if (privacyDirty) {
          const response = await fetch("/api/me/profile/privacy", {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              ...(nextRevision
                ? { "Idempotency-Key": crypto.randomUUID() }
                : {}),
            },
            body: JSON.stringify({
              ...privacy,
              ...(nextRevision ? { expectedRevision: nextRevision } : {}),
            }),
          });
          const body = (await response.json().catch(() => ({}))) as {
            settings?: PrivacySettings;
            revision?: number;
            error?: string;
          };
          if (!response.ok || !body.settings)
            throw new Error(
              body.error ?? "Who can see your profile could not be saved.",
            );
          if (typeof body.revision === "number") nextRevision = body.revision;
          next = {
            ...next,
            privacy: {
              displayName: body.settings.displayName,
              bio: body.settings.bio,
            },
          };
          setPrivacy(next.privacy);
        }
        setRevision(nextRevision);
        setSaved(next);
        setProfile((current) => ({
          ...current,
          displayName: next.displayName,
          bio: next.bio || undefined,
          privacy: next.privacy,
        }));
        setMessage("Saved. Your public profile is up to date.");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Your profile could not be saved.",
        );
      }
    });
  }

  function savePreferences(event?: React.FormEvent) {
    event?.preventDefault();
    setMessage(undefined);
    setError(undefined);
    if (conflict) {
      setError(
        `Resolve the conflict beneath ${taxonomyLabelFor(conflict.termId)} before saving.`,
      );
      return;
    }
    if (exclusions.length && !confirmedExclusions) {
      setError("Confirm what hiding a field does before saving.");
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/profile", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            ...(preferencesRevision
              ? { "Idempotency-Key": crypto.randomUUID() }
              : {}),
          },
          body: JSON.stringify({
            taxonomyPreferences,
            opportunityPreferences,
            ...(preferencesRevision
              ? { expectedRevision: preferencesRevision }
              : {}),
          }),
        });
        const body = (await response
          .json()
          .catch(() => ({}))) as Partial<ProfileProductData> & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(
            body.error ?? "Your matching choices could not be saved.",
          );
        const nextTaxonomy = body.taxonomyPreferences ?? taxonomyPreferences;
        const nextOpportunity =
          body.opportunityPreferences ?? opportunityPreferences;
        setTaxonomyPreferences(nextTaxonomy);
        setOpportunityPreferences(nextOpportunity);
        setSavedPreferences({
          taxonomyPreferences: nextTaxonomy,
          opportunityPreferences: nextOpportunity,
        });
        if (typeof body.preferencesRevision === "number")
          setPreferencesRevision(body.preferencesRevision);
        setMessage("Saved. Missa will use these choices from now on.");
        setConfirmedExclusions(false);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Your matching choices could not be saved.",
        );
      }
    });
  }

  const handle = profile.handle.current;
  const publicHref = handle ? `/@${handle.displayHandle}` : profile.publicUrl;
  const checklist = [
    {
      label: "Name",
      todo: "Add your name",
      href: "#display-name",
      done: Boolean(profile.displayName.trim()),
    },
    {
      label: "Short bio",
      todo: "Add a short bio",
      href: "#bio",
      done: Boolean(profile.bio?.trim()),
    },
    ...(profile.handle.namespaceAvailable
      ? [
          {
            label: "Missa address",
            todo: "Claim your Missa address",
            href: "#profile-address-title",
            done: Boolean(handle),
          },
        ]
      : []),
    {
      label: "Published",
      todo: "Publish your profile",
      href: "/profile/portfolio",
      done: profile.handle.published,
    },
  ];
  const complete = checklist.filter((item) => item.done).length;
  const savedSummary = matchingSummary(
    savedPreferences.taxonomyPreferences,
    savedPreferences.opportunityPreferences,
  );
  const fieldsSummary =
    taxonomyPreferences
      .map((item) =>
        item.preference === "exclude"
          ? `Not ${taxonomyLabelFor(item.termId)}`
          : taxonomyLabelFor(item.termId),
      )
      .join(" · ") || "Any field";
  const typesSummary =
    opportunityPreferences.types.map(typeLabel).join(" · ") || "Any type";
  const whereSummary =
    [
      opportunityPreferences.locations.join(" · "),
      opportunityPreferences.careerStages
        .map((stage) => CAREER_STAGES[stage] ?? stage)
        .join(" · "),
    ]
      .filter(Boolean)
      .join(" · ") || "Anywhere, any stage";
  const costSummary =
    [
      opportunityPreferences.noFeeOnly
        ? "No fee only"
        : opportunityPreferences.maxFeeCents !== undefined
          ? `Fee up to ${(opportunityPreferences.maxFeeCents / 100).toFixed(2)}`
          : "",
      opportunityPreferences.deadlineWithinDays
        ? `Closing within ${opportunityPreferences.deadlineWithinDays} days`
        : "",
      opportunityPreferences.simultaneousRequired ? "Simultaneous allowed" : "",
    ]
      .filter(Boolean)
      .join(" · ") || "Any fee, any deadline";

  const navMeta: Partial<Record<ProfileSection, string>> = {
    profile: `${complete} of ${checklist.length}`,
    searches: String(savedSearches.length),
    following: String(following.length),
  };

  const feedback = (
    <>
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="self-start rounded-lg bg-accent-tint px-3 py-2 text-sm text-accent-deep"
        >
          {message}
        </p>
      ) : null}
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1168px] flex-col gap-8 px-6 pt-8 pb-16 sm:pt-10">
      <header className="flex flex-wrap items-center gap-5 border-b border-border pb-6">
        <span
          aria-hidden="true"
          className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-accent-tint font-heading text-2xl text-accent-deep"
        >
          {initials(profile.displayName)}
        </span>
        <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-1">
          <h1 className="font-heading text-3xl leading-tight font-medium tracking-tight break-words sm:text-4xl">
            {profile.displayName}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {email ? <span>{email}</span> : null}
            {email ? <span aria-hidden="true">·</span> : null}
            {profile.handle.published ? (
              <span>
                <span className="font-semibold text-green">
                  Profile published
                </span>
                {handle ? (
                  <>
                    {" "}
                    at{" "}
                    <span className="font-mono">
                      missa.app/@{handle.displayHandle}
                    </span>
                  </>
                ) : null}
              </span>
            ) : (
              <span>Your public profile is not published yet</span>
            )}
          </p>
        </div>
        <Link
          href={publicHref}
          className={buttonVariants({ variant: "outline" })}
        >
          View public profile
          <ArrowUpRight />
        </Link>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-12">
        <nav
          aria-label="Profile and settings"
          className="flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {NAV_GROUPS.map((group, index) => (
            <div key={group.label} className="flex shrink-0 gap-1 lg:flex-col">
              <span
                className={`hidden px-3 pb-1 text-xs font-semibold text-muted-foreground lg:block ${index === 0 ? "" : "pt-5"}`}
              >
                {group.label}
              </span>
              {group.sections.map((section) => (
                <Button variant="nav"
                  key={section}
                  type="button"
                  onClick={() => navigate(section)}
                  aria-current={active === section ? "page" : undefined}
                >
                  <span>{SECTION_LABELS[section]}</span>
                  {navMeta[section] ? (
                    <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">
                      {navMeta[section]}
                    </span>
                  ) : null}
                </Button>
              ))}
            </div>
          ))}
        </nav>

        <main className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-1">
            <h2
              id="profile-section-heading"
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight outline-none"
            >
              {SECTION_LABELS[active]}
            </h2>
            <p className="text-sm text-muted-foreground">
              {active === "profile"
                ? "What visitors see. Each field says who can see it."
                : active === "matching"
                  ? "Private. These shape what Missa shows you and explain why; they never prove eligibility."
                  : active === "notifications"
                    ? "Choose what you hear about, and where."
                    : active === "connections"
                      ? sp("Private. Each connection has its own permissions, and organizations never see them.")
                      : active === "searches"
                        ? "Searches you can run again, with alerts when new calls match."
                        : active === "following"
                          ? sp("Organizations whose new calls and changes you hear about.")
                          : "Only you can see this page."}
            </p>
          </div>

          {active === "profile" ? (
            // Not a <form>: the handle claim card inside has its own form, and
            // nested forms are invalid HTML that the parser rewrites, which
            // breaks hydration and remounts these fields after first paint.
            <div className="flex flex-col gap-8">
              <section
                aria-labelledby="profile-checklist-title"
                className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border p-5"
              >
                <h3
                  id="profile-checklist-title"
                  className="flex-[1_1_12rem] text-sm font-semibold"
                >
                  Profile{" "}
                  <span className="font-mono tabular-nums">{complete}</span> of{" "}
                  <span className="font-mono tabular-nums">
                    {checklist.length}
                  </span>{" "}
                  complete
                </h3>
                <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {checklist.map((item) => (
                    <li key={item.label}>
                      {item.done ? (
                        <ApplicationStateBadge tone="success">
                          <Check aria-hidden="true" />
                          {item.label}
                        </ApplicationStateBadge>
                      ) : (
                        <Link
                          href={item.href}
                          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          {item.todo}
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="flex min-w-0 flex-col gap-7">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-x-4">
                      <Label htmlFor="display-name">Display name</Label>
                      <VisibilityChoice
                        id="display-name-visibility"
                        field="name"
                        value={privacy.displayName}
                        onChange={(value) => {
                          setPrivacy((current) => ({
                            ...current,
                            displayName: value,
                          }));
                          setMessage(undefined);
                        }}
                      />
                    </div>
                    <Input
                      id="display-name"
                      value={displayName}
                      maxLength={120}
                      onChange={(event) => {
                        setDisplayName(event.target.value);
                        setMessage(undefined);
                        setError(undefined);
                      }}
                      aria-describedby="display-name-help"
                    />
                    <p
                      id="display-name-help"
                      className="text-xs text-muted-foreground"
                    >
                      <Sp>How organizations and readers find you. Up to 120 characters.</Sp>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-x-4">
                      <Label htmlFor="bio">Short bio</Label>
                      <VisibilityChoice
                        id="bio-visibility"
                        field="bio"
                        value={privacy.bio}
                        onChange={(value) => {
                          setPrivacy((current) => ({ ...current, bio: value }));
                          setMessage(undefined);
                        }}
                      />
                    </div>
                    <Textarea
                      id="bio"
                      value={bio}
                      rows={6}
                      onChange={(event) => {
                        setBio(event.target.value);
                        setMessage(undefined);
                        setError(undefined);
                      }}
                      placeholder="Your field and your work, in your own words"
                      aria-describedby="bio-help"
                    />
                    <p id="bio-help" className="text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">
                        {bio.length}
                      </span>
                      /1,000
                    </p>
                  </div>

                  {profile.handle.namespaceAvailable ? (
                    <section
                      aria-labelledby="profile-address-title"
                      className="flex flex-col gap-2"
                    >
                      <h3
                        id="profile-address-title"
                        className="text-sm font-semibold"
                      >
                        Your Missa address
                      </h3>
                      {handle ? (
                        <p className="text-sm">
                          <span className="font-mono">
                            missa.app/@{handle.displayHandle}
                          </span>
                        </p>
                      ) : null}
                      <HandleClaimCard
                        initialHandle={profile.handle.current}
                        initialNamespaceAvailable={
                          profile.handle.namespaceAvailable
                        }
                        claimingOpen={profile.handle.claimingOpen}
                        promptDismissed={profile.handle.promptDismissed}
                        displayName={profile.displayName}
                        published={profile.handle.published}
                      />
                    </section>
                  ) : null}

                  <section
                    aria-labelledby="profile-private-title"
                    className="flex flex-col gap-1 border-t border-border pt-5"
                  >
                    <h3
                      id="profile-private-title"
                      className="flex items-center gap-2 text-sm font-semibold"
                    >
                      <LockKeyhole className="size-4" aria-hidden="true" />
                      Never public
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <Sp>
                        Matching choices, eligibility, your Tracker, Library
                        drafts, saved answers, following, and connections stay
                        private. Organizations see only what you send them.
                      </Sp>
                    </p>
                  </section>
                </div>

                <aside
                  aria-label="Live preview"
                  className="flex flex-col gap-2 xl:sticky xl:top-6"
                >
                  <span className="text-xs font-semibold text-muted-foreground">
                    Live preview · how visitors see it
                  </span>
                  <article className="flex flex-col gap-3 rounded-xl border border-input p-6 shadow-xs">
                    <span
                      aria-hidden="true"
                      className="inline-flex size-14 items-center justify-center rounded-full bg-accent-tint font-heading text-xl text-accent-deep"
                    >
                      {privacy.displayName === "public"
                        ? initials(displayName)
                        : "—"}
                    </span>
                    <p className="font-heading text-2xl break-words">
                      {privacy.displayName === "public" && displayName.trim()
                        ? displayName
                        : "Name hidden"}
                    </p>
                    {privacy.bio === "public" && bio.trim() ? (
                      <p className="font-heading text-base leading-relaxed break-words whitespace-pre-line">
                        {bio}
                      </p>
                    ) : bio.trim() ? (
                      <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                        Bio hidden from visitors
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No bio yet
                      </p>
                    )}
                  </article>
                  <Link
                    href="/profile/portfolio"
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Photo, links, and Works in your portfolio
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </aside>
              </div>

              {feedback}
              {profileDirty ? (
                <SaveBar
                  label="You have unsaved changes"
                  saving={isPending}
                  onDiscard={discardProfile}
                  onSave={() => saveProfile()}
                />
              ) : null}
            </div>
          ) : null}

          {active === "matching" ? (
            <form
              className="flex flex-col gap-8"
              onSubmit={savePreferences}
              noValidate
            >
              <section
                aria-labelledby="matching-summary-title"
                className="flex flex-col gap-3 rounded-xl border border-input p-6 shadow-xs sm:p-8"
              >
                <h3
                  id="matching-summary-title"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  Missa is looking for
                </h3>
                <p className="font-heading text-xl leading-snug sm:text-2xl">
                  {savedSummary ??
                    "Everything open. Add a field or a kind of call to sharpen what Missa shows you."}
                </p>
                <Link
                  href="/opportunities/for-you"
                  className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  See calls picked for you
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </section>

              <div className="border-t border-border">
                <MatchingGroup
                  title="Fields and forms"
                  hint="What you make"
                  summary={fieldsSummary}
                  defaultOpen={!savedSummary}
                >
                  <TaxonomyBrowsePicker
                    idPrefix="profile-practice"
                    preferences={taxonomyPreferences}
                    onPreferencesChange={updateTaxonomy}
                    description="Start broad. Choose the closest field, then a genre or style if it helps."
                  />
                  <FacetRefinement
                    preferences={taxonomyPreferences}
                    onChange={updateTaxonomy}
                  />
                  {conflict ? (
                    <Alert variant="destructive">
                      <AlertTitle>Two choices disagree</AlertTitle>
                      <AlertDescription>
                        {taxonomyLabelFor(conflict.termId)} is hidden, but a
                        narrower choice inside it is still wanted. Change one of
                        them before saving.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {exclusions.length ? (
                    <label className="flex items-start gap-3 rounded-lg bg-muted/60 p-3 text-sm">
                      <Checkbox
                        checked={confirmedExclusions}
                        onCheckedChange={(value) =>
                          setConfirmedExclusions(value === true)
                        }
                      />
                      <span>
                        I understand that hiding a field also hides everything
                        inside it from my results.
                      </span>
                    </label>
                  ) : null}
                </MatchingGroup>

                <MatchingGroup
                  title="Kinds of call"
                  hint="Residencies, grants, prizes…"
                  summary={typesSummary}
                >
                  <fieldset className="m-0 grid gap-2 border-0 p-0 sm:grid-cols-3">
                    <legend className="sr-only">Kinds of call</legend>
                    {OPPORTUNITY_TYPES.map(([value, label]) => (
                      <label
                        key={value}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 text-sm hover:bg-muted/60"
                      >
                        <Checkbox
                          checked={opportunityPreferences.types.includes(value)}
                          onCheckedChange={(checked) =>
                            setOpportunityPreferences((current) => ({
                              ...current,
                              types: checked
                                ? [...current.types, value]
                                : current.types.filter(
                                    (item) => item !== value,
                                  ),
                            }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                </MatchingGroup>

                <MatchingGroup
                  title="Where and when in your career"
                  hint="A preference, not an eligibility rule"
                  summary={whereSummary}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="profile-locations">
                        Places or ways of taking part
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
                        aria-describedby="profile-locations-help"
                      />
                      <p
                        id="profile-locations-help"
                        className="text-xs text-muted-foreground"
                      >
                        Separate places with commas.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="profile-career-stage">Career stage</Label>
                      <NativeSelect
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
                        {Object.entries(CAREER_STAGES).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>
                </MatchingGroup>

                <MatchingGroup
                  title="Cost and timing"
                  hint="Hard limits hide calls whose fee or policy is unknown"
                  summary={costSummary}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="profile-max-fee">
                        Highest fee you would pay
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
                        placeholder="No limit"
                      />
                      <label className="flex min-h-11 items-center gap-3 text-sm">
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
                        Only calls with no fee
                      </label>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="profile-deadline-window">Deadline</Label>
                      <NativeSelect
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
                      </NativeSelect>
                      <label className="flex min-h-11 items-center gap-3 text-sm">
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
                </MatchingGroup>
              </div>

              {feedback}
              {preferencesDirty ? (
                <SaveBar
                  label="You have unsaved matching changes"
                  saving={isPending}
                  disabled={
                    Boolean(conflict) ||
                    Boolean(exclusions.length && !confirmedExclusions)
                  }
                  onDiscard={discardPreferences}
                />
              ) : null}
            </form>
          ) : null}

          {active === "notifications" ? (
            notificationPreferences ? (
              <NotificationPreferencesPanel
                initial={notificationPreferences}
                embedded
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Notification settings need account storage, which this workspace
                does not have yet. Reminders still appear in your{" "}
                <Link
                  href="/inbox"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Inbox
                </Link>
                .
              </p>
            )
          ) : null}

          {active === "connections" ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-5">
                <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-1">
                  <h3 className="text-base font-semibold">Calendars</h3>
                  <p className="text-sm text-muted-foreground">
                    Send deadlines and start-by dates to Google or Outlook, or
                    subscribe with a private feed.
                  </p>
                </div>
                <Link
                  href="/calendar"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Manage calendars
                </Link>
              </div>
              {integrations.gmailSync ? <GmailSyncCard /> : null}
              {integrations.emailForwarding ? <EmailForwardingCard /> : null}
            </div>
          ) : null}

          {active === "searches" ? (
            <SavedSearches userId={profile.id} profiles={savedSearches} />
          ) : null}
          {active === "following" ? (
            <FollowingList userId={profile.id} following={following} />
          ) : null}

          {active === "account" ? (
            <div className="flex flex-col gap-10">
              <dl className="m-0 border-t border-border">
                <div className="flex min-h-18 flex-wrap items-center gap-x-6 gap-y-1 border-b border-border py-3">
                  <dt className="w-full text-sm font-semibold sm:w-48">
                    Sign-in email
                  </dt>
                  <dd className="m-0 min-w-0 flex-1 text-sm break-words">
                    {email ?? "Not available"}
                  </dd>
                </div>
                <div className="flex min-h-18 flex-wrap items-center gap-x-6 gap-y-2 border-b border-border py-3">
                  <dt className="w-full text-sm font-semibold sm:w-48">
                    Signed-in devices
                  </dt>
                  <dd className="m-0 flex min-w-0 flex-[1_1_16rem] flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>End every session after using a shared device.</span>
                    <Button
                      variant="outline"
                      onClick={() => setSignOutEverywhereOpen(true)}
                    >
                      Sign out everywhere
                    </Button>
                  </dd>
                </div>
              </dl>

              <section
                aria-labelledby="account-data-title"
                className="flex flex-col gap-3"
              >
                <h3 id="account-data-title" className="text-lg font-semibold">
                  Your data
                </h3>
                <ExportButtons />
                <Link
                  href="/import"
                  className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Import a tracker you already keep
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </section>

              <section
                aria-labelledby="account-close-title"
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-5"
              >
                <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-1">
                  <h3
                    id="account-close-title"
                    className="text-base font-semibold"
                  >
                    Close your account
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Sign-ins stop and your public profile goes offline. Export
                    first if you want a copy; required audit records are kept.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setCloseAccountOpen(true)}
                >
                  Close account…
                </Button>
              </section>
              {error ? (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}
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
              Your changes in {SECTION_LABELS[active]} have not been saved.
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
      <AlertDialog
        open={signOutEverywhereOpen}
        onOpenChange={(open) => {
          if (signingOutEverywhere) return;
          setSignOutEverywhereOpen(open);
          if (!open) setSignOutEverywhereError(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              Every browser and device signed in to your Missa account,
              including this one, will need to sign in again. Your data is not
              changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {signOutEverywhereError ? (
            <p role="alert" className="text-sm text-destructive">
              {signOutEverywhereError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOutEverywhere}>
              Stay signed in
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={signingOutEverywhere}
              onClick={(event) => {
                event.preventDefault();
                setSigningOutEverywhere(true);
                setSignOutEverywhereError(undefined);
                fetch("/api/auth/logout-all", { method: "POST" })
                  .then(async (response) => {
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok)
                      throw new Error(
                        data.error || "Could not sign you out of all devices.",
                      );
                    window.location.href = "/login";
                  })
                  .catch((reason: unknown) => {
                    setSignOutEverywhereError(
                      reason instanceof Error
                        ? reason.message
                        : "Could not sign you out of all devices.",
                    );
                    setSigningOutEverywhere(false);
                  });
              }}
            >
              {signingOutEverywhere ? "Signing out…" : "Sign out everywhere"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={closeAccountOpen}
        onOpenChange={(open) => {
          if (!closingAccount) setCloseAccountOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close your Missa account?</AlertDialogTitle>
            <AlertDialogDescription>
              This signs you out and removes your public profile. Your exported
              data and required audit history are retained. This cannot be
              undone from Missa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Label htmlFor="close-account-confirmation">
            Type CLOSE MY ACCOUNT
          </Label>
          <Input
            id="close-account-confirmation"
            value={closeAccountText}
            onChange={(event) => setCloseAccountText(event.target.value)}
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingAccount}>
              Keep account
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                closingAccount || closeAccountText !== "CLOSE MY ACCOUNT"
              }
              onClick={(event) => {
                event.preventDefault();
                setClosingAccount(true);
                fetch("/api/me/account/close", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ confirmation: closeAccountText }),
                })
                  .then(async (response) => {
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok)
                      throw new Error(
                        data.error || "Could not close your account.",
                      );
                    window.location.href = "/";
                  })
                  .catch((reason: unknown) => {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "Could not close your account.",
                    );
                    setClosingAccount(false);
                    setCloseAccountOpen(false);
                  });
              }}
            >
              {closingAccount ? "Closing…" : "Close account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
