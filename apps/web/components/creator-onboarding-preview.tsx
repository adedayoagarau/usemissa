"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const practices = [
  "Writing",
  "Visual arts",
  "Music & sound",
  "Film & moving image",
  "Performance",
  "Design & craft",
];

const descriptions = [
  "Poetry, fiction, essays & more",
  "Painting, photography & beyond",
  "Composition, recordings & sound",
  "Cinema, animation & video",
  "Theatre, dance & live work",
  "Objects, spaces & visual design",
];
const goalDescriptions = [
  "Support to bring ideas to life",
  "A residency with room to make work",
  "Find a home for your work",
  "Share your work with an audience",
  "Recognition and room to grow",
  "Find paid opportunities for your work",
];
const interests = [
  "Grants & funding",
  "Residencies",
  "Publication opportunities",
  "Exhibitions & commissions",
  "Fellowships & awards",
  "Jobs & paid projects",
];

export function CreatorOnboardingPreview() {
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [details, setDetails] = useState<string[]>([]);
  const refinements: Record<string, string[]> = {
    Writing: ["Poetry", "Fiction", "Essays"],
    "Visual arts": ["Painting", "Photography", "Sculpture"],
    "Music & sound": ["Composition", "Sound art", "Music production"],
    "Film & moving image": ["Documentary", "Animation", "Narrative film"],
    Performance: ["Dance", "Theatre", "Live art"],
    "Design & craft": ["Ceramics", "Textiles", "Graphic design"],
  };
  const heading = useRef<HTMLHeadingElement>(null);
  function move(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }
  const options = step === 0 ? practices : interests;
  const selected = step === 0 ? fields : goals;
  const update = step === 0 ? setFields : setGoals;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-border px-6 py-5 md:px-10">
        <Link href="/opportunities" aria-label="Missa home">
          <Image
            src="/brand/missa-wordmark-120.svg"
            alt="Missa"
            width={120}
            height={32}
          />
        </Link>
        <span className="text-xs text-muted-foreground">
          Your creative space · Design preview
        </span>
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-8 md:py-12">
        <section className="min-w-0 py-2" aria-label="Set up your interests">
          <div className="mb-6 flex gap-2" aria-hidden="true">
            {[0, 1].map((index) => (
              <span
                key={index}
                className={`h-1 w-12 rounded-full ${step >= index ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="mb-4 text-xs font-medium tracking-widest text-primary uppercase">
            {step < 2 ? `${step + 1} of 2 · Optional` : "Your next step"}
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
          <p className="mt-3 mb-8 text-base leading-relaxed text-muted-foreground">
            {step === 0
              ? "Choose every medium that fits your work; your path can span more than one discipline."
              : step === 1
                ? "Choose a few interests, or keep your options open."
                : "You don’t need a finished portfolio to find your next opportunity."}
          </p>
          {step < 2 ? (
            <>
              <fieldset className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <legend className="sr-only">
                  {step === 0 ? "What you make" : "What you want next"}
                </legend>
                {options.map((option, index) => {
                  return (
                    <label
                      key={option}
                      className={`group relative flex cursor-pointer flex-col items-start gap-0 overflow-hidden rounded-xl border transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-primary motion-reduce:transition-none ${selected.includes(option) ? "border-primary bg-accent text-accent-foreground" : "border-border bg-background"}`}
                    >
                      <div className="relative w-full">
                        <div
                          aria-hidden="true"
                          className="aspect-square w-full bg-cover"
                          style={{
                            backgroundImage:
                              step === 0
                                ? "url(/media/onboarding-practices.png)"
                                : `url(${["/media/home/artist-at-work.webp", "/media/home/opportunity-mountains.webp", "/media/creator-preview-book.png", "/media/home/gallery-interior.webp", "/media/home/opportunity-architecture.webp", "/media/home/portfolio-still-life.webp"][index]})`,
                            backgroundSize: step === 0 ? "300% 200%" : "cover",
                            backgroundPosition:
                              step === 0
                                ? `${(index % 3) * 50}% ${index < 3 ? 0 : 100}%`
                                : "center",
                          }}
                        />
                        <span className="absolute top-3 right-3 rounded-md bg-background p-2">
                          <Checkbox
                            aria-label={option}
                            checked={selected.includes(option)}
                            onCheckedChange={(checked) =>
                              update((current) =>
                                checked
                                  ? [...current, option]
                                  : current.filter((value) => value !== option),
                              )
                            }
                          />
                        </span>
                      </div>

                      <span className="px-4 pt-3 leading-snug font-medium">
                        {option}
                      </span>
                      <span className="px-4 pt-1 pb-4 text-xs leading-relaxed text-muted-foreground">
                        {(step === 0 ? descriptions : goalDescriptions)[index]}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              {step === 0 && fields.length > 0 && (
                <fieldset className="mt-6 border-t border-border pt-5">
                  <legend className="pt-5 text-sm font-medium">
                    Want to be more specific?{" "}
                    <span className="text-muted-foreground">Optional</span>
                  </legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {fields
                      .flatMap((field) => refinements[field] ?? [])
                      .map((detail) => (
                        <label
                          key={detail}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <Checkbox
                            checked={details.includes(detail)}
                            onCheckedChange={(checked) =>
                              setDetails((current) =>
                                checked
                                  ? [...current, detail]
                                  : current.filter((value) => value !== detail),
                              )
                            }
                          />
                          {detail}
                        </label>
                      ))}
                  </div>
                </fieldset>
              )}
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                Private to you. Change these anytime. You can always explore
                everything.
              </p>
              <p role="status" className="mt-4 text-sm text-muted-foreground">
                {selected.length
                  ? `${selected.length} selected`
                  : "Nothing selected yet. That’s okay."}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                {step > 0 ? (
                  <Button variant="ghost" onClick={() => move(step - 1)}>
                    <ArrowLeft aria-hidden="true" />
                    Back
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={() => move(2)}>
                    Skip setup
                  </Button>
                )}
                <Button onClick={() => move(step + 1)}>
                  {selected.length ? "Continue" : "Decide later"}
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
              {step > 0 && (
                <Button
                  className="mt-4"
                  variant="ghost"
                  onClick={() => move(2)}
                >
                  Skip setup
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="mb-6 rounded-lg border border-border p-5">
                <p className="mb-3 flex items-center gap-2 font-medium">
                  <Check className="size-4 text-primary" aria-hidden="true" />
                  Your choices
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {fields.length
                    ? [
                        ...fields,
                        ...details.filter((detail) =>
                          fields.some((field) =>
                            refinements[field]?.includes(detail),
                          ),
                        ),
                      ].join(" · ")
                    : "All disciplines"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {goals.length
                    ? goals.join(" · ")
                    : "Open to all opportunities"}
                </p>
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => move(0)}
                >
                  Edit choices
                </Button>
              </div>
              <Link
                className={buttonVariants({ className: "w-full" })}
                href="/opportunities"
              >
                Explore opportunities
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                className={buttonVariants({
                  variant: "outline",
                  className: "mt-3 w-full",
                })}
                href="/design-system/creator-profile-settings"
              >
                Explore the portfolio editor
              </Link>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                This is an interactive design preview. Choices are not saved to
                your account or used to filter results yet.
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
