import { toast } from 'sonner';

type SaveFailureBody = { code?: string; error?: string; actionHref?: string; actionLabel?: string };

/**
 * Show why a Tracker save did not happen. Reaching the Free tracking limit is
 * not an error, so it uses a neutral toast with a way to make room; anything
 * else stays an error.
 */
export function showSaveFailure(body: SaveFailureBody, fallback: string): void {
  if (body.code === 'tracking-limit' && body.error) {
    toast(body.error, {
      duration: 12_000,
      action: body.actionHref
        ? { label: body.actionLabel ?? 'Open Tracker', onClick: () => window.location.assign(body.actionHref!) }
        : undefined,
    });
    return;
  }
  toast.error(body.error ?? fallback);
}
