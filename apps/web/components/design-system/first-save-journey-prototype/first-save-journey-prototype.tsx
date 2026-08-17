"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Globe2,
  Info,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";

import { MissaWordmark } from "@/components/missa-wordmark";
import styles from "./first-save-journey-prototype.module.css";

type AuthMode = "signup" | "login";
type Stage =
  | "public"
  | "auth-choice"
  | "signup"
  | "login"
  | "existing-account"
  | "auth-error"
  | "revalidating"
  | "changed"
  | "blocked"
  | "ambiguous"
  | "saved"
  | "already-saved"
  | "tracker"
  | "first-action-completed"
  | "guidance-dismissed";

type ScenarioId =
  | "new-account"
  | "returning-account"
  | "existing-email"
  | "invalid-credentials"
  | "deadline-changed"
  | "opportunity-closed"
  | "response-lost"
  | "duplicate-save"
  | "cross-device"
  | "decline-signup"
  | "already-authenticated";

type Scenario = {
  id: ScenarioId;
  label: string;
  description: string;
  initialMode: AuthMode;
};

const scenarios: Scenario[] = [
  {
    id: "new-account",
    label: "New customer · signup",
    description: "Signed-out visitor creates an account, then saves.",
    initialMode: "signup",
  },
  {
    id: "returning-account",
    label: "Returning customer · login",
    description:
      "Signed-out customer logs in and returns to the same Opportunity.",
    initialMode: "login",
  },
  {
    id: "existing-email",
    label: "Existing email",
    description: "Signup safely moves to Login without losing the intent.",
    initialMode: "signup",
  },
  {
    id: "invalid-credentials",
    label: "Incorrect credentials",
    description: "Login fails without consuming the Save intent.",
    initialMode: "login",
  },
  {
    id: "deadline-changed",
    label: "Deadline changed",
    description: "A material change must be reviewed before Save continues.",
    initialMode: "signup",
  },
  {
    id: "opportunity-closed",
    label: "Opportunity closed",
    description: "Revalidation blocks a misleading active Tracker item.",
    initialMode: "login",
  },
  {
    id: "response-lost",
    label: "Save response lost",
    description:
      "The write may have succeeded; canonical state resolves the ambiguity.",
    initialMode: "login",
  },
  {
    id: "duplicate-save",
    label: "Saved twice",
    description: "Create-or-get returns the existing private Tracker item.",
    initialMode: "login",
  },
  {
    id: "cross-device",
    label: "Resume on another device",
    description: "An authenticated account resumes a bound, unexpired intent.",
    initialMode: "login",
  },
  {
    id: "decline-signup",
    label: "Decline signup",
    description:
      "Public reading remains available and no repeated obstruction appears.",
    initialMode: "signup",
  },
  {
    id: "already-authenticated",
    label: "Already authenticated",
    description:
      "Save proceeds directly to revalidation without an interstitial.",
    initialMode: "login",
  },
];

const stateLabels: Record<Stage, string> = {
  public: "opportunity_viewed",
  "auth-choice": "authentication_required",
  signup: "authentication_in_progress · signup",
  login: "authentication_in_progress · login",
  "existing-account": "authentication_in_progress · existing account",
  "auth-error": "authentication_in_progress · error",
  revalidating: "intent_revalidating",
  changed: "material_change_requires_review",
  blocked: "save_blocked",
  ambiguous: "journey_recovered · pending reconciliation",
  saved: "tracker_item_created",
  "already-saved": "already_saved",
  tracker: "next_action_presented",
  "first-action-completed": "first_action_completed",
  "guidance-dismissed": "guidance_dismissed",
};

const opportunity = {
  title: "Open Call: New Ecologies Fellowship",
  organization: "Field Assembly",
  status: "Open",
  deadline: "18 September 2026, 17:00 Europe/London",
  localDeadline: "18 September 2026, 09:00 America/Los_Angeles",
  fee: "No application fee",
  location: "International · remote preparation",
  source: "fieldassembly.org",
};

type JourneyActions = {
  chooseAuth: (mode: AuthMode) => void;
  submitAuth: (mode: AuthMode) => void;
  startSave: () => void;
  keepReading: () => void;
  advanceRevalidation: () => void;
  continueAfterChange: () => void;
  reconcile: () => void;
  openTracker: () => void;
  completeFirstAction: () => void;
  dismissGuidance: () => void;
  showGuidance: () => void;
  reset: () => void;
};

