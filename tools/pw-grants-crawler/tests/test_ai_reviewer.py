from __future__ import annotations

from datetime import datetime, timezone

from pw_grants_crawler.ai_reviewer import DeepSeekReviewer, deterministic_blockers, deterministic_checks, parse_json_object
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


def test_morning_cycle_stays_idle_after_restart_when_durable_date_is_today() -> None:
    now = datetime(2026, 8, 11, 23, 30, tzinfo=timezone.utc)  # 16:30 America/Los_Angeles
    assert should_run_morning(now, "America/Los_Angeles", 8, "2026-08-11")[0] is False


def test_host_unavailability_is_not_a_publication_blocker() -> None:
    checks = deterministic_checks(candidate(host_status="unavailable"))
    assert deterministic_blockers(checks) == []


def test_json_parser_accepts_markdown_fence() -> None:
    assert parse_json_object('```json\n{"recommendation":"publish"}\n```') == {"recommendation": "publish"}


def test_invalid_json_is_repaired_once(monkeypatch) -> None:
    class Response:
        def __init__(self, content: str, prompt_tokens: int, completion_tokens: int):
            self.content = content
            self.prompt_tokens = prompt_tokens
            self.completion_tokens = completion_tokens

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {
                "choices": [{"message": {"content": self.content}}],
                "usage": {"prompt_tokens": self.prompt_tokens, "completion_tokens": self.completion_tokens},
            }

    responses = iter([
        Response('{"recommendation": publish}', 100, 20),
        Response('{"recommendation":"publish","confidence":0.91,"reasons":["coherent"],"checks":{}}', 150, 30),
    ])
    calls: list[dict[str, object]] = []

    def post(*_args: object, **kwargs: object) -> Response:
        calls.append(kwargs)
        return next(responses)

    monkeypatch.setattr("httpx.post", post)
    result = DeepSeekReviewer("secret").review(candidate())

    assert len(calls) == 2
    assert result.recommendation == "publish"
    assert result.input_tokens == 250
    assert result.output_tokens == 50
    assert "previous response" in str(calls[1]["json"])
