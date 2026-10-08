import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { PersonHue } from "@/components/missa/person-avatar";

/** One circle per submission, in the goal's own hue: solid once sent, tinted while still to go. */
const sent: Record<PersonHue, string> = {
  red: "bg-hue-red",
  orange: "bg-hue-orange",
  amber: "bg-hue-amber",
  yellow: "bg-hue-yellow",
  lime: "bg-hue-lime",
  green: "bg-hue-green",
  teal: "bg-hue-teal",
  blue: "bg-hue-blue",
  indigo: "bg-hue-indigo",
  purple: "bg-hue-purple",
  magenta: "bg-hue-magenta",
  pink: "bg-hue-pink",
};
const toGo: Record<PersonHue, string> = {
  red: "bg-hue-red-subtle text-hue-red-ink",
  orange: "bg-hue-orange-subtle text-hue-orange-ink",
  amber: "bg-hue-amber-subtle text-hue-amber-ink",
  yellow: "bg-hue-yellow-subtle text-hue-yellow-ink",
  lime: "bg-hue-lime-subtle text-hue-lime-ink",
  green: "bg-hue-green-subtle text-hue-green-ink",
  teal: "bg-hue-teal-subtle text-hue-teal-ink",
  blue: "bg-hue-blue-subtle text-hue-blue-ink",
  indigo: "bg-hue-indigo-subtle text-hue-indigo-ink",
  purple: "bg-hue-purple-subtle text-hue-purple-ink",
  magenta: "bg-hue-magenta-subtle text-hue-magenta-ink",
  pink: "bg-hue-pink-subtle text-hue-pink-ink",
};

export function GoalSubmissionProgress({
  done,
  target,
  hue = "green",
}: {
  done: number;
  target: number;
  hue?: PersonHue;
}) {
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <strong className="text-5xl font-semibold tracking-tight tabular-nums">
          {done}
        </strong>
        <span className="text-muted-foreground">of {target} submitted</span>
      </p>
      {target <= 24 ? (
        <>
          <div
            aria-hidden="true"
            className="mt-5 grid grid-cols-6 gap-2.5 sm:grid-cols-8"
          >
            {Array.from({ length: target }, (_, i) => (
              <span
                key={i}
                className={`flex aspect-square max-w-14 items-center justify-center rounded-full text-sm font-medium ${i < done ? `${sent[hue]} text-foreground` : toGo[hue]}`}
              >
                {i < done ? <Check className="size-5" /> : i + 1}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            One circle, one submission.
          </p>
        </>
      ) : (
        <Progress
          className="mt-5"
          aria-label="Submission progress"
          value={Math.min(100, (done / target) * 100)}
        />
      )}
      <p className="mt-4 font-medium">
        {done >= target
          ? "You reached your goal!"
          : `${target - done} more to go.`}
      </p>
    </div>
  );
}