function OpportunityFacts({ compact = false }: { compact?: boolean }) {
  return (
    <dl className={compact ? styles.factsCompact : styles.facts}>
      <div>
        <dt>
          <CalendarClock aria-hidden="true" /> Deadline
        </dt>
        <dd>{opportunity.deadline}</dd>
        <dd className={styles.factDetail}>
          Your time: {opportunity.localDeadline}
        </dd>
      </div>
      <div>
        <dt>
          <Tag aria-hidden="true" /> Fee
        </dt>
        <dd>{opportunity.fee}</dd>
      </div>
      <div>
        <dt>
          <Globe2 aria-hidden="true" /> Availability
        </dt>
        <dd>{opportunity.location}</dd>
      </div>
    </dl>
  );
}

function PublicReading({ onSave }: { onSave: () => void }) {
  return (
    <article
      className={styles.opportunityReading}
      aria-labelledby="opportunity-title"
    >
      <div className={styles.sourceLine}>
        <span>
          <CheckCircle2 aria-hidden="true" /> Current public record
        </span>
        <a href="#prototype-source">
          Official source <ExternalLink aria-hidden="true" />
        </a>
      </div>
      <p className={styles.eyebrow}>Fellowship · public Opportunity</p>
      <h1 id="opportunity-title">{opportunity.title}</h1>
      <p className={styles.organization}>{opportunity.organization}</p>
      <p className={styles.summary}>
        A six-month fellowship for artists and writers developing work about
        land, climate, and civic life. Review the source before deciding whether
        its requirements apply to you.
      </p>
      <OpportunityFacts />
      <section
        className={styles.readingSection}
        aria-labelledby="eligibility-title"
      >
        <h2 id="eligibility-title">Eligibility and requirements</h2>
        <p>
          Open internationally to adult applicants working independently or
          collaboratively. Residency and travel requirements are not stated in
          the source record and remain unknown.
        </p>
      </section>
      <div className={styles.publicActions}>
        <button type="button" className={styles.primaryButton} onClick={onSave}>
          <Bookmark aria-hidden="true" /> Save opportunity
        </button>
        <a
          id="prototype-source"
          className={styles.secondaryButton}
          href="#opportunity-title"
        >
          Open official source <ExternalLink aria-hidden="true" />
        </a>
      </div>
      <p className={styles.boundaryCopy}>
        Saving creates a private Tracker item. It does not apply or confirm
        eligibility.
      </p>
    </article>
  );
}

function PasswordField({
  id,
  label,
  autocomplete,
}: {
  id: string;
  label: string;
  autocomplete: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} type="password" autoComplete={autocomplete} />
    </div>
  );
}

