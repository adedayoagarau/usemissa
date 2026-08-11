from __future__ import annotations

import os
import re
from datetime import date

import psycopg

from .harness import ReviewCandidate


DEFAULT_PUBLIC_SOURCE_ID = "src_a4e14bc3-c42a-4944-9ac3-250e684e5f1d"


def money_cents(value: str | None) -> int | None:
    match = re.search(r"(?:\$|USD\s*)([0-9][0-9,]*(?:\.[0-9]{1,2})?)", value or "")
    return round(float(match.group(1).replace(",", "")) * 100) if match else None


def slug(value: str, fallback: str) -> str:
    result = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:150]
    return result or fallback


def opportunity_type(candidate: ReviewCandidate) -> str:
    lowered = " ".join((candidate.title, candidate.organizer, candidate.description or "")).lower()
    if "fellowship" in lowered:
        return "fellowship"
    if "grant" in lowered:
        return "grant"
    if "award" in lowered or "prize" in lowered:
        return "award"
    return "contest"


def publish_opportunity(database_url: str, candidate: ReviewCandidate) -> str:
    if not candidate.deadline:
        raise ValueError("Publication policy requires a deadline")
    deadline = date.fromisoformat(candidate.deadline[:10])
    fee_cents = money_cents(candidate.entry_fee)
    status = "closed" if deadline < date.today() else "open"
    submission_state = "closed" if status == "closed" else "available"
    official = candidate.official_website or candidate.source_detail_url
    host = re.sub(r"^https?://", "", official).split("/", 1)[0]
    genres = candidate.genres or ["Writing"]
    searchable = " ".join((candidate.title, candidate.organizer, candidate.description or ""))
    source_id = os.environ.get("GARY_PUBLIC_SOURCE_ID", DEFAULT_PUBLIC_SOURCE_ID)

    with psycopg.connect(database_url) as connection:
        with connection.transaction():
            connection.execute(
                """
                INSERT INTO opportunities(
                  id, slug, title, organization_id, source_id, status,
                  publication_state, type, discipline, genres, deadline_date,
                  deadline_kind, fee_status, fee_cents, fee_currency, prize,
                  guidelines_url, submission_url, submission_host,
                  submission_state, search_document, source_checked_at,
                  processing_succeeded_at, last_changed_at, created_at, updated_at
                ) VALUES(
                  %s, %s, %s, NULL, %s, %s, 'published', %s, %s, %s, %s,
                  'fixed', %s, %s, 'USD', %s, %s, %s, %s, %s, %s, now(),
                  now(), now(), now(), now()
                )
                ON CONFLICT (id) DO UPDATE SET
                  slug = excluded.slug, title = excluded.title,
                  source_id = excluded.source_id, status = excluded.status,
                  publication_state = excluded.publication_state,
                  type = excluded.type, discipline = excluded.discipline,
                  genres = excluded.genres, deadline_date = excluded.deadline_date,
                  fee_status = excluded.fee_status, fee_cents = excluded.fee_cents,
                  prize = excluded.prize, guidelines_url = excluded.guidelines_url,
                  submission_url = excluded.submission_url,
                  submission_host = excluded.submission_host,
                  submission_state = excluded.submission_state,
                  search_document = excluded.search_document,
                  source_checked_at = excluded.source_checked_at,
                  processing_succeeded_at = excluded.processing_succeeded_at,
                  last_changed_at = excluded.last_changed_at, updated_at = now()
                """,
                (
                    candidate.opportunity_id,
                    f"{slug(candidate.title, candidate.opportunity_id)}-{candidate.opportunity_id[-8:]}",
                    candidate.title,
                    source_id,
                    status,
                    opportunity_type(candidate),
                    genres[0],
                    genres,
                    deadline,
                    "unknown" if fee_cents is None else "no-fee" if fee_cents == 0 else "paid",
                    fee_cents,
                    candidate.cash_prize,
                    official,
                    official,
                    host,
                    submission_state,
                    searchable,
                ),
            )
            evidence_id = f"{candidate.opportunity_id}:evidence:{source_id}"
            connection.execute(
                """
                INSERT INTO opportunity_source_evidence(
                  id, opportunity_id, source_id, kind, name, url, checked_at,
                  processing_succeeded_at, organization_confirmed, verified_until
                ) VALUES(%s, %s, %s, 'directory', 'Poets & Writers Contests', %s,
                         now(), now(), false, NULL)
                ON CONFLICT (id) DO UPDATE SET url = excluded.url,
                  checked_at = excluded.checked_at,
                  processing_succeeded_at = excluded.processing_succeeded_at
                """,
                (evidence_id, candidate.opportunity_id, source_id, candidate.source_detail_url),
            )
            connection.execute(
                """UPDATE opportunity_sources
                   SET last_checked_at = now(), last_successful_fetch_at = now(),
                       last_processed_at = now(), updated_at = now()
                   WHERE id = %s""",
                (source_id,),
            )
    return candidate.opportunity_id
