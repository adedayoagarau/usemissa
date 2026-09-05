"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ONBOARDING_PRACTICES,
  ONBOARDING_INTERESTS,
} from "@/lib/creatorOnboardingTaxonomy";

type OnboardingStateProps = {
  initialPractices?: string[];
  initialRefinements?: string[];
  initialInterests?: string[];
  initialStep?: number;
  initialStatus?: "not_started" | "in_progress" | "completed" | "skipped";
};

const PRACTICE_IMAGES = [
  "url(/media/onboarding-practices.png)",
];

const INTEREST_IMAGES = [
  "/media/home/artist-at-work.webp",
  "/media/home/opportunity-mountains.webp",
  "/media/creator-preview-book.png",
  "/media/home/gallery-interior.webp",
  "/media/home/opportunity-architecture.webp",
  "/media/home/portfolio-still-life.webp",
];

export function CreatorOnboarding({
  initialPractices = [],
  initialRefinements = [],
  initialInterests = [],
  initialStep = 0,
  initialStatus = "not_started",
}: OnboardingStateProps) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep >= 2 ? 0 : initialStep);
  const [practices, setPractices] = useState<string[]>(initialPractices);
  const [refinements, setRefinements] = useState<string[]>(initialRefinements);
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heading = useRef<HTMLHeadingElement>(null);

  function move(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  // Refinements map for selected practices
  const availableRefinements = ONBOARDING_PRACTICES.filter((p) =>
    practices.includes(p.label)
  ).flatMap((p) => p.refinements);

  async function handleSaveStep(nextStep: number) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/me/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: nextStep >= 2 ? "complete" : "save_step",
          step: nextStep,
          practices,
          refinements,
          interests,
          lastRoute: "/onboarding",
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save choices");
      }
      move(nextStep);
    } catch (err) {
      setError("We could not save your choices. You can continue and we will retry.");
      move(nextStep);
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    setError(null);
    try {
      await fetch("/api/me/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "skip",
          step,
          lastRoute: "/workspace",
        }),
      });
      router.push("/workspace");
    } catch {
      router.push("/workspace");
    } finally {
      setSaving(false);
    }
  }

  const currentSelected = step === 0 ? practices : interests;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-border px-6 py-5 md:px-10">
        <Link href="/opportunities" aria-label="Missa home">
          <img src="/brand/missa-wordmark-120.svg" alt="Missa" width="120" height="32" />
        </Link>
        <span className="text-xs text-muted-foreground">Your creative space · Setup</span>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-8 md:py-12">
        <section className="min-w-0 py-2" aria-label="Set up your interests">
          <div className="mb-6 flex gap-2" aria-hidden="true">
            {[0, 1].map((index) => (
              <span
                key={index}
                className={`h-1 w-12 rounded-full ${
                  step >= index ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-primary">
            {step < 2 ? `${step + 1} of 2 · Optional` : "Your space is ready"}
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
              : "Start wherever you are."}
          </h1>

          <p className="mb-8 mt-3 text-base leading-relaxed text-muted-foreground">
            {step === 0
              ? "Choose all that feel like you. Your practice doesn't have to fit in one box."
              : step === 1
              ? "Choose a few interests, or keep your options open."
              : "Your choices are saved to your private workspace. They will guide browse recommendations without becoming public."}
          </p>

          {error && (
            <div role="alert" className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
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
                      className={`group relative flex cursor-pointer flex-col items-start gap-0 overflow-hidden rounded-xl border transition-colors motion-reduce:transition-none hover:border-primary focus-within:ring-2 focus-within:ring-ring ${
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
                            backgroundImage: PRACTICE_IMAGES[0],
                            backgroundSize: "300% 200%",
                            backgroundPosition: `${(index % 3) * 50}% ${index < 3 ? 0 : 100}%`,
                          }}
                        />
                        <span className="absolute right-3 top-3 rounded-md bg-background p-2 shadow-sm">
                          <Checkbox
                            aria-label={practice.label}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              setPractices((curr) =>
                                checked ? [...curr, practice.label] : curr.filter((v) => v !== practice.label)
                              )
                            }
                          />
                        </span>
                      </div>
                      <span className="px-4 pt-3 font-medium leading-snug">{practice.label}</span>
                      <span className="px-4 pb-4 pt-1 text-xs leading-relaxed text-muted-foreground">
                        {practice.description}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {practices.length > 0 && availableRefinements.length > 0 && (
                <fieldset className="mt-6 border-t border-border pt-5">
                  <legend className="pt-2 text-sm font-medium">
                    Want to be more specific? <span className="text-muted-foreground">Optional</span>
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
                                checked ? [...curr, refinement.label] : curr.filter((v) => v !== refinement.label)
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
                Private to you. Change these anytime. You can always explore everything.
              </p>
              <p role="status" className="mt-4 text-sm text-muted-foreground">
                {practices.length ? `${practices.length} practice${practices.length > 1 ? "s" : ""} selected` : "Nothing selected yet. That’s okay."}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" onClick={handleSkip} disabled={saving}>
                  Skip setup
                </Button>
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
                      className={`group relative flex cursor-pointer flex-col items-start gap-0 overflow-hidden rounded-xl border transition-colors motion-reduce:transition-none hover:border-primary focus-within:ring-2 focus-within:ring-ring ${
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
                        <span className="absolute right-3 top-3 rounded-md bg-background p-2 shadow-sm">
                          <Checkbox
                            aria-label={interest.label}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              setInterests((curr) =>
                                checked ? [...curr, interest.label] : curr.filter((v) => v !== interest.label)
                              )
                            }
                          />
                        </span>
                      </div>
                      <span className="px-4 pt-3 font-medium leading-snug">{interest.label}</span>
                      <span className="px-4 pb-4 pt-1 text-xs leading-relaxed text-muted-foreground">
                        {interest.description}
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                Private to you. Powers browse defaults and matching explanations.
              </p>
              <p role="status" className="mt-4 text-sm text-muted-foreground">
                {interests.length ? `${interests.length} interest${interests.length > 1 ? "s" : ""} selected` : "Open to all opportunity types."}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => move(0)} disabled={saving}>
                  <ArrowLeft aria-hidden="true" />
                  Back
                </Button>
                <Button onClick={() => handleSaveStep(2)} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save & finish
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>

              <div className="mt-4">
                <Button variant="ghost" onClick={handleSkip} disabled={saving} className="text-muted-foreground">
                  Skip setup
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
                <p className="mb-3 flex items-center gap-2 font-medium text-foreground">
                  <Check className="size-4 text-primary" aria-hidden="true" />
                  Your declared preferences
                </p>
                <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Practices:</strong>{" "}
                    {practices.length
                      ? [...practices, ...refinements].join(" · ")
                      : "Open to all creative practices"}
                  </p>
                  <p>
                    <strong className="text-foreground">Opportunities:</strong>{" "}
                    {interests.length ? interests.join(" · ") : "Open to all opportunity types"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="mt-4" onClick={() => move(0)}>
                  Edit choices
                </Button>
              </div>

              <div className="space-y-3">
                <Link
                  className={buttonVariants({ className: "w-full" })}
                  href="/workspace"
                >
                  Enter your workspace
                  <ArrowRight aria-hidden="true" />
                </Link>
                <Link
                  className={buttonVariants({ variant: "outline", className: "w-full" })}
                  href="/opportunities"
                >
                  Explore matching opportunities
                </Link>
              </div>

              <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
                These preferences are private to you and editable anytime in your profile or workspace.
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
