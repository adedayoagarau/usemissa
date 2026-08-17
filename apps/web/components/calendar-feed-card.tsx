"use client";

import { useState, useTransition } from "react";
import { CalendarSync, Copy, RefreshCw, Unplug } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

export function CalendarFeedCard({
  initialConnected,
}: {
  initialConnected: boolean;
}) {
  const [connected, setConnected] = useState(initialConnected);
  const [confirmation, setConfirmation] = useState<"rotate" | "disconnect">();
  const [status, setStatus] = useState<string>();
  const [pending, startTransition] = useTransition();

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setStatus("Private calendar link copied.");
  }

  function createOrCopy() {
    setStatus(undefined);
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/calendar-feed", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "create" }),
        });
        const body = (await response.json()) as {
          url?: string;
          error?: string;
        };
        if (!response.ok || !body.url)
          throw new Error(body.error ?? "Calendar connection is unavailable.");
        setConnected(true);
        await copyUrl(body.url);
      } catch (cause) {
        setStatus(
          cause instanceof Error
            ? cause.message
            : "Calendar connection is unavailable.",
        );
      }
    });
  }

  function confirmAction() {
    const action = confirmation;
    if (!action) return;
    setStatus(undefined);
    startTransition(async () => {
      try {
        if (action === "disconnect") {
          const response = await fetch("/api/me/calendar-feed", {
            method: "DELETE",
          });
          if (!response.ok)
            throw new Error("We could not disconnect the calendar link.");
          setConnected(false);
          setStatus("Calendar link disconnected.");
        } else {
          const response = await fetch("/api/me/calendar-feed", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "rotate" }),
          });
          const body = (await response.json()) as {
            url?: string;
            error?: string;
          };
          if (!response.ok || !body.url)
            throw new Error(
              body.error ?? "We could not rotate the calendar link.",
            );
          await copyUrl(body.url);
          setStatus(
            "A new private calendar link was copied. The old link no longer works.",
          );
        }
      } catch (cause) {
        setStatus(
          cause instanceof Error
            ? cause.message
            : "Calendar connection is unavailable.",
        );
      } finally {
        setConfirmation(undefined);
      }
    });
  }

  return (
    <>
      <Item variant="outline">
        <ItemMedia variant="icon">
          <CalendarSync aria-hidden="true" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Calendar subscription</ItemTitle>
          <p>
            {connected
              ? "Your calendar can read private Tracker dates through a subscription link."
              : "Create a private link for exact Tracker deadlines and expected response dates."}
          </p>
          <p>{connected ? "Connected" : "Not connected"}</p>
          {status ? (
            <p role="status" aria-live="polite">
              {status}
            </p>
          ) : null}
        </ItemContent>
        <ItemActions>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={createOrCopy}
          >
            <Copy aria-hidden="true" />{" "}
            {connected ? "Copy link" : "Create link"}
          </Button>
          {connected ? (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmation("rotate")}
              >
                <RefreshCw aria-hidden="true" /> Rotate
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmation("disconnect")}
              >
                <Unplug aria-hidden="true" /> Disconnect
              </Button>
            </>
          ) : null}
        </ItemActions>
      </Item>

      <AlertDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => !open && setConfirmation(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation === "rotate"
                ? "Replace the calendar link?"
                : "Disconnect the calendar link?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation === "rotate"
                ? "The old link will stop working. You will need to subscribe again with the new link."
                : "Calendar apps using this link will stop receiving Tracker dates."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current link</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {confirmation === "rotate" ? "Replace link" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
