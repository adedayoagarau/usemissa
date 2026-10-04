"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  Inbox,
  Mail,
  MailOpen,
  RotateCcw,
  Send,
  Users,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { INQUIRY_TOPIC_OPTIONS } from "./profile-connect";
import styles from "./profile-inbox.module.css";

export type InboxInquiry = {
  id: string;
  senderName: string;
  senderEmail: string;
  topic: string;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: string;
};

export type InboxInvitation = {
  id: string;
  organizationName: string;
  opportunityId: string;
  opportunityTitle: string;
  opportunitySlug?: string;
  deadline?: string;
  open: boolean;
  message: string;
  inviterName?: string;
  status: "sent" | "read" | "declined" | "archived";
  createdAt: string;
};

export type InboxPerson = {
  accountId: string;
  name: string;
  handle?: string;
  since: string;
};

export type ProfileInboxData = {
  inquiries: InboxInquiry[];
  invitations: InboxInvitation[];
  followers: InboxPerson[];
  following: InboxPerson[];
};

const topicLabel = (topic: string) =>
  INQUIRY_TOPIC_OPTIONS.find((option) => option.value === topic)?.label ??
  "Something else";

function when(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

/**
 * Everything that reached a creator through their public profile: messages,
 * invitations to apply, followers and the creators they follow. `initial` with
 * `demo` renders a fixture that never calls the network.
 */
export function ProfileInbox({
  initial,
  demo = false,
}: {
  initial?: ProfileInboxData;
  demo?: boolean;
}) {
  const [data, setData] = useState<ProfileInboxData | null>(initial ?? null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/me/profile-inbox");
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error);
    return body as ProfileInboxData;
  }, []);

  useEffect(() => {
    if (demo || initial) return;
    let active = true;
    load()
      .then((next) => {
        if (active) setData(next);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error && reason.message
              ? reason.message
              : "Could not load your profile inbox. Please retry.",
          );
      });
    return () => {
      active = false;
    };
  }, [demo, initial, load]);

  const change = async (
    type: "inquiry" | "invitation",
    id: string,
    status: string,
    message: string,
  ) => {
    setData((current) =>
      current
        ? {
            ...current,
            inquiries:
              type === "inquiry"
                ? current.inquiries.map((item) =>
                    item.id === id
                      ? { ...item, status: status as InboxInquiry["status"] }
                      : item,
                  )
                : current.inquiries,
            invitations:
              type === "invitation"
                ? current.invitations.map((item) =>
                    item.id === id
                      ? { ...item, status: status as InboxInvitation["status"] }
                      : item,
                  )
                : current.invitations,
          }
        : current,
    );
    setNotice(message);
    if (demo) return;
    const response = await fetch("/api/me/profile-inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, status }),
    }).catch(() => undefined);
    if (!response?.ok) {
      setNotice("That change wasn't saved. Reload and try again.");
      setData(await load().catch(() => data));
    }
  };

  const unfollow = async (person: InboxPerson) => {
    setData((current) =>
      current
        ? {
            ...current,
            following: current.following.filter(
              (item) => item.accountId !== person.accountId,
            ),
          }
        : current,
    );
    setNotice(`You've unfollowed ${person.name}.`);
    if (demo || !person.handle) return;
    const response = await fetch(
      `/api/profiles/${encodeURIComponent(person.handle)}/follow`,
      { method: "DELETE" },
    ).catch(() => undefined);
    if (!response?.ok) {
      setNotice("That change wasn't saved. Reload and try again.");
      setData(await load().catch(() => data));
    }
  };

  if (error)
    return (
      <div role="alert" className={styles.alert}>
        <p>{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  if (!data)
    return (
      <p role="status" className={styles.loading}>
        Loading your profile inbox…
      </p>
    );

  const inquiries = data.inquiries.filter((item) =>
    showArchived ? item.status === "archived" : item.status !== "archived",
  );
  const invitations = data.invitations.filter((item) =>
    showArchived
      ? item.status === "archived" || item.status === "declined"
      : item.status === "sent" || item.status === "read",
  );
  const unreadInquiries = data.inquiries.filter(
    (item) => item.status === "new",
  ).length;
  const unreadInvitations = data.invitations.filter(
    (item) => item.status === "sent",
  ).length;

  return (
    <main id="main-content" className={styles.inbox}>
      <header className={styles.head}>
        <div>
          <h1 className="font-heading">Profile inbox</h1>
          <p>
            Messages and invitations from your public profile. Senders never see
            your email address unless you reply.
          </p>
        </div>
        <div className={styles.headActions}>
          <Button
            variant="ghost"
            aria-pressed={showArchived}
            onClick={() => setShowArchived((value) => !value)}
          >
            {showArchived ? (
              <Inbox aria-hidden="true" />
            ) : (
              <Archive aria-hidden="true" />
            )}
            {showArchived ? "Show current" : "Show archived"}
          </Button>
          <Link
            href="/profile/portfolio"
            className={buttonVariants({ variant: "outline" })}
          >
            Edit profile
          </Link>
        </div>
      </header>
      <p role="status" className={styles.notice}>
        {notice}
      </p>
      <Tabs defaultValue="messages">
        <TabsList aria-label="Profile inbox sections">
          <TabsTrigger value="messages">
            Messages
            {unreadInquiries > 0 && (
              <span className={cn(styles.count, "font-mono")}>
                {unreadInquiries}
                <span className="sr-only"> new</span>
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations
            {unreadInvitations > 0 && (
              <span className={cn(styles.count, "font-mono")}>
                {unreadInvitations}
                <span className="sr-only"> new</span>
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="followers">
            Followers
            <span className={cn(styles.quietCount, "font-mono")}>
              {data.followers.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className={styles.panel}>
          {inquiries.length === 0 ? (
            <EmptyState
              icon={Mail}
              title={showArchived ? "No archived messages" : "No messages yet"}
              text={
                showArchived
                  ? "Messages you archive appear here."
                  : "When someone writes to you from your profile, it appears here and in your email."
              }
            />
          ) : (
            <ol className={styles.list}>
              {inquiries.map((item) => (
                <li
                  key={item.id}
                  className={styles.item}
                  data-unread={item.status === "new" || undefined}
                >
                  <div className={styles.itemHead}>
                    <h2 className="font-heading">{item.senderName}</h2>
                    <span className={cn(styles.meta, "font-mono")}>
                      {topicLabel(item.topic)} · {when(item.createdAt)}
                    </span>
                  </div>
                  <p className={styles.message}>{item.message}</p>
                  <div className={styles.itemActions}>
                    <a
                      className={buttonVariants({ size: "sm" })}
                      href={`mailto:${item.senderEmail}?subject=${encodeURIComponent("Your message on Missa")}`}
                      onClick={() => {
                        if (item.status === "new")
                          void change("inquiry", item.id, "read", "");
                      }}
                    >
                      <Mail aria-hidden="true" />
                      Reply by email
                    </a>
                    {item.status === "archived" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          change(
                            "inquiry",
                            item.id,
                            "read",
                            `Moved ${item.senderName}'s message back to your inbox.`,
                          )
                        }
                      >
                        <RotateCcw aria-hidden="true" />
                        Move to inbox
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            change(
                              "inquiry",
                              item.id,
                              item.status === "new" ? "read" : "new",
                              item.status === "new"
                                ? "Marked as read."
                                : "Marked as unread.",
                            )
                          }
                        >
                          <MailOpen aria-hidden="true" />
                          {item.status === "new"
                            ? "Mark as read"
                            : "Mark as unread"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            change(
                              "inquiry",
                              item.id,
                              "archived",
                              `Archived ${item.senderName}'s message.`,
                            )
                          }
                        >
                          <Archive aria-hidden="true" />
                          Archive
                        </Button>
                      </>
                    )}
                  </div>
                  <p className={styles.small}>
                    Replying opens your email app, so {item.senderName} will see
                    your email address.
                  </p>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="invitations" className={styles.panel}>
          {invitations.length === 0 ? (
            <EmptyState
              icon={Send}
              title={
                showArchived ? "No archived invitations" : "No invitations yet"
              }
              text={
                showArchived
                  ? "Invitations you decline or archive appear here."
                  : "When an organization on Missa invites you to apply to an open call, it appears here."
              }
            />
          ) : (
            <ol className={styles.list}>
              {invitations.map((item) => (
                <li
                  key={item.id}
                  className={styles.item}
                  data-unread={item.status === "sent" || undefined}
                >
                  <div className={styles.itemHead}>
                    <h2 className="font-heading">
                      {item.organizationName} invited you to apply
                    </h2>
                    <span className={cn(styles.meta, "font-mono")}>
                      {when(item.createdAt)}
                    </span>
                  </div>
                  <p className={styles.call}>
                    <strong>{item.opportunityTitle}</strong>
                    <span className="font-mono">
                      {item.open
                        ? item.deadline
                          ? `Closes ${when(item.deadline)}`
                          : "Open"
                        : "No longer open"}
                    </span>
                  </p>
                  {item.message && (
                    <blockquote className={styles.note}>
                      {item.message}
                      {item.inviterName && <cite>— {item.inviterName}</cite>}
                    </blockquote>
                  )}
                  <div className={styles.itemActions}>
                    <Link
                      className={buttonVariants({ size: "sm" })}
                      href={`/opportunities/${item.opportunitySlug ?? item.opportunityId}`}
                      onClick={() => {
                        if (item.status === "sent")
                          void change("invitation", item.id, "read", "");
                      }}
                    >
                      See the call
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                    {item.status === "archived" ||
                    item.status === "declined" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          change(
                            "invitation",
                            item.id,
                            "read",
                            "Moved the invitation back to your inbox.",
                          )
                        }
                      >
                        <RotateCcw aria-hidden="true" />
                        Move to inbox
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            change(
                              "invitation",
                              item.id,
                              "declined",
                              `Marked ${item.opportunityTitle} as not for you.`,
                            )
                          }
                        >
                          <X aria-hidden="true" />
                          Not for me
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            change(
                              "invitation",
                              item.id,
                              "archived",
                              "Archived the invitation.",
                            )
                          }
                        >
                          <Archive aria-hidden="true" />
                          Archive
                        </Button>
                      </>
                    )}
                  </div>
                  <p className={styles.small}>
                    An invitation isn&rsquo;t an acceptance. The call&rsquo;s
                    guidelines and deadline still apply. {item.organizationName}{" "}
                    isn&rsquo;t told when you decline.
                  </p>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="followers" className={styles.panel}>
          {data.followers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No followers yet"
              text="Signed-in Missa members can follow your profile. Share your address to get started."
            />
          ) : (
            <People people={data.followers} />
          )}
        </TabsContent>

        <TabsContent value="following" className={styles.panel}>
          {data.following.length === 0 ? (
            <EmptyState
              icon={Users}
              title="You're not following anyone"
              text="Follow creators from their public profile to keep them here."
            />
          ) : (
            <People people={data.following} onUnfollow={unfollow} />
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}

function People({
  people,
  onUnfollow,
}: {
  people: InboxPerson[];
  onUnfollow?: (person: InboxPerson) => void;
}) {
  return (
    <ul className={styles.people}>
      {people.map((person) => (
        <li key={person.accountId}>
          <span className={styles.person}>
            {person.handle ? (
              <Link href={`/@${person.handle}`} className="font-heading">
                {person.name}
              </Link>
            ) : (
              <span className="font-heading">{person.name}</span>
            )}
            <span className={cn(styles.meta, "font-mono")}>
              {person.handle ? `@${person.handle} · ` : ""}since{" "}
              {when(person.since)}
            </span>
          </span>
          {onUnfollow && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUnfollow(person)}
            >
              Unfollow
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Mail;
  title: string;
  text: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