function JourneyContent({
  stage,
  scenario,
  email,
  onEmail,
  actions,
  headingRef,
}: {
  stage: Stage;
  scenario: Scenario;
  email: string;
  onEmail: (email: string) => void;
  actions: JourneyActions;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  function submit(event: FormEvent<HTMLFormElement>, mode: AuthMode) {
    event.preventDefault();
    actions.submitAuth(mode);
  }

  if (stage === "auth-choice") {
    return (
      <section
        className={styles.journeyContent}
        aria-labelledby="journey-heading"
      >
        <LockKeyhole className={styles.stateIcon} aria-hidden="true" />
        <p className={styles.eyebrow}>Private persistence</p>
        <h1 id="journey-heading" ref={headingRef} tabIndex={-1}>
          Save this Opportunity privately
        </h1>
        <p>
          Create an account or log in to keep{" "}
          <strong>{opportunity.title}</strong> in Tracker. Saving does not apply
          or send anything to {opportunity.organization}.
        </p>
        <div className={styles.actionStack}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => actions.chooseAuth("signup")}
          >
            Create account <ArrowRight aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => actions.chooseAuth("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={styles.textButton}
            onClick={actions.keepReading}
          >
            Keep reading
          </button>
        </div>
        <p className={styles.privateNote}>
          <ShieldCheck aria-hidden="true" /> Only you can see the resulting
          Tracker item. It is not part of your public Profile.
        </p>
      </section>
    );
  }

  if (stage === "signup" || stage === "login" || stage === "auth-error") {
    const mode: AuthMode = stage === "signup" ? "signup" : "login";
    const invalid = stage === "auth-error";
    return (
      <section
        className={styles.journeyContent}
        aria-labelledby="journey-heading"
      >
        <p className={styles.eyebrow}>
          {mode === "signup" ? "New account" : "Existing account"}
        </p>
        <h1 id="journey-heading" ref={headingRef} tabIndex={-1}>
          {mode === "signup"
            ? "Create an account to save this Opportunity"
            : "Log in to save this Opportunity"}
        </h1>
        <p>
          After authentication, Missa will return here and check the current
          Opportunity details before saving.
        </p>
        {invalid ? (
          <div className={styles.errorNotice} role="alert">
            <AlertTriangle aria-hidden="true" />
            <div>
              <strong>Invalid email or password</strong>
              <span>
                Your Save request is still available. Check the fields and try
                again.
              </span>
            </div>
          </div>
        ) : null}
        <form
          className={styles.authForm}
          onSubmit={(event) => submit(event, mode)}
          noValidate
        >
          <div className={styles.field}>
            <label htmlFor={`${mode}-email`}>Email address</label>
            <input
              id={`${mode}-email`}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => onEmail(event.target.value)}
            />
          </div>
          <PasswordField
            id={`${mode}-password`}
            label="Password"
            autocomplete={
              mode === "signup" ? "new-password" : "current-password"
            }
          />
          {mode === "signup" ? (
            <PasswordField
              id="signup-confirmation"
              label="Confirm password"
              autocomplete="new-password"
            />
          ) : null}
          <button type="submit" className={styles.primaryButton}>
            {mode === "signup" ? "Create account" : "Log in"}{" "}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
        <button
          type="button"
          className={styles.textButton}
          onClick={() =>
            actions.chooseAuth(mode === "signup" ? "login" : "signup")
          }
        >
          {mode === "signup"
            ? "Already have an account? Log in"
            : "Create an account instead"}
        </button>
      </section>
    );
  }

  if (stage === "existing-account") {
    return (
      <section
        className={styles.journeyContent}
        aria-labelledby="journey-heading"
      >
        <Info className={styles.stateIcon} aria-hidden="true" />
        <p className={styles.eyebrow}>Account recovery</p>
        <h1 id="journey-heading" ref={headingRef} tabIndex={-1}>
          This email may already be connected to an account
        </h1>
        <p>
          Log in to continue saving {opportunity.title}. Your Opportunity and
          Save request have not been removed.
        </p>
        <div className={styles.actionStack}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => actions.chooseAuth("login")}
          >
            Log in <ArrowRight aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              onEmail("");
              actions.chooseAuth("signup");
            }}
          >
            Use another email
          </button>
        </div>
      </section>
    );
  }

  if (stage === "revalidating") {
    return (
      <section
        className={styles.journeyContent}
        aria-labelledby="journey-heading"
        aria-live="polite"
      >
        <RefreshCw
          className={`${styles.stateIcon} ${styles.spin}`}
          aria-hidden="true"
        />
        <p className={styles.eyebrow}>Authentication complete</p>
        <h1 id="journey-heading" ref={headingRef} tabIndex={-1}>
          Checking current Opportunity details
        </h1>
        <p>
          Missa is checking the status, deadline, fee, source, eligibility, and
          application destination before saving.
        </p>
        {scenario.id === "cross-device" ? (
          <p className={styles.privateNote}>
            We found the unexpired Save request connected to this account.
          </p>
        ) : null}
      </section>
    );
  }

  if (stage === "changed") {
    return (
      <section
        className={styles.journeyContent}
        aria-labelledby="journey-heading"
      >
        <Clock3 className={styles.stateIcon} aria-hidden="true" />
        <p className={styles.eyebrow}>Review before saving</p>
        <h1 id="journey-heading" ref={headingRef} tabIndex={-1}>
          This Opportunity changed while you were signing in
        </h1>
        <div className={styles.changeRows}>
          <div>
            <span>Was</span>
            <strong>14 September 2026, 17:00 Europe/London</strong>
          </div>
          <div>
            <span>Now</span>
            <strong>{opportunity.deadline}</strong>
          </div>
        </div>
        <p>
          The deadline was extended by four days. Review the current source
          before relying on the new date.
        </p>
        <div className={styles.actionStack}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={actions.continueAfterChange}
          >
            Continue with current details <ArrowRight aria-hidden="true" />
          </button>
          <a className={styles.secondaryButton} href="#prototype-source">
            Open official source <ExternalLink aria-hidden="true" />
          </a>
          <button
            type="button"
            className={styles.textButton}
            onClick={actions.keepReading}
          >
            Do not save
          </button>
        </div>
      </section>
    );
  }

  if (stage === "blocked") {
    return (
      <section
        className={styles.journeyContent}
        aria-labelledby="journey-heading"
      >
        <X className={styles.stateIcon} aria-hidden="true" />
        <p className={styles.eyebrow}>Current source state</p>
        <h1 id="journey-heading" ref={headingRef} tabIndex={-1}>
          This Opportunity is closed
        </h1>
        <p>
          It closed on 16 August 2026, 17:00 Europe/London. It was not added as
          an active Tracker item.
        </p>
        <div className={styles.actionStack}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={actions.keepReading}
          >
            Return to Opportunity
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={actions.reset}
          >
            Browse open Opportunities
          </button>
        </div>
      </section>
    );
  }

  if (stage === "ambiguous") {
    return (
      <section
        className={styles.journeyContent}
        aria-labelledby="journey-heading"
      >
        <AlertTriangle className={styles.stateIcon} aria-hidden="true" />
        <p className={styles.eyebrow}>Confirmation interrupted</p>
        <h1 id="journey-heading" ref={headingRef} tabIndex={-1}>
          We are checking whether the Save completed
        </h1>
        <p>
          Do not submit another Save blindly. Missa will read the canonical
          Tracker state and return the existing item.
        </p>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={actions.reconcile}
        >
          Check Tracker state <RefreshCw aria-hidden="true" />
        </button>
      </section>
    );
  }

  if (stage === "saved" || stage === "already-saved") {
    const existing = stage === "already-saved";
    return (
      <section
        className={styles.journeyContent}
        aria-labelledby="journey-heading"
      >
        <CheckCircle2 className={styles.stateIcon} aria-hidden="true" />
        <p className={styles.eyebrow}>Private Tracker receipt</p>
        <h1 id="journey-heading" ref={headingRef} tabIndex={-1}>
          {existing ? "Already in Tracker" : "Saved privately"}
        </h1>
        <p>
          {opportunity.title} {existing ? "was already in" : "is now in"}{" "}
          Tracker. Saving does not confirm eligibility or send an application.
        </p>
        <div className={styles.nextActionPreview}>
          <FileCheck2 aria-hidden="true" />
          <div>
            <span>Next meaningful action</span>
            <strong>Review eligibility</strong>
            <p>
              Read the Organization’s stated rules before deciding whether to
              apply.
            </p>
          </div>
        </div>
        <div className={styles.actionStack}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={actions.openTracker}
          >
            Open Tracker item <ArrowRight aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.textButton}
            onClick={actions.reset}
          >
            Undo Save
          </button>
        </div>
      </section>
    );
  }

  if (stage === "first-action-completed") {
    return (
      <section
        className={styles.journeyContent}
        aria-labelledby="journey-heading"
      >
        <CheckCircle2 className={styles.stateIcon} aria-hidden="true" />
        <p className={styles.eyebrow}>Tracker · action recorded</p>
        <h1 id="journey-heading" ref={headingRef} tabIndex={-1}>
          Eligibility review recorded
        </h1>
        <p>
          The Tracker item now shows that you reviewed the stated eligibility
          rules. This does not mean Missa decided that you are eligible.
        </p>
        <div className={styles.actionStack}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={actions.openTracker}
          >
            Return to Tracker item
          </button>
          <button
            type="button"
            className={styles.textButton}
            onClick={actions.reset}
          >
            Reset prototype
          </button>
        </div>
      </section>
    );
  }

  if (stage === "tracker" || stage === "guidance-dismissed") {
    const dismissed = stage === "guidance-dismissed";
    return (
      <section
        className={styles.journeyContent}
        aria-labelledby="journey-heading"
      >
        <LockKeyhole className={styles.stateIcon} aria-hidden="true" />
        <p className={styles.eyebrow}>Tracker · private</p>
        <h1 id="journey-heading" ref={headingRef} tabIndex={-1}>
          {opportunity.title}
        </h1>
        <p className={styles.trackerStatus}>
          Saved · current source checked today
        </p>
        {!dismissed ? (
          <div className={styles.trackerAction}>
            <span>Suggested next action</span>
            <h3>Review eligibility</h3>
            <p>
              Read the Organization’s stated rules. Missa has not decided
              whether you are eligible.
            </p>
            <div>
              <a className={styles.secondaryButton} href="#prototype-source">
                Open official eligibility <ExternalLink aria-hidden="true" />
              </a>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={actions.completeFirstAction}
              >
                Mark eligibility reviewed <Check aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.textButton}
                onClick={actions.dismissGuidance}
              >
                Dismiss guidance
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.dismissedNotice} role="status">
            <Check aria-hidden="true" />
            <div>
              <strong>Guidance dismissed</strong>
              <span>You can show it again from this Tracker item.</span>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={actions.showGuidance}
            >
              Show guidance
            </button>
          </div>
        )}
      </section>
    );
  }

  return null;
}

