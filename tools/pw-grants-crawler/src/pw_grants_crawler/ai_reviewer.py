from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, Callable, Mapping

import httpx

from .harness import DEFAULT_MODEL, POLICY_VERSION, PROMPT_VERSION, ReviewCandidate
from .jev import (
    GARY_PUBLICATION_ROUTE,
    DecideResult,
    DecisionRecord,
    JevClient,
    PostgresDecisionLedger,
    canonical_json,
    decide,
    decision_mode_from_env,
    input_hash,
    jev_client_from_env,
)


SYSTEM_PROMPT = """You are Gary's evidence reviewer for creative opportunities.
The recorded discovery source is not necessarily canonical. The official host website is canonical when it clearly describes the same call.
Calls are the same when organizer/title, description, and deadline materially agree; minor wording or formatting differences are not conflicts.
One journal may have several concurrent calls. Never merge calls only because their organizer is the same.
Return JSON only with: recommendation (publish|needs_human|reject), confidence (0..1), reasons (short array), checks (object).
Recommend publish when identity is coherent and the record has a title, source URL, and deadline. Host unavailability alone is not a reason to block.
Recommend needs_human for missing required facts, ambiguous identity, or contradictory canonical evidence. Reject only for clear non-opportunities or wrong-page matches."""

REPAIR_PROMPT = """Your previous response was not valid JSON.
Return the same decision again as one valid JSON object only. Do not use Markdown fences or commentary.
Required keys: recommendation, confidence, reasons, checks."""


@dataclass(frozen=True, slots=True)
class ReviewResult:
    recommendation: str
    confidence: float
    reasons: list[str]
    checks: dict[str, Any]
    raw: dict[str, Any]
    input_hash: str
    output_hash: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    estimated_cost_usd: float | None = None


def deterministic_checks(candidate: ReviewCandidate) -> dict[str, Any]:
    return {
        "has_title": bool(candidate.title.strip()),
        "has_organizer": bool(candidate.organizer.strip()),
        "has_source_url": candidate.source_detail_url.startswith(("http://", "https://")),
        "has_deadline": bool(candidate.deadline),
        "identity_confirmed": candidate.identity_status == "confirmed",
        "identity_confidence": candidate.identity_confidence,
        "host_status": candidate.host_status or "not_checked",
        "conflict_count": len(candidate.conflicts),
    }


def deterministic_blockers(checks: dict[str, Any]) -> list[str]:
    blockers: list[str] = []
    for key, label in (
        ("has_title", "missing title"),
        ("has_organizer", "missing organizer"),
        ("has_source_url", "missing source URL"),
        ("has_deadline", "missing deadline"),
        ("identity_confirmed", "identity requires review"),
    ):
        if not checks[key]:
            blockers.append(label)
    return blockers


def parse_json_object(content: str) -> dict[str, Any]:
    """Parse a model JSON object while tolerating harmless Markdown wrappers."""
    stripped = content.strip()
    candidates = [stripped]
    if stripped.startswith("```") and stripped.endswith("```"):
        first_newline = stripped.find("\n")
        if first_newline >= 0:
            candidates.append(stripped[first_newline + 1 : -3].strip())
    first_brace = stripped.find("{")
    last_brace = stripped.rfind("}")
    if first_brace >= 0 and last_brace > first_brace:
        candidates.append(stripped[first_brace : last_brace + 1])

    for candidate in dict.fromkeys(candidates):
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed
    raise ValueError("DeepSeek returned invalid JSON")


