"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { UserHandle } from "@missa/radar-adapters";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import styles from "./profile-product.module.css";

export function HandleClaimCard({
  initialHandle,
  initialNamespaceAvailable,
  claimingOpen,
  promptDismissed,
  displayName,
  published,
  onHandleChange,
}: {
  initialHandle: UserHandle | null;
  initialNamespaceAvailable: boolean;
  claimingOpen: boolean;
  promptDismissed: boolean;
  displayName: string;
  published: boolean;
  /** Tells the settings page about a claim or rename so its checklist updates. */
  onHandleChange?: (handle: UserHandle) => void;
}) {
  const [handle, setHandle] = useState(initialHandle);
  const [value, setValue] = useState(displayName);
  const [dismissed, setDismissed] = useState(promptDismissed);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  if (!initialNamespaceAvailable || (!handle && dismissed)) return null;

  function request(
    path: string,
    method: "POST" | "PATCH",
    body?: Record<string, string>,
  ) {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const response = await fetch(path, {
        method,
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = (await response.json().catch(() => ({}))) as {
        handle?: UserHandle;
        error?: string;
        state?: string;
      };
      if (!response.ok) {
        if (result.state === "publication-claim") {
          setError(undefined);
          setMessage(
            result.error ??
              "This name needs verification before it can change.",
          );
          return;
        }
        setError(result.error ?? "We could not save this handle.");
        return;
      }
      if (result.handle) {
        setHandle(result.handle);
        setValue(result.handle.displayHandle);
        onHandleChange?.(result.handle);
        setMessage(
          method === "PATCH"
            ? "Handle renamed."
            : "Handle held for your Profile.",
        );
      }
    });
  }

  function skip() {
    startTransition(async () => {
      await fetch("/api/me/handles/prompt", { method: "POST" });
      setDismissed(true);
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    request(
      handle ? "/api/me/handles" : "/api/me/handles",
      handle ? "PATCH" : "POST",
      { handle: value },
    );
  }

  if (!handle) {
    return (
      <section
        className={styles.handleCard}
        aria-labelledby="handle-card-title"
      >
        <div>
          <p className={styles.cardKicker}>Public handle</p>
          <h3 id="handle-card-title">Choose your name on Missa</h3>
          <p>
            Your display name is only a starting point. A handle is optional and
            does not publish your Profile.
          </p>
        </div>
        {!claimingOpen ? (
          <Alert>
            <AlertTitle>
              Handle claiming is not open for this account yet.
            </AlertTitle>
            <AlertDescription>
              You can keep using Missa normally. There is no public page until
              you choose a handle and publish your Profile.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={submit} className={styles.handleForm}>
            <label htmlFor="profile-handle">Handle</label>
            <Input
              id="profile-handle"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoComplete="off"
              aria-describedby="profile-handle-help"
            />
            <p id="profile-handle-help">
              Use 3–30 letters, numbers, or hyphens. Case and accents are
              normalized for the shared namespace.
            </p>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className={styles.success} role="status">
                {message}
              </p>
            ) : null}
            <div className={styles.formActions}>
              <Button type="submit" disabled={isPending || !value.trim()}>
                {isPending ? "Saving…" : "Hold this handle"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={skip}
                disabled={isPending}
              >
                Skip for now
              </Button>
            </div>
          </form>
        )}
      </section>
    );
  }

  return (
    <section className={styles.handleCard} aria-labelledby="handle-card-title">
      <div>
        <p className={styles.cardKicker}>Public handle</p>
        <h3 id="handle-card-title">@{handle.displayHandle}</h3>
        <p>
          {published
            ? "Your public page is live at this address."
            : "This handle is yours. Add your photo, links and Works, then publish your page from the page builder."}
        </p>
      </div>
      <div className={styles.formActions}>
        <Link
          href="/profile/portfolio"
          className={buttonVariants({
            variant: published ? "outline" : "default",
          })}
        >
          {published ? "Edit your public page" : "Build your public page"}
        </Link>
        {published ? (
          <Link
            href={`/@${handle.handleKey}`}
            className={buttonVariants({ variant: "link" })}
          >
            Open public page
          </Link>
        ) : null}
      </div>
      <form onSubmit={submit} className={styles.handleForm}>
        <label htmlFor="rename-profile-handle">Rename handle</label>
        <Input
          id="rename-profile-handle"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
        />
        <p>
          Renames are limited to once every 30 days. The old address will
          redirect permanently.
        </p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className={styles.success} role="status">
            {message}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="outline"
          disabled={isPending || value.trim() === handle.displayHandle}
        >
          {isPending ? "Saving…" : "Rename handle"}
        </Button>
      </form>
    </section>
  );
}
