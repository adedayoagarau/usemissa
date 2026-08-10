from datetime import date

from pw_grants_crawler.identity import (
    IdentityInput,
    IdentityRecord,
    identity_key,
    normalize_text,
    normalize_url,
    resolve_identity,
)
from pw_grants_crawler.neon import stable_run_id


def test_identity_key_is_stable_across_case_punctuation_and_url_tracking_noise():
    assert normalize_text("  Gival Press, LLC! ") == "gival press llc"
    assert normalize_url(
        "https://www.example.org/call/?utm_source=pw&ref=directory#details"
    ) == "https://example.org/call"
    assert identity_key("Gival Press, LLC", "Short-Story Award", date(2026, 8, 8)) == (
        "call:gival press llc|short story award|2026-08-08"
    )


def test_same_organizer_title_and_deadline_attach_to_existing_opportunity():
    incoming = IdentityInput(
        organizer="Gival Press",
        title="Short Story Award",
        deadline=date(2026, 8, 8),
        detail_url="https://www.pw.org/writing_contests/short_story_award",
        official_url="https://givalpress.com/short-story-award-2027",
    )
    existing = IdentityRecord(
        id="gary-1",
        organizer="Gival Press",
        title="Short Story Award",
        deadline=date(2026, 8, 8),
        detail_url="https://givalpress.com/short-story-award",
        official_url="https://givalpress.com/short-story-award-2026",
    )

    result = resolve_identity(incoming, [existing])

    assert result.action == "attach"
    assert result.matched_id == "gary-1"
    assert result.reason == "organizer_title_deadline"


def test_same_call_name_with_different_deadline_is_review_candidate_not_auto_merge():
    incoming = IdentityInput(
        organizer="Gival Press",
        title="Short Story Award",
        deadline=date(2027, 8, 8),
        detail_url="https://directory.example/gival-2027",
        official_url="https://givalpress.com/short-story-award-2027",
    )
    existing = IdentityRecord(
        id="gary-1",
        organizer="Gival Press",
        title="Short Story Award",
        deadline=date(2026, 8, 8),
        detail_url="https://givalpress.com/short-story-award",
        official_url="https://givalpress.com/short-story-award-2026",
    )

    result = resolve_identity(incoming, [existing])

    assert result.action == "review"
    assert result.matched_id is None
    assert result.reason == "similar_identity"
    assert result.candidate_ids == ("gary-1",)


def test_exact_alias_attaches_even_when_source_labels_changed():
    incoming = IdentityInput(
        organizer="A slightly revised organizer name",
        title="A revised listing title",
        deadline=date(2027, 8, 8),
        detail_url="https://source-b.example/call",
        official_url="https://new-host.example/call",
    )
    existing = IdentityRecord(
        id="gary-1",
        organizer="Original organizer",
        title="Original listing title",
        deadline=date(2026, 8, 8),
        detail_url=None,
        official_url=None,
        aliases=("https://source-b.example/call",),
    )

    result = resolve_identity(incoming, [existing])

    assert result.action == "attach"
    assert result.matched_id == "gary-1"
    assert result.reason == "exact_url_alias"


def test_shared_official_hub_does_not_merge_different_call_titles():
    incoming = IdentityInput(
        organizer="Academy of American Poets",
        title="First Book Award",
        deadline=date(2026, 9, 1),
        detail_url="https://www.pw.org/writing_contests/first_book_award",
        official_url="https://poets.org/academy-american-poets/american-poets-prizes",
    )
    existing = IdentityRecord(
        id="gary-1",
        organizer="Academy of American Poets",
        title="Ambroggio Prize",
        deadline=date(2026, 9, 15),
        detail_url="https://www.pw.org/writing_contests/ambroggio_prize",
        official_url="https://poets.org/academy-american-poets/american-poets-prizes",
    )

    result = resolve_identity(incoming, [existing])

    assert result.action != "attach"
    assert result.matched_id is None


def test_neon_run_id_is_stable_for_retries_of_the_same_source_manifest():
    assert stable_run_id("pw.org", "a" * 64) == stable_run_id("pw.org", "a" * 64)
    assert stable_run_id("pw.org", "a" * 64) != stable_run_id("pw.org", "b" * 64)
