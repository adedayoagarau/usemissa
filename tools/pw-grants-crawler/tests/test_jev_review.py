from __future__ import annotations

from datetime import date

import httpx

from pw_grants_crawler import review_worker
from pw_grants_crawler.ai_reviewer import JevPublicationRouter, ReviewResult, jev_publication_router_from_env
from pw_grants_crawler.harness import ReviewCandidate, ReviewJob
from pw_grants_crawler.identity import IdentityInput, IdentityRecord, OpportunityIdentityShadow
from pw_grants_crawler.jev import JevClient, MemoryDecisionLedger
from pw_grants_crawler.neon import NeonStore


def candidate(**overrides: object) -> ReviewCandidate:
    values: dict[str, object] = {
        "queue_id": "review_1",
        "opportunity_id": "identity_opp_1",
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


class FakeStore:
    def __init__(self, review_candidate: ReviewCandidate):
        self.review_candidate = review_candidate
        self.decisions: list[dict] = []
        self.published: list[tuple[str, str]] = []
        self.needs_human: list[str] = []
        self.failures: list[str] = []

    def cost_today(self) -> float:
        return 0.0

    def claim(self, owner: str, limit: int) -> list[ReviewJob]:
        return [ReviewJob("review_1", self.review_candidate.opportunity_id, "obs_1", "run_1", "pw.org", 1, None)]

    def candidate(self, job: ReviewJob) -> ReviewCandidate:
        return self.review_candidate

    def save_decision(self, job, review_candidate, **kwargs) -> str:
        self.decisions.append(kwargs)
        return "decision_1"

    def mark_published(self, job_id: str, opportunity_id: str, actor: str) -> None:
        self.published.append((opportunity_id, actor))

    def mark_needs_human(self, job_id: str, reason: str) -> None:
        self.needs_human.append(reason)

    def fail(self, job_id: str, error: str) -> None:
        self.failures.append(error)

    def defer(self, job_id: str, reason: str) -> None:
        raise AssertionError("not expected")


class FakeDeepSeek:
    model = "deepseek-test"

    def __init__(self, recommendation: str = "publish", confidence: float = 0.9):
        self.calls = 0
        self.recommendation = recommendation
        self.confidence = confidence

    def review(self, review_candidate: ReviewCandidate) -> ReviewResult:
        self.calls += 1
        return ReviewResult(
            recommendation=self.recommendation, confidence=self.confidence, reasons=["ok"], checks={},
            raw={}, input_hash="in", output_hash="out", input_tokens=10, output_tokens=5, estimated_cost_usd=0.0001,
        )


def jev_router(choice: str, probability: float, mode: str, *, calls: list[int] | None = None, status: int = 200) -> tuple[JevPublicationRouter, MemoryDecisionLedger]:
    def handler(request: httpx.Request) -> httpx.Response:
        if calls is not None:
            calls.append(1)
        if status != 200:
            return httpx.Response(status)
        return httpx.Response(200, json={
            "model": "jev-test",
            "answers": {"q0": {"type": "choice", "choice": choice, "probabilities": {choice: probability}, "confidence": 0.9}},
        })

    ledger = MemoryDecisionLedger()
    client = JevClient("k", transport=httpx.MockTransport(handler), max_retries=0, sleep=lambda _s: None)
    return JevPublicationRouter(client, ledger, mode, log=lambda _message: None), ledger


def run(store: FakeStore, reviewer: FakeDeepSeek, router: JevPublicationRouter | None, monkeypatch) -> dict[str, int]:
    published: list[str] = []
    monkeypatch.setattr(review_worker, "publish_opportunity", lambda _url, review_candidate: published.append(review_candidate.opportunity_id))
    return review_worker.process_batch(
        store, reviewer, "postgres://example.test/gary", owner="test", release="release_1",  # type: ignore[arg-type]
        batch_size=1, publish_threshold=0.85, daily_cost_limit_usd=1.0, router=router,
    )


def test_without_jev_the_reviewer_behaves_as_before(monkeypatch):
    store, reviewer = FakeStore(candidate()), FakeDeepSeek()
    counts = run(store, reviewer, None, monkeypatch)
    assert counts["published"] == 1 and reviewer.calls == 1
    assert store.decisions[0]["model"] == "deepseek-test"
    assert store.published == [("identity_opp_1", "deepseek-test")]


def test_shadow_records_jev_and_deepseek_and_still_follows_deepseek(monkeypatch):
    router, ledger = jev_router("reject", 0.99, "shadow")
    store, reviewer = FakeStore(candidate()), FakeDeepSeek("publish", 0.9)
    counts = run(store, reviewer, router, monkeypatch)
    assert counts["published"] == 1 and reviewer.calls == 1
    assert [(record.decider_kind, record.answer, record.mode) for record in ledger.records] == [
        ("jev", "reject", "shadow"),
        ("llm", "publish", "live"),
    ]
    jev_row, llm_row = ledger.records
    assert jev_row.input_hash == llm_row.input_hash
    assert llm_row.decider == "deepseek" and llm_row.decider_version == "deepseek-test"
    assert llm_row.route == "apply" and jev_row.question_key == "gary.publication_route"


def test_live_confident_jev_publish_skips_deepseek(monkeypatch):
    router, ledger = jev_router("publish", 0.95, "live")
    store, reviewer = FakeStore(candidate()), FakeDeepSeek()
    counts = run(store, reviewer, router, monkeypatch)
    assert reviewer.calls == 0 and counts["published"] == 1
    assert store.decisions[0]["model"] == "jev/jev-test"
    assert store.decisions[0]["recommendation"] == "publish"
    assert store.published == [("identity_opp_1", "jev/jev-test")]
    assert [record.decider_kind for record in ledger.records] == ["jev"]


def test_live_confident_jev_reject_skips_deepseek(monkeypatch):
    router, _ledger = jev_router("reject", 0.97, "live")
    store, reviewer = FakeStore(candidate()), FakeDeepSeek()
    counts = run(store, reviewer, router, monkeypatch)
    assert reviewer.calls == 0 and counts["rejected"] == 1 and not store.published


def test_live_uncertain_jev_falls_back_to_deepseek(monkeypatch):
    for choice, probability in (("publish", 0.7), ("needs_human", 0.99)):
        router, ledger = jev_router(choice, probability, "live")
        store, reviewer = FakeStore(candidate()), FakeDeepSeek("needs_human", 0.9)
        counts = run(store, reviewer, router, monkeypatch)
        assert reviewer.calls == 1 and counts["needs_human"] == 1
        assert [record.decider_kind for record in ledger.records] == ["jev", "llm"]


def test_jev_failure_falls_back_to_deepseek(monkeypatch):
    router, ledger = jev_router("publish", 0.99, "live", status=503)
    store, reviewer = FakeStore(candidate()), FakeDeepSeek()
    counts = run(store, reviewer, router, monkeypatch)
    assert reviewer.calls == 1 and counts["published"] == 1 and not store.failures
    assert [record.decider_kind for record in ledger.records] == ["llm"]


def test_deterministic_blockers_win_and_jev_is_not_asked(monkeypatch):
    calls: list[int] = []
    router, ledger = jev_router("publish", 0.99, "live", calls=calls)

    class BlockingReviewer(FakeDeepSeek):
        def review(self, review_candidate):
            from pw_grants_crawler.ai_reviewer import DeepSeekReviewer

            self.calls += 1
            return DeepSeekReviewer("secret").review(review_candidate)

    store, reviewer = FakeStore(candidate(deadline=None)), BlockingReviewer()
    counts = run(store, reviewer, router, monkeypatch)
    assert calls == [] and counts["needs_human"] == 1 and not store.published
    assert ledger.records == []


def test_router_exists_only_with_a_key():
    assert jev_publication_router_from_env("postgres://example.test/gary", {}) is None
    router = jev_publication_router_from_env("postgres://example.test/gary", {"JEV_API_KEY": "k", "DECISIONS_MODE_GARY_REVIEW": "live"})
    assert router is not None and router.mode == "live"


# ── Identity review band ──────────────────────────────────────────────


def identity_shadow(noul: float) -> tuple[OpportunityIdentityShadow, MemoryDecisionLedger]:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"model": "jev-test", "answers": {"q0": {"type": "noul", "noul": noul}}})

    ledger = MemoryDecisionLedger()
    client = JevClient("k", transport=httpx.MockTransport(handler), max_retries=0)
    return OpportunityIdentityShadow(client, ledger, log=lambda _message: None), ledger


