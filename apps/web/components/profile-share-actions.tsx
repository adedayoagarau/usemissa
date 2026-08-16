"use client";

import { useSyncExternalStore } from "react";
import { Copy, Share2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProfileShareActions({
  displayName,
  url,
}: {
  displayName: string;
  url: string;
}) {
  const canShareFromDevice = useSyncExternalStore(
    () => () => undefined,
    () => Boolean((navigator as Navigator & { share?: unknown }).share),
    () => false,
  );
  const text = `${displayName} on Missa`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${text} ${url}`);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied.");
    } catch {
      toast("Copy failed. Select the address from your browser.");
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" />}
        className="min-h-[44px]"
      >
        <Share2 aria-hidden="true" />
        Share
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem
          className="min-h-[44px]"
          onClick={() => void copyLink()}
        >
          <Copy aria-hidden="true" />
          Copy link
        </DropdownMenuItem>
        {canShareFromDevice ? (
          <DropdownMenuItem
            className="min-h-[44px]"
            onClick={() => void shareFromDevice()}
          >
            <Smartphone aria-hidden="true" />
            More options
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="min-h-[44px]"
          render={
            <a
              href={`https://wa.me/?text=${encodedText}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-[44px]"
          render={
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-[44px]"
          render={
            <a
              href={`https://bsky.app/intent/compose?text=${encodedText}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          Bluesky
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-[44px]"
          render={
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          Facebook
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
