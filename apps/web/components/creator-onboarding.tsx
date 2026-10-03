"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserHandle } from "@missa/radar-adapters";
import { CANONICAL_COUNTRIES } from "@missa/contracts";
import { MissaWordmark } from "@/components/missa-wordmark";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  RotateCw,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { RadioGroup } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { signupIdentity, suggestedHandle } from "@/lib/signupIdentity";
import {
  ONBOARDING_PRACTICES,
  ONBOARDING_INTERESTS,
} from "@/lib/creatorOnboardingTaxonomy";
import { cn } from "@/lib/utils";
import {
  ChoiceChip,
  ChoiceRow,
  ChoiceTile,
  OnboardingMobileProgress,
  OnboardingStepper,
  OnboardingSummaryCard,
  ProfilePreviewCard,
  RadioCard,
  type OnboardingStepMeta,
} from "@/components/creator-onboarding-parts";

type OnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";

type OnboardingStateProps = {
  /** Local design tour only: no account writes. */
  preview?: boolean;
  initialDisplayName?: string;
  initialGivenName?: string;
  initialFamilyName?: string;
  initialUsesSingleName?: boolean;
  initialCountryCode?: string;
  initialCity?: string;
  initialTimezone?: string;
  initialCareerStage?: string;
  initialTravelWillingness?: string;
  initialNoFeeOnly?: boolean;
  initialHandle?: UserHandle | null;
  handleNamespaceReady?: boolean;
  handleClaimingOpen?: boolean;
  initialPractices?: string[];
  initialRefinements?: string[];
  initialInterests?: string[];
  initialStep?: number;
  initialStatus?: OnboardingStatus;
};

type FieldName = "country" | "timezone" | "givenName" | "familyName" | "handle";

type HandleCheck =
  | { state: "idle" }
  | { state: "checking"; handle: string }
  | { state: "available"; handle: string }
  | { state: "taken"; handle: string }
  | { state: "error"; handle: string; message: string };

const STEPS: readonly OnboardingStepMeta[] = [
  {
    label: "Your work",
    title: "What do you make?",
    lede: "Choose every kind of work you make. Missa uses this to find calls written for work like yours.",
  },
  {
    label: "Opportunities",
    title: "What are you looking for?",
    lede: "Choose what you want to see first. You can still browse everything.",
  },
  {
    label: "Location",
    title: "Where are you based?",
    lede: "Many calls have location rules. Missa uses these details to explain which ones fit.",
  },
  {
    label: "Profile",
    title: "Confirm your name.",
    lede: "This is how Missa introduces you. Nothing is public until you publish your Profile.",
  },
];

const DONE_STEP = STEPS.length;

const PRACTICE_SPRITE = "url(/media/onboarding-practices.webp)";

const INTEREST_IMAGES: Record<string, string> = {
  "Grants & funding": "/media/home/generated/grants.webp",
  Residencies: "/media/home/generated/residencies.webp",
  "Publication opportunities": "/media/home/generated/publications.webp",
  "Exhibitions & commissions": "/media/home/generated/exhibitions.webp",
  "Fellowships & awards": "/media/home/generated/prizes.webp",
  "Jobs & paid projects": "/media/home/generated/feature-studio.webp",
};

const CAREER_STAGES = [
  {
    value: "student",
    label: "Student",
    description: "In school or a degree programme",
  },
  {
    value: "emerging",
    label: "Early career",
    description: "Building a body of work",
  },
  {
    value: "mid-career",
    label: "Mid-career",
    description: "A steady body of shown work",
  },
  {
    value: "established",
    label: "Established",
    description: "Widely recognised work",
  },
  { value: "any", label: "Show me all", description: "Don’t narrow by stage" },
] as const;

const PARTICIPATION = [
  { value: "any", label: "In person or online" },
  { value: "remote-only", label: "Online only" },
  { value: "willing-to-travel", label: "I can travel" },
  { value: "local-only", label: "Near where I live" },
] as const;

const PARTICIPATION_SUMMARY: Record<string, string> = {
  any: "In person or online",
  "remote-only": "Online only",
  "willing-to-travel": "Open to travel",
  "local-only": "Near where you live",
};

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/u;

const COUNTRY_CODES = Object.entries(CANONICAL_COUNTRIES)
  .filter(([code]) => code !== "GLOBAL")
  .sort(([, left], [, right]) => left.localeCompare(right))
  .map(([code]) => code);

function isValidTimeZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

function plainZoneName(zone: string) {
  return zone.replaceAll("_", " ");
}

function listJoin(items: string[]) {
  return items.length ? items.join(", ") : null;
}

