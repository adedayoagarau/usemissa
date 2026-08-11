from __future__ import annotations

import hashlib
import json
import os
import threading
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterator
from uuid import uuid4

import psycopg
from psycopg.types.json import Jsonb


PROMPT_VERSION = "gary-review-v1"
POLICY_VERSION = "gary-publish-v1"
ADAPTER_VERSION = "poets-writers-v1"
PARSER_VERSION = "gary-parser-v1"
DEFAULT_MODEL = "deepseek-v4-flash"


def stable_id(prefix: str, *parts: object) -> str:
    material = "\x1f".join(str(part) for part in parts)
    return f"{prefix}_" + hashlib.sha256(material.encode("utf-8")).hexdigest()[:32]


def release_id() -> str:
    git_sha = os.environ.get("RAILWAY_GIT_COMMIT_SHA") or os.environ.get("GIT_SHA") or "local"
    return stable_id("release", git_sha, PROMPT_VERSION, POLICY_VERSION)


@dataclass(frozen=True, slots=True)
class ReviewJob:
    id: str
    opportunity_id: str
    observation_id: str
    run_id: str
    source_id: str
    attempts: int
    requested_action: str | None


@dataclass(frozen=True, slots=True)
class ReviewCandidate:
    queue_id: str
    opportunity_id: str
    observation_id: str
    organizer: str
    title: str
    identity_status: str
    identity_confidence: float
    source_detail_url: str
    official_website: str | None
    deadline: str | None
    entry_fee: str | None
    cash_prize: str | None
    genres: list[str]
    description: str | None
    host_status: str | None
    missing_fields: list[str]
    conflicts: list[dict[str, Any]]
    requested_action: str | None

    def model_payload(self) -> dict[str, Any]:
        return {
            "organizer": self.organizer,
            "title": self.title,
            "identity_status": self.identity_status,
            "identity_confidence": self.identity_confidence,
            "pw_url": self.source_detail_url,
            "official_website": self.official_website,
            "deadline": self.deadline,
            "entry_fee": self.entry_fee,
            "cash_prize": self.cash_prize,
            "genres": self.genres,
            "description": self.description,
            "host_status": self.host_status,
            "missing_fields": self.missing_fields,
            "conflicts": self.conflicts,
        }


