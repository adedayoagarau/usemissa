"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Building, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { ResidencyRankingRow } from "@missa/radar-adapters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SubmitResidencyReviewDialogProps {
  residency: ResidencyRankingRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newRating: number, newTotalScore: number) => void;
}

export function SubmitResidencyReviewDialog({
  residency,
  isOpen,
  onClose,
  onSuccess,
}: SubmitResidencyReviewDialogProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInRequired, setSignInRequired] = useState(false);

  if (!residency) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSignInRequired(false);

    if (!rating || rating < 1 || rating > 5) {
      setError("Choose a rating from 1 to 5.");
      return;
    }

    if (!reviewBody.trim() || reviewBody.trim().length < 10) {
      setError("Write at least 10 characters about the residency.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/rankings/residencies/${encodeURIComponent(residency.profileId)}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ratingScore: rating,
            reviewTitle: reviewTitle.trim() || undefined,
            reviewBody: reviewBody.trim(),
            isAnonymous,
          }),
        },
      );

      if (res.status === 401) {
        setSignInRequired(true);
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "We could not save your review. Try again.");
      }

      toast.success("Review submitted.");
      onSuccess?.(json.newRating, json.newTotalScore);
      onClose();

      // Reset form
      setRating(5);
      setReviewTitle("");
      setReviewBody("");
      setIsAnonymous(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not save your review. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Building className="h-5 w-5 text-primary" />
            <span>Review {residency.name}</span>
          </DialogTitle>
          <DialogDescription>
            Reviews are posted from your Missa account. You can post one review
            for each residency.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {signInRequired && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-border bg-muted p-3 text-xs text-foreground"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Sign in to post a review.{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(
                    typeof window === "undefined"
                      ? "/rankings/residencies"
                      : `${window.location.pathname}${window.location.search}`,
                  )}`}
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Log in
                </Link>
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Rating Picker */}
          <Field>
            <FieldLabel>Overall Resident Experience</FieldLabel>
            <div className="flex items-center gap-1.5 pt-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (hoverRating ?? rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="rounded-md p-1 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Rate ${star} of 5 stars`}
                  >
                    <Star
                      className={`h-6 w-6 transition-transform ${
                        active
                          ? "scale-110 fill-warning text-warning"
                          : "text-muted-foreground/40 hover:text-muted-foreground"
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 font-mono text-sm font-semibold text-foreground">
                {hoverRating ?? rating}.0 / 5.0
              </span>
            </div>
          </Field>

          {/* Review Title */}
          <Field>
            <FieldLabel htmlFor="review-title">
              Review Headline (optional)
            </FieldLabel>
            <Input
              id="review-title"
              placeholder="e.g. Uninterrupted solitude and generous studio space"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </Field>

          {/* Review Body */}
          <Field>
            <FieldLabel htmlFor="review-body">
              Your Residency Experience *
            </FieldLabel>
            <Textarea
              id="review-body"
              placeholder="How was the working environment, studio solitude, accommodation quality, staff support, and financial honesty?"
              rows={4}
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </Field>

          {/* Author Name & Anonymity */}
          <div className="space-y-2 border-t border-border pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="anonymous-check"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(Boolean(checked))}
                disabled={isSubmitting}
              />
              <label
                htmlFor="anonymous-check"
                className="cursor-pointer text-xs font-medium text-foreground select-none"
              >
                Post anonymously as &quot;Anonymous Resident&quot;
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {isAnonymous
                ? "Your name is hidden. The review is still linked to your account."
                : "Your account name is shown with the review."}
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Submit Review</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
