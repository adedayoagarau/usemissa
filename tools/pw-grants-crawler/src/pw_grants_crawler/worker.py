from __future__ import annotations

import argparse
import os
import shutil
import time
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import uuid4

from .neon import NeonStore
from .runner import CrawlConfig, crawl_to_manifest
from .source_schema import calendar_month_range


def run_mode(backfill_status: str) -> str:
    return "refresh" if backfill_status == "complete" else "backfill"


@dataclass(frozen=True, slots=True)
class WorkerConfig:
    source_id: str = "pw.org"
    source_name: str = "Poets & Writers Writing Contests, Grants & Awards"
    adapter: str = "poets-writers"
    index_url: str = "https://www.pw.org/grants"
    limit: int | None = None
    output_root: Path = Path("outputs/gary-worker")
    timeout: float = 30.0
    max_index_pages: int = 50
    max_site_pages: int = 5
    max_call_images: int = 1
    max_asset_bytes: int = 5_000_000
    render: bool = False
    freshness_hours: int = 24
    poll_seconds: int = 60
    retain_output: bool = False
    backfill_calendar_start_month: str | None = None
    backfill_calendar_end_month: str | None = None
    refresh_calendar_months: int = 2


def calendar_bounds(
    mode: str,
    now: date,
    *,
    backfill_start_month: str | None,
    backfill_end_month: str | None,
    refresh_calendar_months: int,
) -> tuple[str | None, str | None]:
    if mode == "backfill":
        if (backfill_start_month is None) != (backfill_end_month is None):
            raise ValueError("backfill calendar start and end months must be provided together")
        return backfill_start_month, backfill_end_month
    if mode == "refresh":
        return calendar_month_range(now.strftime("%Y-%m"), refresh_calendar_months)
    raise ValueError(f"unsupported crawl mode: {mode}")


def run_once(
    config: WorkerConfig,
    store: NeonStore,
    *,
    owner: str | None = None,
    force_backfill: bool = False,
) -> str | None:
    owner = owner or str(uuid4())
    store.register_source(
        source_id=config.source_id,
        adapter=config.adapter,
        name=config.source_name,
        seed_url=config.index_url,
        freshness_hours=config.freshness_hours,
        config={"worker": "gary", "index_url": config.index_url},
    )
    if force_backfill:
        store.request_backfill(config.source_id)
    claim = store.claim_source(config.source_id, owner)
    if claim is None:
        return None
    mode = run_mode(claim["backfill_status"])
    calendar_start_month, calendar_end_month = calendar_bounds(
        mode,
        datetime.now(timezone.utc).date(),
        backfill_start_month=config.backfill_calendar_start_month,
        backfill_end_month=config.backfill_calendar_end_month,
        refresh_calendar_months=config.refresh_calendar_months,
    )
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_dir = config.output_root / f"{config.source_id.replace('.', '-')}-{mode}-{timestamp}"
    crawl_config = CrawlConfig(
        index_url=claim["seed_url"],
        limit=config.limit,
        timeout=config.timeout,
        max_index_pages=config.max_index_pages,
        max_site_pages=config.max_site_pages,
        max_call_images=config.max_call_images,
        max_asset_bytes=config.max_asset_bytes,
        render=config.render,
        calendar_start_month=calendar_start_month,
        calendar_end_month=calendar_end_month,
    )
    try:
        manifest_path = crawl_to_manifest(crawl_config, output_dir)
        run_id = store.ingest_manifest(
            manifest_path,
            source_id=config.source_id,
            mode=mode,
            source_name=config.source_name,
            adapter=config.adapter,
            freshness_hours=config.freshness_hours,
        )
        store.release_source(config.source_id, owner)
        if not config.retain_output:
            shutil.rmtree(output_dir, ignore_errors=True)
        return run_id
    except Exception as error:
        store.fail_source(config.source_id, owner, str(error))
        raise


def run_worker(
    config: WorkerConfig,
    store: NeonStore,
    *,
    once: bool = False,
    force_backfill: bool = False,
) -> None:
    owner = str(uuid4())
    while True:
        run_id = run_once(config, store, owner=owner, force_backfill=force_backfill)
        force_backfill = False
        if run_id:
            print(f"[gary-worker] completed run={run_id}")
        if once:
            return
        time.sleep(config.poll_seconds if run_id is None else min(config.poll_seconds, 5))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run Gary continuously against Neon.")
    parser.add_argument("--source-id", default="pw.org")
    parser.add_argument("--index-url", default="https://www.pw.org/grants")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--output-root", type=Path, default=Path("outputs/gary-worker"))
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--max-index-pages", type=int, default=50)
    parser.add_argument("--max-site-pages", type=int, default=5)
    parser.add_argument("--max-call-images", type=int, default=1)
    parser.add_argument("--max-asset-bytes", type=int, default=5_000_000)
    parser.add_argument("--freshness-hours", type=int, default=24)
    parser.add_argument("--poll-seconds", type=int, default=60)
    parser.add_argument(
        "--render",
        action="store_true",
        default=os.environ.get("GARY_RENDER", "").casefold() in {"1", "true", "yes", "on"},
        help="Use the bounded browser renderer for JavaScript-only host pages.",
    )
    parser.add_argument("--retain-output", action="store_true")
    parser.add_argument(
        "--calendar-start-month",
        default=os.environ.get("GARY_BACKFILL_CALENDAR_START"),
        help="Inclusive YYYY-MM start for the initial calendar backfill.",
    )
    parser.add_argument(
        "--calendar-end-month",
        default=os.environ.get("GARY_BACKFILL_CALENDAR_END"),
        help="Inclusive YYYY-MM end for the initial calendar backfill.",
    )
    parser.add_argument(
        "--refresh-calendar-months",
        type=int,
        default=int(os.environ.get("GARY_REFRESH_CALENDAR_MONTHS", "2")),
    )
    parser.add_argument("--once", action="store_true", help="Run one due backfill/refresh and exit.")
    parser.add_argument(
        "--force-backfill",
        action="store_true",
        help="Requeue the source before the first loop; useful for a deliberate historical rerun.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("gary-pw-worker requires DATABASE_URL")
    if (
        (args.limit is not None and args.limit < 1)
        or args.max_index_pages < 1
        or args.freshness_hours < 1
        or args.poll_seconds < 1
        or args.refresh_calendar_months < 1
    ):
        raise SystemExit("limit, max-index-pages, freshness-hours, poll-seconds, and refresh-calendar-months must be positive")
    store = NeonStore(database_url)
    store.ensure_schema()
    config = WorkerConfig(
        source_id=args.source_id,
        index_url=args.index_url,
        limit=args.limit,
        output_root=args.output_root,
        timeout=args.timeout,
        max_index_pages=args.max_index_pages,
        max_site_pages=args.max_site_pages,
        max_call_images=args.max_call_images,
        max_asset_bytes=args.max_asset_bytes,
        freshness_hours=args.freshness_hours,
        poll_seconds=args.poll_seconds,
        render=args.render,
        retain_output=args.retain_output,
        backfill_calendar_start_month=args.calendar_start_month,
        backfill_calendar_end_month=args.calendar_end_month,
        refresh_calendar_months=args.refresh_calendar_months,
    )
    run_worker(config, store, once=args.once, force_backfill=args.force_backfill)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
