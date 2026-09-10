"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Menu,
  RotateCcw,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MissaWordmark } from "@/components/missa-wordmark";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  STUDIO_SCENES,
  STUDIO_MOTION_MS,
  studioHref,
  studioImage,
  type StudioId,
} from "@/lib/homepage-studio";
import { HOMEPAGE_NAV_LINKS } from "@/lib/homepage-navigation";
import "@/components/design-system/homepage-studio-tokens.css";
import styles from "./homepage-studio.module.css";

const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const reducedOnServer = () => true;
const readReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const subscribeReducedMotion = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

/** Original editorial composition over installed controls; no saved preference or submission mutation. */
export function HomepageStudio({
  opportunities,
}: {
  opportunities: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayed, setDisplayed] = useState<StudioId>("writing");
  const [requested, setRequested] = useState<StudioId | null>("writing");
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [motionPreference, setMotionPreference] = useState<boolean | null>(
    null,
  );
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientReady,
    serverReady,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotion,
    reducedOnServer,
  );
  const motion = motionPreference ?? !reducedMotion;
  const [status, setStatus] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);
  const version = useRef(0);
  const desired = useRef<StudioId | null>("writing");
  const motionRef = useRef(false);
  const mounted = useRef(true);
  const cancellation = useRef<(() => void) | null>(null);
  const scene = STUDIO_SCENES.find((item) => item.id === displayed)!;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      version.current += 1;
      cancellation.current?.();
    };
  }, []);

  useEffect(() => {
    motionRef.current = motion;
  }, [motion]);

  async function showScene(target: StudioId | null) {
    desired.current = target;
    const token = ++version.current;
    cancellation.current?.();
    const controller = new AbortController();
    cancellation.current = () => controller.abort();
    const valid = () => mounted.current && token === version.current;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(finish, ms);
        function finish() {
          window.clearTimeout(timer);
          controller.signal.removeEventListener("abort", finish);
          resolve();
        }
        controller.signal.addEventListener("abort", finish, { once: true });
      });
    setRequested(target);
    setError(false);
    if (target === displayed && !closed && !imageFailed) {
      setBusy(false);
      setStatus("");
      return;
    }
    setBusy(true);
    setStatus(
      target
        ? `Opening ${STUDIO_SCENES.find((item) => item.id === target)!.label.toLowerCase()} studio…`
        : "Closing studio…",
    );
    try {
      if (target) {
        const mobile = window.matchMedia("(max-width: 767px)").matches;
        await new Promise<void>((resolve, reject) => {
          const image = new window.Image();
          const finish = (failure?: Error) => {
            window.clearTimeout(timeout);
            image.onload = null;
            image.onerror = null;
            controller.signal.removeEventListener("abort", abort);
            if (failure) reject(failure);
            else resolve();
          };
          const abort = () => finish(new Error("cancelled"));
          const timeout = window.setTimeout(
            () => finish(new Error("timeout")),
            7000,
          );
          controller.signal.addEventListener("abort", abort, { once: true });
          image.onload = () => {
            image
              .decode()
              .then(() => finish())
              .catch(() => finish(new Error("decode")));
          };
          image.onerror = () => finish(new Error("image unavailable"));
          image.src = studioImage(target, mobile);
        });
      }
      if (!valid()) return;
      if (motionRef.current) {
        setClosed(true);
        await wait(STUDIO_MOTION_MS);
      }
      if (!valid()) return;
      if (target) {
        setDisplayed(target);
        setImageFailed(false);
        // Allow React to commit the cached image under the closed panels.
        await wait(32);
        if (!valid()) return;
        if (imageRef.current) await imageRef.current.decode();
        if (!valid()) return;
        setClosed(false);
        if (motionRef.current) await wait(STUDIO_MOTION_MS);
      } else {
        setClosed(true);
      }
      if (!valid()) return;
      setBusy(false);
      setStatus(
        target
          ? `${STUDIO_SCENES.find((item) => item.id === target)!.label} studio shown.`
          : "Studio closed. Choose a scene to open it.",
      );
    } catch {
      if (!valid()) return;
      setBusy(false);
      setClosed(false);
      setError(true);
      setStatus(
        "This studio image couldn't load. You can still explore opportunities.",
      );
    }
  }

  function toggleMotion(checked: boolean) {
    motionRef.current = checked;
    setMotionPreference(checked);
    if (!checked && busy) void showScene(desired.current);
  }

  return (
    <div
      className={`missa-homepage-studio ${styles.page}`}
      data-density="spacious"
      data-testid="homepage-studio"
    >
      <a href="#main-content" className={styles.skip}>
        Skip to content
      </a>
      <header className={styles.header}>
        <MissaWordmark size="app" />
        <nav aria-label="Primary" className={styles.desktopNav}>
          {HOMEPAGE_NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.account}>
          <Link href="/login">Log in</Link>
          <Button
            variant="outline"
            nativeButton={false}
            role="link"
            render={<Link href="/signup" />}
          >
            Create account <ArrowUpRight aria-hidden="true" />
          </Button>
        </div>
        <div className={styles.mobileMenu}>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open menu" />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent>
              <SheetTitle className="sr-only">Missa menu</SheetTitle>
              <SheetDescription className="sr-only">
                Explore Missa and your account.
              </SheetDescription>
              <nav aria-label="Mobile navigation" className={styles.menuLinks}>
                {[
                  ...HOMEPAGE_NAV_LINKS,
                  { href: "/login", label: "Log in" },
                  { href: "/signup", label: "Create account" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="homepage-title">
          <div className={styles.intro}>
            <h1 id="homepage-title" className={`font-heading ${styles.title}`}>
              Opportunities for
              <br />
              <em>every creator.</em>
            </h1>
            <div className={styles.introAside}>
              <p>
                Find open calls, grants, residencies,
                <br className={styles.desktopBreak} /> and places to share your
                work.
              </p>
              <Button
                nativeButton={false}
                role="link"
                render={<Link href="/opportunities" />}
                className={styles.primary}
              >
                Explore opportunities <ArrowUpRight aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div
            className={styles.studio}
            data-motion={motion && hydrated ? "on" : "off"}
            data-closed={closed ? "true" : "false"}
            data-busy={busy ? "true" : "false"}
            data-scene={displayed}
            data-testid="studio-stage"
          >
            <div className={styles.stage}>
              {/* The HTML image is useful before hydration; other scenes load only on request. */}
              <picture>
                <source
                  media="(max-width: 767px)"
                  srcSet={studioImage(displayed, true)}
                />
                <img
                  ref={imageRef}
                  src={studioImage(displayed)}
                  alt={scene.alt}
                  width={1672}
                  height={941}
                  fetchPriority="high"
                  className={styles.sceneImage}
                  onLoad={() => setImageFailed(false)}
                  onError={() => {
                    setImageFailed(true);
                    setError(true);
                  }}
                />
              </picture>
              {imageFailed && (
                <div className={styles.imageFallback}>
                  <span className="font-heading">A place for your work.</span>
                  <p>Explore opportunities across six creative worlds.</p>
                </div>
              )}
              <div
                className={`${styles.panel} ${styles.panelLeft}`}
                aria-hidden="true"
              />
              <div
                className={`${styles.panel} ${styles.panelRight}`}
                aria-hidden="true"
              />
              <div className={styles.stageNote}>
                <span className={styles.noteDot} />
                The creator’s studio
              </div>
            </div>
            <div className={styles.studioBar}>
              <div className={styles.sceneCaption}>
                <span className={styles.captionNumber} aria-hidden="true">
                  {closed && !busy
                    ? "—"
                    : `0${STUDIO_SCENES.findIndex((item) => item.id === displayed) + 1}`}
                </span>
                <span className="font-heading">
                  {closed && !busy
                    ? "Make room for what comes next."
                    : scene.caption}
                </span>
              </div>
              <div className={styles.mediaControls}>
                <label className={styles.motionLabel} htmlFor="studio-motion">
                  Scene motion
                  <Switch
                    id="studio-motion"
                    checked={motion}
                    onCheckedChange={toggleMotion}
                    disabled={!hydrated}
                  />
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close studio"
                  disabled={!hydrated || (closed && !busy)}
                  onClick={() => void showScene(null)}
                >
                  <RotateCcw aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div
              className={styles.sceneControls}
              role="group"
              aria-label="Explore the studio"
            >
              <span className={styles.selectorLabel}>
                What do you make?
                <ArrowRight aria-hidden="true" />
              </span>
              {STUDIO_SCENES.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  aria-pressed={requested === item.id}
                  aria-controls="studio-status"
                  disabled={!hydrated}
                  onClick={() => void showScene(item.id)}
                  className={styles.sceneButton}
                >
                  {item.label}
                  <span className={styles.sceneDot} aria-hidden="true" />
                </Button>
              ))}
            </div>
            <p
              className="sr-only"
              id="studio-status"
              role="status"
              aria-live="polite"
            >
              {status}
            </p>
            {error && (
              <Alert className={styles.mediaError}>
                <AlertDescription>
                  This studio image couldn&apos;t load. You can still explore
                  opportunities.
                  <Button
                    variant="link"
                    onClick={() => void showScene(desired.current)}
                  >
                    Retry image
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <noscript>
              <p className={styles.noScript}>
                Explore opportunities below. Interactive studio scenes need
                JavaScript.
              </p>
            </noscript>
          </div>
          <a href="#discover" className={styles.scrollLink}>
            Find a next step for your work <ArrowDown aria-hidden="true" />
          </a>
        </section>
        <section
          id="discover"
          className={styles.discover}
          aria-labelledby="discover-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Room for every kind of work</p>
              <h2
                id="discover-title"
                className={`font-heading ${styles.sectionTitle}`}
              >
                Start with what you make.
              </h2>
            </div>
            <Link href="/opportunities" className={styles.textLink}>
              View all opportunities <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.practiceGrid}>
            {STUDIO_SCENES.map((item) => (
              <Link
                href={studioHref(item)}
                key={item.id}
                className={styles.practiceLink}
              >
                <div>
                  <h3 className="font-heading">{item.label}</h3>
                  <p>{item.description}</p>
                </div>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
        {opportunities}
        <section
          id="how-it-works"
          className={styles.how}
          aria-labelledby="how-title"
        >
          <div className={styles.howIntro}>
            <p className={styles.eyebrow}>How Missa works</p>
            <h2
              id="how-title"
              className={`font-heading ${styles.sectionTitle}`}
            >
              Your work.
              <br />
              <em>Its next opening.</em>
            </h2>
            <p>
              A clear place to look, compare the details, and take the next
              step.
            </p>
          </div>
          <ol className={styles.steps}>
            {[
              {
                title: "Find an opportunity",
                body: "Explore open calls, grants, residencies, and more for the work you make.",
              },
              {
                title: "Check the details",
                body: "Review deadlines, eligibility, fees, and what you need to apply.",
              },
              {
                title: "Go to the official application",
                body: "Follow the organiser’s link and apply on their website.",
              },
            ].map((step, index) => (
              <li key={step.title}>
                <span className={styles.stepNumber} aria-hidden="true">
                  0{index + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.method} aria-labelledby="method-title">
          <div>
            <p className={styles.eyebrow}>The source stays close</p>
            <h2 id="method-title" className="font-heading">
              Know where an opportunity comes from.
            </h2>
            <p>Check the source and application details before you apply.</p>
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            role="link"
            render={<Link href="/methodology" />}
          >
            Our methodology <ArrowUpRight aria-hidden="true" />
          </Button>
        </section>
        <section className={styles.finalInvite} aria-labelledby="invite-title">
          <p className={styles.eyebrow}>Missa is open to explore</p>
          <h2
            id="invite-title"
            className={`font-heading ${styles.sectionTitle}`}
          >
            Let&apos;s find a place
            <br />
            <em>for your work.</em>
          </h2>
          <Button
            nativeButton={false}
            role="link"
            render={<Link href="/opportunities" />}
          >
            Explore opportunities <ArrowUpRight aria-hidden="true" />
          </Button>
        </section>
      </main>
      <footer className={styles.footer}>
        <MissaWordmark size="compact" />
        <p>Opportunities for every creator.</p>
        <nav aria-label="Footer">
          <Link href="/about">About</Link>
          <Link href="/methodology">Methodology</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </div>
  );
}