class HarnessStore:
    def __init__(self, database_url: str):
        if not database_url:
            raise ValueError("DATABASE_URL is required")
        self.database_url = database_url

    def register_release(self, model: str = DEFAULT_MODEL) -> str:
        current_id = release_id()
        git_sha = os.environ.get("RAILWAY_GIT_COMMIT_SHA") or os.environ.get("GIT_SHA") or "local"
        with psycopg.connect(self.database_url) as connection:
            with connection.transaction():
                connection.execute(
                    "UPDATE gary_harness_releases SET status = 'superseded', updated_at = now() WHERE status = 'active' AND id <> %s",
                    (current_id,),
                )
                connection.execute(
                    """
                    INSERT INTO gary_harness_releases(
                      id, git_sha, artifact_version, adapter_version, parser_version,
                      prompt_version, policy_version, model, status, metadata_json
                    ) VALUES(%s, %s, %s, %s, %s, %s, %s, %s, 'active', %s)
                    ON CONFLICT (id) DO UPDATE SET status = 'active', model = excluded.model,
                      metadata_json = excluded.metadata_json, updated_at = now()
                    """,
                    (
                        current_id,
                        git_sha,
                        os.environ.get("RAILWAY_DEPLOYMENT_ID") or "local",
                        ADAPTER_VERSION,
                        PARSER_VERSION,
                        PROMPT_VERSION,
                        POLICY_VERSION,
                        model,
                        Jsonb({"environment": os.environ.get("RAILWAY_ENVIRONMENT_NAME", "local")}),
                    ),
                )
        return current_id

    def heartbeat(
        self,
        worker_kind: str,
        instance_id: str,
        status: str,
        *,
        release: str | None = None,
        current_run_id: str | None = None,
        current_job_id: str | None = None,
        progress: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> None:
        with psycopg.connect(self.database_url) as connection:
            connection.execute(
                """
                INSERT INTO gary_worker_heartbeats(
                  worker_kind, instance_id, release_id, status, current_run_id,
                  current_job_id, progress_json, last_error
                ) VALUES(%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (worker_kind) DO UPDATE SET
                  instance_id = excluded.instance_id, release_id = excluded.release_id,
                  status = excluded.status, current_run_id = excluded.current_run_id,
                  current_job_id = excluded.current_job_id,
                  progress_json = excluded.progress_json, last_error = excluded.last_error,
                  heartbeat_at = now(), updated_at = now()
                """,
                (worker_kind, instance_id, release, status, current_run_id, current_job_id, Jsonb(progress or {}), error),
            )

    def enqueue_run(self, run_id: str) -> int:
        with psycopg.connect(self.database_url) as connection:
            with connection.transaction():
                rows = connection.execute(
                    """
                    INSERT INTO gary_review_queue(
                      id, opportunity_id, observation_id, run_id, source_id,
                      observation_hash, requested_action
                    )
                    SELECT 'review_' || substr(md5(co.opportunity_id || ':' || co.observation_hash), 1, 32),
                           co.opportunity_id, co.id, co.run_id, co.source_id,
                           co.observation_hash, 'review'
                    FROM gary_call_observations co
                    WHERE co.run_id = %s
                    ON CONFLICT (opportunity_id, observation_hash) DO NOTHING
                    RETURNING id
                    """,
                    (run_id,),
                ).fetchall()
                connection.execute(
                    """
                    UPDATE gary_review_queue older
                    SET status = 'superseded', lease_owner = NULL, lease_until = NULL, updated_at = now()
                    FROM gary_review_queue current
                    WHERE current.run_id = %s
                      AND older.opportunity_id = current.opportunity_id
                      AND older.id <> current.id
                      AND older.status IN ('queued', 'processing', 'recommended', 'needs_human', 'held', 'failed')
                    """,
                    (run_id,),
                )
        return len(rows)

    def enqueue_unreviewed(self, limit: int = 1000) -> int:
        with psycopg.connect(self.database_url) as connection:
            rows = connection.execute(
                """
                INSERT INTO gary_review_queue(
                  id, opportunity_id, observation_id, run_id, source_id,
                  observation_hash, requested_action
                )
                SELECT 'review_' || substr(md5(co.opportunity_id || ':' || co.observation_hash), 1, 32),
                       co.opportunity_id, co.id, co.run_id, co.source_id,
                       co.observation_hash, 'review'
                FROM (
                  SELECT DISTINCT ON (opportunity_id) *
                  FROM gary_call_observations
                  ORDER BY opportunity_id, observed_at DESC, id DESC
                ) co
                LEFT JOIN gary_review_queue q
                  ON q.opportunity_id = co.opportunity_id AND q.observation_hash = co.observation_hash
                WHERE q.id IS NULL
                ORDER BY co.observed_at DESC
                LIMIT %s
                ON CONFLICT (opportunity_id, observation_hash) DO NOTHING
                RETURNING id
                """,
                (limit,),
            ).fetchall()
        return len(rows)

    def supersede_stale_jobs(self) -> int:
        with psycopg.connect(self.database_url) as connection:
            rows = connection.execute(
                """
                WITH ranked AS (
                  SELECT q.id, row_number() OVER (
                    PARTITION BY q.opportunity_id
                    ORDER BY co.observed_at DESC, q.created_at DESC, q.id DESC
                  ) AS position
                  FROM gary_review_queue q
                  JOIN gary_call_observations co ON co.id = q.observation_id
                  WHERE q.status IN ('queued', 'processing', 'recommended', 'needs_human', 'held', 'failed')
                )
                UPDATE gary_review_queue q
                SET status = 'superseded', lease_owner = NULL, lease_until = NULL, updated_at = now()
                FROM ranked WHERE q.id = ranked.id AND ranked.position > 1
                RETURNING q.id
                """
            ).fetchall()
        return len(rows)

    def claim(self, owner: str, limit: int = 20, lease_seconds: int = 900) -> list[ReviewJob]:
        with psycopg.connect(self.database_url) as connection:
            with connection.transaction():
                rows = connection.execute(
                    """
                    WITH due AS (
                      SELECT id FROM gary_review_queue
                      WHERE status IN ('queued', 'failed')
                        AND attempts < max_attempts
                        AND available_at <= now()
                        AND (lease_until IS NULL OR lease_until < now())
                      ORDER BY priority DESC, created_at
                      LIMIT %s
                      FOR UPDATE SKIP LOCKED
                    )
                    UPDATE gary_review_queue q
                    SET status = 'processing', attempts = q.attempts + 1,
                        lease_owner = %s, lease_until = now() + make_interval(secs => %s),
                        updated_at = now()
                    FROM due WHERE q.id = due.id
                    RETURNING q.id, q.opportunity_id, q.observation_id, q.run_id,
                              q.source_id, q.attempts, q.requested_action
                    """,
                    (limit, owner, lease_seconds),
                ).fetchall()
        return [ReviewJob(*row) for row in rows]

    def candidate(self, job: ReviewJob) -> ReviewCandidate:
        with psycopg.connect(self.database_url) as connection:
            row = connection.execute(
                """
                SELECT q.id, g.id, co.id, g.organizer, g.title, g.identity_status,
                       g.identity_confidence, co.source_detail_url, co.official_website,
                       co.deadline::text, co.entry_fee, co.cash_prize, co.genres_json,
                       co.description, co.host_status, co.missing_fields_json,
                       COALESCE((SELECT jsonb_agg(jsonb_build_object(
                         'field', fc.field_name, 'host', fc.host_value,
                         'directory', fc.expected_value, 'detail', fc.detail
                       )) FROM gary_field_conflicts fc WHERE fc.observation_id = co.id), '[]'::jsonb),
                       q.requested_action
                FROM gary_review_queue q
                JOIN gary_opportunities g ON g.id = q.opportunity_id
                JOIN gary_call_observations co ON co.id = q.observation_id
                WHERE q.id = %s
                """,
                (job.id,),
            ).fetchone()
        if row is None:
            raise ValueError(f"Review job not found: {job.id}")
        values = list(row)
        values[6] = float(values[6])
        values[12] = list(values[12] or [])
        values[15] = list(values[15] or [])
        values[16] = list(values[16] or [])
        return ReviewCandidate(*values)

    def save_decision(
        self,
        job: ReviewJob,
        candidate: ReviewCandidate,
        *,
        model: str,
        recommendation: str,
        confidence: float,
        reasons: list[str],
        checks: dict[str, Any],
        raw_output: dict[str, Any],
        input_hash: str,
        output_hash: str,
        input_tokens: int | None,
        output_tokens: int | None,
        estimated_cost_usd: float | None,
        release: str,
    ) -> str:
        decision_id = stable_id("decision", job.id, input_hash, model, PROMPT_VERSION)
        next_status = "recommended" if recommendation == "publish" else recommendation
        with psycopg.connect(self.database_url) as connection:
            with connection.transaction():
                connection.execute(
                    """
                    INSERT INTO gary_ai_review_decisions(
                      id, queue_id, opportunity_id, observation_id, release_id, model,
                      prompt_version, policy_version, input_hash, output_hash,
                      recommendation, confidence, reasons_json, checks_json,
                      raw_output_json, input_tokens, output_tokens, estimated_cost_usd
                    ) VALUES(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                             %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (queue_id, input_hash, model, prompt_version) DO UPDATE SET
                      output_hash = excluded.output_hash, recommendation = excluded.recommendation,
                      confidence = excluded.confidence, reasons_json = excluded.reasons_json,
                      checks_json = excluded.checks_json, raw_output_json = excluded.raw_output_json,
                      input_tokens = excluded.input_tokens, output_tokens = excluded.output_tokens,
                      estimated_cost_usd = excluded.estimated_cost_usd
                    """,
                    (
                        decision_id, job.id, candidate.opportunity_id, candidate.observation_id,
                        release, model, PROMPT_VERSION, POLICY_VERSION, input_hash, output_hash,
                        recommendation, confidence, Jsonb(reasons), Jsonb(checks), Jsonb(raw_output),
                        input_tokens, output_tokens, estimated_cost_usd,
                    ),
                )
                connection.execute(
                    """
                    UPDATE gary_review_queue
                    SET status = %s, recommendation = %s, confidence = %s,
                        decision_id = %s, reviewed_at = now(), lease_owner = NULL,
                        lease_until = NULL, last_error = NULL, updated_at = now()
                    WHERE id = %s
                    """,
                    (next_status, recommendation, confidence, decision_id, job.id),
                )
                self._audit(connection, "reviewer", model, "review.completed", "review-job", job.id, {
                    "recommendation": recommendation, "confidence": confidence, "decision_id": decision_id,
                })
        return decision_id

    def mark_published(self, job_id: str, opportunity_id: str, actor: str) -> None:
        with psycopg.connect(self.database_url) as connection:
            with connection.transaction():
                connection.execute(
                    """
                    UPDATE gary_review_queue SET status = 'published', published_opportunity_id = %s,
                      published_at = now(), lease_owner = NULL, lease_until = NULL,
                      requested_action = NULL, last_error = NULL, updated_at = now()
                    WHERE id = %s
                    """,
                    (opportunity_id, job_id),
                )
                self._audit(connection, "reviewer", actor, "opportunity.published", "review-job", job_id, {
                    "opportunity_id": opportunity_id,
                })

    def mark_needs_human(self, job_id: str, reason: str) -> None:
        with psycopg.connect(self.database_url) as connection:
            connection.execute(
                """
                UPDATE gary_review_queue SET status = 'needs_human', operator_note = %s,
                  lease_owner = NULL, lease_until = NULL, updated_at = now()
                WHERE id = %s
                """,
                (reason[:1000], job_id),
            )

    def cost_today(self) -> float:
        with psycopg.connect(self.database_url) as connection:
            row = connection.execute(
                "SELECT COALESCE(sum(estimated_cost_usd), 0) FROM gary_ai_review_decisions WHERE created_at >= current_date"
            ).fetchone()
        return float(row[0] if row else 0)

    def fail(self, job_id: str, error: str, *, retry_minutes: int = 15) -> None:
        with psycopg.connect(self.database_url) as connection:
            connection.execute(
                """
                UPDATE gary_review_queue
                SET status = CASE WHEN attempts >= max_attempts THEN 'needs_human' ELSE 'failed' END,
                    available_at = now() + make_interval(mins => %s), lease_owner = NULL,
                    lease_until = NULL, last_error = %s, updated_at = now()
                WHERE id = %s
                """,
                (retry_minutes, error[:2000], job_id),
            )

    def defer(self, job_id: str, reason: str, *, retry_minutes: int = 60) -> None:
        with psycopg.connect(self.database_url) as connection:
            connection.execute(
                """
                UPDATE gary_review_queue
                SET status = 'queued', attempts = greatest(attempts - 1, 0),
                    available_at = now() + make_interval(mins => %s),
                    lease_owner = NULL, lease_until = NULL, last_error = %s,
                    updated_at = now()
                WHERE id = %s
                """,
                (retry_minutes, reason[:1000], job_id),
            )

    def cycle_summary(self, since: datetime) -> dict[str, Any]:
        with psycopg.connect(self.database_url) as connection:
            counts = connection.execute(
                """
                SELECT status, count(*) FROM gary_review_queue
                WHERE updated_at >= %s GROUP BY status ORDER BY status
                """,
                (since,),
            ).fetchall()
            total_cost = connection.execute(
                "SELECT COALESCE(sum(estimated_cost_usd), 0) FROM gary_ai_review_decisions WHERE created_at >= %s",
                (since,),
            ).fetchone()[0]
        return {"statuses": {status: count for status, count in counts}, "estimated_cost_usd": float(total_cost)}

    def record_digest(
        self,
        digest_date: date,
        timezone_name: str,
        recipient_hash: str,
        status: str,
        summary: dict[str, Any],
        *,
        provider_message_id: str | None = None,
        error: str | None = None,
    ) -> bool:
        digest_id = stable_id("digest", digest_date, timezone_name, recipient_hash)
        with psycopg.connect(self.database_url) as connection:
            row = connection.execute(
                """
                INSERT INTO gary_daily_digests(
                  id, digest_date, timezone, recipient_hash, status, summary_json,
                  provider_message_id, error, sent_at
                ) VALUES(%s, %s, %s, %s, %s, %s, %s, %s,
                         CASE WHEN %s = 'sent' THEN now() ELSE NULL END)
                ON CONFLICT (digest_date, timezone, recipient_hash) DO NOTHING
                RETURNING id
                """,
                (digest_id, digest_date, timezone_name, recipient_hash, status, Jsonb(summary), provider_message_id, error, status),
            ).fetchone()
        return row is not None

    @staticmethod
    def _audit(connection: Any, actor_type: str, actor_id: str, action: str, target_type: str, target_id: str, payload: dict[str, Any]) -> None:
        connection.execute(
            """
            INSERT INTO gary_harness_audit_events(id, actor_type, actor_id, action, target_type, target_id, payload_json)
            VALUES(%s, %s, %s, %s, %s, %s, %s)
            """,
            (f"audit_{uuid4().hex}", actor_type, actor_id, action, target_type, target_id, Jsonb(payload)),
        )


@contextmanager
def heartbeat_loop(
    store: HarnessStore,
    worker_kind: str,
    instance_id: str,
    *,
    release: str | None,
    status: str = "working",
    current_run_id: str | None = None,
    current_job_id: str | None = None,
    interval_seconds: int = 30,
) -> Iterator[None]:
    stopped = threading.Event()

    def beat() -> None:
        while not stopped.is_set():
            try:
                store.heartbeat(
                    worker_kind, instance_id, status, release=release,
                    current_run_id=current_run_id, current_job_id=current_job_id,
                )
            except Exception as error:  # The work must not die because telemetry is unavailable.
                print(f"[gary-{worker_kind}] heartbeat failed: {error}")
            stopped.wait(interval_seconds)

    thread = threading.Thread(target=beat, name=f"gary-{worker_kind}-heartbeat", daemon=True)
    thread.start()
    try:
        yield
    finally:
        stopped.set()
        thread.join(timeout=2)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def retry_delay(attempt: int) -> timedelta:
    return timedelta(minutes=min(240, 5 * (2 ** max(0, attempt - 1))))
