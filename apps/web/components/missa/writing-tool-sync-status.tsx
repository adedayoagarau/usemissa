"use client";
import { Button } from "@/components/ui/button";
export function WritingToolSyncStatus({
  sync,
}: {
  sync: {
    status: string;
    needsRecovery?: boolean;
    conflict: unknown;
    busy: boolean;
    download: () => void;
    resolve: (local: boolean) => void;
    retry: () => void | Promise<void>;
  };
}) {
  return (
    <div className="space-y-2">
      <p role="status" className="text-sm text-muted-foreground">
        {sync.status}
      </p>
      {sync.conflict ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="inline" onClick={sync.download}>
            Download both copies
          </Button>
          <Button
            variant="outline"
            size="inline"
            disabled={sync.busy}
            onClick={() => sync.resolve(false)}
          >
            Use account copy
          </Button>
          <Button
            variant="outline"
            size="inline"
            disabled={sync.busy}
            onClick={() => sync.resolve(true)}
          >
            Keep device copy
          </Button>
        </div>
      ) : sync.needsRecovery ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="inline" onClick={sync.download}>
            Download notes backup
          </Button>
          <Button
            variant="ghost"
            size="inline"
            disabled={sync.busy}
            onClick={() => void sync.retry()}
          >
            Retry account save
          </Button>
        </div>
      ) : null}
    </div>
  );
}
