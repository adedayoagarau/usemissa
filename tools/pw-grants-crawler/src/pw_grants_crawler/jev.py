"""Jev (TypeSafe AI System One) client and decision ledger for Gary.

Mirrors packages/decisions (TypeScript): the same request shape, retry rules,
routing policy, canonical input hash and data_decisions columns, so a Gary
decision and a Missa decision about the same record land in one ledger with
comparable rows.

Jev never writes text. Gary asks it typed questions and routes each answer by
the question's own policy. Everything is shadow unless
``DECISIONS_MODE_<SCOPE>=live`` (or ``DECISIONS_MODE=live``), and every Jev or
ledger failure is logged and ignored so the existing path keeps working.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Iterable, Mapping, Sequence
from uuid import uuid4

import httpx


JEV_DEFAULT_BASE_URL = "https://thejevai.com"
JEV_DEFAULT_MODEL = "jev-latest"
RETRYABLE_STATUS = {429, 529, 500, 502, 503, 504}


# ── Questions ─────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class QuestionDefinition:
    key: str
    version: int
    subject_type: str
    data_class: str
    question: dict[str, Any]
    policy: dict[str, Any]
    field_name: str | None = None

    @property
    def kind(self) -> str:
        return str(self.question["type"])

    def options(self) -> list[str]:
        if self.kind == "choice":
            return list(self.question["criteria"].keys())
        if self.kind == "score":
            return list(self.question["criteria"])
        return ["true", "false"]


# Keep these two definitions identical to packages/decisions/src/sets/identity.ts
# (tests/test_jev.py checks the wording) and bump both versions together.
GARY_PUBLICATION_ROUTE = QuestionDefinition(
    key="gary.publication_route",
    version=1,
    subject_type="gary_opportunity",
    data_class="public",
    question={
        "type": "choice",
        "instructions": (
            "The state holds one scraped opportunity record with its deterministic checks. "
            "The discovery source is not necessarily canonical; the organizer's own website is "
            "canonical when it clearly describes the same call. Should this record be published, "
            "sent to a person, or rejected?"
        ),
        "criteria": {
            "publish": (
                "Identity is coherent and the record states a title, organizer, source URL and "
                "deadline that agree with the organizer's evidence."
            ),
            "needs_human": (
                "A required fact is missing, the identity is ambiguous, or the organizer's "
                "evidence contradicts the record."
            ),
            "reject": (
                "The page is clearly not a single creative opportunity, or the record matches "
                "the wrong page."
            ),
        },
    },
    policy={"kind": "choice", "minProbability": 0.85, "alwaysReview": ["needs_human"]},
)

SAME_OPPORTUNITY = QuestionDefinition(
    key="identity.same_opportunity",
    version=1,
    subject_type="opportunity_pair",
    data_class="public",
    question={
        "type": "noul",
        "instructions": (
            "The state holds two opportunity records, `left` and `right`, each with title, "
            "organization, URLs, deadline and type as stated on their pages. Do both records "
            "describe the same single call for the same cycle? An annual call with a different "
            "deadline year, a different category of the same prize, or a different call from the "
            "same organization is not the same opportunity. Treat a missing field as unknown, not "
            "as agreement."
        ),
        "criteria": {
            "true": (
                "Both records state the same organizer, the same call and the same cycle; "
                "differences are only wording, formatting or URL tracking noise."
            ),
            "false": (
                "The records state a different organizer, a different call, a different category "
                "or a different cycle or deadline year."
            ),
        },
    },
    policy={"kind": "noul", "acceptAtOrAbove": 0.9, "rejectAtOrBelow": 0.1},
)


# ── Canonical input hash (matches packages/decisions/src/hash.ts) ─────


def _canonical_number(value: float) -> str:
    if math.isfinite(value) and value == int(value) and abs(value) < 2**53:
        return str(int(value))
    return json.dumps(value)


def canonical_json(value: Any) -> str:
    """Canonical JSON with sorted keys, matching the TypeScript canonicalJson."""

    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return _canonical_number(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, Mapping):
        entries = sorted((str(key), entry) for key, entry in value.items())
        return "{" + ",".join(f"{json.dumps(key, ensure_ascii=False)}:{canonical_json(entry)}" for key, entry in entries) + "}"
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(canonical_json(entry) for entry in value) + "]"
    return json.dumps(str(value), ensure_ascii=False)


def input_hash(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


# ── Client ────────────────────────────────────────────────────────────


class JevError(Exception):
    def __init__(self, message: str, status: int | None, retryable: bool):
        super().__init__(message)
        self.status = status
        self.retryable = retryable


class JevClient:
    """POSTs to ``{base_url}/v1/systemone`` with a Bearer key; retries 429/529/5xx."""

    def __init__(
        self,
        api_key: str | None,
        *,
        base_url: str = JEV_DEFAULT_BASE_URL,
        model: str = JEV_DEFAULT_MODEL,
        timeout: float = 10.0,
        max_retries: int = 3,
        allow_creator_private_data: bool = False,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ):
        self.api_key = (api_key or "").strip() or None
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.max_retries = max_retries
        self.allow_creator_private_data = allow_creator_private_data
        self.transport = transport
        self.sleep = sleep

    @property
    def available(self) -> bool:
        return self.api_key is not None

    def can_send(self, data_class: str) -> bool:
        return data_class != "creator-private" or self.allow_creator_private_data

    def evaluate(self, state: Any, questions: Mapping[str, Mapping[str, Any]]) -> dict[str, Any]:
        if not self.api_key:
            raise JevError("Jev is not configured: JEV_API_KEY is missing", None, False)
        if not questions:
            return {"model": self.model, "answers": {}}
        body = {"state": state, "model": self.model, "questions": dict(questions)}
        attempt = 0
        with httpx.Client(transport=self.transport, timeout=self.timeout) as http:
            while True:
                try:
                    response = http.post(
                        f"{self.base_url}/v1/systemone",
                        headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                        json=body,
                    )
                    if response.is_success:
                        parsed = response.json()
                        if not isinstance(parsed, dict) or not isinstance(parsed.get("answers"), dict):
                            raise JevError("Jev returned a response without answers", response.status_code, False)
                        return parsed
                    detail = response.text[:300]
                    raise JevError(
                        f"Jev request failed with {response.status_code}{': ' + detail if detail else ''}",
                        response.status_code,
                        response.status_code in RETRYABLE_STATUS,
                    )
                except JevError as error:
                    failure = error
                except (httpx.HTTPError, ValueError) as error:
                    failure = JevError(f"Jev request failed: {error}", None, True)
                if not failure.retryable or attempt >= self.max_retries:
                    raise failure
                attempt += 1
                self.sleep(min(8.0, 0.5 * 2 ** (attempt - 1)))


def jev_client_from_env(env: Mapping[str, str] | None = None, **overrides: Any) -> JevClient:
    """Reads JEV_API_KEY, JEV_BASE_URL, JEV_MODEL, JEV_TIMEOUT_MS, JEV_ALLOW_CREATOR_PRIVATE_DATA."""

    env = os.environ if env is None else env
    try:
        timeout_ms = float(env.get("JEV_TIMEOUT_MS") or 0)
    except ValueError:
        timeout_ms = 0
    options: dict[str, Any] = {
        "base_url": env.get("JEV_BASE_URL") or JEV_DEFAULT_BASE_URL,
        "model": env.get("JEV_MODEL") or JEV_DEFAULT_MODEL,
        "timeout": timeout_ms / 1000 if timeout_ms > 0 else 10.0,
        "allow_creator_private_data": env.get("JEV_ALLOW_CREATOR_PRIVATE_DATA") == "1",
    }
    options.update(overrides)
    return JevClient(env.get("JEV_API_KEY"), **options)


def decision_mode_from_env(scope: str, env: Mapping[str, str] | None = None) -> str:
    """DECISIONS_MODE_<SCOPE> or DECISIONS_MODE; anything but "live" is shadow."""

    env = os.environ if env is None else env
    key = "DECISIONS_MODE_" + "".join(char if char.isalnum() else "_" for char in scope.upper())
    while "__" in key:
        key = key.replace("__", "_")
    scoped = env.get(key)
    return "live" if (scoped if scoped is not None else env.get("DECISIONS_MODE")) == "live" else "shadow"


# ── Routing (matches packages/decisions/src/routing.ts) ───────────────


@dataclass(frozen=True, slots=True)
class DecisionOutcome:
    question_key: str
    question_version: int
    kind: str
    route: str  # apply | review | reject | unavailable
    answer: str | None
    probability: float | None
    confidence: float | None
    distribution: dict[str, float] = field(default_factory=dict)
    actionable: bool = False
    reason: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def _clamp(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        return None
    return min(1.0, max(0.0, float(value)))


def unavailable_outcome(definition: QuestionDefinition, reason: str) -> DecisionOutcome:
    return DecisionOutcome(definition.key, definition.version, definition.kind, "unavailable", None, None, None, {}, False, reason)


def route_answer(definition: QuestionDefinition, answer: Mapping[str, Any] | None, mode: str) -> DecisionOutcome:
    """Turns one Jev answer into apply/review/reject; malformed or uncertain answers never apply."""

    if not isinstance(answer, Mapping):
        return unavailable_outcome(definition, "Jev returned no answer for this question")
    if answer.get("type") != definition.kind:
        return unavailable_outcome(definition, f"Jev answered {answer.get('type')}, expected {definition.kind}")
    policy = definition.policy

    def finish(route: str, chosen: str | None, probability: float | None, confidence: float | None, distribution: dict[str, float]) -> DecisionOutcome:
        return DecisionOutcome(
            definition.key, definition.version, definition.kind, route, chosen, probability, confidence,
            distribution, mode == "live" and route in {"apply", "reject"},
        )

    if definition.kind == "noul":
        probability = _clamp(answer.get("noul"))
        if probability is None:
            return unavailable_outcome(definition, "Jev returned no probability")
        route = (
            "apply" if probability >= policy["acceptAtOrAbove"]
            else "reject" if probability <= policy["rejectAtOrBelow"]
            else "review"
        )
        return finish(
            route, "true" if probability >= 0.5 else "false", probability,
            abs(probability - 0.5) * 2, {"true": probability, "false": 1 - probability},
        )

    if definition.kind == "choice":
        raw = answer.get("probabilities") if isinstance(answer.get("probabilities"), Mapping) else {}
        distribution = {str(option): value for option, raw_value in raw.items() if (value := _clamp(raw_value)) is not None}
        chosen = answer.get("choice")
        if chosen not in definition.question["criteria"]:
            outcome = unavailable_outcome(definition, f"Jev chose an undeclared option: {chosen}")
            return DecisionOutcome(**{**outcome.as_dict(), "distribution": distribution})
        probability = distribution.get(chosen)
        forced_review = chosen in (policy.get("alwaysReview") or [])
        route = "apply" if not forced_review and probability is not None and probability >= policy["minProbability"] else "review"
        return finish(route, chosen, probability, _clamp(answer.get("confidence")), distribution)

    if definition.kind == "score":
        levels = list(definition.question["criteria"])
        raw = answer.get("probabilities") if isinstance(answer.get("probabilities"), Mapping) else {}
        distribution: dict[str, float] = {}
        for index, raw_value in raw.items():
            try:
                label = levels[int(index)]
            except (ValueError, IndexError):
                continue
            if (value := _clamp(raw_value)) is not None:
                distribution[label] = value
        if not distribution:
            return unavailable_outcome(definition, "Jev returned no usable score level")
        label = max(distribution, key=lambda key: distribution[key])
        confidence = _clamp(answer.get("confidence"))
        route = "apply" if confidence is not None and confidence >= policy["minConfidence"] else "review"
        return finish(route, label, distribution[label], confidence, distribution)

    return unavailable_outcome(definition, "Question policy does not match the question type")


# ── Ledger (matches packages/decisions/src/ledger.ts and the data_decisions table) ─


@dataclass(slots=True)
class DecisionRecord:
    subject_type: str
    subject_id: str
    question_key: str
    question_version: int
    question_kind: str
    input_hash: str
    answer: str | None
    probability: float | None
    confidence: float | None
    distribution: dict[str, float]
    route: str
    mode: str
    decider_kind: str  # jev | llm | heuristic | human | source
    decider: str
    field_name: str | None = None
    options: list[str] | None = None
    evidence_url: str | None = None
    decider_version: str | None = None
    policy_version: str | None = None
    reviewer_account_id: str | None = None
    supersedes_id: str | None = None
    usage: dict[str, Any] | None = None


def record_from_outcome(
    definition: QuestionDefinition,
    outcome: DecisionOutcome,
    *,
    subject_id: str,
    input_hash_value: str,
    mode: str,
    model: str,
    evidence_url: str | None = None,
    usage: dict[str, Any] | None = None,
) -> DecisionRecord:
    return DecisionRecord(
        subject_type=definition.subject_type,
        subject_id=subject_id,
        field_name=definition.field_name,
        question_key=definition.key,
        question_version=definition.version,
        question_kind=definition.kind,
        options=definition.options(),
        input_hash=input_hash_value,
        evidence_url=evidence_url,
        answer=outcome.answer,
        probability=outcome.probability,
        confidence=outcome.confidence,
        distribution=dict(outcome.distribution),
        route=outcome.route,
        mode=mode,
        decider_kind="jev",
        decider="jev",
        decider_version=model,
        policy_version=f"{definition.key}@{definition.version}",
        usage=usage,
    )


def _round(value: float | None) -> float | None:
    return None if value is None else round(value * 10_000) / 10_000


_COLUMNS = (
    "id", "subject_type", "subject_id", "field_name", "question_key", "question_version",
    "question_kind", "options", "input_hash", "evidence_url", "answer", "probability",
    "confidence", "distribution", "route", "mode", "decider_kind", "decider",
    "decider_version", "policy_version", "reviewer_account_id", "supersedes_id", "usage",
)


class PostgresDecisionLedger:
    """Writes to data_decisions; a machine decision already recorded for the same input is skipped."""

    def __init__(self, database_url: str, *, connect_factory: Callable[[str], Any] | None = None):
        if connect_factory is None:
            import psycopg

            connect_factory = psycopg.connect
        self.database_url = database_url
        self.connect_factory = connect_factory

    def record(self, records: Sequence[DecisionRecord]) -> list[str]:
        if not records:
            return []
        from psycopg.types.json import Jsonb

        rows: list[str] = []
        values: list[Any] = []
        for record in records:
            values.extend((
                f"dec_{uuid4()}", record.subject_type, record.subject_id, record.field_name,
                record.question_key, record.question_version, record.question_kind, record.options,
                record.input_hash, record.evidence_url, record.answer, _round(record.probability),
                _round(record.confidence), Jsonb(record.distribution or {}), record.route, record.mode,
                record.decider_kind, record.decider, record.decider_version, record.policy_version,
                record.reviewer_account_id, record.supersedes_id,
                Jsonb(record.usage) if record.usage else None,
            ))
            rows.append("(" + ", ".join(["%s"] * len(_COLUMNS)) + ")")
        sql = (
            f"INSERT INTO data_decisions ({', '.join(_COLUMNS)}) VALUES {', '.join(rows)} "
            "ON CONFLICT (subject_type, subject_id, question_key, question_version, decider, input_hash) "
            "WHERE decider_kind <> 'human' DO NOTHING RETURNING id"
        )
        with self.connect_factory(self.database_url) as connection:
            fetched = connection.execute(sql, values).fetchall()
        return [str(row[0]) for row in fetched]


class MemoryDecisionLedger:
    """Keeps records in memory with the same dedup rule; for tests and dry runs."""

    def __init__(self) -> None:
        self.records: list[DecisionRecord] = []
        self._seen: set[tuple[Any, ...]] = set()

    def record(self, records: Iterable[DecisionRecord]) -> list[str]:
        ids: list[str] = []
        for record in records:
            key = (record.subject_type, record.subject_id, record.question_key, record.question_version, record.decider, record.input_hash)
            if record.decider_kind != "human" and key in self._seen:
                continue
            self._seen.add(key)
            self.records.append(record)
            ids.append(f"mem_{len(self.records)}")
        return ids


# ── decide (matches packages/decisions/src/decide.ts) ─────────────────


@dataclass(slots=True)
class DecideResult:
    outcomes: dict[str, DecisionOutcome]
    model: str | None
    input_hash: str
    error: str | None = None


def decide(
    *,
    client: JevClient,
    ledger: Any | None,
    mode: str,
    subject_id: str,
    state: Any,
    questions: Sequence[QuestionDefinition],
    evidence_url: str | None = None,
) -> DecideResult:
    """Asks every question about one record in one call. Never raises for Jev or ledger failures."""

    state_hash = input_hash(state)
    outcomes: dict[str, DecisionOutcome] = {}
    sendable: list[QuestionDefinition] = []
    for definition in questions:
        if definition.key in outcomes:
            raise ValueError(f"Question asked twice: {definition.key}")
        if not client.available:
            outcomes[definition.key] = unavailable_outcome(definition, "Jev is not configured")
        elif not client.can_send(definition.data_class):
            outcomes[definition.key] = unavailable_outcome(definition, "Creator-private data may not be sent to Jev")
        else:
            sendable.append(definition)
            outcomes[definition.key] = unavailable_outcome(definition, "Pending")
    if not sendable:
        return DecideResult(outcomes, None, state_hash)

    ids = {definition.key: f"q{index}" for index, definition in enumerate(sendable)}
    try:
        response = client.evaluate(state, {ids[definition.key]: definition.question for definition in sendable})
    except Exception as error:  # noqa: BLE001 - a Jev failure must never break the caller
        for definition in sendable:
            outcomes[definition.key] = unavailable_outcome(definition, str(error))
        return DecideResult(outcomes, None, state_hash, str(error))

    model = str(response.get("model") or client.model)
    answers = response.get("answers") or {}
    for definition in sendable:
        outcomes[definition.key] = route_answer(definition, answers.get(ids[definition.key]), mode)

    if ledger is not None:
        usage = response.get("usage")
        usage = {**usage, "questions": len(sendable)} if isinstance(usage, dict) else None
        records = [
            record_from_outcome(
                definition, outcomes[definition.key], subject_id=subject_id, input_hash_value=state_hash,
                mode=mode, model=model, evidence_url=evidence_url, usage=usage,
            )
            for definition in sendable
            if outcomes[definition.key].route != "unavailable"
        ]
        try:
            ledger.record(records)
        except Exception as error:  # noqa: BLE001
            return DecideResult(outcomes, model, state_hash, f"Ledger write failed: {error}")
    return DecideResult(outcomes, model, state_hash)


# ── Identity state (matches packages/decisions/src/sets/identity.ts) ──


def _text(value: Any, limit: int = 500) -> str | None:
    if value is None:
        return None
    normalized = " ".join(str(value).split())
    return normalized[:limit] if normalized else None


def _distinct_texts(values: Iterable[Any], limit: int = 400) -> list[str]:
    seen: dict[str, None] = {}
    for value in values:
        if (text := _text(value, limit)) is not None:
            seen.setdefault(text, None)
    return list(seen)


def opportunity_identity_state(
    *, title: Any = None, organization: Any = None, urls: Iterable[Any] = (), deadline: Any = None, type: Any = None
) -> dict[str, Any]:
    return {
        "title": _text(title),
        "organization": _text(organization),
        "urls": _distinct_texts(urls),
        "deadline": _text(deadline, 80),
        "type": _text(type, 80),
    }


def same_opportunity_state(left: dict[str, Any], right: dict[str, Any]) -> dict[str, Any]:
    """Orders the pair so (a, b) and (b, a) hash identically."""

    if canonical_json(left) <= canonical_json(right):
        return {"left": left, "right": right}
    return {"left": right, "right": left}


def identity_pair_subject_id(left_id: str, right_id: str) -> str:
    first, second = sorted((left_id, right_id))
    joined = f"{first}~{second}"
    return joined if len(joined) <= 200 else "pair_" + input_hash(joined)[:40]