export function CreatorOnboarding({
  preview = false,
  initialDisplayName = "",
  initialGivenName = "",
  initialFamilyName = "",
  initialUsesSingleName = false,
  initialCountryCode = "",
  initialCity = "",
  initialTimezone = "",
  initialCareerStage = "any",
  initialTravelWillingness = "any",
  initialNoFeeOnly = false,
  initialHandle = null,
  handleNamespaceReady = false,
  handleClaimingOpen = false,
  initialPractices = [],
  initialRefinements = [],
  initialInterests = [],
  initialStep = 0,
  initialStatus = "not_started",
}: OnboardingStateProps) {
  const router = useRouter();
  // A skipped setup resumes where the person left; only a completed setup
  // opens on the summary.
  const resumeStep =
    initialStatus === "completed"
      ? DONE_STEP
      : Math.min(DONE_STEP - 1, Math.max(0, initialStep));
  const [step, setStep] = useState(resumeStep);
  const [furthest, setFurthest] = useState(
    initialStatus === "completed" ? DONE_STEP : resumeStep,
  );
  const [completed, setCompleted] = useState(initialStatus === "completed");
  const [practices, setPractices] = useState<string[]>(initialPractices);
  const [refinements, setRefinements] = useState<string[]>(initialRefinements);
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [givenName, setGivenName] = useState(initialGivenName);
  const [familyName, setFamilyName] = useState(initialFamilyName);
  const [usesSingleName, setUsesSingleName] = useState(initialUsesSingleName);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [city, setCity] = useState(initialCity);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [timezoneDetected, setTimezoneDetected] = useState(false);
  const [zoneOptions, setZoneOptions] = useState<string[]>([]);
  const [zoneLabels, setZoneLabels] = useState<Map<string, string>>(new Map());
  const [careerStage, setCareerStage] = useState(initialCareerStage);
  const [travelWillingness, setTravelWillingness] = useState(
    initialTravelWillingness,
  );
  const [noFeeOnly, setNoFeeOnly] = useState(initialNoFeeOnly);
  const [handleValue, setHandleValue] = useState(
    initialHandle?.displayHandle ?? suggestedHandle(initialDisplayName),
  );
  const [claimedHandle, setClaimedHandle] = useState(initialHandle);
  const [handleCheck, setHandleCheck] = useState<HandleCheck>({
    state: "idle",
  });
  const [handleRetry, setHandleRetry] = useState(0);
  const [saving, setSaving] = useState<"next" | "later" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});

  const heading = useRef<HTMLHeadingElement>(null);
  const identity = signupIdentity({ givenName, familyName, usesSingleName });
  const displayName =
    "field" in identity
      ? [givenName.trim(), usesSingleName ? "" : familyName.trim()]
          .filter(Boolean)
          .join(" ") || initialDisplayName
      : identity.displayName;

  const normalizedHandle = handleValue.trim().toLowerCase().replace(/^@/u, "");
  const handleIsValid = HANDLE_PATTERN.test(normalizedHandle);
  const canClaimHandle =
    !claimedHandle && handleNamespaceReady && handleClaimingOpen;
  const handleAvailable =
    handleCheck.state === "available" &&
    handleCheck.handle === normalizedHandle;
  const publicAddress = claimedHandle
    ? `usemissa.com/@${claimedHandle.displayHandle}`
    : canClaimHandle && normalizedHandle
      ? `usemissa.com/@${normalizedHandle}`
      : null;

  const availableRefinements = ONBOARDING_PRACTICES.filter((p) =>
    practices.includes(p.label),
  );

  // Detect the device time zone once and build the list of valid zones after
  // mount, so server and client render the same initial markup.
  useEffect(() => {
    let zones: string[] = [];
    try {
      zones = Intl.supportedValuesOf("timeZone");
    } catch {
      zones = [];
    }
    const labels = new Map<string, string>();
    const now = new Date();
    for (const zone of zones) {
      try {
        const offset = new Intl.DateTimeFormat("en-US", {
          timeZone: zone,
          timeZoneName: "shortOffset",
        })
          .formatToParts(now)
          .find((part) => part.type === "timeZoneName")?.value;
        labels.set(
          zone,
          `${plainZoneName(zone)}${offset ? ` (${offset})` : ""}`,
        );
      } catch {
        labels.set(zone, plainZoneName(zone));
      }
    }
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    queueMicrotask(() => {
      setZoneOptions(zones);
      setZoneLabels(labels);
      setTimezone((current) => {
        if (current) return current;
        setTimezoneDetected(true);
        return detected;
      });
    });
  }, []);

  useEffect(() => {
    if (preview || !canClaimHandle || !handleIsValid) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setHandleCheck({ state: "checking", handle: normalizedHandle });
      try {
        const response = await fetch(
          `/api/me/handles/availability?handle=${encodeURIComponent(normalizedHandle)}`,
          { signal: controller.signal },
        );
        const result = (await response.json().catch(() => ({}))) as {
          available?: boolean;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error);
        setHandleCheck({
          state: result.available ? "available" : "taken",
          handle: normalizedHandle,
        });
      } catch (problem) {
        if (controller.signal.aborted) return;
        setHandleCheck({
          state: "error",
          handle: normalizedHandle,
          message:
            problem instanceof Error && problem.message
              ? problem.message
              : "We could not check this address.",
        });
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [canClaimHandle, handleIsValid, normalizedHandle, preview, handleRetry]);

  function move(next: number) {
    setError(null);
    setFieldErrors({});
    setStep(next);
    setFurthest((current) => Math.max(current, next));
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      heading.current?.focus({ preventScroll: true });
    });
  }

  function togglePractice(label: string, checked: boolean) {
    setPractices((current) =>
      checked ? [...current, label] : current.filter((v) => v !== label),
    );
    if (!checked) {
      // A refinement without its practice would be saved invisibly.
      const practice = ONBOARDING_PRACTICES.find((p) => p.label === label);
      const orphaned = new Set(practice?.refinements.map((r) => r.label));
      setRefinements((current) => current.filter((r) => !orphaned.has(r)));
    }
  }

  function payload(action: "save_step" | "complete", nextStep: number) {
    return {
      action,
      step: nextStep,
      practices,
      refinements,
      interests,
      givenName,
      familyName: usesSingleName ? undefined : familyName,
      usesSingleName,
      countryCode,
      city,
      timezone,
      careerStage,
      travelWillingness,
      noFeeOnly,
      lastRoute: "/onboarding",
    };
  }

  async function post(body: unknown) {
    const response = await fetch("/api/me/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 401) {
      router.push("/login?next=/onboarding");
      throw new Error("Your session ended. Log in to continue setup.");
    }
    if (!response.ok) {
      const result = (await response.json().catch(() => undefined)) as
        { error?: string } | undefined;
      throw new Error(
        result?.error ?? "We could not save this change. Please try again.",
      );
    }
  }

  async function saveAndMove(nextStep: number) {
    if (preview) {
      if (nextStep >= DONE_STEP) setCompleted(true);
      move(nextStep);
      return;
    }
    setSaving("next");
    setError(null);
    try {
      await post(
        payload(nextStep >= DONE_STEP ? "complete" : "save_step", nextStep),
      );
      if (nextStep >= DONE_STEP) setCompleted(true);
      move(nextStep);
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "We could not save this change. Please try again.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function finishLater() {
    if (completed) {
      // Someone editing a finished setup saves everything and returns to the
      // summary rather than marking setup as skipped.
      if (validateLocation() && validateProfile()) await saveAndMove(DONE_STEP);
      return;
    }
    if (preview) {
      router.push("/opportunities");
      return;
    }
    setSaving("later");
    setError(null);
    try {
      await post(payload("save_step", step));
      await post({ action: "skip", step, lastRoute: "/onboarding" });
      router.push("/tracker");
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "We could not save this change. Please try again.",
      );
      setSaving(null);
    }
  }

  function validateLocation() {
    const problems: Partial<Record<FieldName, string>> = {};
    if (!countryCode) problems.country = "Choose your country.";
    if (!timezone || !isValidTimeZone(timezone))
      problems.timezone = "Choose a time zone from the list.";
    setFieldErrors(problems);
    if (Object.keys(problems).length) {
      if (step !== 2) move(2);
      queueMicrotask(() => setFieldErrors(problems));
      return false;
    }
    return true;
  }

  function validateProfile() {
    const problems: Partial<Record<FieldName, string>> = {};
    if ("field" in identity) problems[identity.field] = identity.message;
    if (!preview && canClaimHandle) {
      if (!handleIsValid)
        problems.handle =
          "Use 3–30 lowercase letters, numbers, or hyphens. Start and end with a letter or number.";
      else if (
        handleCheck.state === "taken" &&
        handleCheck.handle === normalizedHandle
      )
        problems.handle = `@${normalizedHandle} is already in use. Try another address.`;
      else if (!handleAvailable)
        problems.handle =
          handleCheck.state === "error"
            ? "We could not check this address. Retry the check, then finish."
            : "Wait a moment while Missa checks this address.";
    }
    setFieldErrors(problems);
    return Object.keys(problems).length === 0;
  }

  async function finishSetup() {
    if (!validateLocation()) return;
    if (!validateProfile()) return;

    if (preview) {
      if (canClaimHandle && normalizedHandle) {
        setClaimedHandle({
          handleKey: normalizedHandle,
          displayHandle: normalizedHandle,
          state: "claimed",
          claimedAt: new Date().toISOString(),
        });
      }
      setCompleted(true);
      move(DONE_STEP);
      return;
    }

    setSaving("next");
    setError(null);
    try {
      if (!claimedHandle && handleClaimingOpen && normalizedHandle) {
        const response = await fetch("/api/me/handles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: normalizedHandle }),
        });
        const result = (await response.json().catch(() => ({}))) as {
          handle?: UserHandle;
          error?: string;
        };
        if (!response.ok || !result.handle) {
          throw new Error(
            result.error ??
              "We could not hold this Missa address. Try another.",
          );
        }
        setClaimedHandle(result.handle);
      }
      await post(payload("complete", DONE_STEP));
      setCompleted(true);
      move(DONE_STEP);
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "We could not finish setting up your account. Try again.",
      );
    } finally {
      setSaving(null);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (step === 0) void saveAndMove(1);
    else if (step === 1) void saveAndMove(2);
    else if (step === 2) {
      if (validateLocation()) void saveAndMove(3);
    } else if (step === 3) void finishSetup();
  }

  const countryName = countryCode ? CANONICAL_COUNTRIES[countryCode] : "";
  const basedIn = [city.trim(), countryName].filter(Boolean).join(", ") || null;
  const practiceSummary = listJoin([...practices, ...refinements]);
  const interestSummary = listJoin(interests);
  const stageLabel =
    CAREER_STAGES.find((s) => s.value === careerStage && s.value !== "any")
      ?.label ?? null;

  const summaryRows = [
    { label: "You make", value: practiceSummary },
    {
      label: "Looking for",
      value: interestSummary ?? (step > 1 ? "Every opportunity type" : null),
    },
    { label: "Based in", value: basedIn },
    {
      label: "Fit",
      value:
        step > 2 || basedIn
          ? [
              stageLabel,
              PARTICIPATION_SUMMARY[travelWillingness],
              noFeeOnly ? "No-fee only" : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : null,
    },
  ];

  const asideImage =
    step === 0
      ? "/media/home/hero-artist-studio.webp"
      : step === 1
        ? (INTEREST_IMAGES[interests[interests.length - 1] ?? ""] ??
          "/media/home/generated/residencies.webp")
        : step === 2
          ? "/media/home/generated/missa-coastal-village.webp"
          : step === 3
            ? "/media/home/artist-at-work.webp"
            : "/media/home/generated/festivals.webp";

  const selectedWorkCount = practices.length;
  const selectionStatus =
    step === 0
      ? practices.length
        ? `${selectedWorkCount} selected`
        : "Nothing selected yet"
      : step === 1
        ? interests.length
          ? `${interests.length} selected`
          : "Showing every opportunity type"
        : step === 2
          ? "Private to you"
          : "Nothing is published yet";

  const primaryLabel =
    step === 0
      ? practices.length
        ? "Continue"
        : "Skip this step"
      : step === 3
        ? completed
          ? "Save changes"
          : "Finish setup"
        : "Continue";

  const busy = saving !== null;
  const meta = STEPS[step];

  return (
    <div
      className="min-h-dvh bg-background text-foreground"
      data-density="comfortable"
    >
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="flex h-16 items-center justify-between gap-4 px-gutter">
          <MissaWordmark href="/" size="app" />
          {step < DONE_STEP ? (
            <OnboardingStepper
              steps={STEPS}
              current={step}
              furthest={furthest}
              completed={completed}
              onSelect={move}
              disabled={busy}
            />
          ) : null}
          {step < DONE_STEP ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void finishLater()}
              disabled={busy}
              aria-busy={saving === "later"}
            >
              {saving === "later" ? <Spinner aria-hidden="true" /> : null}
              {completed ? "Save and close" : "Finish later"}
            </Button>
          ) : (
            <span className="w-24" aria-hidden="true" />
          )}
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(26rem,40%)]">
        <main className="min-w-0">
          {step < DONE_STEP && meta ? (
            <form
              noValidate
              onSubmit={onSubmit}
              aria-labelledby="onboarding-heading"
              className="flex min-h-[calc(100dvh-4rem)] flex-col"
            >
              <div className="mx-auto w-full max-w-2xl flex-1 px-gutter pt-6 pb-section md:pt-12">
                <OnboardingMobileProgress steps={STEPS} current={step} />
                <div
                  key={step}
                  className="mt-6 animate-in duration-200 fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none md:mt-0"
                >
                  <p className="hidden text-sm text-muted-foreground md:block">
                    Step {step + 1} of {STEPS.length}
                  </p>
                  <h1
                    id="onboarding-heading"
                    ref={heading}
                    tabIndex={-1}
                    className="mt-2 font-heading text-4xl leading-[1.05] tracking-tight text-balance outline-none md:text-5xl"
                  >
                    {meta.title}
                  </h1>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground">
                    {meta.lede}
                  </p>

                  {error ? (
                    <div className="mt-6">
                      <Alert variant="destructive">
                        <AlertCircle aria-hidden="true" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    </div>
                  ) : null}

                  <div className="mt-8">
                    {step === 0 ? (
                      <>
                        <fieldset>
                          <legend className="sr-only">
                            Creative practices
                          </legend>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                            {ONBOARDING_PRACTICES.map((practice, index) => (
                              <ChoiceTile
                                key={practice.label}
                                label={practice.label}
                                description={practice.refinements
                                  .map((r) => r.label)
                                  .join(", ")}
                                checked={practices.includes(practice.label)}
                                onCheckedChange={(checked) =>
                                  togglePractice(practice.label, checked)
                                }
                                media={
                                  <span
                                    className="absolute inset-0 bg-cover"
                                    style={{
                                      backgroundImage: PRACTICE_SPRITE,
                                      backgroundSize: "300% 200%",
                                      backgroundPosition: `${(index % 3) * 50}% ${index < 3 ? 0 : 100}%`,
                                    }}
                                  />
                                }
                              />
                            ))}
                          </div>
                        </fieldset>

                        {availableRefinements.length ? (
                          <section
                            aria-labelledby="refine-heading"
                            className="mt-10 animate-in duration-200 fade-in-0 motion-reduce:animate-none"
                          >
                            <h2
                              id="refine-heading"
                              className="text-base font-semibold text-foreground"
                            >
                              Narrow it down{" "}
                              <span className="font-normal text-muted-foreground">
                                · optional
                              </span>
                            </h2>
                            <div className="mt-4 grid gap-5">
                              {availableRefinements.map((practice) => (
                                <fieldset key={practice.label}>
                                  <legend className="mb-2 text-sm text-muted-foreground">
                                    {practice.label}
                                  </legend>
                                  <div className="flex flex-wrap gap-2">
                                    {practice.refinements.map((refinement) => (
                                      <ChoiceChip
                                        key={refinement.termId}
                                        label={refinement.label}
                                        checked={refinements.includes(
                                          refinement.label,
                                        )}
                                        onCheckedChange={(checked) =>
                                          setRefinements((current) =>
                                            checked
                                              ? [...current, refinement.label]
                                              : current.filter(
                                                  (v) => v !== refinement.label,
                                                ),
                                          )
                                        }
                                      />
                                    ))}
                                  </div>
                                </fieldset>
                              ))}
                            </div>
                          </section>
                        ) : null}
                      </>
                    ) : null}

                    {step === 1 ? (
                      <fieldset>
                        <legend className="sr-only">
                          Opportunity interests
                        </legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {ONBOARDING_INTERESTS.map((interest) => (
                            <ChoiceRow
                              key={interest.label}
                              label={interest.label}
                              description={interest.description}
                              imageSrc={
                                INTEREST_IMAGES[interest.label] ??
                                "/media/home/generated/residencies.webp"
                              }
                              checked={interests.includes(interest.label)}
                              onCheckedChange={(checked) =>
                                setInterests((current) =>
                                  checked
                                    ? [...current, interest.label]
                                    : current.filter(
                                        (v) => v !== interest.label,
                                      ),
                                )
                              }
                            />
                          ))}
                        </div>
                      </fieldset>
                    ) : null}

                    {step === 2 ? (
                      <div className="grid gap-10">
                        <section
                          aria-labelledby="where-heading"
                          className="grid gap-5"
                        >
                          <h2
                            id="where-heading"
                            className="text-base font-semibold"
                          >
                            Where you are
                          </h2>
                          <div className="grid gap-5 sm:grid-cols-2">
                            <Field data-invalid={Boolean(fieldErrors.country)}>
                              <FieldLabel htmlFor="onboarding-country">
                                Country
                              </FieldLabel>
                              <Combobox
                                items={COUNTRY_CODES}
                                value={countryCode || null}
                                itemToStringLabel={(code: string) =>
                                  CANONICAL_COUNTRIES[code] ?? code
                                }
                                onValueChange={(code: string | null) => {
                                  setCountryCode(code ?? "");
                                  setFieldErrors(
                                    ({ country: _drop, ...rest }) => rest,
                                  );
                                }}
                              >
                                <ComboboxInput
                                  id="onboarding-country"
                                  className="h-11 w-full"
                                  placeholder="Search countries"
                                  autoComplete="off"
                                  aria-invalid={Boolean(fieldErrors.country)}
                                  aria-describedby="onboarding-country-error"
                                />
                                <ComboboxContent>
                                  <ComboboxEmpty>
                                    No country matches that search.
                                  </ComboboxEmpty>
                                  <ComboboxList>
                                    {(code: string) => (
                                      <ComboboxItem
                                        key={code}
                                        value={code}
                                        className="min-h-9"
                                      >
                                        {CANONICAL_COUNTRIES[code]}
                                      </ComboboxItem>
                                    )}
                                  </ComboboxList>
                                </ComboboxContent>
                              </Combobox>
                              <FieldError id="onboarding-country-error">
                                {fieldErrors.country}
                              </FieldError>
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="onboarding-city">
                                City{" "}
                                <span className="font-normal text-muted-foreground">
                                  (optional)
                                </span>
                              </FieldLabel>
                              <Input
                                id="onboarding-city"
                                value={city}
                                onChange={(event) =>
                                  setCity(event.target.value)
                                }
                                autoComplete="address-level2"
                                maxLength={120}
                              />
                            </Field>
                            <Field
                              className="sm:col-span-2"
                              data-invalid={Boolean(fieldErrors.timezone)}
                            >
                              <FieldLabel htmlFor="onboarding-timezone">
                                Time zone
                              </FieldLabel>
                              <Combobox
                                items={
                                  timezone && !zoneOptions.includes(timezone)
                                    ? [timezone, ...zoneOptions]
                                    : zoneOptions
                                }
                                value={timezone || null}
                                itemToStringLabel={(zone: string) =>
                                  zoneLabels.get(zone) ?? plainZoneName(zone)
                                }
                                onValueChange={(zone: string | null) => {
                                  setTimezone(zone ?? "");
                                  setTimezoneDetected(false);
                                  setFieldErrors(
                                    ({ timezone: _drop, ...rest }) => rest,
                                  );
                                }}
                              >
                                <ComboboxInput
                                  id="onboarding-timezone"
                                  className="h-11 w-full"
                                  placeholder="Search time zones"
                                  autoComplete="off"
                                  aria-invalid={Boolean(fieldErrors.timezone)}
                                  aria-describedby="onboarding-timezone-help onboarding-timezone-error"
                                />
                                <ComboboxContent>
                                  <ComboboxEmpty>
                                    No time zone matches that search.
                                  </ComboboxEmpty>
                                  <ComboboxList>
                                    {(zone: string) => (
                                      <ComboboxItem
                                        key={zone}
                                        value={zone}
                                        className="min-h-9"
                                      >
                                        {zoneLabels.get(zone) ??
                                          plainZoneName(zone)}
                                      </ComboboxItem>
                                    )}
                                  </ComboboxList>
                                </ComboboxContent>
                              </Combobox>
                              <FieldDescription id="onboarding-timezone-help">
                                {timezoneDetected
                                  ? "Detected from this device. Deadlines and reminders use this time."
                                  : "Deadlines and reminders use this time."}
                              </FieldDescription>
                              <FieldError id="onboarding-timezone-error">
                                {fieldErrors.timezone}
                              </FieldError>
                            </Field>
                          </div>
                        </section>

                        <section
                          aria-labelledby="fit-heading"
                          className="grid gap-6"
                        >
                          <h2
                            id="fit-heading"
                            className="text-base font-semibold"
                          >
                            What fits right now
                          </h2>
                          <div className="grid gap-3">
                            <p
                              id="career-stage-label"
                              className="text-sm font-medium"
                            >
                              Career stage
                            </p>
                            <RadioGroup
                              aria-labelledby="career-stage-label"
                              value={careerStage}
                              onValueChange={(value) =>
                                setCareerStage(String(value))
                              }
                              className="grid gap-2 sm:grid-cols-2"
                            >
                              {CAREER_STAGES.map((stage) => (
                                <RadioCard
                                  key={stage.value}
                                  value={stage.value}
                                  label={stage.label}
                                  description={stage.description}
                                  checked={careerStage === stage.value}
                                />
                              ))}
                            </RadioGroup>
                          </div>
                          <div className="grid gap-3">
                            <p
                              id="participation-label"
                              className="text-sm font-medium"
                            >
                              How you can take part
                            </p>
                            <RadioGroup
                              aria-labelledby="participation-label"
                              value={travelWillingness}
                              onValueChange={(value) =>
                                setTravelWillingness(String(value))
                              }
                              className="grid gap-2 sm:grid-cols-2"
                            >
                              {PARTICIPATION.map((option) => (
                                <RadioCard
                                  key={option.value}
                                  value={option.value}
                                  label={option.label}
                                  checked={travelWillingness === option.value}
                                />
                              ))}
                            </RadioGroup>
                          </div>
                          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
                            <span>
                              <span className="block text-sm font-medium">
                                No application fees
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                Only show calls that are free to enter.
                              </span>
                            </span>
                            <Switch
                              checked={noFeeOnly}
                              onCheckedChange={(checked) =>
                                setNoFeeOnly(checked === true)
                              }
                            />
                          </label>
                        </section>
                      </div>
                    ) : null}

                    {step === 3 ? (
                      <div className="grid gap-8">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field data-invalid={Boolean(fieldErrors.givenName)}>
                            <FieldLabel htmlFor="onboarding-given-name">
                              Given name
                            </FieldLabel>
                            <Input
                              id="onboarding-given-name"
                              value={givenName}
                              onChange={(event) => {
                                setGivenName(event.target.value);
                                setFieldErrors(
                                  ({ givenName: _drop, ...rest }) => rest,
                                );
                              }}
                              maxLength={80}
                              autoComplete="given-name"
                              aria-invalid={Boolean(fieldErrors.givenName)}
                              aria-describedby="onboarding-given-name-error"
                              required
                            />
                            <FieldError id="onboarding-given-name-error">
                              {fieldErrors.givenName}
                            </FieldError>
                          </Field>
                          <Field data-invalid={Boolean(fieldErrors.familyName)}>
                            <FieldLabel htmlFor="onboarding-family-name">
                              Family name
                            </FieldLabel>
                            <Input
                              id="onboarding-family-name"
                              value={familyName}
                              onChange={(event) => {
                                setFamilyName(event.target.value);
                                setFieldErrors(
                                  ({ familyName: _drop, ...rest }) => rest,
                                );
                              }}
                              maxLength={80}
                              autoComplete="family-name"
                              disabled={usesSingleName}
                              required={!usesSingleName}
                              aria-invalid={Boolean(fieldErrors.familyName)}
                              aria-describedby="onboarding-family-name-error"
                            />
                            <FieldError id="onboarding-family-name-error">
                              {fieldErrors.familyName}
                            </FieldError>
                          </Field>
                          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm sm:col-span-2">
                            <Checkbox
                              checked={usesSingleName}
                              onCheckedChange={(checked) => {
                                const next = checked === true;
                                setUsesSingleName(next);
                                if (next) setFamilyName("");
                                setFieldErrors(
                                  ({ familyName: _drop, ...rest }) => rest,
                                );
                              }}
                            />
                            I use one name
                          </label>
                        </div>

                        {claimedHandle ? (
                          <div className="rounded-lg border border-border px-4 py-4">
                            <p className="text-sm font-medium">
                              Your Missa address
                            </p>
                            <p className="mt-1 font-mono text-base text-foreground">
                              usemissa.com/@{claimedHandle.displayHandle}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              You can change it in Profile 30 days after
                              claiming it.
                            </p>
                          </div>
                        ) : canClaimHandle ? (
                          <Field data-invalid={Boolean(fieldErrors.handle)}>
                            <FieldLabel htmlFor="onboarding-handle">
                              Missa address
                            </FieldLabel>
                            <InputGroup className="h-11">
                              <InputGroupAddon>
                                <InputGroupText>usemissa.com/@</InputGroupText>
                              </InputGroupAddon>
                              <InputGroupInput
                                id="onboarding-handle"
                                value={handleValue}
                                onChange={(event) => {
                                  setHandleValue(
                                    event.target.value
                                      .toLowerCase()
                                      .replace(/^@/u, ""),
                                  );
                                  setHandleCheck({ state: "idle" });
                                  setFieldErrors(
                                    ({ handle: _drop, ...rest }) => rest,
                                  );
                                }}
                                maxLength={30}
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                aria-invalid={Boolean(fieldErrors.handle)}
                                aria-describedby="onboarding-handle-status onboarding-handle-error"
                              />
                              <InputGroupAddon align="inline-end">
                                {handleCheck.state === "checking" ? (
                                  <span className="text-muted-foreground">
                                    <Spinner aria-hidden="true" />
                                  </span>
                                ) : handleAvailable ? (
                                  <Check
                                    aria-hidden="true"
                                    className="text-primary"
                                  />
                                ) : handleCheck.state === "taken" ? (
                                  <X
                                    aria-hidden="true"
                                    className="text-destructive"
                                  />
                                ) : null}
                              </InputGroupAddon>
                            </InputGroup>
                            <div
                              id="onboarding-handle-status"
                              role="status"
                              className="flex min-h-6 flex-wrap items-center gap-2 text-sm text-muted-foreground"
                            >
                              {normalizedHandle && !handleIsValid ? (
                                "Use 3–30 letters, numbers, or hyphens. Start and end with a letter or number."
                              ) : handleCheck.state === "checking" ? (
                                "Checking availability…"
                              ) : handleAvailable ? (
                                <span className="text-primary">
                                  @{normalizedHandle} is available.
                                </span>
                              ) : handleCheck.state === "taken" ? (
                                `@${normalizedHandle} is already in use.`
                              ) : handleCheck.state === "error" ? (
                                <>
                                  <span>{handleCheck.message}</span>
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="xs"
                                    onClick={() => setHandleRetry((n) => n + 1)}
                                  >
                                    <RotateCw aria-hidden="true" />
                                    Check again
                                  </Button>
                                </>
                              ) : (
                                "Letters, numbers, and hyphens. You can change it once every 30 days."
                              )}
                            </div>
                            <FieldError id="onboarding-handle-error">
                              {fieldErrors.handle}
                            </FieldError>
                          </Field>
                        ) : (
                          <p className="flex items-start gap-3 rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
                            <Lock
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0"
                            />
                            Profile addresses are opening in stages. You can
                            choose yours in Profile when it’s available.
                          </p>
                        )}

                        <div className="lg:hidden">
                          <ProfilePreviewCard
                            name={displayName}
                            address={publicAddress}
                            practices={practices}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-20 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
                <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-gutter py-3">
                  <p
                    role="status"
                    aria-live="polite"
                    className="me-auto hidden min-w-0 truncate text-sm text-muted-foreground sm:block"
                  >
                    {selectionStatus}
                  </p>
                  {step > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => move(step - 1)}
                      disabled={busy}
                      className="me-auto sm:me-0"
                    >
                      <ArrowLeft aria-hidden="true" />
                      Back
                    </Button>
                  ) : (
                    <span className="me-auto sm:hidden" />
                  )}
                  <Button
                    type="submit"
                    disabled={busy}
                    aria-busy={saving === "next"}
                    className="min-w-36"
                  >
                    {saving === "next" ? <Spinner aria-hidden="true" /> : null}
                    {primaryLabel}
                    {saving === "next" ? null : (
                      <ArrowRight aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <DoneView
              heading={heading}
              preview={preview}
              name={givenName.trim() || displayName}
              rows={[
                {
                  label: "Your work",
                  value: practiceSummary ?? "Not chosen",
                  step: 0,
                },
                {
                  label: "Looking for",
                  value: interestSummary ?? "Every opportunity type",
                  step: 1,
                },
                {
                  label: "Based in",
                  value:
                    [basedIn, timezone ? plainZoneName(timezone) : null]
                      .filter(Boolean)
                      .join(" · ") || "Not set",
                  step: 2,
                },
                {
                  label: "Preferences",
                  value: [
                    stageLabel ?? "Any career stage",
                    PARTICIPATION_SUMMARY[travelWillingness],
                    noFeeOnly ? "No-fee calls only" : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  step: 2,
                },
                {
                  label: "Profile",
                  value: [
                    displayName,
                    claimedHandle
                      ? `usemissa.com/@${claimedHandle.displayHandle}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  step: 3,
                },
              ]}
              onEdit={move}
            />
          )}
        </main>

        <aside
          aria-hidden={step === 3 ? undefined : true}
          className="hidden lg:block"
        >
          <div className="sticky top-16 h-[calc(100dvh-4rem)] p-4 ps-0">
            <div className="relative h-full overflow-hidden rounded-2xl bg-muted">
              <Image
                key={asideImage}
                src={asideImage}
                alt=""
                fill
                sizes="(min-width: 1024px) 40vw, 0px"
                priority={step === resumeStep}
                className="animate-in object-cover duration-300 fade-in-0 motion-reduce:animate-none"
              />
              <div className="absolute inset-x-4 bottom-4 xl:inset-x-6 xl:bottom-6">
                {step === 3 ? (
                  <ProfilePreviewCard
                    name={displayName}
                    address={publicAddress}
                    practices={practices}
                  />
                ) : step < DONE_STEP ? (
                  <OnboardingSummaryCard rows={summaryRows} />
                ) : null}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DoneView({
  heading,
  preview,
  name,
  rows,
  onEdit,
}: {
  heading: RefObject<HTMLHeadingElement | null>;
  preview: boolean;
  name: string;
  rows: { label: string; value: string; step: number }[];
  onEdit: (step: number) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-gutter pt-10 pb-section md:pt-16">
      <div className="animate-in duration-300 fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none">
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-full bg-accent-tint text-primary"
        >
          <Check className="size-5" />
        </span>
        <h1
          id="onboarding-heading"
          ref={heading}
          tabIndex={-1}
          className="mt-6 font-heading text-4xl leading-[1.05] tracking-tight text-balance outline-none md:text-5xl"
        >
          {name ? `Welcome to Missa, ${name}.` : "Welcome to Missa."}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          {preview
            ? "This is the finished setup. The design preview has not changed any account."
            : "Your choices are saved. Missa uses them to explain which opportunities fit you."}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className={buttonVariants({ className: "sm:min-w-44" })}
            href="/opportunities"
          >
            Browse opportunities
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link
            className={buttonVariants({
              variant: "outline",
              className: "sm:min-w-36",
            })}
            href="/tracker"
          >
            Open Tracker
          </Link>
        </div>

        <section aria-labelledby="summary-heading" className="mt-12">
          <div className="flex items-center justify-between gap-3">
            <h2 id="summary-heading" className="text-base font-semibold">
              Your setup
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock aria-hidden="true" className="size-3.5" />
              Only you can see this
            </span>
          </div>
          <dl className="mt-4 divide-y divide-border border-y border-border">
            {rows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto]"
              >
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="col-start-1 row-start-2 min-w-0 text-sm break-words text-foreground sm:col-start-2 sm:row-start-1">
                  {row.value}
                </dd>
                <dd className="col-start-2 row-span-2 row-start-1 sm:col-start-3 sm:row-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    onClick={() => onEdit(row.step)}
                  >
                    Edit
                    <span className="sr-only"> {row.label.toLowerCase()}</span>
                  </Button>
                </dd>
              </div>
            ))}
          </dl>
          <p className={cn("mt-4 text-sm text-muted-foreground")}>
            You can also change these in Profile at any time.
          </p>
        </section>
      </div>
    </div>
  );
}
