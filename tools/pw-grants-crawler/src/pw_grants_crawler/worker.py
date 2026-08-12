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
from .fetcher import HttpFetcher
from .profile_crawler import crawl_profiles
from .profile_output import write_profile_result
from .profile_source import PwProfileSchema
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
    include_profile_sources: bool = True
    profile_kinds: tuple[str, ...] = ("literary_magazine", "small_press")
    profile_max_index_pages: int = 100
    profile_request_delay: float = 10.0
    profile_freshness_hours: int = 168
    max_profile_images: int = 1
    profile_only: bool = False


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


def profile_source_id(kind: str) -> str:
    if kind == "literary_magazine":
        return "pw.org.literary_magazines"
    if kind == "small_press":
        return "pw.org.small_presses"
    raise ValueError(f"unsupported profile kind: {kind}")


def profile_source_name(kind: str) -> str:
    if kind == "literary_magazine":
        return "Poets & Writers Literary Magazines"
    if kind == "small_press":
        return "Poets & Writers Small Presses"
    raise ValueError(f"unsupported profile kind: {kind}")


def run_profile_once(
    config: WorkerConfig,
    store: NeonStore,
    *,
    kind: str,
    owner: str | None = None,
    force_backfill: bool = False,
) -> str | None:
    owner = owner or str(uuid4())
    schema = PwProfileSchema(kind, max_pages=config.profile_max_index_pages)
    source_id = profile_source_id(kind)
    store.register_source(
        source_id=source_id,
        adapter="poets-writers-profiles",
        name=profile_source_name(kind),
        seed_url=schema.index_url(0),
        freshness_hours=config.profile_freshness_hours,
        config={"worker": "gary", "profile_kind": kind, "index_url": schema.index_url(0)},
    )
    if force_backfill:
        store.request_backfill(source_id)
    claim = store.claim_source(source_id, owner)
    if claim is None:
        return None
    mode = run_mode(claim["backfill_status"])
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_dir = config.output_root / f"{source_id.replace('.', '-')}-{mode}-{timestamp}"
    fetcher = HttpFetcher(
        timeout=config.timeout,
        max_bytes=config.max_asset_bytes,
        min_request_interval=config.profile_request_delay,
    )
    try:
        result = crawl_profiles(
            schema,
            fetcher,
            fetch_details=True,
            detail_concurrency=1,
            max_index_pages=config.profile_max_index_pages,
        )
        manifest_path = write_profile_result(
            result,
            output_dir,
            asset_fetcher=fetcher,
            max_profile_images=config.max_profile_images,
            max_asset_bytes=config.max_asset_bytes,
        )
        run_id = store.ingest_profile_manifest(
            manifest_path,
            source_id=source_id,
            mode=mode,
            source_name=profile_source_name(kind),
            freshness_hours=config.profile_freshness_hours,
            seed_url=schema.index_url(0),
            backfill_complete=mode == "backfill" and not result.errors,
        )
        store.release_source(source_id, owner)
        if not config.retain_output:
            shutil.rmtree(output_dir, ignore_errors=True)
        return run_id
    except Exception as error:
        store.fail_source(source_id, owner, str(error))
        raise
    finally:
        fetcher.close()


def run_worker(
    config: WorkerConfig,
    store: NeonStore,
    *,
    once: bool = False,
    force_backfill: bool = False,
) -> None:
    owner = str(uuid4())
    while True:
        run_id = None if config.profile_only else run_once(config, store, owner=owner, force_backfill=force_backfill)
        profile_run_ids: list[str] = []
        if config.include_profile_sources:
            for kind in config.profile_kinds:
                profile_run_id = run_profile_once(
                    config,
                    store,
                    kind=kind,
                    owner=owner,
                    force_backfill=force_backfill,
                )
                if profile_run_id:
                    profile_run_ids.append(profile_run_id)
        force_backfill = False
        if run_id:
            print(f"[gary-worker] completed run={run_id}")
        for profile_run_id in profile_run_ids:
            print(f"[gary-worker] completed profile_run={profile_run_id}")
        if once:
            return
        did_work = bool(run_id or profile_run_ids)
        time.sleep(config.poll_seconds if not did_work else min(config.poll_seconds, 5))


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
    parser.add_argument(
        "--disable-profile-sources",
        action="store_true",
        help="Run only the call/calendar source, leaving profile backfill/freshness to another process.",
    )
    parser.add_argument(
        "--profile-only",
        action="store_true",
        default=os.environ.get("GARY_PROFILE_ONLY", "").casefold() in {"1", "true", "yes", "on"},
        help="Run only the profile backfill/freshness lane; do not claim the call/calendar source.",
    )
    parser.add_argument(
        "--profile-kind",
        choices=("literary_magazine", "small_press", "both"),
        default=os.environ.get("GARY_PROFILE_KIND", "both"),
    )
    parser.add_argument("--profile-max-index-pages", type=int, default=int(os.environ.get("GARY_PROFILE_MAX_INDEX_PAGES", "100")))
    parser.add_argument("--profile-request-delay", type=float, default=float(os.environ.get("GARY_PROFILE_REQUEST_DELAY", "10")))
    parser.add_argument("--profile-freshness-hours", type=int, default=int(os.environ.get("GARY_PROFILE_FRESHNESS_HOURS", "168")))
    parser.add_argument("--max-profile-images", type=int, default=int(os.environ.get("GARY_MAX_PROFILE_IMAGES", "1")))
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
        or args.profile_max_index_pages < 1
        or args.profile_request_delay < 0
        or args.profile_freshness_hours < 1
        or args.max_profile_images < 0
    ):
        raise SystemExit(
            "limits, freshness values, and poll seconds must be positive; profile request delay "
            "and max profile images must be non-negative"
        )
    profile_kinds = (
        ("literary_magazine", "small_press")
        if args.profile_kind == "both"
        else (args.profile_kind,)
    )
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
        include_profile_sources=not args.disable_profile_sources,
        profile_kinds=profile_kinds,
        profile_max_index_pages=args.profile_max_index_pages,
        profile_request_delay=args.profile_request_delay,
        profile_freshness_hours=args.profile_freshness_hours,
        max_profile_images=args.max_profile_images,
        profile_only=args.profile_only,
    )
    run_worker(config, store, once=args.once, force_backfill=args.force_backfill)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
