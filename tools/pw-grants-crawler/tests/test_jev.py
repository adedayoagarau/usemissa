from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

from pw_grants_crawler.jev import (
    GARY_PUBLICATION_ROUTE,
    SAME_OPPORTUNITY,
    JevClient,
    JevError,
    MemoryDecisionLedger,
    PostgresDecisionLedger,
    decide,
    decision_mode_from_env,
    identity_pair_subject_id,
    input_hash,
    jev_client_from_env,
    opportunity_identity_state,
    route_answer,
    same_opportunity_state,
)


IDENTITY_SET = Path(__file__).resolve().parents[3] / "packages" / "decisions" / "src" / "sets" / "identity.ts"


def transport(*responses: httpx.Response | Exception, seen: list[httpx.Request] | None = None) -> httpx.MockTransport:
    queue = list(responses)

    def handler(request: httpx.Request) -> httpx.Response:
        if seen is not None:
            seen.append(request)
        response = queue.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    return httpx.MockTransport(handler)


def answer(payload: dict) -> httpx.Response:
    return httpx.Response(200, json={"model": "jev-test", "answers": payload})


def client(*responses: httpx.Response | Exception, seen: list[httpx.Request] | None = None, **options) -> JevClient:
    return JevClient("k", transport=transport(*responses, seen=seen), sleep=lambda _seconds: None, **options)


# ── Client ────────────────────────────────────────────────────────────


def test_client_posts_state_and_questions_with_bearer_key():
    seen: list[httpx.Request] = []
    result = client(answer({"q0": {"type": "noul", "noul": 0.9}}), seen=seen).evaluate({"a": 1}, {"q0": {"type": "noul", "instructions": "?"}})
    assert result["answers"]["q0"]["noul"] == 0.9
    request = seen[0]
    assert str(request.url) == "https://thejevai.com/v1/systemone"
    assert request.headers["Authorization"] == "Bearer k"
    assert json.loads(request.content) == {"state": {"a": 1}, "model": "jev-latest", "questions": {"q0": {"type": "noul", "instructions": "?"}}}


def test_client_retries_overload_and_rate_limits_then_succeeds():
    seen: list[httpx.Request] = []
    jev = client(httpx.Response(429), httpx.Response(529), answer({}), seen=seen)
    assert jev.evaluate({}, {"q0": {"type": "noul", "instructions": "?"}})["model"] == "jev-test"
    assert len(seen) == 3


def test_client_does_not_retry_a_bad_request_and_gives_up_after_max_retries():
    seen: list[httpx.Request] = []
    with pytest.raises(JevError) as bad:
        client(httpx.Response(400, text="bad"), answer({}), seen=seen).evaluate({}, {"q0": {}})
    assert bad.value.status == 400 and len(seen) == 1
    with pytest.raises(JevError):
        client(*(httpx.ConnectTimeout("slow") for _ in range(3)), max_retries=2).evaluate({}, {"q0": {}})


def test_client_without_a_key_is_unavailable():
    jev = jev_client_from_env({})
    assert jev.available is False
    with pytest.raises(JevError):
        jev.evaluate({}, {"q0": {}})
    configured = jev_client_from_env({"JEV_API_KEY": "k", "JEV_TIMEOUT_MS": "2500", "JEV_MODEL": "jev-x"})
    assert configured.available and configured.timeout == 2.5 and configured.model == "jev-x"
    assert configured.can_send("public") and not configured.can_send("creator-private")


def test_decision_mode_is_shadow_unless_the_scope_is_live():
    assert decision_mode_from_env("gary_review", {}) == "shadow"
    assert decision_mode_from_env("gary_review", {"DECISIONS_MODE": "live"}) == "live"
    assert decision_mode_from_env("gary_review", {"DECISIONS_MODE": "live", "DECISIONS_MODE_GARY_REVIEW": "shadow"}) == "shadow"
    assert decision_mode_from_env("gary_review", {"DECISIONS_MODE_GARY_REVIEW": "live"}) == "live"


# ── Routing and hashing parity with packages/decisions ────────────────


def test_routing_follows_each_question_policy():
    noul = route_answer(SAME_OPPORTUNITY, {"type": "noul", "noul": 0.95}, "live")
    assert (noul.route, noul.answer, noul.actionable) == ("apply", "true", True)
    assert route_answer(SAME_OPPORTUNITY, {"type": "noul", "noul": 0.05}, "shadow").route == "reject"
    assert route_answer(SAME_OPPORTUNITY, {"type": "noul", "noul": 0.5}, "live").route == "review"
    assert route_answer(SAME_OPPORTUNITY, {"type": "choice"}, "live").route == "unavailable"

    def choice(option: str, probability: float):
        return route_answer(
            GARY_PUBLICATION_ROUTE,
            {"type": "choice", "choice": option, "probabilities": {option: probability}, "confidence": 0.9},
            "live",
        )

    assert choice("publish", 0.9).route == "apply"
    assert choice("publish", 0.8).route == "review"
    assert choice("needs_human", 0.99).route == "review"
    assert choice("archive", 0.99).route == "unavailable"