function OpportunityContext() {
  return (
    <section
      className={styles.compactContext}
      aria-label="Opportunity being saved"
    >
      <div>
        <span>Opportunity being saved</span>
        <strong>{opportunity.title}</strong>
        <small>{opportunity.organization}</small>
      </div>
      <OpportunityFacts compact />
    </section>
  );
}

function SelectedFocusedHandoff({
  stage,
  scenario,
  email,
  onEmail,
  actions,
  headingRef,
}: SelectedPrototypeProps) {
  if (stage === "public") {
    return (
      <div className={styles.focusedPublic}>
        <PublicReading onSave={actions.startSave} />
      </div>
    );
  }

  return (
    <div className={styles.focusedVariant}>
      <button
        type="button"
        className={styles.focusedBack}
        onClick={actions.keepReading}
      >
        <ArrowLeft aria-hidden="true" /> Return to public Opportunity
      </button>
      <OpportunityContext />
      <div className={styles.focusedJourney}>
        <JourneyContent
          stage={stage}
          scenario={scenario}
          email={email}
          onEmail={onEmail}
          actions={actions}
          headingRef={headingRef}
        />
      </div>
    </div>
  );
}

type SelectedPrototypeProps = {
  stage: Stage;
  scenario: Scenario;
  email: string;
  onEmail: (email: string) => void;
  actions: JourneyActions;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
};

