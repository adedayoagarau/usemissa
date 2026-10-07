import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MissaWordmark } from "@/components/missa-wordmark";
import { Sp } from "@/components/missa/spelling";

/**
 * Shared frame for log in, sign up, and password recovery: a white form
 * column with the wordmark and legal links, and an inset illustration with an
 * editorial caption on wide screens. Small screens show the form only. The
 * illustrations are made with AI, and the caption says so.
 */

export type AuthVisual = "signup" | "login" | "recovery";

const VISUALS: Record<
  AuthVisual,
  { src: string; title: string; body: string }
> = {
  signup: {
    src: "/media/home/generated/residencies.webp",
    title: "Find the call. Make the deadline.",
    body: "Save calls, get reminded before they close, and keep track of what you sent.",
  },
  login: {
    src: "/media/home/generated/publications.webp",
    title: "Your deadlines, where you left them.",
    body: "Your saved calls and what you sent stay private to your account.",
  },
  recovery: {
    src: "/media/home/generated/exhibitions.webp",
    title: "Find the call. Make the deadline.",
    body: "Every call links to the organizer’s own page, with the fee and the rules up front.",
  },
};

export function AuthShell({
  visual,
  children,
}: {
  visual: AuthVisual;
  children: ReactNode;
}) {
  const art = VISUALS[visual];
  return (
    <main
      id="main-content"
      data-density="comfortable"
      className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,46%)]"
    >
      <div className="flex min-h-dvh flex-col px-gutter">
        <header className="flex h-16 shrink-0 items-center lg:h-20">
          <MissaWordmark href="/" size="app" />
        </header>
        <div className="flex flex-1 justify-center py-6 sm:items-center sm:py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <footer className="flex shrink-0 flex-wrap items-center gap-x-5 py-4 text-xs text-muted-foreground">
          <span>© Missa</span>
          <Link
            href="/terms"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center hover:text-foreground"
          >
            Privacy
          </Link>
        </footer>
      </div>

      <aside aria-hidden="true" className="hidden lg:block">
        <div className="sticky top-0 h-dvh p-4 ps-0">
          <div className="relative h-full overflow-hidden rounded-2xl bg-muted">
            <Image
              src={art.src}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 46vw, 0px"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-foreground/85 via-foreground/45 to-transparent px-8 pt-40 pb-8 xl:px-12 xl:pb-12">
              <p className="max-w-md font-heading text-4xl leading-[1.05] tracking-tight text-balance text-background xl:text-5xl">
                <Sp>{art.title}</Sp>
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-background/85">
                <Sp>{art.body}</Sp>
              </p>
              <p className="mt-6 text-xs text-background/70">
                Illustration made with AI.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
