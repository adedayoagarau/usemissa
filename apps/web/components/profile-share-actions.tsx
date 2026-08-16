"use client";

import { useState } from "react";
import { Copy, Share2, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProfileShareActions({
  displayName,
  url,
}: {
  displayName: string;
  url: string;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const text = `${displayName} on Missa`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${text} ${url}`);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  async function shareFromDevice() {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: text, text, url });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
    }
  }

  return (
    <div className="flex flex-col items-start gap-row sm:items-end">
      <ButtonGroup aria-label="Profile sharing">
        <Dialog>
          <DialogTrigger render={<Button type="button" variant="outline" />}>
            <Share2 aria-hidden="true" />
            Share Profile
          </DialogTrigger>
          <DialogContent className="[&_[data-slot=dialog-close]]:min-h-[44px] [&_[data-slot=dialog-close]]:min-w-[44px]">
            <DialogHeader>
              <DialogTitle>Share this Profile</DialogTitle>
              <DialogDescription>
                Send the public page without changing what appears on it.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-row">
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] justify-start"
                onClick={copyLink}
              >
                <Copy aria-hidden="true" />
                Copy link
              </Button>
              <Button
                nativeButton={false}
                render={
                  <a
                    href={`https://wa.me/?text=${encodedText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                variant="outline"
                className="min-h-[44px] justify-start"
              >
                WhatsApp
              </Button>
              <Button
                nativeButton={false}
                render={
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                variant="outline"
                className="min-h-[44px] justify-start"
              >
                LinkedIn
              </Button>
              <Button
                nativeButton={false}
                render={
                  <a
                    href={`https://bsky.app/intent/compose?text=${encodedText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                variant="outline"
                className="min-h-[44px] justify-start"
              >
                Bluesky
              </Button>
              <Button
                nativeButton={false}
                render={
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                variant="outline"
                className="min-h-[44px] justify-start"
              >
                Facebook
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-[44px] justify-start"
                onClick={shareFromDevice}
              >
                <Smartphone aria-hidden="true" />
                More options
              </Button>
            </div>
            <p className="min-h-5 text-sm text-muted-foreground" role="status">
              {copyState === "copied"
                ? "Link copied."
                : copyState === "failed"
                  ? "Copy failed. Select the address from your browser."
                  : ""}
            </p>
          </DialogContent>
        </Dialog>
        <Button type="button" variant="outline" onClick={copyLink}>
          <Copy aria-hidden="true" />
          Copy link
        </Button>
      </ButtonGroup>
      <p className="min-h-5 text-sm text-muted-foreground" role="status">
        {copyState === "copied"
          ? "Link copied."
          : copyState === "failed"
            ? "Copy failed. Select the address from your browser."
            : ""}
      </p>
    </div>
  );
}
