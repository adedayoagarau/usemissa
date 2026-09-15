"use client";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function InboxError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="max-w-2xl">
        <h1 className="font-sans text-3xl font-semibold tracking-tight">
          Inbox
        </h1>
        <p className="mt-2 text-muted-foreground">
          Decisions, reminders and changes connected to your Missa work.
        </p>
      </header>
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>We could not load your Inbox</AlertTitle>
        <AlertDescription>
          Your Tracker, applications and notification settings are unchanged.
          Check your connection and try again.
        </AlertDescription>
        <Button type="button" variant="outline" onClick={reset}>
          Try loading Inbox again
        </Button>
      </Alert>
    </div>
  );
}
