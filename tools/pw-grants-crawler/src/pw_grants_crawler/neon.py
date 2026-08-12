from __future__ import annotations

import hashlib
import json
from datetime import date
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlsplit
import psycopg
from psycopg.types.json import Jsonb

from .identity import (
    IdentityInput,
    IdentityRecord,
    identity_key,
    normalize_text,
    normalize_url,
    resolve_identity,
)


SCHEMA_PATH = Path(__file__).with_name("neon_schema.sql")
ConnectionFactory = Callable[[str], Any]


def manifest_hash(manifest_path: Path) -> str:
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    canonical = json.dumps(manifest, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def stable_run_id(source_id: str, digest: str) -> str:
    return "run_" + hashlib.sha256(f"{source_id}:{digest}".encode("utf-8")).hexdigest()[:32]


def _stable_id(prefix: str, *parts: object) -> str:
    value = "\x1f".join(str(part) for part in parts)
    return f"{prefix}_" + hashlib.sha256(value.encode("utf-8")).hexdigest()[:32]


def _normalized_host_key(url: str | None) -> str:
    normalized = normalize_url(url)
    if not normalized:
        return ""
    parsed = urlsplit(normalized)
    host = parsed.netloc.removeprefix("www.")
    return host or normalized


def _text(value: object) -> object:
    """Prepare text for Postgres, which cannot store U+0000 bytes."""

    if isinstance(value, str):
        return value.replace("\x00", "")
    return value


def _clean_text_values(value: object) -> object:
    if isinstance(value, str):
        return _text(value)
    if isinstance(value, dict):
        return {
            _text(key) if isinstance(key, str) else key: _clean_text_values(child)
            for key, child in value.items()
        }
    if isinstance(value, list):
        return [_clean_text_values(child) for child in value]
    if isinstance(value, tuple):
        return tuple(_clean_text_values(child) for child in value)
    return value


def _json(value: object) -> Jsonb:
    """Prepare JSON for Postgres, which cannot store U+0000 in jsonb text."""

    return Jsonb(_clean_text_values(value))


def _date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _read_relative(root: Path, relative_path: str, *, binary: bool = False) -> str | bytes:
    root = root.resolve()
    path = (root / relative_path).resolve()
    if root != path and root not in path.parents:
        return b"" if binary else ""
    if not path.is_file():
        return b"" if binary else ""
    return path.read_bytes() if binary else path.read_text(encoding="utf-8", errors="replace")


class NeonStore:
    """Durable Gary evidence store backed by Neon/Postgres.

    This schema is intentionally separate from Missa's public opportunity
    projection. Gary can backfill and reconcile source evidence repeatedly;
    promotion into public opportunities remains an explicit later step.
    """

    def __init__(
        self,
        database_url: str,
        *,
        connect_factory: ConnectionFactory = psycopg.connect,
        schema_path: Path = SCHEMA_PATH,
    ):
        if not database_url:
            raise ValueError("A Neon/Postgres database URL is required")
        self.database_url = database_url
        self.connect_factory = connect_factory
        self.schema_path = schema_path

    def ensure_schema(self) -> None:
        schema = self.schema_path.read_text(encoding="utf-8")
        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                for statement in schema.split(";"):
                    statement = statement.strip()
                    if statement:
                        connection.execute(statement)

    def upsert_source(
        self,
        connection: Any,
        *,
        source_id: str,
        adapter: str,
        name: str,
        seed_url: str,
        freshness_hours: int = 24,
        config: dict[str, object] | None = None,
    ) -> None:
        connection.execute(
            """
            INSERT INTO gary_sources(id, adapter, name, seed_url, freshness_hours, config_json)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                adapter = excluded.adapter,
                name = excluded.name,
                seed_url = excluded.seed_url,
                freshness_hours = excluded.freshness_hours,
                config_json = excluded.config_json,
                updated_at = now()
            """,
            (source_id, adapter, name, seed_url, freshness_hours, _json(config or {})),
        )

    def register_source(
        self,
        *,
        source_id: str,
        adapter: str,
        name: str,
        seed_url: str,
        freshness_hours: int = 24,
        config: dict[str, object] | None = None,
    ) -> None:
        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                self.upsert_source(
                    connection,
                    source_id=source_id,
                    adapter=adapter,
                    name=name,
                    seed_url=seed_url,
                    freshness_hours=freshness_hours,
                    config=config,
                )

    def request_backfill(self, source_id: str) -> None:
        """Make an existing source immediately eligible for a fresh backfill."""

        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                row = connection.execute(
                    """
                    UPDATE gary_sources
                    SET backfill_status = 'pending',
                        next_refresh_at = NULL,
                        lease_owner = NULL,
                        lease_until = NULL,
                        updated_at = now()
                    WHERE id = %s
                    RETURNING id
                    """,
                    (source_id,),
                ).fetchone()
                if row is None:
                    raise ValueError(f"Unknown Gary source: {source_id}")

    def claim_source(self, source_id: str, owner: str, *, lease_seconds: int = 3600) -> dict[str, Any] | None:
        """Claim one due source so only one Gary worker crawls it at a time."""

        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                row = connection.execute(
                    """
                    WITH due AS (
                        SELECT id
                        FROM gary_sources
                        WHERE id = %s
                          AND enabled = TRUE
                          AND (backfill_status IN ('pending', 'running') OR next_refresh_at IS NULL OR next_refresh_at <= now())
                          AND (lease_until IS NULL OR lease_until < now())
                        FOR UPDATE SKIP LOCKED
                    )
                    UPDATE gary_sources AS sources
                    SET backfill_status = CASE WHEN sources.backfill_status = 'pending' THEN 'running' ELSE sources.backfill_status END,
                        lease_owner = %s,
                        lease_until = now() + make_interval(secs => %s),
                        last_started_at = now(),
                        updated_at = now()
                    FROM due
                    WHERE sources.id = due.id
                    RETURNING sources.id, sources.seed_url, sources.freshness_hours, sources.backfill_status
                    """,
                    (source_id, owner, lease_seconds),
                ).fetchone()
                if row is None:
                    return None
                return {
                    "id": row[0],
                    "seed_url": row[1],
                    "freshness_hours": row[2],
                    "backfill_status": row[3],
                }

    def release_source(self, source_id: str, owner: str) -> None:
        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                connection.execute(
                    "UPDATE gary_sources SET lease_owner = NULL, lease_until = NULL, updated_at = now() WHERE id = %s AND lease_owner = %s",
                    (source_id, owner),
                )

    def fail_source(self, source_id: str, owner: str, error: str, *, retry_hours: int = 2) -> None:
        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                connection.execute(
                    """
                    UPDATE gary_sources
                    SET consecutive_failures = consecutive_failures + 1,
                        last_error = %s,
                        next_refresh_at = now() + make_interval(hours => %s),
                        lease_owner = NULL,
                        lease_until = NULL,
                        updated_at = now()
                    WHERE id = %s AND lease_owner = %s
                    """,
                    (error[:500], retry_hours, source_id, owner),
                )

    def repair_crawl_run_to_partial(self, run_id: str, error: str) -> bool:
        """Repair a wrongly completed crawl run whose manifest had recoverable errors."""

        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                row = connection.execute(
                    """
                    UPDATE gary_crawl_runs
                    SET status = 'partial',
                        error = %s,
                        completed_at = COALESCE(completed_at, now())
                    WHERE id = %s
                      AND status = 'completed'
                    RETURNING source_id
                    """,
                    (error[:500], run_id),
                ).fetchone()
                if row is None:
                    return False
                connection.execute(
                    """
                    UPDATE gary_sources
                    SET backfill_status = 'pending',
                        next_refresh_at = NULL,
                        last_error = %s,
                        updated_at = now()
                    WHERE id = %s
                    """,
                    (error[:500], row[0]),
                )
                return True

    def ingest_manifest(
        self,
        manifest_path: Path,
        *,
        source_id: str = "pw.org",
        mode: str = "backfill",
        source_name: str = "Poets & Writers Writing Contests, Grants & Awards",
        adapter: str = "poets-writers",
        freshness_hours: int = 24,
    ) -> str:
        if mode not in {"backfill", "refresh"}:
            raise ValueError("mode must be 'backfill' or 'refresh'")
        manifest_path = Path(manifest_path)
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        digest = manifest_hash(manifest_path)
        run_id = stable_run_id(source_id, digest)
        index_url = manifest["index"]["requested_url"]

        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                self.upsert_source(
                    connection,
                    source_id=source_id,
                    adapter=adapter,
                    name=source_name,
                    seed_url=index_url,
                    freshness_hours=freshness_hours,
                    config={"manifest_path": str(manifest_path)},
                )
                existing_run = connection.execute(
                    "SELECT status FROM gary_crawl_runs WHERE id = %s",
                    (run_id,),
                ).fetchone()
                if existing_run and existing_run[0] == "completed":
                    connection.execute(
                        """
                        UPDATE gary_sources
                        SET last_successful_at = now(), consecutive_failures = 0, last_error = NULL,
                            next_refresh_at = now() + make_interval(hours => freshness_hours), updated_at = now()
                        WHERE id = %s
                        """,
                        (source_id,),
                    )
                    return run_id
                connection.execute(
                    """
                    INSERT INTO gary_crawl_runs(id, source_id, mode, manifest_hash, status, config_json)
                    VALUES (%s, %s, %s, %s, 'running', %s)
                    ON CONFLICT (id) DO UPDATE SET
                        status = 'running', completed_at = NULL, error = NULL, config_json = excluded.config_json
                    """,
                    (run_id, source_id, mode, digest, _json({"manifest_path": str(manifest_path)})),
                )

                self._ingest_manifest(connection, manifest, manifest_path.parent, run_id, source_id)
                connection.execute(
                    "UPDATE gary_crawl_runs SET status = 'completed', completed_at = now(), error = NULL WHERE id = %s",
                    (run_id,),
                )
                connection.execute(
                    """
                    UPDATE gary_sources
                    SET backfill_status = CASE WHEN %s = 'backfill' THEN 'complete' ELSE backfill_status END,
                        last_successful_at = CASE WHEN %s = 'completed' THEN now() ELSE last_successful_at END,
                        last_started_at = now(),
                        consecutive_failures = 0, last_error = NULL,
                        next_refresh_at = now() + make_interval(hours => freshness_hours),
                        updated_at = now()
                    WHERE id = %s
                    """,
                    (mode, source_id),
                )
        return run_id

    def ingest_profile_manifest(
        self,
        manifest_path: Path,
        *,
        source_id: str,
        mode: str = "backfill",
        source_name: str | None = None,
        adapter: str = "poets-writers-profiles",
        freshness_hours: int = 168,
        seed_url: str | None = None,
        backfill_complete: bool = False,
    ) -> str:
        """Ingest an approved PW magazine/press profile manifest into Neon."""

        if mode not in {"backfill", "refresh"}:
            raise ValueError("mode must be 'backfill' or 'refresh'")
        manifest_path = Path(manifest_path)
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        profile_kind = manifest.get("profile_kind")
        if profile_kind not in {"literary_magazine", "small_press"}:
            raise ValueError("profile manifest must declare a literary_magazine or small_press profile_kind")
        index = manifest.get("index")
        if not index or not index.get("requested_url"):
            raise ValueError("profile manifest must contain a source index page")
        digest = manifest_hash(manifest_path)
        run_id = stable_run_id(source_id, digest)
        index_url = index["requested_url"]
        source_name = source_name or (
            "Poets & Writers Literary Magazines"
            if profile_kind == "literary_magazine"
            else "Poets & Writers Small Presses"
        )

        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                self.upsert_source(
                    connection,
                    source_id=source_id,
                    adapter=adapter,
                    name=source_name,
                    seed_url=seed_url or index_url,
                    freshness_hours=freshness_hours,
                    config={
                        "manifest_path": str(manifest_path),
                        "profile_kind": profile_kind,
                    },
                )
                existing_run = connection.execute(
                    "SELECT status FROM gary_crawl_runs WHERE id = %s",
                    (run_id,),
                ).fetchone()
                if existing_run and existing_run[0] == "completed":
                    if backfill_complete or mode == "refresh":
                        connection.execute(
                            """
                            UPDATE gary_sources
                            SET backfill_status = CASE
                                    WHEN %s = 'backfill' THEN 'complete'
                                    ELSE backfill_status
                                END,
                                last_successful_at = now(),
                                consecutive_failures = 0,
                                last_error = NULL,
                                next_refresh_at = now() + make_interval(hours => freshness_hours),
                                updated_at = now()
                            WHERE id = %s
                            """,
                            (mode, source_id),
                        )
                    return run_id
                connection.execute(
                    """
                    INSERT INTO gary_crawl_runs(id, source_id, mode, manifest_hash, status, config_json)
                    VALUES (%s, %s, %s, %s, 'running', %s)
                    ON CONFLICT (id) DO UPDATE SET
                        status = 'running', completed_at = NULL, error = NULL, config_json = excluded.config_json
                    """,
                    (
                        run_id,
                        source_id,
                        mode,
                        digest,
                        _json({"manifest_path": str(manifest_path), "profile_kind": profile_kind}),
                    ),
                )
                self._ingest_profile_manifest(
                    connection,
                    manifest,
                    manifest_path.parent,
                    run_id,
                    source_id,
                )
                manifest_errors = manifest.get("errors") or []
                run_status = "partial" if manifest_errors else "completed"
                connection.execute(
                    "UPDATE gary_crawl_runs SET status = %s, completed_at = now(), error = %s WHERE id = %s",
                    (run_status, (manifest_errors[0] if manifest_errors else None), run_id),
                )
                connection.execute(
                    """
                    UPDATE gary_sources
                    SET backfill_status = CASE
                            WHEN %s = 'backfill' AND %s = 'completed' AND %s THEN 'complete'
                            WHEN %s = 'backfill' THEN 'pending'
                            ELSE backfill_status
                        END,
                        last_successful_at = CASE
                            WHEN %s = 'completed' AND (%s = 'refresh' OR %s) THEN now()
                            ELSE last_successful_at
                        END,
                        last_started_at = now(),
                        consecutive_failures = CASE
                            WHEN %s = 'partial' THEN consecutive_failures + 1
                            WHEN %s = 'completed' AND (%s = 'refresh' OR %s) THEN 0
                            ELSE consecutive_failures
                        END,
                        last_error = CASE
                            WHEN %s = 'partial' THEN %s
                            WHEN %s = 'completed' AND (%s = 'refresh' OR %s) THEN NULL
                            ELSE last_error
                        END,
                        next_refresh_at = CASE
                            WHEN %s = 'partial' THEN now() + make_interval(hours => 2)
                            WHEN %s = 'completed' AND (%s = 'refresh' OR %s)
                                THEN now() + make_interval(hours => freshness_hours)
                            ELSE NULL
                        END,
                        updated_at = now()
                    WHERE id = %s
                    """,
                    (
                        mode,
                        run_status,
                        backfill_complete,
                        mode,
                        run_status,
                        mode,
                        backfill_complete,
                        run_status,
                        run_status,
                        mode,
                        backfill_complete,
                        run_status,
                        (manifest_errors[0] if manifest_errors else None),
                        run_status,
                        mode,
                        backfill_complete,
                        run_status,
                        run_status,
                        mode,
                        backfill_complete,
                        source_id,
                    ),
                )
        return run_id

    def _ingest_manifest(
        self,
        connection: Any,
        manifest: dict[str, Any],
        evidence_root: Path,
        run_id: str,
        source_id: str,
    ) -> None:
        for index_page in manifest.get("index_pages", [manifest["index"]]):
            self._insert_page(connection, run_id, None, "index", index_page, evidence_root)
        for call in manifest.get("calls", []):
            opportunity_id, observation_id = self._insert_call(
                connection, run_id, source_id, call
            )
            page_ids: dict[str, str] = {}
            detail_page = call["source"]["detail_page"]
            page_ids[detail_page["html_path"]] = self._insert_page(
                connection, run_id, observation_id, "pw_detail", detail_page, evidence_root
            )
            evidence = call.get("official_evidence")
            if evidence is not None:
                for page in evidence.get("pages", []):
                    page_ids[page["html_path"]] = self._insert_page(
                        connection, run_id, observation_id, "official", page, evidence_root
                    )
            elif call["source"].get("official_site_page") is not None:
                page = call["source"]["official_site_page"]
                page_ids[page["html_path"]] = self._insert_page(
                    connection, run_id, observation_id, "official", page, evidence_root
                )
            self._insert_fields(connection, observation_id, call, page_ids, evidence)
            if evidence is not None:
                selected_path = (evidence.get("selected_page") or {}).get("html_path")
                selected_page_id = page_ids.get(selected_path) or page_ids.get(detail_page["html_path"])
                for target_url in evidence.get("discovered_urls", []):
                    if not selected_page_id:
                        continue
                    link_id = _stable_id("link", selected_page_id, target_url, "bounded_discovery")
                    connection.execute(
                        """
                        INSERT INTO gary_source_links(id, source_page_id, target_url, relation, followed)
                        VALUES (%s, %s, %s, 'bounded_discovery', TRUE)
                        ON CONFLICT (source_page_id, target_url, relation) DO NOTHING
                        """,
                        (link_id, selected_page_id, target_url),
                    )

    def _existing_records(self, connection: Any, incoming: IdentityInput) -> list[IdentityRecord]:
        rows: dict[str, tuple[Any, ...]] = {}
        detail_aliases_by_id: dict[str, set[str]] = {}
        official_aliases_by_id: dict[str, set[str]] = {}
        conditions = ["identity_key = %s", "(organizer_key = %s AND title_key = %s)"]
        params: list[Any] = [
            identity_key(incoming.organizer, incoming.title, incoming.deadline),
            normalize_text(incoming.organizer),
            normalize_text(incoming.title),
        ]
        official_url = normalize_url(incoming.official_url)
        if official_url:
            conditions.append("normalized_official_url = %s")
            params.append(official_url)

        def add_coherent_record(row: tuple[Any, ...]) -> None:
            # Older retries could mutate the display label without updating
            # identity_key. Never use such a record as identity evidence.
            if row[5] != identity_key(row[1], row[2], row[3]):
                return
            rows[str(row[0])] = row[:5]

        for row in connection.execute(
            f"""
            SELECT id, organizer, title, deadline_key, official_website, identity_key
            FROM gary_opportunities
            WHERE {' OR '.join(conditions)}
            """,
            tuple(params),
        ).fetchall():
            add_coherent_record(row)
        alias_urls = [normalize_url(value) for value in (incoming.detail_url, incoming.official_url) if normalize_url(value)]
        if alias_urls:
            for row in connection.execute(
                """
                SELECT o.id, o.organizer, o.title, o.deadline_key, o.official_website,
                       o.identity_key, a.alias_kind, a.normalized_url
                FROM gary_opportunity_aliases a
                JOIN gary_opportunities o ON o.id = a.opportunity_id
                WHERE a.normalized_url = ANY(%s)
                """,
                (alias_urls,),
            ).fetchall():
                if row[6] == "detail" and (
                    normalize_text(row[1]) != normalize_text(incoming.organizer)
                    or normalize_text(row[2]) != normalize_text(incoming.title)
                ):
                    continue
                if row[5] != identity_key(row[1], row[2], row[3]):
                    continue
                opportunity_id = str(row[0])
                rows[opportunity_id] = row[:5]
                aliases = detail_aliases_by_id if row[6] == "detail" else official_aliases_by_id
                aliases.setdefault(opportunity_id, set()).add(row[7])
        return [
            IdentityRecord(
                id=row[0],
                organizer=row[1],
                title=row[2],
                deadline=row[3],
                detail_url=None,
                official_url=row[4],
                detail_aliases=tuple(sorted(detail_aliases_by_id.get(str(row[0]), set()))),
                official_aliases=tuple(sorted(official_aliases_by_id.get(str(row[0]), set()))),
            )
            for row in rows.values()
        ]

    def _insert_call(self, connection: Any, run_id: str, source_id: str, call: dict[str, Any]) -> tuple[str, str]:
        call = {key: _clean_text_values(value) for key, value in call.items()}
        evidence = call.get("official_evidence") or {}
        canonical_fields = evidence.get("canonical_fields") or {}
        source = call["source"]
        detail_url = source["detail_url"]
        official_url = call.get("official_website")
        incoming = IdentityInput(
            organizer=call.get("organizer", ""),
            title=call.get("title", ""),
            deadline=call.get("deadline"),
            detail_url=detail_url,
            official_url=official_url,
        )
        resolution = resolve_identity(incoming, self._existing_records(connection, incoming))
        if resolution.action == "attach" and resolution.matched_id:
            opportunity_id = resolution.matched_id
            connection.execute(
                """
                UPDATE gary_opportunities
                SET official_website = COALESCE(%s, official_website),
                    normalized_official_url = COALESCE(%s, normalized_official_url),
                    last_seen_at = now(), updated_at = now()
                WHERE id = %s
                """,
                (official_url, normalize_url(official_url), opportunity_id),
            )
        else:
            base_key = identity_key(call.get("organizer"), call.get("title"), call.get("deadline"))
            suffix = "" if resolution.action == "create" else "|review:" + hashlib.sha256(detail_url.encode()).hexdigest()[:12]
            canonical_key = base_key + suffix
            opportunity_id = _stable_id("opp", canonical_key)
            connection.execute(
                """
                INSERT INTO gary_opportunities(
                    id, identity_key, canonical_key, organizer_key, title_key, deadline_key,
                    organizer, title, official_website, normalized_official_url,
                    identity_status, identity_confidence
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    identity_key = excluded.identity_key,
                    canonical_key = excluded.canonical_key,
                    organizer_key = excluded.organizer_key,
                    title_key = excluded.title_key,
                    deadline_key = excluded.deadline_key,
                    organizer = excluded.organizer,
                    title = excluded.title,
                    official_website = COALESCE(excluded.official_website, gary_opportunities.official_website),
                    normalized_official_url = COALESCE(
                        excluded.normalized_official_url,
                        gary_opportunities.normalized_official_url
                    ),
                    identity_status = excluded.identity_status,
                    identity_confidence = excluded.identity_confidence,
                    updated_at = now()
                """,
                (
                    opportunity_id,
                    base_key,
                    canonical_key,
                    normalize_text(call.get("organizer")),
                    normalize_text(call.get("title")),
                    str(call.get("deadline") or "unknown"),
                    call.get("organizer", ""),
                    call.get("title", ""),
                    official_url,
                    normalize_url(official_url) or None,
                    "needs-review" if resolution.action == "review" else "confirmed",
                    resolution.confidence if resolution.action == "review" else 0.5,
                ),
            )
            for candidate_id in resolution.candidate_ids:
                connection.execute(
                    """
                    INSERT INTO gary_identity_candidates(
                        id, run_id, incoming_opportunity_id, existing_opportunity_id,
                        reason, confidence, evidence_json
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (run_id, incoming_opportunity_id, existing_opportunity_id) DO NOTHING
                    """,
                    (
                        _stable_id("identity", run_id, opportunity_id, candidate_id),
                        run_id,
                        opportunity_id,
                        candidate_id,
                        resolution.reason,
                        resolution.confidence,
                        _json({"organizer": call.get("organizer"), "title": call.get("title"), "deadline": call.get("deadline")}),
                    ),
                )

        for alias_kind, url in (("detail", detail_url), ("official", official_url)):
            normalized = normalize_url(url)
            if not normalized:
                continue
            if alias_kind == "detail":
                # A previous corrupt canonical group may already own this
                # detail URL. The current source observation is authoritative
                # for the derived alias mapping; raw observations are retained.
                connection.execute(
                    """
                    DELETE FROM gary_opportunity_aliases
                    WHERE alias_kind = 'detail'
                      AND normalized_url = %s
                      AND opportunity_id <> %s
                    """,
                    (normalized, opportunity_id),
                )
            connection.execute(
                """
                INSERT INTO gary_opportunity_aliases(id, opportunity_id, source_id, alias_kind, url, normalized_url)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (_stable_id("alias", opportunity_id, alias_kind, normalized), opportunity_id, source_id, alias_kind, url, normalized),
            )

        observation_id = _stable_id("observation", run_id, detail_url)
        observation_hash = hashlib.sha256(
            json.dumps(call, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        connection.execute(
            """
            INSERT INTO gary_call_observations(
                id, run_id, source_id, opportunity_id, source_detail_url, official_website,
                rank, deadline, deadline_note, entry_fee, cash_prize, genres_json, tags_json,
                description, contact_email, contact_details, full_text, host_status,
                host_match_score, canonical_source, canonical_deadline_text,
                canonical_entry_fee, canonical_cash_prize, missing_fields_json,
                payload_json, observation_hash
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                opportunity_id = excluded.opportunity_id,
                official_website = excluded.official_website,
                rank = excluded.rank,
                deadline = excluded.deadline,
                deadline_note = excluded.deadline_note,
                entry_fee = excluded.entry_fee,
                cash_prize = excluded.cash_prize,
                genres_json = excluded.genres_json,
                tags_json = excluded.tags_json,
                description = excluded.description,
                contact_email = excluded.contact_email,
                contact_details = excluded.contact_details,
                full_text = excluded.full_text,
                host_status = excluded.host_status,
                host_match_score = excluded.host_match_score,
                canonical_source = excluded.canonical_source,
                canonical_deadline_text = excluded.canonical_deadline_text,
                canonical_entry_fee = excluded.canonical_entry_fee,
                canonical_cash_prize = excluded.canonical_cash_prize,
                missing_fields_json = excluded.missing_fields_json,
                payload_json = excluded.payload_json,
                observation_hash = excluded.observation_hash,
                observed_at = now()
            """,
            (
                observation_id,
                run_id,
                source_id,
                opportunity_id,
                detail_url,
                official_url,
                call.get("rank", 1),
                _date(call.get("deadline")),
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
                _json(call),
                observation_hash,
            ),
        )
        return opportunity_id, observation_id

    def _insert_page(
        self,
        connection: Any,
        run_id: str,
        observation_id: str | None,
        role: str,
        page: dict[str, Any],
        evidence_root: Path,
    ) -> str:
        page = {key: _clean_text_values(value) for key, value in page.items()}
        html_path = page["html_path"]
        raw_html_content = _read_relative(evidence_root, html_path)
        if not isinstance(raw_html_content, str):
            raw_html_content = raw_html_content.decode("utf-8", errors="replace")
        content_hash = hashlib.sha256(raw_html_content.encode("utf-8")).hexdigest()
        html_content = _text(raw_html_content)
        page_id = _stable_id("page", run_id, html_path)
        connection.execute(
            """
            INSERT INTO gary_source_pages(
                id, run_id, observation_id, role, requested_url, final_url, status_code,
                content_type, title, text_content, html_content, content_hash, error,
                rendered, resource_urls_json, html_path
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                observation_id = COALESCE(excluded.observation_id, gary_source_pages.observation_id),
                final_url = excluded.final_url,
                status_code = excluded.status_code,
                content_type = excluded.content_type,
                title = excluded.title,
                text_content = excluded.text_content,
                html_content = excluded.html_content,
                content_hash = excluded.content_hash,
                error = excluded.error,
                rendered = excluded.rendered,
                resource_urls_json = excluded.resource_urls_json
            """,
            (
                page_id,
                run_id,
                observation_id,
                role,
                page["requested_url"],
                page["final_url"],
                page.get("status_code"),
                page.get("content_type"),
                page.get("title", ""),
                page.get("text", ""),
                html_content,
                content_hash,
                page.get("error"),
                bool(page.get("rendered", False)),
                _json(page.get("resource_urls", [])),
                html_path,
            ),
        )
        self._insert_page_assets(connection, page_id, page.get("media_assets", []), evidence_root)
        return page_id

    def _insert_page_assets(
        self,
        connection: Any,
        page_id: str,
        assets: list[dict[str, Any]],
        evidence_root: Path,
    ) -> None:
        for asset in assets:
            asset = {key: _clean_text_values(value) for key, value in asset.items()}
            local_path = asset.get("local_path")
            payload = _read_relative(evidence_root, local_path, binary=True) if local_path else b""
            if not isinstance(payload, bytes):
                payload = payload.encode("utf-8")
            sha256 = asset.get("sha256")
            blob_id = None
            if sha256:
                blob_id = _stable_id("blob", sha256)
                connection.execute(
                    """
                    INSERT INTO gary_media_blobs(id, sha256, content_type, byte_size, payload, local_path)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (sha256) DO UPDATE SET
                        content_type = COALESCE(excluded.content_type, gary_media_blobs.content_type),
                        byte_size = excluded.byte_size,
                        payload = COALESCE(excluded.payload, gary_media_blobs.payload),
                        local_path = COALESCE(excluded.local_path, gary_media_blobs.local_path)
                    """,
                    (
                        blob_id,
                        sha256,
                        asset.get("content_type"),
                        asset.get("byte_size") or len(payload),
                        payload or None,
                        local_path,
                    ),
                )
            relation = asset.get("relation") or "unknown"
            asset_id = _stable_id("asset", page_id, asset.get("original_url"), relation)
            connection.execute(
                """
                INSERT INTO gary_media_assets(
                    id, source_page_id, original_url, final_url, kind, content_type,
                    status_code, byte_size, blob_id, alt_text, relation, error
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    final_url = excluded.final_url,
                    content_type = excluded.content_type,
                    status_code = excluded.status_code,
                    byte_size = excluded.byte_size,
                    blob_id = excluded.blob_id,
                    alt_text = excluded.alt_text,
                    relation = excluded.relation,
                    error = excluded.error
                """,
                (
                    asset_id,
                    page_id,
                    asset["original_url"],
                    asset["final_url"],
                    asset["kind"],
                    asset.get("content_type"),
                    asset.get("status_code"),
                    asset.get("byte_size"),
                    blob_id,
                    asset.get("alt_text"),
                    relation,
                    asset.get("error"),
                ),
            )

    def _insert_fields(
        self,
        connection: Any,
        observation_id: str,
        call: dict[str, Any],
        page_ids: dict[str, str],
        evidence: dict[str, Any] | None,
    ) -> None:
        fields = {
            "deadline": call.get("deadline"),
            "entry_fee": call.get("entry_fee"),
            "cash_prize": call.get("cash_prize"),
        }
        for field_name, value in fields.items():
            if value:
                field_id = _stable_id("field", observation_id, "pw", field_name, value, 0)
                connection.execute(
                    """
                    INSERT INTO gary_field_observations(id, observation_id, field_name, value, source, selected, candidate_rank)
                    VALUES (%s, %s, %s, %s, 'pw', TRUE, 0)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (field_id, observation_id, field_name, value),
                )
        if evidence is None:
            return
        selected_page_id = page_ids.get((evidence.get("selected_page") or {}).get("html_path"))
        selected_fields = evidence.get("fields", {})
        for field_name, candidates in evidence.get("field_candidates", {}).items():
            for rank, value in enumerate(candidates):
                field_id = _stable_id("field", observation_id, "host", field_name, value, rank)
                connection.execute(
                    """
                    INSERT INTO gary_field_observations(id, observation_id, source_page_id, field_name, value, source, selected, candidate_rank)
                    VALUES (%s, %s, %s, %s, %s, 'host', %s, %s)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (field_id, observation_id, selected_page_id, field_name, value, value == selected_fields.get(field_name), rank),
                )
        for conflict in evidence.get("field_conflicts", []):
            field_name, _, detail = conflict.partition(":")
            conflict_id = _stable_id("conflict", observation_id, field_name, detail)
            connection.execute(
                """
                INSERT INTO gary_field_conflicts(id, observation_id, source_page_id, field_name, host_value, expected_value, detail)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    conflict_id,
                    observation_id,
                    selected_page_id,
                    field_name.strip(),
                    selected_fields.get(field_name.strip()),
                    fields.get(field_name.strip()),
                    detail.strip(),
                ),
            )

    def _ingest_profile_manifest(
        self,
        connection: Any,
        manifest: dict[str, Any],
        evidence_root: Path,
        run_id: str,
        source_id: str,
    ) -> None:
        for index_page in manifest.get("index_pages", [manifest.get("index")]):
            if index_page is not None:
                self._insert_profile_page(
                    connection,
                    run_id,
                    None,
                    "index",
                    index_page,
                    evidence_root,
                    [],
                )
        for profile in manifest.get("profiles", []):
            self._insert_profile(connection, run_id, source_id, profile, evidence_root)

    def _insert_profile(
        self,
        connection: Any,
        run_id: str,
        source_id: str,
        profile: dict[str, Any],
        evidence_root: Path | None = None,
    ) -> tuple[str, str]:
        profile = {key: _clean_text_values(value) for key, value in profile.items()}
        detail = profile.get("detail") or {}
        source = profile.get("source") or {}
        profile_kind = detail.get("kind") or profile.get("kind")
        if profile_kind not in {"literary_magazine", "small_press"}:
            raise ValueError(f"Unsupported profile kind: {profile_kind}")
        name = detail.get("name") or profile.get("name") or ""
        name_key = normalize_text(name)
        website_url = detail.get("website_url")
        normalized_website_url = normalize_url(website_url) or None
        host_key = _normalized_host_key(website_url)
        detail_url = source.get("detail_url") or detail.get("detail_url") or ""
        if not host_key:
            host_key = normalize_url(detail_url) or "unknown-host"
        canonical_key = f"profile:{profile_kind}:{host_key}:{name_key}"
        identity_key_value = canonical_key
        profile_id = _stable_id("profile", canonical_key)
        connection.execute(
            """
            INSERT INTO gary_profiles(
                id, identity_key, canonical_key, profile_kind, name_key, name,
                website_url, normalized_website_url, identity_status, identity_confidence
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'confirmed', %s)
            ON CONFLICT (id) DO UPDATE SET
                identity_key = excluded.identity_key,
                canonical_key = excluded.canonical_key,
                profile_kind = excluded.profile_kind,
                name_key = excluded.name_key,
                name = excluded.name,
                website_url = COALESCE(excluded.website_url, gary_profiles.website_url),
                normalized_website_url = COALESCE(
                    excluded.normalized_website_url,
                    gary_profiles.normalized_website_url
                ),
                last_seen_at = now(),
                updated_at = now()
            """,
            (
                profile_id,
                identity_key_value,
                canonical_key,
                profile_kind,
                name_key,
                name,
                website_url,
                normalized_website_url,
                0.95,
            ),
        )

        aliases = (
            ("detail", detail_url),
            ("official", website_url),
            ("submission", detail.get("submission_guidelines_url")),
        )
        for alias_kind, url in aliases:
            normalized = normalize_url(url)
            if not normalized:
                continue
            connection.execute(
                """
                INSERT INTO gary_profile_aliases(
                    id, profile_id, source_id, alias_kind, url, normalized_url
                ) VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (profile_id, normalized_url) DO UPDATE SET
                    source_id = excluded.source_id,
                    alias_kind = excluded.alias_kind,
                    url = excluded.url
                """,
                (
                    _stable_id("profile_alias", profile_id, normalized),
                    profile_id,
                    source_id,
                    alias_kind,
                    url,
                    normalized,
                ),
            )

        observation_id = _stable_id("profile_observation", run_id, detail_url)
        genres = detail.get("genres") or profile.get("genres", [])
        subgenres = detail.get("book_types") or profile.get("subgenres", [])
        formats = detail.get("formats", [])
        reading_period = detail.get("reading_period") or profile.get("reading_period")
        full_text = detail.get("full_text") or ""
        observation_hash = hashlib.sha256(
            json.dumps(profile, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        connection.execute(
            """
            INSERT INTO gary_profile_observations(
                id, run_id, source_id, profile_id, source_detail_url, profile_kind,
                rank, name, source_summary, website_url, submission_guidelines_url,
                genres_json, subgenres_json, representative_authors, formats_json,
                book_types_json, reading_period, response_time, reading_fee,
                unsolicited_submissions, simultaneous_submissions, payment,
                editorial_focus, editorial_tips, contact_name, contact_email,
                contact_details, issues_per_year, issue_price, subscription_price,
                circulation, titles_per_year, publishes_through_contests_only,
                last_updated, full_text, payload_json, observation_hash
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                profile_id = excluded.profile_id,
                rank = excluded.rank,
                name = excluded.name,
                source_summary = excluded.source_summary,
                website_url = excluded.website_url,
                submission_guidelines_url = excluded.submission_guidelines_url,
                genres_json = excluded.genres_json,
                subgenres_json = excluded.subgenres_json,
                representative_authors = excluded.representative_authors,
                formats_json = excluded.formats_json,
                book_types_json = excluded.book_types_json,
                reading_period = excluded.reading_period,
                response_time = excluded.response_time,
                reading_fee = excluded.reading_fee,
                unsolicited_submissions = excluded.unsolicited_submissions,
                simultaneous_submissions = excluded.simultaneous_submissions,
                payment = excluded.payment,
                editorial_focus = excluded.editorial_focus,
                editorial_tips = excluded.editorial_tips,
                contact_name = excluded.contact_name,
                contact_email = excluded.contact_email,
                contact_details = excluded.contact_details,
                issues_per_year = excluded.issues_per_year,
                issue_price = excluded.issue_price,
                subscription_price = excluded.subscription_price,
                circulation = excluded.circulation,
                titles_per_year = excluded.titles_per_year,
                publishes_through_contests_only = excluded.publishes_through_contests_only,
                last_updated = excluded.last_updated,
                full_text = excluded.full_text,
                payload_json = excluded.payload_json,
                observation_hash = excluded.observation_hash,
                observed_at = now()
            """,
            (
                observation_id,
                run_id,
                source_id,
                profile_id,
                detail_url,
                profile_kind,
                profile.get("rank", 1),
                name,
                profile.get("summary"),
                website_url,
                detail.get("submission_guidelines_url"),
                _json(genres),
                _json(subgenres),
                detail.get("representative_authors"),
                _json(formats),
                _json(detail.get("book_types", [])),
                reading_period,
                detail.get("response_time"),
                detail.get("reading_fee"),
                detail.get("unsolicited_submissions"),
                detail.get("simultaneous_submissions"),
                detail.get("payment"),
                detail.get("editorial_focus"),
                detail.get("editorial_tips"),
                detail.get("contact_name"),
                detail.get("contact_email"),
                detail.get("contact_details"),
                detail.get("issues_per_year"),
                detail.get("issue_price"),
                detail.get("subscription_price"),
                detail.get("circulation"),
                detail.get("titles_per_year"),
                detail.get("publishes_through_contests_only"),
                detail.get("last_updated"),
                full_text,
                _json(profile),
                observation_hash,
            ),
        )

        page_ids: dict[str, str] = {}
        detail_page = source.get("detail_page")
        if detail_page is not None and evidence_root is not None:
            page_ids[detail_page["html_path"]] = self._insert_profile_page(
                connection,
                run_id,
                observation_id,
                "profile",
                detail_page,
                evidence_root,
                profile.get("media_assets", []),
            )
        self._insert_profile_fields(
            connection,
            observation_id,
            profile,
            page_ids,
        )
        return profile_id, observation_id

    def _insert_profile_page(
        self,
        connection: Any,
        run_id: str,
        profile_observation_id: str | None,
        role: str,
        page: dict[str, Any],
        evidence_root: Path,
        assets: list[dict[str, Any]],
    ) -> str:
        page = {key: _clean_text_values(value) for key, value in page.items()}
        html_path = page["html_path"]
        raw_html_content = _read_relative(evidence_root, html_path)
        if not isinstance(raw_html_content, str):
            raw_html_content = raw_html_content.decode("utf-8", errors="replace")
        content_hash = hashlib.sha256(raw_html_content.encode("utf-8")).hexdigest()
        page_id = _stable_id("profile_page", run_id, html_path)
        connection.execute(
            """
            INSERT INTO gary_profile_pages(
                id, run_id, profile_observation_id, role, requested_url, final_url,
                status_code, content_type, title, text_content, html_content,
                content_hash, error, rendered, resource_urls_json, html_path
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                profile_observation_id = COALESCE(excluded.profile_observation_id, gary_profile_pages.profile_observation_id),
                final_url = excluded.final_url,
                status_code = excluded.status_code,
                content_type = excluded.content_type,
                title = excluded.title,
                text_content = excluded.text_content,
                html_content = excluded.html_content,
                content_hash = excluded.content_hash,
                error = excluded.error,
                rendered = excluded.rendered,
                resource_urls_json = excluded.resource_urls_json
            """,
            (
                page_id,
                run_id,
                profile_observation_id,
                role,
                page["requested_url"],
                page["final_url"],
                page.get("status_code"),
                page.get("content_type"),
                page.get("title", ""),
                page.get("text", ""),
                _text(raw_html_content),
                content_hash,
                page.get("error"),
                bool(page.get("rendered", False)),
                _json(page.get("resource_urls", [])),
                html_path,
            ),
        )
        self._insert_profile_page_assets(connection, page_id, assets, evidence_root)
        return page_id

    def _insert_profile_page_assets(
        self,
        connection: Any,
        page_id: str,
        assets: list[dict[str, Any]],
        evidence_root: Path,
    ) -> None:
        for asset in assets:
            asset = {key: _clean_text_values(value) for key, value in asset.items()}
            local_path = asset.get("local_path")
            payload = _read_relative(evidence_root, local_path, binary=True) if local_path else b""
            if not isinstance(payload, bytes):
                payload = payload.encode("utf-8")
            sha256 = asset.get("sha256")
            blob_id = None
            if sha256:
                blob_id = _stable_id("blob", sha256)
                connection.execute(
                    """
                    INSERT INTO gary_media_blobs(id, sha256, content_type, byte_size, payload, local_path)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (sha256) DO UPDATE SET
                        content_type = COALESCE(excluded.content_type, gary_media_blobs.content_type),
                        byte_size = excluded.byte_size,
                        payload = COALESCE(excluded.payload, gary_media_blobs.payload),
                        local_path = COALESCE(excluded.local_path, gary_media_blobs.local_path)
                    """,
                    (
                        blob_id,
                        sha256,
                        asset.get("content_type"),
                        asset.get("byte_size") or len(payload),
                        payload or None,
                        local_path,
                    ),
                )
            relation = asset.get("relation") or "unknown"
            asset_id = _stable_id("profile_asset", page_id, asset.get("original_url"), relation)
            connection.execute(
                """
                INSERT INTO gary_profile_media_assets(
                    id, profile_page_id, original_url, final_url, kind, content_type,
                    status_code, byte_size, blob_id, alt_text, relation, error
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    final_url = excluded.final_url,
                    content_type = excluded.content_type,
                    status_code = excluded.status_code,
                    byte_size = excluded.byte_size,
                    blob_id = excluded.blob_id,
                    alt_text = excluded.alt_text,
                    relation = excluded.relation,
                    error = excluded.error
                """,
                (
                    asset_id,
                    page_id,
                    asset["original_url"],
                    asset["final_url"],
                    asset.get("kind", "other"),
                    asset.get("content_type"),
                    asset.get("status_code"),
                    asset.get("byte_size"),
                    blob_id,
                    asset.get("alt_text"),
                    relation,
                    asset.get("error"),
                ),
            )

    def _insert_profile_fields(
        self,
        connection: Any,
        observation_id: str,
        profile: dict[str, Any],
        page_ids: dict[str, str],
    ) -> None:
        detail = profile.get("detail") or {}
        selected_page_id = next(iter(page_ids.values()), None)
        values = {
            "name": detail.get("name") or profile.get("name"),
            "website_url": detail.get("website_url"),
            "submission_guidelines_url": detail.get("submission_guidelines_url"),
            "genres": ", ".join(detail.get("genres") or profile.get("genres", [])),
            "subgenres": ", ".join(detail.get("book_types") or profile.get("subgenres", [])),
            "formats": ", ".join(detail.get("formats", [])),
            "reading_period": detail.get("reading_period") or profile.get("reading_period"),
            "response_time": detail.get("response_time"),
            "reading_fee": detail.get("reading_fee"),
            "payment": detail.get("payment"),
            "editorial_focus": detail.get("editorial_focus"),
            "last_updated": detail.get("last_updated"),
        }
        for field_name, value in values.items():
            if value is None or value == "":
                continue
            field_id = _stable_id("profile_field", observation_id, "pw", field_name, value, 0)
            connection.execute(
                """
                INSERT INTO gary_profile_field_observations(
                    id, profile_observation_id, profile_page_id, field_name,
                    value, source, selected, candidate_rank
                ) VALUES (%s, %s, %s, %s, %s, 'pw', TRUE, 0)
                ON CONFLICT (id) DO NOTHING
                """,
                (field_id, observation_id, selected_page_id, field_name, value),
            )

    def enqueue_job(
        self,
        *,
        source_id: str,
        kind: str,
        target_url: str,
        priority: int = 0,
        run_id: str | None = None,
    ) -> str:
        normalized = normalize_url(target_url)
        job_id = _stable_id("job", source_id, kind, normalized)
        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                connection.execute(
                    """
                    INSERT INTO gary_crawl_jobs(id, source_id, run_id, kind, target_url, normalized_url, priority)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (source_id, kind, normalized_url) DO UPDATE SET
                        target_url = excluded.target_url,
                        run_id = COALESCE(excluded.run_id, gary_crawl_jobs.run_id),
                        priority = excluded.priority,
                        status = CASE WHEN gary_crawl_jobs.status IN ('completed', 'failed') THEN 'queued' ELSE gary_crawl_jobs.status END,
                        available_at = now(),
                        lease_until = NULL,
                        last_error = NULL,
                        updated_at = now()
                    """,
                    (job_id, source_id, run_id, kind, target_url, normalized, priority),
                )
        return job_id

    def claim_jobs(self, *, limit: int = 10, lease_seconds: int = 300) -> list[dict[str, Any]]:
        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                rows = connection.execute(
                    """
                    WITH next_jobs AS (
                        SELECT id
                        FROM gary_crawl_jobs
                        WHERE status IN ('queued', 'failed')
                          AND available_at <= now()
                          AND (lease_until IS NULL OR lease_until < now())
                        ORDER BY priority DESC, created_at ASC
                        FOR UPDATE SKIP LOCKED
                        LIMIT %s
                    )
                    UPDATE gary_crawl_jobs AS jobs
                    SET status = 'processing', attempts = jobs.attempts + 1,
                        lease_until = now() + make_interval(secs => %s), updated_at = now()
                    FROM next_jobs
                    WHERE jobs.id = next_jobs.id
                    RETURNING jobs.id, jobs.source_id, jobs.run_id, jobs.kind,
                              jobs.target_url, jobs.attempts, jobs.lease_until
                    """,
                    (limit, lease_seconds),
                ).fetchall()
                return [
                    {
                        "id": row[0],
                        "source_id": row[1],
                        "run_id": row[2],
                        "kind": row[3],
                        "target_url": row[4],
                        "attempts": row[5],
                        "lease_until": row[6],
                    }
                    for row in rows
                ]

    def complete_job(self, job_id: str) -> None:
        self._update_job(job_id, "completed", None)

    def fail_job(self, job_id: str, error: str, *, retry_after_seconds: int = 300) -> None:
        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                connection.execute(
                    """
                    UPDATE gary_crawl_jobs
                    SET status = CASE WHEN attempts >= 8 THEN 'blocked' ELSE 'failed' END,
                        available_at = now() + make_interval(secs => %s),
                        lease_until = NULL, last_error = %s, updated_at = now()
                    WHERE id = %s
                    """,
                    (retry_after_seconds, error[:500], job_id),
                )

    def _update_job(self, job_id: str, status: str, error: str | None) -> None:
        with self.connect_factory(self.database_url) as connection:
            with connection.transaction():
                connection.execute(
                    "UPDATE gary_crawl_jobs SET status = %s, lease_until = NULL, last_error = %s, updated_at = now() WHERE id = %s",
                    (status, error, job_id),
                )

    def counts(self, run_id: str) -> dict[str, int]:
        queries = {
            "opportunities": "SELECT COUNT(*) FROM gary_opportunities WHERE id IN (SELECT opportunity_id FROM gary_call_observations WHERE run_id = %s)",
            "observations": "SELECT COUNT(*) FROM gary_call_observations WHERE run_id = %s",
            "profiles": "SELECT COUNT(*) FROM gary_profiles WHERE id IN (SELECT profile_id FROM gary_profile_observations WHERE run_id = %s)",
            "profile_observations": "SELECT COUNT(*) FROM gary_profile_observations WHERE run_id = %s",
            "profile_pages": "SELECT COUNT(*) FROM gary_profile_pages WHERE run_id = %s",
            "profile_media_assets": "SELECT COUNT(*) FROM gary_profile_media_assets WHERE profile_page_id IN (SELECT id FROM gary_profile_pages WHERE run_id = %s)",
            "profile_media_blobs": "SELECT COUNT(*) FROM gary_media_blobs WHERE id IN (SELECT blob_id FROM gary_profile_media_assets WHERE profile_page_id IN (SELECT id FROM gary_profile_pages WHERE run_id = %s))",
            "profile_field_observations": "SELECT COUNT(*) FROM gary_profile_field_observations WHERE profile_observation_id IN (SELECT id FROM gary_profile_observations WHERE run_id = %s)",
            "source_pages": "SELECT COUNT(*) FROM gary_source_pages WHERE run_id = %s",
            "media_assets": "SELECT COUNT(*) FROM gary_media_assets WHERE source_page_id IN (SELECT id FROM gary_source_pages WHERE run_id = %s)",
            "media_blobs": "SELECT COUNT(*) FROM gary_media_blobs WHERE id IN (SELECT blob_id FROM gary_media_assets WHERE source_page_id IN (SELECT id FROM gary_source_pages WHERE run_id = %s))",
            "field_observations": "SELECT COUNT(*) FROM gary_field_observations WHERE observation_id IN (SELECT id FROM gary_call_observations WHERE run_id = %s)",
            "field_conflicts": "SELECT COUNT(*) FROM gary_field_conflicts WHERE observation_id IN (SELECT id FROM gary_call_observations WHERE run_id = %s)",
            "identity_candidates": "SELECT COUNT(*) FROM gary_identity_candidates WHERE run_id = %s",
        }
        with self.connect_factory(self.database_url) as connection:
            result = {
                key: connection.execute(query, (run_id,)).fetchone()[0]
                for key, query in queries.items()
            }
        return result
