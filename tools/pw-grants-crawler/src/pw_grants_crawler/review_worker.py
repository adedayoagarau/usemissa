from __future__ import annotations

import argparse
import os
import time
from datetime import datetime, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo

from .ai_reviewer import DeepSeekReviewer
from .alerts import recipient_hash, send_daily_digest
from .harness import DEFAULT_MODEL, HarnessStore, heartbeat_loop
from .health import start_health_server
from .neon import NeonStore
from .promotion import publish_opportunity


def should_run_morning(now: datetime, timezone_name: str, hour: int, last_date: str | None) -> tuple[bool, str]:
    local = now.astimezone(ZoneInfo(timezone_name))
    local_date = local.date().isoformat()
    return local.hour >= hour and local_date != last_date, local_date


def process_batch(
    store: HarnessStore,
    reviewer: DeepSeekReviewer,
    database_url: str,
    *,
    owner: str,
    release: str,
    batch_size: int,
    publish_threshold: float,
    daily_cost_limit_usd: float,
) -> dict[str, int]:
    counts = {"reviewed": 0, "published": 0, "needs_human": 0, "rejected": 0, "failed": 0}
    spent = store.cost_today()
    for job in store.claim(owner, limit=batch_size):
        try:
            candidate = store.candidate(job)
            if job.requested_action == "publish":
                publish_opportunity(database_url, candidate)
                store.mark_published(job.id, candidate.opportunity_id, "operator-request")
                counts["published"] += 1
                continue
            if spent >= daily_cost_limit_usd:
                store.defer(job.id, "Daily DeepSeek cost limit reached")
                continue
            result = reviewer.review(candidate)
            spent += result.estimated_cost_usd or 0
            store.save_decision(
                job, candidate, model=reviewer.model, recommendation=result.recommendation,
                confidence=result.confidence, reasons=result.reasons, checks=result.checks,
                raw_output=result.raw, input_hash=result.input_hash, output_hash=result.output_hash,
                input_tokens=result.input_tokens, output_tokens=result.output_tokens,
                estimated_cost_usd=result.estimated_cost_usd, release=release,
            )
            counts["reviewed"] += 1
            if result.recommendation == "publish" and result.confidence >= publish_threshold:
                publish_opportunity(database_url, candidate)
                store.mark_published(job.id, candidate.opportunity_id, reviewer.model)
                counts["published"] += 1
            elif result.recommendation == "needs_human" or result.recommendation == "publish":
                if result.recommendation == "publish":
                    store.mark_needs_human(job.id, f"AI confidence {result.confidence:.3f} is below the {publish_threshold:.3f} publication threshold")
                counts["needs_human"] += 1
            else:
                counts["rejected"] += 1
            if spent >= daily_cost_limit_usd:
                print(f"[gary-reviewer] cost ceiling reached (${spent:.4f}); remaining jobs stay queued")
        except Exception as error:
            store.fail(job.id, str(error))
            counts["failed"] += 1
            print(f"[gary-reviewer] job={job.id} failed: {error}")
    return counts


def run_cycle(args: argparse.Namespace, store: HarnessStore, reviewer: DeepSeekReviewer, owner: str, release: str) -> dict[str, object]:
    started = datetime.now(timezone.utc)
    enqueued = store.enqueue_unreviewed(limit=args.enqueue_limit)
    superseded = store.supersede_stale_jobs()
    totals = {"reviewed": 0, "published": 0, "needs_human": 0, "rejected": 0, "failed": 0}
    while True:
        batch = process_batch(
            store, reviewer, args.database_url, owner=owner, release=release,
            batch_size=args.batch_size, publish_threshold=args.publish_threshold,
            daily_cost_limit_usd=args.daily_cost_limit_usd,
        )
        for key, value in batch.items():
            totals[key] += value
        if sum(batch.values()) == 0 or args.once:
            break
    summary = store.cycle_summary(started)
    summary.update({"cycle": totals, "enqueued": enqueued, "superseded": superseded})
    return summary


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run Gary's morning AI review and publication worker.")
    parser.add_argument("--database-url", default=os.environ.get("DATABASE_URL"))
    parser.add_argument("--model", default=os.environ.get("GARY_DEEPSEEK_MODEL", DEFAULT_MODEL))
    parser.add_argument("--timezone", default=os.environ.get("GARY_REVIEW_TIMEZONE", "America/Los_Angeles"))
    parser.add_argument("--review-hour", type=int, default=int(os.environ.get("GARY_REVIEW_HOUR", "8")))
    parser.add_argument("--poll-seconds", type=int, default=int(os.environ.get("GARY_REVIEW_POLL_SECONDS", "60")))
    parser.add_argument("--batch-size", type=int, default=int(os.environ.get("GARY_REVIEW_BATCH_SIZE", "20")))
    parser.add_argument("--enqueue-limit", type=int, default=int(os.environ.get("GARY_REVIEW_ENQUEUE_LIMIT", "1000")))
    parser.add_argument("--publish-threshold", type=float, default=float(os.environ.get("GARY_PUBLISH_THRESHOLD", "0.85")))
    parser.add_argument("--daily-cost-limit-usd", type=float, default=float(os.environ.get("GARY_DAILY_AI_COST_LIMIT_USD", "1.00")))
    parser.add_argument("--once", action="store_true", help="Run immediately once, regardless of the morning schedule.")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.database_url:
        raise SystemExit("gary-review-worker requires DATABASE_URL")
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        raise SystemExit("gary-review-worker requires DEEPSEEK_API_KEY")
    if not 0 <= args.review_hour <= 23 or args.batch_size < 1 or args.poll_seconds < 1:
        raise SystemExit("review-hour must be 0..23; batch-size and poll-seconds must be positive")

    NeonStore(args.database_url).ensure_schema()
    start_health_server()
    store = HarnessStore(args.database_url)
    release = store.register_release(args.model)
    reviewer = DeepSeekReviewer(api_key, model=args.model)
    owner = os.environ.get("RAILWAY_REPLICA_ID") or f"gary-reviewer-{uuid4().hex[:12]}"
    last_date: str | None = None
    store.heartbeat("reviewer", owner, "starting", release=release)
    while True:
        due, local_date = should_run_morning(datetime.now(timezone.utc), args.timezone, args.review_hour, last_date)
        if args.once or due:
            with heartbeat_loop(store, "reviewer", owner, release=release, status="working"):
                summary = run_cycle(args, store, reviewer, owner, release)
            recipient = os.environ.get("GARY_REVIEW_EMAIL")
            alert = send_daily_digest(
                api_key=os.environ.get("RESEND_API_KEY"), sender=os.environ.get("RESEND_FROM"),
                recipient=recipient, digest_date=datetime.now(ZoneInfo(args.timezone)).date(),
                summary=summary, dashboard_url=os.environ.get("GARY_DASHBOARD_URL"),
            )
            store.record_digest(
                datetime.now(ZoneInfo(args.timezone)).date(), args.timezone,
                recipient_hash(recipient or "unconfigured"), alert.status, summary,
                provider_message_id=alert.provider_message_id, error=alert.error,
            )
            print(f"[gary-reviewer] cycle={local_date} summary={summary} email={alert.status}")
            last_date = local_date
            store.heartbeat("reviewer", owner, "healthy", release=release, progress=summary)
            if args.once:
                return 0
        else:
            store.heartbeat("reviewer", owner, "idle", release=release, progress={"next_cycle_after_hour": args.review_hour, "timezone": args.timezone})
        time.sleep(args.poll_seconds)


if __name__ == "__main__":
    raise SystemExit(main())
