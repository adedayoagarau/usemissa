import argparse
import os
from pathlib import Path

from .crawler import crawl_calls
from .fetcher import HttpFetcher
from .neon import NeonStore
from .output import write_result
from .renderer import PlaywrightFetcher
from .source_schema import PwOrgSchema
from .storage import SQLiteStore


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index-url", default="https://www.pw.org/grants")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--output-dir", type=Path, default=Path("outputs/pw-grants-crawl"))
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--max-bytes", type=int, default=5_000_000)
    parser.add_argument("--max-site-pages", type=int, default=5)
    parser.add_argument("--max-index-pages", type=int, default=1)
    parser.add_argument("--calendar-start-month", default=None)
    parser.add_argument("--calendar-end-month", default=None)
    parser.add_argument("--max-call-images", type=int, default=1)
    parser.add_argument(
        "--max-assets-per-page",
        type=int,
        dest="max_call_images",
        default=argparse.SUPPRESS,
        help=argparse.SUPPRESS,
    )
    parser.add_argument("--max-asset-bytes", type=int, default=5_000_000)
    parser.add_argument("--database", type=Path, default=None)
    parser.add_argument(
        "--neon",
        action="store_true",
        help="Ingest the completed manifest into Neon using DATABASE_URL.",
    )
    parser.add_argument("--neon-source-id", default="pw.org")
    parser.add_argument(
        "--neon-mode",
        choices=("backfill", "refresh"),
        default="backfill",
        help="Whether this Neon run is initial backfill or scheduled freshness refresh.",
    )
    parser.add_argument("--freshness-hours", type=int, default=24)
    parser.add_argument(
        "--render",
        action="store_true",
        help="Use a headless browser for JavaScript or thin host pages.",
    )
    parser.add_argument(
        "--no-follow-official-sites",
        dest="follow_official_sites",
        action="store_false",
        default=True,
        help="Only crawl Poets & Writers call pages.",
    )
    return parser


def _print_summary(result, manifest_path: Path) -> None:
    print(f"Saved crawl manifest: {manifest_path}")
    for rank, call in enumerate(result.calls, start=1):
        deadline = call.detail.deadline.isoformat() if call.detail.deadline else "unknown deadline"
        evidence = call.official_evidence
        status = evidence.status if evidence else "not fetched"
        score = f"{evidence.match_score:.2f}" if evidence else "-"
        print(f"{rank}. {call.detail.organizer} — {call.detail.title} — {deadline} — host {status} (match {score})")


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.limit < 1:
        raise SystemExit("--limit must be at least 1")
    if args.max_index_pages < 1:
        raise SystemExit("--max-index-pages must be at least 1")
    if (args.calendar_start_month is None) != (args.calendar_end_month is None):
        raise SystemExit("--calendar-start-month and --calendar-end-month must be provided together")
    fetcher = HttpFetcher(timeout=args.timeout, max_bytes=args.max_bytes)
    renderer = None
    if args.render:
        try:
            renderer = PlaywrightFetcher(timeout=args.timeout, max_bytes=args.max_bytes)
        except RuntimeError as exc:
            fetcher.close()
            raise SystemExit(str(exc)) from exc
    try:
        calendar_urls = []
        if args.calendar_start_month and args.calendar_end_month:
            calendar_urls = PwOrgSchema(
                grants_index_url=args.index_url,
                grants_max_pages=args.max_index_pages,
            ).calendar_urls(args.calendar_start_month, args.calendar_end_month)
        result = crawl_calls(
            args.index_url,
            limit=args.limit,
            fetcher=fetcher,
            follow_official_sites=args.follow_official_sites,
            renderer=renderer,
            max_site_pages=args.max_site_pages,
            max_index_pages=args.max_index_pages,
            calendar_urls=calendar_urls,
        )
        failed_index_pages = [page for page in result.index_pages if page.error]
        if failed_index_pages:
            raise SystemExit(
                f"Could not fetch source page {failed_index_pages[0].requested_url}: "
                f"{failed_index_pages[0].error}"
            )
        manifest_path = write_result(
            result,
            args.output_dir,
            asset_fetcher=fetcher,
            max_call_images=args.max_call_images,
            max_asset_bytes=args.max_asset_bytes,
        )
        database_path = args.database or args.output_dir / "crawl.sqlite3"
        with SQLiteStore(database_path) as store:
            local_run_id = store.ingest_manifest(manifest_path)
        print(f"Saved normalized database: {database_path} (run {local_run_id})")
        if args.neon:
            database_url = os.environ.get("DATABASE_URL")
            if not database_url:
                raise SystemExit("--neon requires DATABASE_URL")
            if args.freshness_hours < 1:
                raise SystemExit("--freshness-hours must be at least 1")
            neon_store = NeonStore(database_url)
            neon_store.ensure_schema()
            neon_run_id = neon_store.ingest_manifest(
                manifest_path,
                source_id=args.neon_source_id,
                mode=args.neon_mode,
                freshness_hours=args.freshness_hours,
            )
            print(f"Saved Neon evidence: run {neon_run_id}")
            print(f"Neon counts: {neon_store.counts(neon_run_id)}")
        _print_summary(result, manifest_path)
    finally:
        fetcher.close()
        if renderer is not None:
            renderer.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