class DeepSeekReviewer:
    def __init__(self, api_key: str, *, model: str = DEFAULT_MODEL, timeout: float = 45.0):
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY is required")
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def review(self, candidate: ReviewCandidate) -> ReviewResult:
        checks = deterministic_checks(candidate)
        blockers = deterministic_blockers(checks)
        payload = {
            "prompt_version": PROMPT_VERSION,
            "policy_version": POLICY_VERSION,
            "deterministic_checks": checks,
            "candidate": candidate.model_payload(),
        }
        canonical_input = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        input_hash = hashlib.sha256(canonical_input.encode("utf-8")).hexdigest()
        if blockers:
            raw = {"recommendation": "needs_human", "confidence": 1.0, "reasons": blockers, "checks": checks}
            output = json.dumps(raw, sort_keys=True, separators=(",", ":"))
            return ReviewResult(
                recommendation="needs_human", confidence=1.0, reasons=blockers,
                checks=checks, raw=raw, input_hash=input_hash,
                output_hash=hashlib.sha256(output.encode("utf-8")).hexdigest(),
            )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": canonical_input},
        ]
        envelopes: list[dict[str, Any]] = []
        raw: dict[str, Any] | None = None
        for attempt in range(2):
            response = httpx.post(
                "https://api.deepseek.com/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "messages": messages,
                    "response_format": {"type": "json_object"},
                    "temperature": 0,
                    "max_tokens": 2000,
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            envelope = response.json()
            envelopes.append(envelope)
            content = str(envelope["choices"][0]["message"]["content"])
            try:
                raw = parse_json_object(content)
                break
            except ValueError as error:
                if attempt == 1:
                    raise ValueError("DeepSeek returned invalid JSON after one repair attempt") from error
                messages = [*messages, {"role": "assistant", "content": content}, {"role": "user", "content": REPAIR_PROMPT}]
        if raw is None:  # Defensive: the loop either parses or raises.
            raise ValueError("DeepSeek returned no review object")
        recommendation = raw.get("recommendation")
        if recommendation not in {"publish", "needs_human", "reject"}:
            raise ValueError("DeepSeek returned an unsupported recommendation")
        confidence = max(0.0, min(1.0, float(raw.get("confidence", 0))))
        raw_reasons = raw.get("reasons")
        reasons = [str(item)[:300] for item in raw_reasons][:8] if isinstance(raw_reasons, list) else []
        model_checks = raw.get("checks") if isinstance(raw.get("checks"), dict) else {}
        merged_checks = {**checks, "model": model_checks}
        output = json.dumps(raw, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        input_tokens = sum(
            usage["prompt_tokens"] for envelope in envelopes
            if isinstance((usage := envelope.get("usage")), dict) and isinstance(usage.get("prompt_tokens"), int)
        )
        output_tokens = sum(
            usage["completion_tokens"] for envelope in envelopes
            if isinstance((usage := envelope.get("usage")), dict) and isinstance(usage.get("completion_tokens"), int)
        )
        # DeepSeek V4 Flash list pricing at implementation time: $0.14/M uncached input, $0.28/M output.
        cost = None
        if input_tokens or output_tokens:
            cost = (input_tokens * 0.14 + output_tokens * 0.28) / 1_000_000
        return ReviewResult(
            recommendation=recommendation, confidence=confidence, reasons=reasons,
            checks=merged_checks, raw=raw, input_hash=input_hash,
            output_hash=hashlib.sha256(output.encode("utf-8")).hexdigest(),
            input_tokens=input_tokens or None,
            output_tokens=output_tokens or None,
            estimated_cost_usd=cost,
        )


# ── Jev publication route ─────────────────────────────────────────────

GARY_REVIEW_SCOPE = "gary_review"  # DECISIONS_MODE_GARY_REVIEW=live lets confident Jev answers skip DeepSeek


def publication_state(candidate: ReviewCandidate, checks: dict[str, Any]) -> dict[str, Any]:
    """The facts DeepSeek reviews, without its prompt: scraped public evidence only."""

    return {"deterministic_checks": checks, "candidate": candidate.model_payload()}


class JevPublicationRouter:
    """Asks Jev gary.publication_route before DeepSeek and records both verdicts.

    Shadow (default): Jev is recorded and DeepSeek runs exactly as before; the
    DeepSeek verdict is also recorded as an `llm` row for comparison. Live: a
    confident Jev publish or reject is used instead of DeepSeek; anything else
    still goes to DeepSeek. Callers only ask when no deterministic blocker
    applies, so blockers always win.
    """

    def __init__(self, client: JevClient, ledger: Any | None, mode: str, *, log: Callable[[str], None] = print):
        self.client = client
        self.ledger = ledger
        self.mode = mode
        self.log = log

    def route(self, candidate: ReviewCandidate, checks: dict[str, Any]) -> DecideResult | None:
        try:
            result = decide(
                client=self.client, ledger=self.ledger, mode=self.mode,
                subject_id=candidate.opportunity_id, state=publication_state(candidate, checks),
                questions=[GARY_PUBLICATION_ROUTE], evidence_url=candidate.source_detail_url or None,
            )
        except Exception as error:  # noqa: BLE001 - Jev must never break review
            self.log(f"[gary-reviewer] Jev publication route failed for {candidate.opportunity_id}: {error}")
            return None
        if result.error:
            self.log(f"[gary-reviewer] Jev publication route for {candidate.opportunity_id}: {result.error}")
        return result

    @staticmethod
    def confident(result: DecideResult | None, publish_threshold: float) -> bool:
        """True only for a live, actionable publish (at or above Gary's threshold) or reject."""

        outcome = result.outcomes.get(GARY_PUBLICATION_ROUTE.key) if result else None
        if outcome is None or not outcome.actionable:
            return False
        if outcome.answer == "reject":
            return True
        return outcome.answer == "publish" and (outcome.probability or 0) >= publish_threshold

    @staticmethod
    def review_result(result: DecideResult, checks: dict[str, Any]) -> ReviewResult:
        outcome = result.outcomes[GARY_PUBLICATION_ROUTE.key]
        probability = outcome.probability or 0.0
        raw = {**outcome.as_dict(), "model": result.model}
        return ReviewResult(
            recommendation=str(outcome.answer),
            confidence=probability,
            reasons=[f"Jev {GARY_PUBLICATION_ROUTE.key}@{GARY_PUBLICATION_ROUTE.version}: {outcome.answer} at probability {probability:.3f}"],
            checks={**checks, "jev": {"route": outcome.route, "distribution": outcome.distribution, "model": result.model}},
            raw=raw,
            input_hash=result.input_hash,
            output_hash=hashlib.sha256(canonical_json(raw).encode("utf-8")).hexdigest(),
        )

    def record_llm(
        self,
        candidate: ReviewCandidate,
        checks: dict[str, Any],
        review: ReviewResult,
        *,
        model: str,
        publish_threshold: float,
    ) -> None:
        """Records DeepSeek's verdict on the same input so it can be compared with Jev."""

        if self.ledger is None:
            return
        state = publication_state(candidate, checks)
        acted = review.recommendation == "reject" or (
            review.recommendation == "publish" and review.confidence >= publish_threshold
        )
        record = DecisionRecord(
            subject_type=GARY_PUBLICATION_ROUTE.subject_type,
            subject_id=candidate.opportunity_id,
            question_key=GARY_PUBLICATION_ROUTE.key,
            question_version=GARY_PUBLICATION_ROUTE.version,
            question_kind=GARY_PUBLICATION_ROUTE.kind,
            options=GARY_PUBLICATION_ROUTE.options(),
            input_hash=input_hash(state),
            evidence_url=candidate.source_detail_url or None,
            answer=review.recommendation,
            # DeepSeek reports its own confidence; it is not a calibrated probability.
            probability=review.confidence,
            confidence=review.confidence,
            distribution={review.recommendation: review.confidence},
            route="apply" if acted else "review",
            # DeepSeek's verdict is what Gary acts on today.
            mode="live",
            decider_kind="llm",
            decider="deepseek",
            decider_version=model,
            policy_version=f"{PROMPT_VERSION}+{POLICY_VERSION}",
            usage={"input_tokens": review.input_tokens, "output_tokens": review.output_tokens} if review.input_tokens or review.output_tokens else None,
        )
        try:
            self.ledger.record([record])
        except Exception as error:  # noqa: BLE001
            self.log(f"[gary-reviewer] could not record the DeepSeek decision for {candidate.opportunity_id}: {error}")


def jev_publication_router_from_env(database_url: str, env: Mapping[str, str] | None = None) -> JevPublicationRouter | None:
    """None unless JEV_API_KEY is set, so an unconfigured reviewer does no extra work."""

    client = jev_client_from_env(env)
    if not client.available:
        return None
    return JevPublicationRouter(client, PostgresDecisionLedger(database_url), decision_mode_from_env(GARY_REVIEW_SCOPE, env))
