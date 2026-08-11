from __future__ import annotations

import os
import re
from datetime import date

import psycopg


SOURCE_ID = "src_a4e14bc3-c42a-4944-9ac3-250e684e5f1d"


def money_cents(value: str | None) -> int | None:
    match = re.search(r"(?:\$|USD\s*)([0-9][0-9,]*(?:\.[0-9]{1,2})?)", value or "")
    return round(float(match.group(1).replace(",", "")) * 100) if match else None


def slug(value: str, fallback: str) -> str:
    result = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:150]
    return result or fallback


def main() -> None:
    with psycopg.connect(os.environ["DATABASE_URL"]) as connection:
        rows = connection.execute(
            """
            SELECT DISTINCT ON (g.id)
              g.id, g.organizer, g.title, co.deadline, co.entry_fee,
              co.cash_prize, co.genres_json, co.description,
              co.source_detail_url, co.official_website, co.observed_at
            FROM gary_opportunities g
            JOIN gary_call_observations co ON co.opportunity_id = g.id
            WHERE co.host_status = 'verified'
            ORDER BY g.id, co.observed_at DESC
            """
        ).fetchall()
        promoted = 0
        for opportunity_id, organizer, title, deadline, entry_fee, prize, genres, description, pw_url, official_url, checked_at in rows:
            if not deadline:
                continue
            text = " ".join((title or "", organizer or "", description or ""))
            lowered = text.lower()
            opportunity_type = (
                "fellowship" if "fellowship" in lowered
                else "grant" if "grant" in lowered
                else "award" if "award" in lowered or "prize" in lowered
                else "contest"
            )
            fee_cents = money_cents(entry_fee)
            status = "closed" if deadline < date.today() else "open"
            submission_state = "closed" if status == "closed" else "available"
            official = official_url or pw_url
            host = re.sub(r"^https?://", "", official).split("/", 1)[0]
            genre_list = genres or ["Writing"]
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
                  'fixed', %s, %s, 'USD', %s, %s, %s, %s, %s, %s, %s,
                  %s, %s, %s, now()
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
                    opportunity_id, f"{slug(title or '', opportunity_id)}-{opportunity_id[-8:]}", title,
                    SOURCE_ID, status, opportunity_type, genre_list[0], genre_list,
                    deadline, "unknown" if fee_cents is None else "no-fee" if fee_cents == 0 else "paid",
                    fee_cents, prize, official, official, host, submission_state,
                    text, checked_at, checked_at, checked_at, checked_at,
                ),
            )
            evidence_id = f"{opportunity_id}:evidence:{SOURCE_ID}"
            connection.execute(
                """
                INSERT INTO opportunity_source_evidence(
                  id, opportunity_id, source_id, kind, name, url, checked_at,
                  processing_succeeded_at, organization_confirmed, verified_until
                ) VALUES(%s, %s, %s, 'directory', 'Poets & Writers Contests', %s,
                         %s, %s, false, NULL)
                ON CONFLICT (id) DO UPDATE SET
                  checked_at = excluded.checked_at,
                  processing_succeeded_at = excluded.processing_succeeded_at
                """,
                (evidence_id, opportunity_id, SOURCE_ID, pw_url, checked_at, checked_at),
            )
            promoted += 1
        connection.execute(
            """UPDATE opportunity_sources
               SET last_checked_at = now(), last_successful_fetch_at = now(),
                   last_processed_at = now(), updated_at = now()
               WHERE id = %s""",
            (SOURCE_ID,),
        )
        print(f"promoted {promoted} verified PW opportunities")


if __name__ == "__main__":
    main()