def test_input_hash_and_pair_state_match_the_typescript_package():
    # Values computed with packages/decisions (inputHash, sameOpportunityState, identityPairSubjectId).
    state = same_opportunity_state(
        opportunity_identity_state(title="Poetry  Prize", organization="Nörth Review", urls=["https://b.test", None, "https://b.test"], deadline="2026-10-01"),
        opportunity_identity_state(title="Poetry Prize", organization="North Review", urls=[], type="contest"),
    )
    assert input_hash(state) == "6fed0ad5ed42314082fc776f9c26d5a83f3c8d66e9065228598ff27f428b9a39"
    assert input_hash({"a": 1, "b": [True, None, 0.5, "x"], "c": {"z": 2, "y": 1.0}}) == "bc42906509fac38d9ba51bed39f6d0e2754d2152c737ce54a0e6fbafd1e78e9f"
    assert identity_pair_subject_id("x" * 150, "y" * 150) == "pair_91eef0b45151f71f5a7bc60141cde94e261f9836"
    assert identity_pair_subject_id("opp_b", "opp_a") == "opp_a~opp_b"


@pytest.mark.skipif(not IDENTITY_SET.exists(), reason="TypeScript question set not in this checkout")
@pytest.mark.parametrize("definition", [GARY_PUBLICATION_ROUTE, SAME_OPPORTUNITY], ids=lambda d: d.key)
def test_question_wording_matches_the_typescript_definition(definition):
    source = IDENTITY_SET.read_text(encoding="utf-8")
    assert f'key: "{definition.key}",\n  version: {definition.version},' in source
    assert json.dumps(definition.question["instructions"], ensure_ascii=False) in source
    for meaning in definition.question["criteria"].values():
        assert json.dumps(meaning, ensure_ascii=False) in source


# ── decide and ledgers ────────────────────────────────────────────────


def test_decide_records_routed_answers_once_per_input():
    ledger = MemoryDecisionLedger()
    jev = client(answer({"q0": {"type": "noul", "noul": 0.97}}), answer({"q0": {"type": "noul", "noul": 0.97}}))
    for _ in range(2):
        result = decide(client=jev, ledger=ledger, mode="shadow", subject_id="a~b", state={"x": 1}, questions=[SAME_OPPORTUNITY])
    assert result.outcomes[SAME_OPPORTUNITY.key].route == "apply"
    assert result.outcomes[SAME_OPPORTUNITY.key].actionable is False
    assert len(ledger.records) == 1
    record = ledger.records[0]
    assert (record.decider_kind, record.decider, record.decider_version) == ("jev", "jev", "jev-test")
    assert record.policy_version == "identity.same_opportunity@1"
    assert record.options == ["true", "false"]


def test_decide_never_raises_for_jev_or_ledger_failures():
    failing = client(httpx.Response(401))
    result = decide(client=failing, ledger=MemoryDecisionLedger(), mode="live", subject_id="s", state={}, questions=[SAME_OPPORTUNITY])
    assert result.outcomes[SAME_OPPORTUNITY.key].route == "unavailable"
    assert "401" in (result.error or "")

    class BrokenLedger:
        def record(self, _records):
            raise RuntimeError("relation data_decisions does not exist")

    result = decide(client=client(answer({"q0": {"type": "noul", "noul": 0.5}})), ledger=BrokenLedger(), mode="shadow", subject_id="s", state={}, questions=[SAME_OPPORTUNITY])
    assert result.outcomes[SAME_OPPORTUNITY.key].route == "review"
    assert result.error and result.error.startswith("Ledger write failed")

    unconfigured = decide(client=JevClient(None), ledger=None, mode="live", subject_id="s", state={}, questions=[SAME_OPPORTUNITY])
    assert unconfigured.outcomes[SAME_OPPORTUNITY.key].reason == "Jev is not configured"


def test_postgres_ledger_uses_the_machine_dedup_index():
    statements = []

    class Connection:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def execute(self, sql, values):
            statements.append((sql, values))
            return self

        def fetchall(self):
            return [("dec_1",)]

    ledger = PostgresDecisionLedger("postgres://example.test/db", connect_factory=lambda _url: Connection())
    result = decide(
        client=client(answer({"q0": {"type": "noul", "noul": 0.123456}})), ledger=ledger, mode="shadow",
        subject_id="s", state={}, questions=[SAME_OPPORTUNITY],
    )
    assert result.error is None
    sql, values = statements[0]
    assert "INSERT INTO data_decisions" in sql
    assert "ON CONFLICT (subject_type, subject_id, question_key, question_version, decider, input_hash)" in sql
    assert "WHERE decider_kind <> 'human' DO NOTHING" in sql
    assert sql.count("%s") == len(values) == 23
    assert values[11] == 0.1235  # probability rounded like the TypeScript ledger
