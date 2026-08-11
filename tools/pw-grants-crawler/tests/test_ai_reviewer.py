from __future__ import annotations

from datetime import datetime, timezone

from pw_grants_crawler.ai_reviewer import DeepSeekReviewer, deterministic_blockers, deterministic_checks
from pw_grants_crawler.harness import ReviewCandidate
from pw_grants_crawler.review_worker import should_run_morning


def candidate(**overrides: object) -> ReviewCandidate:
    values: dict[str, object] = {
        "queue_id": "review_1",
        "opportunity_id": "opp_1",
        "observation_id": "obs_1",
        "organizer": "Example Review",
        "title": "Annual Poetry Prize",
        "identity_status": "confirmed",
        "identity_confidence": 0.97,
        "source_detail_url": "https://www.pw.org/example",
        "official_website": "https://example.org/prize",
        "deadline": "2026-10-01",
        "entry_fee": "$10",
        "cash_prize": "$1,000",
        "genres": ["Poetry"],
        "description": "A prize for a poetry manuscript.",
        "host_status": "verified",
        "missing_fields": [],
        "conflicts": [],
        "requested_action": "review",
    }
    values.update(overrides)
    return ReviewCandidate(**values)  # type: ignore[arg-type]


def test_required_field_blockers_are_deterministic() -> None:
    checks = deterministic_checks(candidate(deadline=None, identity_status="needs-review"))
    assert deterministic_blockers(checks) == ["missing deadline", "identity requires review"]


def test_blocked_candidate_never_calls_deepseek(monkeypatch) -> None:
    monkeypatch.setattr("httpx.post", lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("network should not be called")))
    result = DeepSeekReviewer("secret").review(candidate(deadline=None))
    assert result.recommendation == "needs_human"
    assert result.confidence == 1.0


def test_morning_cycle_runs_once_after_configured_hour() -> None:
    now = datetime(2026, 8, 11, 16, 0, tzinfo=timezone.utc)  # 09:00 America/Los_Angeles
    due, local_date = should_run_morning(now, "America/Los_Angeles", 8, None)
    assert due is True
    assert local_date == "2026-08-11"
    assert should_run_morning(now, "America/Los_Angeles", 8, local_date)[0] is False


def test_host_unavailability_is_not_a_publication_blocker() -> None:
    checks = deterministic_checks(candidate(host_status="unavailable"))
    assert deterministic_blockers(checks) == []
