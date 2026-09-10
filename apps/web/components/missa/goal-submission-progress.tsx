import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
export function GoalSubmissionProgress({
  done,
  target,
}: {
  done: number;
  target: number;
}) {
  return (
    <div>
      <p className="flex items-baseline gap-3">
        <strong className="text-6xl font-semibold tracking-tight">
          {done}
        </strong>
        <span>of {target} submitted</span>
      </p>
      {target <= 24 ? (
        <>
          <div aria-hidden="true" className="mt-6 grid grid-cols-6 gap-3">
            {Array.from({ length: target }, (_, i) => (
              <span
                key={i}
                className={`flex aspect-square items-center justify-center rounded-full border border-primary-foreground ${i < done ? "bg-primary-foreground text-primary" : "text-primary-foreground"}`}
              >
                {i < done ? (
                  <Check className="size-5" />
                ) : (
                  <span className="text-sm">{i + 1}</span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm">One circle, one submission.</p>
        </>
      ) : (
        <Progress
          className="mt-6"
          aria-label="Submission progress"
          value={Math.min(100, (done / target) * 100)}
        />
      )}
      <p className="mt-4 text-lg">
        {done >= target
          ? "You reached your goal!"
          : `${target - done} more to go.`}
      </p>
    </div>
  );
}