INCOMING = IdentityInput("Gival Press", "Short Story Award", date(2027, 8, 8), "https://www.pw.org/gival", "https://givalpress.com/award")
EXISTING = IdentityRecord("identity_opp_existing", "Gival Press", "Short-Story Award", "2026-08-08", None, "https://givalpress.com/award")


def test_identity_shadow_records_same_opportunity_for_a_review_pair():
    shadow, ledger = identity_shadow(0.04)
    outcome = shadow(INCOMING, "identity_opp_incoming", EXISTING)
    assert outcome.route == "reject" and outcome.actionable is False
    [record] = ledger.records
    assert record.question_key == "identity.same_opportunity"
    assert record.subject_type == "opportunity_pair"
    assert record.subject_id == "identity_opp_existing~identity_opp_incoming"
    assert record.mode == "shadow"


class Connection:
    def __init__(self):
        self.statements = []

    def execute(self, query, params=None):
        self.statements.append((query, params))


def test_review_band_queues_shadow_pairs_without_changing_the_insert(monkeypatch):
    calls = []
    store = NeonStore("postgres://example.test/gary", identity_shadow=lambda *args: calls.append(args))
    plain = NeonStore("postgres://example.test/gary")
    for neon in (store, plain):
        monkeypatch.setattr(neon, "_existing_records", lambda connection, incoming: [EXISTING])
    call = {
        "organizer": "Gival Press",
        "title": "Short Story Award",
        "deadline": "2027-08-08",
        "official_website": "https://elsewhere.example/award",
        "source": {"detail_url": "https://www.pw.org/gival"},
    }
    with_shadow, without_shadow = Connection(), Connection()
    store._insert_call(with_shadow, "run_1", "pw.org", call)
    plain._insert_call(without_shadow, "run_1", "pw.org", call)

    def comparable(statements):
        # Jsonb wrappers compare by identity, so compare their payloads.
        return [(query, tuple(getattr(value, "obj", value) for value in params or ())) for query, params in statements]

    assert comparable(with_shadow.statements) == comparable(without_shadow.statements)
    assert any("gary_identity_candidates" in query for query, _ in with_shadow.statements)
    assert len(store._pending_identity_reviews) == 1
    assert calls == []  # nothing runs inside the ingest transaction

    def failing(*args):
        calls.append(args)
        raise RuntimeError("Jev down")

    store.identity_shadow = failing
    store._flush_identity_reviews()
    assert len(calls) == 1 and store._pending_identity_reviews == []
