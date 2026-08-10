from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone
from pathlib import Path

from .fetcher import HttpFetcher
from .neon import NeonStore
from .profile_crawler import crawl_profiles
from .profile_output import write_profile_result
from .profile_source import PwProfileSchema


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Discover Poets & Writers publication profiles without persisting source content."
    )
    parser.add_argument(
        "--kind",
        choices=("literary_magazine", "small_press", "both"),
        default="literary_magazine",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum profiles per directory; required with --fetch-details.",
    )
    parser.add_argument("--max-index-pages", type=int, default=100)
    parser.add_argument(
        "--start-index-page",
        type=int,
        default=0,
        help="Start at this zero-based PW index page; useful for resumable batches.",
    )
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--max-bytes", type=int, default=5_000_000)
    parser.add_argument(
        "--request-delay",
        type=float,
        default=10.0,
        help="Minimum seconds between PW requests; PW robots.txt specifies 10 seconds.",
    )
    parser.add_argument("--max-retries", type=int, default=4)
    parser.add_argument(
        "--detail-concurrency",
        type=int,
        default=1,
        help="Detail fetchers; keep this at 1 for PW because its crawl delay is aggregate.",
    )
    parser.add_argument("--output-root", type=Path, default=Path("outputs/gary-profiles"))
    parser.add_argument("--max-profile-images", type=int, default=1)
    parser.add_argument("--max-asset-bytes", type=int, default=5_000_000)
    parser.add_argument(
        "--fetch-details",
        action="store_true",
        help="Fetch public profile detail pages in memory; never writes them.",
    )
    parser.add_argument(
        "--neon",
        action="store_true",
        help="Write the approved manifest and profile evidence into Neon.",
    )
    parser.add_argument("--source-id", default=None)
    parser.add_argument("--freshness-hours", type=int, default=168)
    parser.add_argument(
        "--neon-mode",
        choices=("backfill", "refresh"),
        default="backfill",
    )
    parser.add_argument(
        "--backfill-complete",
        action="store_true",
        help="Mark the source complete after this error-free Neon run; use only on the final batch.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.limit is not None and args.limit < 1:
        raise SystemExit("--limit must be at least 1 when provided")
    if args.max_index_pages < 1:
        raise SystemExit("--max-index-pages must be at least 1")
    if args.start_index_page < 0:
        raise SystemExit("--start-index-page must be non-negative")
    if args.fetch_details and args.limit is None and not args.neon:
        raise SystemExit("--fetch-details requires --limit to keep the crawl bounded")
    if (
        args.max_profile_images < 0
        or args.max_asset_bytes < 1
        or args.freshness_hours < 1
        or args.request_delay < 0
        or args.max_retries < 0
        or args.detail_concurrency < 1
    ):
        raise SystemExit(
            "max-profile-images must be non-negative; max-asset-bytes, freshness-hours, "
            "and max-retries must be positive/non-negative; request-delay must be non-negative"
        )
    database_url = os.environ.get("DATABASE_URL")
    if args.neon and not database_url:
        raise SystemExit("--neon requires DATABASE_URL")

    kinds = (
        ("literary_magazine", "small_press")
        if args.kind == "both"
        else (args.kind,)
    )
    fetcher = HttpFetcher(
        timeout=args.timeout,
        max_bytes=args.max_bytes,
        min_request_interval=args.request_delay,
        max_retries=args.max_retries,
    )
    try:
        for kind in kinds:
            schema = PwProfileSchema(
                kind,
                max_pages=args.max_index_pages,
                start_page=args.start_index_page,
            )
            result = crawl_profiles(
                schema,
                fetcher,
                limit=args.limit,
                max_index_pages=args.max_index_pages,
                fetch_details=args.fetch_details or args.neon,
                detail_concurrency=args.detail_concurrency,
                detail_fetcher_factory=(
                    lambda: HttpFetcher(
                        timeout=args.timeout,
                        max_bytes=args.max_bytes,
                        min_request_interval=args.request_delay,
                        max_retries=args.max_retries,
                    )
                    if args.detail_concurrency > 1
                    else None
                ),
            )
            source_id = args.source_id or (
                "pw.org.literary_magazines"
                if kind == "literary_magazine"
                else "pw.org.small_presses"
            )
            manifest_path = None
            if args.neon:
                output_dir = args.output_root / source_id.replace(".", "-")
                manifest_path = write_profile_result(
                    result,
                    output_dir,
                    asset_fetcher=fetcher,
                    max_profile_images=args.max_profile_images,
                    max_asset_bytes=args.max_asset_bytes,
                )
            print(
                f"{kind}: {len(result.profiles)} profiles across "
                f"{len(result.index_pages)} index pages; errors={len(result.errors)}"
            )
            if manifest_path is not None:
                print(f"  manifest={manifest_path}")
            if result.profiles:
                print(
                    f"  first={result.profiles[0].summary.name}; "
                    f"last={result.profiles[-1].summary.name}"
                )
            if args.fetch_details:
                detail_count = sum(profile.detail is not None for profile in result.profiles)
                print(f"  public details fetched in memory={detail_count}")
            if args.neon:
                store = NeonStore(database_url)
                store.ensure_schema()
                run_id = store.ingest_profile_manifest(
                    manifest_path,
                    source_id=source_id,
                    mode=args.neon_mode,
                    freshness_hours=args.freshness_hours,
                    seed_url=schema.index_url(0),
                    backfill_complete=args.backfill_complete,
                )
                print(f"  neon_run={run_id}; counts={store.counts(run_id)}")
            for error in result.errors[:5]:
                print(f"  error={error}")
    finally:
        fetcher.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