export function FirstSaveJourneyPrototype() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("new-account");
  const [stage, setStage] = useState<Stage>("public");
  const [email, setEmail] = useState("creator@example.com");
  const [authAttempts, setAuthAttempts] = useState(0);
  const [announcement, setAnnouncement] = useState(
    "Public Opportunity ready to review.",
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  const scenario = useMemo(
    () =>
      scenarios.find((candidate) => candidate.id === scenarioId) ??
      scenarios[0]!,
    [scenarioId],
  );

  useEffect(() => {
    if (stage !== "public") headingRef.current?.focus();
  }, [stage]);

  function transition(next: Stage, message: string) {
    setStage(next);
    setAnnouncement(message);
  }

  function reset(nextScenario = scenarioId) {
    setScenarioId(nextScenario);
    setStage("public");
    setEmail("creator@example.com");
    setAuthAttempts(0);
    setAnnouncement("Prototype reset. Public Opportunity ready to review.");
  }

  const actions: JourneyActions = {
    startSave() {
      if (scenario.id === "already-authenticated") {
        transition(
          "revalidating",
          "Save intent accepted. Checking current Opportunity details.",
        );
        return;
      }
      transition(
        "auth-choice",
        "Authentication is required for private saving.",
      );
    },
    chooseAuth(mode) {
      transition(
        mode,
        `${mode === "signup" ? "Signup" : "Login"} selected. Save intent preserved.`,
      );
    },
    submitAuth(mode) {
      if (scenario.id === "existing-email" && mode === "signup") {
        transition(
          "existing-account",
          "Existing-account recovery shown. Save intent preserved.",
        );
        return;
      }
      if (
        scenario.id === "invalid-credentials" &&
        mode === "login" &&
        authAttempts === 0
      ) {
        setAuthAttempts(1);
        transition(
          "auth-error",
          "Invalid credentials. Save intent preserved for retry.",
        );
        return;
      }
      transition(
        "revalidating",
        "Authentication succeeded. Checking current Opportunity details.",
      );
    },
    keepReading() {
      transition(
        "public",
        "Returned to the public Opportunity. Private saving was not completed.",
      );
    },
    advanceRevalidation() {
      if (scenario.id === "deadline-changed") {
        transition("changed", "A material deadline change requires review.");
      } else if (scenario.id === "opportunity-closed") {
        transition(
          "blocked",
          "The Opportunity is closed. Active Save is blocked.",
        );
      } else if (scenario.id === "response-lost") {
        transition(
          "ambiguous",
          "Save confirmation was interrupted. Canonical reconciliation is required.",
        );
      } else if (scenario.id === "duplicate-save") {
        transition(
          "already-saved",
          "The existing Tracker item was found. No duplicate was created.",
        );
      } else {
        transition("saved", "Tracker item created. Saved privately.");
      }
    },
    continueAfterChange() {
      transition(
        "saved",
        "Current details acknowledged. Tracker item created and saved privately.",
      );
    },
    reconcile() {
      transition(
        "already-saved",
        "Canonical Tracker state found the saved item. No duplicate was created.",
      );
    },
    openTracker() {
      transition(
        "tracker",
        "Exact Tracker item opened. Next action presented.",
      );
    },
    completeFirstAction() {
      transition(
        "first-action-completed",
        "Eligibility review recorded as the first meaningful Tracker action.",
      );
    },
    dismissGuidance() {
      transition(
        "guidance-dismissed",
        "Guidance dismissed. It can be shown again from this item.",
      );
    },
    showGuidance() {
      transition("tracker", "Guidance restored for this Tracker item.");
    },
    reset() {
      reset();
    },
  };

  function changeScenario(next: ScenarioId) {
    reset(next);
  }

  return (
    <div className={styles.prototype}>
      <a className={styles.skipLink} href="#prototype-content">
        Skip to prototype
      </a>
      <aside className={styles.prototypeNotice} aria-label="Prototype boundary">
        <span>
          <ShieldCheck aria-hidden="true" /> Throwaway prototype · synthetic
          data
        </span>
        <strong>
          No authentication, persistence, eligibility decision, or application
          submission occurs.
        </strong>
      </aside>
      <header className={styles.appHeader}>
        <MissaWordmark href="/design-system" size="compact" />
        <nav aria-label="Prototype product context">
          <span aria-current="page">Opportunities</span>
          <span>Tracker</span>
          <span>Library</span>
          <span>Profile</span>
        </nav>
        <span className={styles.signedOut}>Signed out</span>
      </header>

      <section
        className={styles.prototypeControls}
        aria-labelledby="prototype-controls-title"
      >
        <div>
          <p>Selected first-Save journey</p>
          <h2 id="prototype-controls-title">Focused handoff</h2>
          <span>
            Can a quiet transition preserve the Opportunity while making account
            and recovery states easier to understand?
          </span>
        </div>
        <label>
          Test fixture
          <select
            value={scenarioId}
            onChange={(event) =>
              changeScenario(event.target.value as ScenarioId)
            }
          >
            {scenarios.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.stateReadout}>
          <span>Canonical state</span>
          <code>{stateLabels[stage]}</code>
          <small>{scenario.description}</small>
        </div>
        <button
          type="button"
          className={styles.resetButton}
          onClick={() => reset()}
        >
          <RotateCcw aria-hidden="true" /> Reset
        </button>
      </section>

      {stage === "revalidating" ? (
        <div className={styles.simulationControl} role="note">
          <span>
            Prototype control: the product would advance from a server result.
          </span>
          <button type="button" onClick={actions.advanceRevalidation}>
            Return fixture result <ArrowRight aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <main id="prototype-content" className={styles.prototypeContent}>
        <SelectedFocusedHandoff
          stage={stage}
          scenario={scenario}
          email={email}
          onEmail={setEmail}
          actions={actions}
          headingRef={headingRef}
        />
      </main>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}
