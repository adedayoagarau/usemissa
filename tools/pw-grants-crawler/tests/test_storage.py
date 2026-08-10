import json
import sqlite3

from pw_grants_crawler.storage import SCHEMA_PATH, SQLiteStore


def _snapshot(path: str, url: str, *, media_assets: list[dict] | None = None) -> dict:
    return {
        "requested_url": url,
        "final_url": url,
        "status_code": 200,
        "content_type": "text/html",
        "title": "Example",
        "text": "Example page",
        "error": None,
        "rendered": False,
        "resource_urls": [],
        "media_assets": media_assets or [],
        "html_path": path,
    }


def test_sqlite_store_ingests_normalized_run_pages_assets_fields_and_conflicts(tmp_path):
    asset = {
        "source_page_url": "https://example.test/call",
        "original_url": "https://cdn.example.test/cover.jpg",
        "final_url": "https://cdn.example.test/cover.jpg",
        "kind": "image",
        "content_type": "image/jpeg",
        "status_code": 200,
        "byte_size": 12,
        "sha256": "a" * 64,
        "local_path": "assets/example/cover.jpg",
        "alt_text": "Cover",
        "relation": "img.src",
        "error": None,
    }
    manifest = {
        "generated_at": "2026-08-08T20:00:00+00:00",
        "index": _snapshot("index.html", "https://www.pw.org/grants"),
        "calls": [
            {
                "rank": 1,
                "organizer": "Example Press",
                "title": "Example Award",
                "deadline": "2026-08-08",
                "deadline_note": None,
                "entry_fee": "$10",
                "cash_prize": "$500",
                "genres": ["Fiction"],
                "contact_email": "hello@example.test",
                "official_website": "https://example.test/call",
                "description": "Example call.",
                "contact_details": None,
                "tags": ["short stories"],
                "full_text": "Full P&W text.",
                "media_assets": [asset],
                "source": {
                    "index_url": "https://www.pw.org/grants",
                    "detail_url": "https://www.pw.org/writing_contests/example_award",
                    "detail_page": _snapshot(
                        "pages/01-example.html",
                        "https://www.pw.org/writing_contests/example_award",
                    ),
                    "official_site_page": _snapshot(
                        "official-sites/01-example.html",
                        "https://example.test/call",
                        media_assets=[asset],
                    ),
                },
                "official_evidence": {
                    "status": "conflict",
                    "match_score": 1.0,
                    "discovered_urls": ["https://example.test/guidelines.pdf"],
                    "fields": {
                        "deadline": "2025-08-08",
                        "entry_fee": "$10",
                        "cash_prize": "$500",
                    },
                    "missing_fields": [],
                    "field_candidates": {"deadline": ["August 8, 2025"]},
                    "field_conflicts": [
                        "deadline: host has 'August 8, 2025'; P&W lists '2026-08-08'"
                    ],
                    "notes": [],
                    "selected_page": _snapshot(
                        "official-sites/01-example.html",
                        "https://example.test/call",
                        media_assets=[asset],
                    ),
                    "pages": [
                        _snapshot(
                            "official-sites/01-example.html",
                            "https://example.test/call",
                            media_assets=[asset],
                        )
                    ],
                },
            }
        ],
    }
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(json.dumps(manifest))

    run_id = SQLiteStore(tmp_path / "crawl.sqlite3").ingest_manifest(manifest_path)

    with sqlite3.connect(tmp_path / "crawl.sqlite3") as connection:
        assert connection.execute("SELECT COUNT(*) FROM crawl_runs").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM opportunities").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM call_observations").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM source_pages").fetchone()[0] == 3
        assert connection.execute("SELECT COUNT(*) FROM media_blobs").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM media_assets").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM field_observations").fetchone()[0] >= 4
        assert connection.execute("SELECT COUNT(*) FROM field_conflicts").fetchone()[0] == 1
        assert connection.execute("SELECT id FROM crawl_runs").fetchone()[0] == run_id


def test_sqlite_store_ingests_all_index_pages(tmp_path):
    first = _snapshot("index-pages/01.html", "https://www.pw.org/grants")
    second = _snapshot("index-pages/02.html", "https://www.pw.org/grants?page=1")
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "generated_at": "2026-08-08T20:00:00+00:00",
                "index": first,
                "index_pages": [first, second],
                "calls": [],
            }
        )
    )

    SQLiteStore(tmp_path / "crawl.sqlite3").ingest_manifest(manifest_path)

    with sqlite3.connect(tmp_path / "crawl.sqlite3") as connection:
        assert connection.execute("SELECT COUNT(*) FROM source_pages").fetchone()[0] == 2


def test_sqlite_store_migrates_existing_observations_for_host_canonical_fields(tmp_path):
    database_path = tmp_path / "legacy.sqlite3"
    legacy_schema = SCHEMA_PATH.read_text().replace(
        "    canonical_source TEXT NOT NULL DEFAULT 'p_and_w',\n"
        "    canonical_deadline_text TEXT,\n"
        "    canonical_entry_fee TEXT,\n"
        "    canonical_cash_prize TEXT,\n",
        "",
    )
    with sqlite3.connect(database_path) as connection:
        connection.executescript(legacy_schema)

    SQLiteStore(database_path).close()

    with sqlite3.connect(database_path) as connection:
        columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(call_observations)").fetchall()
        }
        assert {
            "canonical_source",
            "canonical_deadline_text",
            "canonical_entry_fee",
            "canonical_cash_prize",
        } <= columns
        assert connection.execute("PRAGMA user_version").fetchone()[0] == 3
