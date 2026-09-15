"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { UserHandle } from "@missa/radar-adapters";
import { CANONICAL_COUNTRIES } from "@missa/contracts";
import { MissaWordmark } from "@/components/missa-wordmark";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { signupIdentity, suggestedHandle } from "@/lib/signupIdentity";
import {
  ONBOARDING_PRACTICES,
  ONBOARDING_INTERESTS,
} from "@/lib/creatorOnboardingTaxonomy";

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
  initialStatus?: "not_started" | "in_progress" | "completed" | "skipped";
};

const PRACTICE_IMAGES = ["url(/media/onboarding-practices.webp)"];

const INTEREST_IMAGES = [
  "/media/home/artist-at-work.webp",
  "/media/home/opportunity-mountains.webp",
  "/media/creator-preview-book.webp",
  "/media/home/gallery-interior.webp",
  "/media/home/opportunity-architecture.webp",
  "/media/home/portfolio-still-life.webp",
];

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
  const [step, setStep] = useState(
    initialStatus === "completed" || initialStatus === "skipped"
      ? 4
      : Math.min(4, Math.max(0, initialStep)),
  );
  const [practices, setPractices] = useState<string[]>(initialPractices);
  const [refinements, setRefinements] = useState<string[]>(initialRefinements);
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [givenName, setGivenName] = useState(initialGivenName);
  const [familyName, setFamilyName] = useState(initialFamilyName);
  const [usesSingleName, setUsesSingleName] = useState(initialUsesSingleName);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [city, setCity] = useState(initialCity);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [careerStage, setCareerStage] = useState(initialCareerStage);
  const [travelWillingness, setTravelWillingness] = useState(
    initialTravelWillingness,
  );
  const [noFeeOnly, setNoFeeOnly] = useState(initialNoFeeOnly);
  const [handleValue, setHandleValue] = useState(
    initialHandle?.displayHandle ?? suggestedHandle(initialDisplayName),
  );
  const [claimedHandle, setClaimedHandle] = useState(initialHandle);
  const [handleStatus, setHandleStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heading = useRef<HTMLHeadingElement>(null);
  const identity = signupIdentity({ givenName, familyName, usesSingleName });
  const displayName =
    "field" in identity ? initialDisplayName : identity.displayName;
  const countryOptions = Object.entries(CANONICAL_COUNTRIES)
    .filter(([code]) => code !== "GLOBAL")
    .sort(([, left], [, right]) => left.localeCompare(right));

  function move(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  // Refinements map for selected practices
  const availableRefinements = ONBOARDING_PRACTICES.filter((p) =>
    practices.includes(p.label),
  ).flatMap((p) => p.refinements);

  const normalizedHandle = handleValue.trim().toLowerCase().replace(/^@/u, "");
  const handleIsValid = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/u.test(
    normalizedHandle,
  );

  useEffect(() => {
    if (timezone) return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    queueMicrotask(() => setTimezone(detected));
  }, [timezone]);

  useEffect(() => {
    if (preview || claimedHandle || !handleClaimingOpen || !handleIsValid) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setHandleStatus("Checking this address…");
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
        setHandleStatus(
          result.available
            ? `@${normalizedHandle} is available.`
            : `@${normalizedHandle} is already in use.`,
        );
      } catch (problem) {
        if (controller.signal.aborted) return;
        setHandleStatus(
          problem instanceof Error && problem.message
            ? problem.message
            : "We could not check this address. Try again.",
        );
      }
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    claimedHandle,
    handleClaimingOpen,
    handleIsValid,
    normalizedHandle,
    preview,
  ]);

  async function handleSaveStep(nextStep: number) {
    if (preview) {
      move(nextStep);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/me/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: nextStep >= 4 ? "complete" : "save_step",
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
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => undefined)) as
          { error?: string } | undefined;
        throw new Error(
          payload?.error ?? "We could not save your choices. Please try again.",
        );
      }
      move(nextStep);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "We could not save your choices. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveIdentityAndFinish() {
    if ("field" in identity) {
      setError(identity.message);
      return;
    }
    if (!countryCode || !timezone) {
      setError("Add your country and time zone before finishing setup.");
      return;
    }
    if (
      !preview &&
      !claimedHandle &&
      handleClaimingOpen &&
      (!normalizedHandle || !handleIsValid)
    ) {
      setError("Use 3–30 letters, numbers, or hyphens for your Missa address.");
      return;
    }
    if (
      !preview &&
      !claimedHandle &&
      handleClaimingOpen &&
      handleStatus !== `@${normalizedHandle} is available.`
    ) {
      setError(
        handleStatus.includes("already in use")
          ? "Choose an available Missa address."
          : "Wait while Missa checks this address, then finish setup.",
      );
      return;
    }
    if (preview) {
      if (normalizedHandle) {
        setClaimedHandle({
          handleKey: normalizedHandle,
          displayHandle: normalizedHandle,
          state: "claimed",
          claimedAt: new Date().toISOString(),
        });
      }
      move(4);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (!claimedHandle && normalizedHandle) {
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
            result.error ?? "We could not hold this Missa address.",
          );
        }
        setClaimedHandle(result.handle);
      }

      await handleSaveStep(4);
    } catch (problem) {
      setError(
        problem instanceof Error
          ? problem.message
          : "We could not finish setting up your account. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-border px-6 py-5 md:px-10">
        <MissaWordmark href="/" size="app" />
        <span className="text-xs text-muted-foreground">Account setup</span>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-8 md:py-12">
        <section
          className="min-w-0 py-2"
          aria-label="Set up your Missa account"
        >
          <div className="mb-6 flex gap-2" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={`h-1 w-12 rounded-full ${
                  step >= index ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <p className="mb-4 text-xs font-medium tracking-widest text-primary uppercase">
            {step < 4 ? `${step + 1} of 4` : "Account ready"}
          </p>

          <h1
            ref={heading}
            tabIndex={-1}
            className="font-heading text-4xl leading-tight tracking-tight outline-none md:text-5xl"
          >
            {step === 0
              ? "What do you make?"
              : step === 1
                ? "What are you looking for?"
                : step === 2
                  ? "Where are you based?"
                  : step === 3
                    ? "Choose your Missa address."
                    : "You’re ready to explore."}
          </h1>

          <p className="mt-3 mb-8 text-base leading-relaxed text-muted-foreground">
            {step === 0
              ? "Choose the kinds of work you make. You can change these choices later."
              : step === 1
                ? "Choose the opportunity types you want to see first. You can still browse everything."
                : step === 2
                  ? "Your location and preferences help Missa explain which opportunities may fit. These details stay private."
                  : step === 3
                    ? "Confirm your name and choose the address people can use to find your Profile. Nothing is public until you publish it."
                    : preview
                      ? "This is the completed setup state. The design preview has not changed your account."
                      : "Your choices have been saved. You can change them in Profile at any time."}
          </p>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {step === 0 && (
            <>
              <fieldset className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <legend className="sr-only">Creative practices</legend>
                {ONBOARDING_PRACTICES.map((practice, index) => {
                  const isSelected = practices.includes(practice.label);
                  return (
                    <label
                      key={practice.label}
                      className={`group relative flex cursor-pointer flex-col items-start gap-0 overflow-hidden rounded-xl border transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary motion-reduce:transition-none ${
                        isSelected
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="relative w-full">
                        <div
                          aria-hidden="true"
                          className="aspect-[4/3] w-full bg-cover sm:aspect-square"
                          style={{
                            backgroundImage: PRACTICE_IMAGES[0],
                            backgroundSize: "300% 200%",
                            backgroundPosition: `${(index % 3) * 50}% ${index < 3 ? 0 : 100}%`,
                          }}
                        />
                        <span className="absolute top-3 right-3 rounded-md bg-background p-2 shadow-sm">
                          <Checkbox
                            aria-label={practice.label}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              setPractices((curr) =>
                                checked
                                  ? [...curr, practice.label]
                                  : curr.filter((v) => v !== practice.label),
                              )
                            }
                          />
                        </span>
                      </div>
                      <span className="px-4 pt-3 leading-snug font-medium">
                        {practice.label}
                      </span>
                      <span className="px-4 pt-1 pb-4 text-xs leading-relaxed text-muted-foreground">
                        {practice.description}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {practices.length > 0 && availableRefinements.length > 0 && (
                <fieldset className="mt-6 border-t border-border pt-5">
                  <legend className="pt-2 text-sm font-medium">
                    Want to be more specific?{" "}
                    <span className="text-muted-foreground">Optional</span>
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableRefinements.map((refinement) => {
                      const isChecked = refinements.includes(refinement.label);
                      return (
                        <label
                          key={refinement.termId}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            isChecked
                              ? "border-primary bg-accent text-accent-foreground"
                              : "border-border bg-background"
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              setRefinements((curr) =>
                                checked
                                  ? [...curr, refinement.label]
                                  : curr.filter((v) => v !== refinement.label),
                              )
                            }
                          />
                          {refinement.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                These choices are private, and you can change them at any time.
              </p>
              <p role="status" className="mt-4 text-sm text-muted-foreground">
                {practices.length
                  ? `You selected ${practices.length} option${practices.length > 1 ? "s" : ""}.`
                  : "You have not selected anything yet."}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
                <Button onClick={() => handleSaveStep(1)} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {practices.length ? "Continue" : "Decide later"}
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <fieldset className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <legend className="sr-only">Opportunity interests</legend>
                {ONBOARDING_INTERESTS.map((interest, index) => {
                  const isSelected = interests.includes(interest.label);
                  return (
                    <label
                      key={interest.label}
                      className={`group relative flex cursor-pointer flex-col items-start gap-0 overflow-hidden rounded-xl border transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary motion-reduce:transition-none ${
                        isSelected
                          ? "border-primary bg-accent text-accent-foreground"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="relative w-full">
                        <div
                          aria-hidden="true"
                          className="aspect-square w-full bg-cover"
                          style={{
                            backgroundImage: `url(${INTEREST_IMAGES[index]})`,
                            backgroundPosition: "center",
                          }}
                        />
                        <span className="absolute top-3 right-3 rounded-md bg-background p-2 shadow-sm">
                          <Checkbox
                            aria-label={interest.label}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              setInterests((curr) =>
                                checked
                                  ? [...curr, interest.label]
                                  : curr.filter((v) => v !== interest.label),
                              )
                            }
                          />
                        </span>
                      </div>
                      <span className="px-4 pt-3 leading-snug font-medium">
                        {interest.label}
                      </span>
                      <span className="px-4 pt-1 pb-4 text-xs leading-relaxed text-muted-foreground">
                        {interest.description}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                These choices are private and will shape what Missa shows you
                first.
              </p>
              <p role="status" className="mt-4 text-sm text-muted-foreground">
                {interests.length
                  ? `You selected ${interests.length} opportunity type${interests.length > 1 ? "s" : ""}.`
                  : "Missa will show you every opportunity type."}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={() => move(0)}
                  disabled={saving}
                >
                  <ArrowLeft aria-hidden="true" />
                  Back
                </Button>
                <Button onClick={() => handleSaveStep(2)} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save and continue
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-6 border-y border-border py-8 md:grid-cols-2 md:gap-8">
                <div className="space-y-2">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="onboarding-country"
                  >
                    Country
                  </label>
                  <NativeSelect
                    id="onboarding-country"
                    className="w-full [&_select]:h-11"
                    value={countryCode}
                    onChange={(event) => setCountryCode(event.target.value)}
                    required
                  >
                    <NativeSelectOption value="">
                      Choose your country
                    </NativeSelectOption>
                    {countryOptions.map(([code, name]) => (
                      <NativeSelectOption key={code} value={code}>
                        {name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Missa uses your country to explain location rules. It is
                    private by default.
                  </p>
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="onboarding-city"
                  >
                    City{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <Input
                    id="onboarding-city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    autoComplete="address-level2"
                    maxLength={120}
                    placeholder="Lagos"
                  />
                  <p className="text-sm leading-6 text-muted-foreground">
                    Add your city if you want Missa to surface nearby
                    opportunities.
                  </p>
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="onboarding-timezone"
                  >
                    Time zone
                  </label>
                  <Input
                    id="onboarding-timezone"
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    maxLength={80}
                    placeholder="Africa/Lagos"
                    required
                  />
                  <p className="text-sm leading-6 text-muted-foreground">
                    We use this to show deadlines and reminders at the right
                    local time.
                  </p>
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="onboarding-career-stage"
                  >
                    Career stage
                  </label>
                  <NativeSelect
                    id="onboarding-career-stage"
                    className="w-full [&_select]:h-11"
                    value={careerStage}
                    onChange={(event) => setCareerStage(event.target.value)}
                  >
                    <NativeSelectOption value="any">
                      I do not want to narrow this
                    </NativeSelectOption>
                    <NativeSelectOption value="student">
                      Student
                    </NativeSelectOption>
                    <NativeSelectOption value="emerging">
                      Early career
                    </NativeSelectOption>
                    <NativeSelectOption value="mid-career">
                      Mid-career
                    </NativeSelectOption>
                    <NativeSelectOption value="established">
                      Established
                    </NativeSelectOption>
                  </NativeSelect>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Choose the description that best matches where you are now.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="onboarding-travel"
                  >
                    How can you take part?
                  </label>
                  <NativeSelect
                    id="onboarding-travel"
                    className="w-full [&_select]:h-11"
                    value={travelWillingness}
                    onChange={(event) =>
                      setTravelWillingness(event.target.value)
                    }
                  >
                    <NativeSelectOption value="any">
                      In person or online
                    </NativeSelectOption>
                    <NativeSelectOption value="remote-only">
                      Online only
                    </NativeSelectOption>
                    <NativeSelectOption value="willing-to-travel">
                      I can travel
                    </NativeSelectOption>
                    <NativeSelectOption value="local-only">
                      Near where I live
                    </NativeSelectOption>
                  </NativeSelect>
                </div>
                <label className="flex min-h-11 items-center gap-3 text-sm md:col-span-2">
                  <Checkbox
                    checked={noFeeOnly}
                    onCheckedChange={(checked) =>
                      setNoFeeOnly(checked === true)
                    }
                  />
                  Only show me opportunities with no application fee.
                </label>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={() => move(1)}
                  disabled={saving}
                >
                  <ArrowLeft aria-hidden="true" />
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (!countryCode || !timezone) {
                      setError("Add your country and time zone to continue.");
                      return;
                    }
                    void handleSaveStep(3);
                  }}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save and continue
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-8 border-y border-border py-8 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] md:gap-12">
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        className="text-sm font-semibold"
                        htmlFor="onboarding-given-name"
                      >
                        Given name
                      </label>
                      <Input
                        id="onboarding-given-name"
                        value={givenName}
                        onChange={(event) => setGivenName(event.target.value)}
                        maxLength={80}
                        autoComplete="given-name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-sm font-semibold"
                        htmlFor="onboarding-family-name"
                      >
                        Family name
                      </label>
                      <Input
                        id="onboarding-family-name"
                        value={familyName}
                        onChange={(event) => setFamilyName(event.target.value)}
                        maxLength={80}
                        autoComplete="family-name"
                        disabled={usesSingleName}
                        required={!usesSingleName}
                      />
                    </div>
                    <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
                      <Checkbox
                        checked={usesSingleName}
                        onCheckedChange={(checked) => {
                          const next = checked === true;
                          setUsesSingleName(next);
                          if (next) setFamilyName("");
                        }}
                      />
                      I use one name.
                    </label>
                    <p className="text-sm leading-6 text-muted-foreground sm:col-span-2">
                      {`Your Missa name is ${displayName || "shown here after you enter it"}.`}
                    </p>
                  </div>

                  {claimedHandle ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">
                        Your Missa address
                      </p>
                      <p className="font-data text-base text-foreground">
                        usemissa.com/@{claimedHandle.displayHandle}
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Your Profile remains private until you publish it. You
                        can rename this address in Profile after 30 days.
                      </p>
                    </div>
                  ) : handleNamespaceReady && handleClaimingOpen ? (
                    <div className="space-y-2">
                      <label
                        className="text-sm font-semibold"
                        htmlFor="onboarding-handle"
                      >
                        Missa address
                      </label>
                      <Input
                        id="onboarding-handle"
                        value={handleValue}
                        onChange={(event) => {
                          setHandleValue(
                            event.target.value.toLowerCase().replace(/^@/u, ""),
                          );
                          setHandleStatus("");
                        }}
                        maxLength={30}
                        autoCapitalize="none"
                        autoCorrect="off"
                        aria-describedby="onboarding-handle-help onboarding-handle-status"
                        placeholder="yourname"
                      />
                      <p
                        id="onboarding-handle-help"
                        className="text-sm leading-6 text-muted-foreground"
                      >
                        We suggested an address from your name. Keep it or
                        choose another using 3–30 letters, numbers, or hyphens.
                      </p>
                      <p
                        id="onboarding-handle-status"
                        role="status"
                        className="text-sm leading-6 text-muted-foreground"
                      >
                        {normalizedHandle && !handleIsValid
                          ? "The address must start and end with a letter or number."
                          : handleStatus}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground">
                      Public Missa addresses are not available for this account
                      yet. You can choose one later in Profile.
                    </p>
                  )}
                </div>

                <aside
                  className="border-s border-border ps-6 md:ps-8"
                  aria-label="Profile address preview"
                >
                  <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Your Profile
                  </p>
                  <p className="mt-4 font-heading text-3xl leading-tight text-foreground">
                    {displayName.trim() || "Your name"}
                  </p>
                  <p className="font-data mt-2 text-sm text-primary">
                    usemissa.com/@
                    {claimedHandle?.displayHandle ||
                      normalizedHandle ||
                      "yourname"}
                  </p>
                  <p className="mt-6 text-sm leading-6 text-muted-foreground">
                    Nothing becomes public until you review and publish your
                    Profile.
                  </p>
                </aside>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={() => move(2)}
                  disabled={saving}
                >
                  <ArrowLeft aria-hidden="true" />
                  Back
                </Button>
                <Button
                  onClick={saveIdentityAndFinish}
                  disabled={
                    saving ||
                    "field" in identity ||
                    !countryCode ||
                    !timezone ||
                    (!preview &&
                      !claimedHandle &&
                      handleClaimingOpen &&
                      handleStatus !== `@${normalizedHandle} is available.`)
                  }
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Finish setup
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
                <p className="mb-3 flex items-center gap-2 font-medium text-foreground">
                  <Check className="size-4 text-primary" aria-hidden="true" />
                  {preview
                    ? "This is the completed setup preview."
                    : "Your account setup is complete."}
                </p>
                <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Name:</strong>{" "}
                    {displayName.trim() || initialDisplayName}
                  </p>
                  {claimedHandle ? (
                    <p>
                      <strong className="text-foreground">
                        Missa address:
                      </strong>{" "}
                      usemissa.com/@{claimedHandle.displayHandle}
                    </p>
                  ) : null}
                  <p>
                    <strong className="text-foreground">Your work:</strong>{" "}
                    {practices.length
                      ? [...practices, ...refinements].join(" · ")
                      : "You did not select any work types."}
                  </p>
                  <p>
                    <strong className="text-foreground">Opportunities:</strong>{" "}
                    {interests.length
                      ? interests.join(" · ")
                      : "Missa will show every opportunity type."}
                  </p>
                  <p>
                    <strong className="text-foreground">Location:</strong>{" "}
                    {[city, CANONICAL_COUNTRIES[countryCode]]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p>
                    <strong className="text-foreground">Participation:</strong>{" "}
                    {travelWillingness === "remote-only"
                      ? "Online only"
                      : travelWillingness === "willing-to-travel"
                        ? "Open to travel"
                        : travelWillingness === "local-only"
                          ? "Near where you live"
                          : "In person or online"}
                  </p>
                  {noFeeOnly ? (
                    <p>
                      <strong className="text-foreground">
                        Application fees:
                      </strong>{" "}
                      No-fee opportunities only
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4"
                  onClick={() => move(0)}
                >
                  Edit choices
                </Button>
              </div>

              <div className="space-y-3">
                <Link
                  className={buttonVariants({ className: "w-full" })}
                  href="/tracker"
                >
                  Open Tracker
                  <ArrowRight aria-hidden="true" />
                </Link>
                <Link
                  className={buttonVariants({
                    variant: "outline",
                    className: "w-full",
                  })}
                  href="/opportunities"
                >
                  Browse opportunities
                </Link>
              </div>

              <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                {preview
                  ? "This preview does not save any changes to your account."
                  : "These preferences are private to you, and you can edit them in Profile or Tracker."}
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
