from pw_grants_crawler.cli import build_parser
from datetime import date

from pw_grants_crawler.worker import calendar_bounds, run_mode


def test_cli_defaults_to_five_deadline_sorted_calls_and_output_dir():
    args = build_parser().parse_args([])

    assert args.limit == 5
    assert args.index_url == "https://www.pw.org/grants"
    assert str(args.output_dir).endswith("outputs/pw-grants-crawl")
    assert args.follow_official_sites is True
    assert args.render is False
    assert args.max_site_pages == 5
    assert args.max_call_images == 1
    assert args.max_asset_bytes == 5_000_000
    assert args.database is None
    assert args.neon is False
    assert args.neon_source_id == "pw.org"
    assert args.neon_mode == "backfill"
    assert args.freshness_hours == 24


def test_cli_accepts_pagination_and_calendar_backfill_bounds():
    args = build_parser().parse_args(
        [
            "--max-index-pages",
            "50",
            "--calendar-start-month",
            "2026-01",
            "--calendar-end-month",
            "2026-09",
        ]
    )

    assert args.max_index_pages == 50
    assert args.calendar_start_month == "2026-01"
    assert args.calendar_end_month == "2026-09"


def test_worker_runs_backfill_until_complete_then_switches_to_refresh():
    assert run_mode("pending") == "backfill"
    assert run_mode("running") == "backfill"
    assert run_mode("complete") == "refresh"


def test_worker_uses_historical_calendar_range_for_backfill_and_short_range_for_refresh():
    assert calendar_bounds(
        "backfill",
        date(2026, 8, 8),
        backfill_start_month="2026-01",
        backfill_end_month="2026-09",
        refresh_calendar_months=2,
    ) == ("2026-01", "2026-09")
    assert calendar_bounds(
        "refresh",
        date(2026, 12, 8),
        backfill_start_month="2026-01",
        backfill_end_month="2026-09",
        refresh_calendar_months=2,
    ) == ("2026-12", "2027-01")


def test_worker_can_explicitly_requeue_a_completed_source_for_backfill():
    from pw_grants_crawler.worker import build_parser

    args = build_parser().parse_args(["--once", "--force-backfill"])

    assert args.once is True
    assert args.force_backfill is True


def test_worker_can_enable_rendering_from_environment(monkeypatch):
    from pw_grants_crawler.worker import build_parser

    monkeypatch.setenv("GARY_RENDER", "true")

    assert build_parser().parse_args([]).render is True
