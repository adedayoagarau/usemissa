import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def _json(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


class SQLiteStore:
    """Normalized local persistence for crawl manifests and their provenance."""

    def __init__(self, database_path: Path):
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.database_path)
        self.connection.execute("PRAGMA foreign_keys = ON")
        self._initialize_schema()

    def _initialize_schema(self) -> None:
        tables = {
            row[0]
            for row in self.connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
        if "media_assets" in tables:
            columns = {
                row[1]
                for row in self.connection.execute("PRAGMA table_info(media_assets)").fetchall()
            }
            if "blob_id" not in columns:
                self.connection.execute("ALTER TABLE media_assets RENAME TO media_assets_legacy")
                self.connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
                legacy_rows = self.connection.execute(
                    """
                    SELECT source_page_id, source_page_url, original_url, final_url, kind,
                           content_type, status_code, byte_size, sha256, local_path,
                           alt_text, relation, error
                    FROM media_assets_legacy
                    """
                ).fetchall()
                for row in legacy_rows:
                    (
                        source_page_id,
                        _source_page_url,
                        original_url,
                        final_url,
                        kind,
                        content_type,
                        status_code,
                        byte_size,
                        sha256,
                        local_path,
                        alt_text,
                        relation,
                        error,
                    ) = row
                    blob_id = None
                    if sha256 and local_path and byte_size is not None:
                        self.connection.execute(
                            "INSERT OR IGNORE INTO media_blobs(sha256, content_type, byte_size, local_path) VALUES (?, ?, ?, ?)",
                            (sha256, content_type, byte_size, local_path),
                        )
                        blob_id = self.connection.execute(
                            "SELECT id FROM media_blobs WHERE sha256 = ?", (sha256,)
                        ).fetchone()[0]
                    self.connection.execute(
                        """
                        INSERT OR IGNORE INTO media_assets(
                            source_page_id, original_url, final_url, kind, content_type,
                            status_code, byte_size, blob_id, alt_text, relation, error
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            source_page_id,
                            original_url,
                            final_url,
                            kind,
                            content_type,
                            status_code,
                            byte_size,
                            blob_id,
                            alt_text,
                            relation,
                            error,
                        ),
                    )
                self.connection.execute("DROP TABLE media_assets_legacy")
            else:
                self.connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        else:
            self.connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))

        # CREATE TABLE IF NOT EXISTS does not add columns to an existing local
        # database, so migrate older call_observations files explicitly.
        observation_columns = {
            row[1]
            for row in self.connection.execute("PRAGMA table_info(call_observations)").fetchall()
        }
        for column, definition in (
            ("canonical_source", "TEXT NOT NULL DEFAULT 'p_and_w'"),
            ("canonical_deadline_text", "TEXT"),
            ("canonical_entry_fee", "TEXT"),
            ("canonical_cash_prize", "TEXT"),
        ):
            if column not in observation_columns:
                self.connection.execute(
                    f"ALTER TABLE call_observations ADD COLUMN {column} {definition}"
                )
        self.connection.execute("PRAGMA user_version = 3")

    def close(self) -> None:
        self.connection.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        self.close()

    def ingest_manifest(self, manifest_path: Path) -> str:
        manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
        generated_at = manifest.get("generated_at") or datetime.now(timezone.utc).isoformat()
        run_id = str(uuid4())
        index_url = manifest["index"]["requested_url"]
        with self.connection:
            self.connection.execute(
                "INSERT INTO crawl_runs(id, index_url, generated_at, status, config_json) VALUES (?, ?, ?, ?, ?)",
                (run_id, index_url, generated_at, "completed", _json({"manifest_path": str(manifest_path)})),
            )
            for index_page in manifest.get("index_pages", [manifest["index"]]):
                self._insert_page(run_id, None, "index", index_page)
            for call in manifest.get("calls", []):
                observation_id = self._insert_call(run_id, generated_at, call)
                page_ids: dict[str, int] = {}
                detail_page = call["source"]["detail_page"]
                page_ids[detail_page["html_path"]] = self._insert_page(
                    run_id, observation_id, "pw_detail", detail_page
                )
                evidence = call.get("official_evidence")
                if evidence is not None:
                    for page in evidence.get("pages", []):
                        page_ids[page["html_path"]] = self._insert_page(
                            run_id, observation_id, "official", page
                        )
                elif call["source"].get("official_site_page") is not None:
                    page = call["source"]["official_site_page"]
                    page_ids[page["html_path"]] = self._insert_page(
                        run_id, observation_id, "official", page
                    )
                self._insert_fields(observation_id, call, page_ids, evidence)
                if evidence is not None:
                    selected_path = (evidence.get("selected_page") or {}).get("html_path")
                    source_page_id = page_ids.get(selected_path) or page_ids.get(detail_page["html_path"])
                    for target_url in evidence.get("discovered_urls", []):
                        self.connection.execute(
                            "INSERT OR IGNORE INTO source_links(source_page_id, target_url, relation, followed) VALUES (?, ?, ?, ?)",
                            (source_page_id, target_url, "bounded_discovery", 1),
                        )
        return run_id

    def _insert_call(self, run_id: str, observed_at: str, call: dict) -> int:
        source_detail_url = call["source"]["detail_url"]
        evidence = call.get("official_evidence") or {}
        canonical_fields = evidence.get("canonical_fields") or {}
        self.connection.execute(
            """
            INSERT INTO opportunities(source_detail_url, organizer, title, official_website, first_seen_at, last_seen_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_detail_url) DO UPDATE SET
                organizer=excluded.organizer,
                title=excluded.title,
                official_website=excluded.official_website,
                last_seen_at=excluded.last_seen_at
            """,
            (
                source_detail_url,
                call["organizer"],
                call["title"],
                call.get("official_website"),
                observed_at,
                observed_at,
            ),
        )
        opportunity_id = self.connection.execute(
            "SELECT id FROM opportunities WHERE source_detail_url = ?", (source_detail_url,)
        ).fetchone()[0]
        self.connection.execute(
            """
            INSERT INTO call_observations(
                run_id, opportunity_id, rank, deadline, deadline_note, entry_fee, cash_prize,
                genres_json, tags_json, description, contact_email, contact_details, full_text,
                host_status, host_match_score, canonical_source, canonical_deadline_text,
                canonical_entry_fee, canonical_cash_prize, missing_fields_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                opportunity_id,
                call["rank"],
                call.get("deadline"),
                call.get("deadline_note"),
                call.get("entry_fee"),
                call.get("cash_prize"),
                _json(call.get("genres", [])),
                _json(call.get("tags", [])),
                call.get("description"),
                call.get("contact_email"),
                call.get("contact_details"),
                call.get("full_text", ""),
                evidence.get("status"),
                evidence.get("match_score"),
                evidence.get("canonical_source", "p_and_w"),
                canonical_fields.get("deadline"),
                canonical_fields.get("entry_fee"),
                canonical_fields.get("cash_prize"),
                _json(evidence.get("missing_fields", [])),
            ),
        )
        return self.connection.execute(
            "SELECT id FROM call_observations WHERE run_id = ? AND opportunity_id = ?",
            (run_id, opportunity_id),
        ).fetchone()[0]

    def _insert_page(self, run_id: str, observation_id: int | None, role: str, page: dict) -> int:
        self.connection.execute(
            """
            INSERT OR IGNORE INTO source_pages(
                run_id, observation_id, role, requested_url, final_url, status_code, content_type,
                title, text_content, error, rendered, resource_urls_json, html_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                observation_id,
                role,
                page["requested_url"],
                page["final_url"],
                page.get("status_code"),
                page.get("content_type"),
                page.get("title", ""),
                page.get("text", ""),
                page.get("error"),
                int(bool(page.get("rendered", False))),
                _json(page.get("resource_urls", [])),
                page["html_path"],
            ),
        )
        page_id = self.connection.execute(
            "SELECT id FROM source_pages WHERE run_id = ? AND html_path = ?", (run_id, page["html_path"])
        ).fetchone()[0]
        self._insert_page_assets(page_id, page.get("media_assets", []))
        return page_id

    def _insert_page_assets(self, page_id: int, assets: list[dict]) -> None:
        for asset in assets:
            blob_id = None
            if asset.get("sha256") and asset.get("local_path") and asset.get("byte_size") is not None:
                self.connection.execute(
                    "INSERT OR IGNORE INTO media_blobs(sha256, content_type, byte_size, local_path) VALUES (?, ?, ?, ?)",
                    (
                        asset["sha256"],
                        asset.get("content_type"),
                        asset["byte_size"],
                        asset["local_path"],
                    ),
                )
                blob_id = self.connection.execute(
                    "SELECT id FROM media_blobs WHERE sha256 = ?", (asset["sha256"],)
                ).fetchone()[0]
            self.connection.execute(
                """
                INSERT OR IGNORE INTO media_assets(
                    source_page_id, original_url, final_url, kind, content_type,
                    status_code, byte_size, blob_id, alt_text, relation, error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    page_id,
                    asset["original_url"],
                    asset["final_url"],
                    asset["kind"],
                    asset.get("content_type"),
                    asset.get("status_code"),
                    asset.get("byte_size"),
                    blob_id,
                    asset.get("alt_text"),
                    asset.get("relation"),
                    asset.get("error"),
                ),
            )

    def _insert_fields(
        self,
        observation_id: int,
        call: dict,
        page_ids: dict[str, int],
        evidence: dict | None,
    ) -> None:
        pw_fields = {
            "deadline": call.get("deadline"),
            "entry_fee": call.get("entry_fee"),
            "cash_prize": call.get("cash_prize"),
        }
        for field_name, value in pw_fields.items():
            if value:
                self.connection.execute(
                    "INSERT INTO field_observations(observation_id, field_name, value, source, selected, candidate_rank) VALUES (?, ?, ?, ?, ?, ?)",
                    (observation_id, field_name, value, "pw", 1, 0),
                )
        if evidence is None:
            return
        selected_path = (evidence.get("selected_page") or {}).get("html_path")
        source_page_id = page_ids.get(selected_path)
        selected_fields = evidence.get("fields", {})
        candidates = evidence.get("field_candidates", {})
        for field_name, values in candidates.items():
            for rank, value in enumerate(values):
                self.connection.execute(
                    "INSERT INTO field_observations(observation_id, source_page_id, field_name, value, source, selected, candidate_rank) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (
                        observation_id,
                        source_page_id,
                        field_name,
                        value,
                        "host",
                        int(value == selected_fields.get(field_name)),
                        rank,
                    ),
                )
        for conflict in evidence.get("field_conflicts", []):
            field_name, _, detail = conflict.partition(":")
            self.connection.execute(
                "INSERT INTO field_conflicts(observation_id, source_page_id, field_name, host_value, expected_value, detail) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    observation_id,
                    source_page_id,
                    field_name.strip(),
                    selected_fields.get(field_name.strip()),
                    pw_fields.get(field_name.strip()),
                    detail.strip(),
                ),
            )
