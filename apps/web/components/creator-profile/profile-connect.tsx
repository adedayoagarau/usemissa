"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Check, Mail, Pencil, Plus, Send, UserPlus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import styles from "./profile-connect.module.css";
import { Sp } from "@/components/missa/spelling";

export const INQUIRY_TOPIC_OPTIONS = [
  { value: "commission", label: "A commission" },
  { value: "booking", label: "A booking or reading" },
  { value: "publication", label: "Publication or rights" },
  { value: "collaboration", label: "A collaboration" },
  { value: "other", label: "Something else" },
] as const;

/** Who the profile is being looked at as, in the studio's preview. */
export const VIEW_AS = ["visitor", "creator", "organization", "owner"] as const;
export type ViewAs = (typeof VIEW_AS)[number];

/** A request from another part of the profile to open the message form. */
export type InquiryRequest = {
  /** One of the inquiry topics; defaults to a commission. */
  topic?: (typeof INQUIRY_TOPIC_OPTIONS)[number]["value"];
  /** Text to start the message with, such as "About Indigo Hours III:". */
  message?: string;
};

const INQUIRY_EVENT = "missa:profile-inquiry";

/**
 * Opens the profile's message form, optionally with a topic and a first line.
 * Sections such as Editions and Teaching call this instead of owning a form.
 */
export function requestInquiry(request: InquiryRequest = {}) {
  window.dispatchEvent(new CustomEvent(INQUIRY_EVENT, { detail: request }));
}

type Viewer = {
  signedIn: boolean;
  isOwner: boolean;
  following: boolean;
  inquiries: boolean;
  /** Signed in and not the owner: may credit this creator on their own profile. */
  canCredit?: boolean;
  senderName: string;
  senderEmail: string;
  organizations: { id: string; name: string }[];
};

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
}

type InviteOption = {
  organizationId: string;
  organizationName: string;
  opportunityId: string;
  title: string;
  deadline?: string;
  invited: boolean;
};

/**
 * Follow, write and invite on a public profile. On the live page these talk to
 * Missa; in a preview or sample they open the same forms but never send, and
 * say so.
 */
export function ProfileConnect({
  handle,
  name,
  inquiries,
  contactHref,
  live,
  sample,
  viewAs,
}: {
  /** Preview only: show the actions this kind of viewer would see. */
  viewAs?: ViewAs;
  handle?: string;
  name: string;
  inquiries: boolean;
  contactHref?: string;
  /** True only on the published `/@handle` page. */
  live: boolean;
  sample?: boolean;
}) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  // On the live page, wait for the viewer before acting on Follow, so a
  // signed-in member is never sent to sign in by a fast click.
  const [viewerSettled, setViewerSettled] = useState(!live || !handle);
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [writing, setWriting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [preset, setPreset] = useState<{ key: number } & InquiryRequest>({
    key: 0,
  });

  useEffect(() => {
    if (!live || !handle) return;
    let active = true;
    fetch(`/api/profiles/${encodeURIComponent(handle)}/viewer`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Viewer | null) => {
        if (!active) return;
        if (data) {
          setViewer(data);
          setFollowing(data.following);
        }
        setViewerSettled(true);
      })
      .catch(() => {
        if (active) setViewerSettled(true);
      });
    return () => {
      active = false;
    };
  }, [handle, live]);

  // On the live page the viewer comes from the server; in a preview the studio
  // says who to show, and nothing is sent.
  const previewing = !live ? viewAs : undefined;
  const isOwner = viewer?.isOwner ?? previewing === "owner";
  const canWrite = inquiries && (viewer?.inquiries ?? true) && !isOwner;
  const canInvite =
    (viewer?.organizations.length ?? 0) > 0 || previewing === "organization";
  const canCredit = live
    ? Boolean(handle && viewer?.canCredit)
    : previewing === "creator";

  useEffect(() => {
    const open = (event: Event) => {
      const request = (event as CustomEvent<InquiryRequest>).detail ?? {};
      if (canWrite) {
        setPreset((current) => ({ ...request, key: current.key + 1 }));
        setWriting(true);
      } else if (contactHref && !isOwner) {
        const url = new URL(contactHref);
        if (request.message) url.searchParams.set("subject", request.message);
        window.location.assign(url.toString());
      }
    };
    window.addEventListener(INQUIRY_EVENT, open);
    return () => window.removeEventListener(INQUIRY_EVENT, open);
  }, [canWrite, contactHref, isOwner]);

  const toggleFollow = async () => {
    if (!live || !handle) {
      setNotice(
        sample
          ? "This is a sample profile, so following is off."
          : "Visitors can follow you once your profile is published.",
      );
      return;
    }
    if (!viewer?.signedIn) {
      window.location.assign(
        `/login?next=${encodeURIComponent(`/@${handle}`)}`,
      );
      return;
    }
    setPending(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/profiles/${encodeURIComponent(handle)}/follow`,
        { method: following ? "DELETE" : "POST" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      setFollowing(data.following);
      setNotice(
        data.following
          ? `You're following ${name}.`
          : `You've unfollowed ${name}.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error && error.message
          ? error.message
          : "Could not update. Please try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {canWrite ? (
        <Button data-tone="primary" onClick={() => setWriting(true)}>
          <Mail aria-hidden="true" />
          Get in touch
        </Button>
      ) : (
        contactHref &&
        !isOwner && (
          <a href={contactHref} className={buttonVariants()}>
            <Mail aria-hidden="true" />
            Get in touch
          </a>
        )
      )}
      {!isOwner && (
        <Button
          variant="outline"
          aria-pressed={following}
          disabled={pending || !viewerSettled}
          onClick={toggleFollow}
        >
          {following ? (
            <Check aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          {following ? "Following" : "Follow"}
        </Button>
      )}
      {isOwner && <ConnectOwnerAction live={live} onNotice={setNotice} />}
      {canInvite && (
        <Button
          variant="outline"
          onClick={() =>
            live
              ? setInviting(true)
              : setNotice(
                  "Organizations see their own open calls here. Nothing is sent from a preview.",
                )
          }
        >
          <Send aria-hidden="true" />
          Invite to apply
        </Button>
      )}
      {canCredit &&
        (live && handle ? (
          // Opens your own studio with this creator already on a new row.
          <Link
            href={`/profile/portfolio?credit=${encodeURIComponent(handle)}`}
            className={buttonVariants({ variant: "ghost" })}
          >
            <UserPlus aria-hidden="true" />
            Credit as collaborator
          </Link>
        ) : (
          <Button
            variant="ghost"
            onClick={() =>
              setNotice(
                "Signed-in creators can credit you from here. Both of you confirm before it shows.",
              )
            }
          >
            <UserPlus aria-hidden="true" />
            Credit as collaborator
          </Button>
        ))}
      <span role="status" className={styles.notice}>
        {notice}
      </span>
      <InquiryDialog
        open={writing}
        onOpenChange={setWriting}
        handle={live ? handle : undefined}
        name={name}
        sample={sample}
        defaultName={viewer?.senderName ?? ""}
        defaultEmail={viewer?.senderEmail ?? ""}
        key={preset.key}
        preset={preset}
      />
      {canInvite && handle && live && (
        <InviteDialog
          open={inviting}
          onOpenChange={setInviting}
          handle={handle}
          name={name}
        />
      )}
    </>
  );
}

/** The owner's own view of the page: a way back to the studio. */
function ConnectOwnerAction({
  live,
  onNotice,
}: {
  live: boolean;
  onNotice: (text: string) => void;
}) {
  return live ? (
    <Link
      href="/profile/portfolio"
      className={buttonVariants({ variant: "outline" })}
    >
      <Pencil aria-hidden="true" />
      Edit profile
    </Link>
  ) : (
    <Button
      variant="outline"
      onClick={() => onNotice("You’re already editing your profile.")}
    >
      <Pencil aria-hidden="true" />
      Edit profile
    </Button>
  );
}

function InquiryDialog({
  open,
  onOpenChange,
  handle,
  name,
  sample,
  defaultName,
  defaultEmail,
  preset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent in previews and samples: the form never sends. */
  handle?: string;
  name: string;
  sample?: boolean;
  defaultName: string;
  defaultEmail: string;
  /** A topic and first line asked for by another section; `key` marks each ask. */
  preset: { key: number } & InquiryRequest;
}) {
  const ids = {
    name: useId(),
    email: useId(),
    topic: useId(),
    message: useId(),
  };
  const [form, setForm] = useState<{
    name: string;
    email: string;
    topic: NonNullable<InquiryRequest["topic"]>;
    message: string;
    website: string;
  }>({
    name: "",
    email: "",
    topic: preset.topic ?? "commission",
    message: preset.message ?? "",
    website: "",
  });
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent"; text: string }
    | { kind: "error"; text: string }
  >({ kind: "idle" });
  const first = name.split(" ")[0] || name;
  const value = (key: "name" | "email") =>
    form[key] || (key === "name" ? defaultName : defaultEmail);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { ...form, name: value("name"), email: value("email") };
    if (!handle) {
      setState({
        kind: "sent",
        text: sample
          ? "This is a sample profile, so nothing was sent."
          : "This is a preview, so nothing was sent. Visitors can write to you once you publish.",
      });
      return;
    }
    setState({ kind: "sending" });
    try {
      const response = await fetch(
        `/api/profiles/${encodeURIComponent(handle)}/inquiries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      setState({
        kind: "sent",
        text: `Sent. ${first} will reply to ${payload.email} if they'd like to take it further.`,
      });
      setForm((current) => ({ ...current, message: "" }));
    } catch (error) {
      setState({
        kind: "error",
        text:
          error instanceof Error && error.message
            ? error.message
            : "Your message wasn't sent. Please try again.",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setState({ kind: "idle" });
      }}
    >
      <DialogContent className={styles.dialog}>
        <DialogTitle className="font-heading">Write to {first}</DialogTitle>
        <DialogDescription>
          Your message goes to {first}&rsquo;s Missa inbox. Their email address
          stays private; they reply to you directly if they choose.
        </DialogDescription>
        {state.kind === "sent" ? (
          <div className={styles.done}>
            <p role="status">{state.text}</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit} noValidate={false}>
            <div className={styles.pair}>
              <Field>
                <FieldLabel htmlFor={ids.name}>Your name</FieldLabel>
                <Input
                  id={ids.name}
                  required
                  maxLength={120}
                  autoComplete="name"
                  value={value("name")}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={ids.email}>Your email</FieldLabel>
                <Input
                  id={ids.email}
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={value("email")}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={ids.topic}>What it&rsquo;s about</FieldLabel>
              <NativeSelect
                id={ids.topic}
                value={form.topic}
                className={styles.select}
                onChange={(event) =>
                  setForm({
                    ...form,
                    topic: event.target.value as typeof form.topic,
                  })
                }
              >
                {INQUIRY_TOPIC_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor={ids.message}>Message</FieldLabel>
              <Textarea
                id={ids.message}
                required
                minLength={10}
                maxLength={4000}
                rows={6}
                value={form.message}
                aria-describedby={`${ids.message}-hint`}
                onChange={(event) =>
                  setForm({ ...form, message: event.target.value })
                }
              />
              <FieldDescription id={`${ids.message}-hint`}>
                Say who you are, what you have in mind and any dates or fees.
              </FieldDescription>
            </Field>
            <Input
              className={styles.trap}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              name="website"
              value={form.website}
              onChange={(event) =>
                setForm({ ...form, website: event.target.value })
              }
            />
            {state.kind === "error" && (
              <FieldError role="alert">{state.text}</FieldError>
            )}
            <div className={styles.actions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={state.kind === "sending"}>
                {state.kind === "sending" ? "Sending…" : "Send message"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  handle,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handle: string;
  name: string;
}) {
  const ids = { call: useId(), message: useId() };
  const [options, setOptions] = useState<InviteOption[] | null>(null);
  const [choice, setChoice] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading-failed" }
    | { kind: "sending" }
    | { kind: "sent" }
    | { kind: "error"; text: string }
  >({ kind: "idle" });
  const first = name.split(" ")[0] || name;

  useEffect(() => {
    if (!open || options) return;
    let active = true;
    fetch(`/api/profiles/${encodeURIComponent(handle)}/invitations`)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data: { options: InviteOption[] }) => {
        if (!active) return;
        setOptions(data.options);
        setChoice(
          data.options.find((item) => !item.invited)?.opportunityId ?? "",
        );
      })
      .catch(() => {
        if (active) setState({ kind: "loading-failed" });
      });
    return () => {
      active = false;
    };
  }, [handle, open, options]);

  const selected = options?.find((item) => item.opportunityId === choice);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setState({ kind: "sending" });
    try {
      const response = await fetch(
        `/api/profiles/${encodeURIComponent(handle)}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: selected.organizationId,
            opportunityId: selected.opportunityId,
            message,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      setOptions(
        (current) =>
          current?.map((item) =>
            item.opportunityId === selected.opportunityId
              ? { ...item, invited: true }
              : item,
          ) ?? null,
      );
      setState({ kind: "sent" });
    } catch (error) {
      setState({
        kind: "error",
        text:
          error instanceof Error && error.message
            ? error.message
            : "The invitation wasn't sent. Please try again.",
      });
    }
  };

  const available = options?.filter((item) => !item.invited) ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next && state.kind === "sent") {
          setState({ kind: "idle" });
          setMessage("");
          setChoice(available[0]?.opportunityId ?? "");
        }
      }}
    >
      <DialogContent className={styles.dialog}>
        <DialogTitle className="font-heading">
          Invite {first} to apply
        </DialogTitle>
        <DialogDescription>
          {`${first} gets the call and your note in their profile inbox and by email. An invitation isn’t a promise of acceptance; your usual guidelines and deadline apply.`}
        </DialogDescription>
        {state.kind === "sent" ? (
          <div className={styles.done}>
            <p role="status">
              Invitation sent for {selected?.title ?? "your call"}.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : state.kind === "loading-failed" ? (
          <p role="alert" className={styles.error}>
            Your open calls couldn&rsquo;t be loaded. Close this and try again.
          </p>
        ) : !options ? (
          <p role="status" className={styles.hint}>
            Loading your open calls…
          </p>
        ) : available.length === 0 ? (
          <p className={styles.hint}>
            {options.length ? (
              `${first} already has an invitation for each of your open calls.`
            ) : (
              <Sp>Your organization has no open, published calls right now.</Sp>
            )}
          </p>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <Field>
              <FieldLabel htmlFor={ids.call}>Call</FieldLabel>
              <NativeSelect
                id={ids.call}
                value={choice}
                className={styles.select}
                onChange={(event) => setChoice(event.target.value)}
              >
                {available.map((item) => (
                  <NativeSelectOption
                    key={item.opportunityId}
                    value={item.opportunityId}
                  >
                    {item.title}
                    {item.deadline
                      ? ` · closes ${shortDate(item.deadline)}`
                      : ""}
                    {new Set(available.map((o) => o.organizationId)).size > 1
                      ? ` · ${item.organizationName}`
                      : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor={ids.message}>
                Note to {first}{" "}
                <span className={styles.optional}>· optional</span>
              </FieldLabel>
              <Textarea
                id={ids.message}
                maxLength={1000}
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </Field>
            {state.kind === "error" && (
              <FieldError role="alert">{state.text}</FieldError>
            )}
            <div className={styles.actions}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={state.kind === "sending" || !selected}
              >
                {state.kind === "sending" ? "Sending…" : "Send invitation"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
