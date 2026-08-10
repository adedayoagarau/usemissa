import pytest

from pw_grants_crawler.review import (
    build_review_payload,
    normalize_decision_record,
    render_review_html,
)


def test_build_review_payload_groups_evidence_and_preserves_decision_contract():
    payload = build_review_payload(
        run={
            "id": "run_test",
            "source_id": "pw.org",
            "mode": "backfill",
            "status": "completed",
            "started_at": "2026-08-08T23:00:00+00:00",
            "completed_at": "2026-08-08T23:05:00+00:00",
        },
        observations=[
            {
                "id": "obs_1",
                "opportunity_id": "opp_1",
                "organizer": "Example Press",
                "title": "Example Award",
                "source_detail_url": "https://www.pw.org/calls/example",
                "official_website": "https://example.org/award",
                "deadline": "2026-09-01",
                "entry_fee": "$20",
                "cash_prize": "$1000",
                "host_status": "conflict",
                "host_match_score": 4.0,
                "canonical_source": "host",
                "canonical_deadline_text": "August 15, 2026",
                "canonical_entry_fee": None,
                "canonical_cash_prize": None,
                "missing_fields": ["contact_email"],
                "description": "A call for work.",
                "full_text": "P&W full text.",
                "payload_json": {
                    "official_evidence": {
                        "notes": ["Review before publishing."],
                        "discovered_urls": ["https://example.org/submit"],
                        "fields": {"deadline": "2026-08-15", "entry_fee": "free"},
                    }
                },
            }
        ],
        pages=[
            {
                "id": "page_1",
                "observation_id": "obs_1",
                "role": "official",
                "requested_url": "https://example.org/award",
                "final_url": "https://example.org/award",
                "status_code": 200,
                "content_type": "text/html",
                "title": "Example Award",
                "text_content": "Host says deadline August 15.",
                "error": None,
                "rendered": False,
                "html_path": "official-sites/example.html",
            }
        ],
        conflicts=[
            {
                "observation_id": "obs_1",
                "source_page_id": "page_1",
                "field_name": "deadline",
                "host_value": "2026-08-15",
                "expected_value": "2026-09-01",
                "detail": "host has '2026-08-15'; P&W lists '2026-09-01'",
            }
        ],
        field_observations=[
            {"observation_id": "obs_1", "field_name": "deadline", "value": "2026-09-01", "source": "pw", "selected": True},
            {"observation_id": "obs_1", "field_name": "deadline", "value": "2026-08-15", "source": "host", "selected": True},
        ],
    )

    assert payload["queue"][0]["id"] == "obs_1"
    assert payload["queue"][0]["status"] == "conflict"
    assert payload["queue"][0]["host"]["pages"][0]["text_excerpt"] == "Host says deadline August 15."
    assert payload["queue"][0]["conflicts"][0]["field_name"] == "deadline"
    assert payload["queue"][0]["field_candidates"]["deadline"]["pw"] == ["2026-09-01"]
    assert payload["queue"][0]["field_candidates"]["deadline"]["host"] == ["2026-08-15"]
    assert payload["queue"][0]["host"]["canonical_source"] == "host"
    assert payload["queue"][0]["host"]["canonical_fields"]["deadline"] == "August 15, 2026"
    assert payload["decision_contract"]["identity"] == ["same_call", "not_same_call", "unresolved"]


def test_render_review_html_is_self_contained_and_safe_for_embedded_source_text():
    payload = build_review_payload(
        run={"id": "run_test", "source_id": "pw.org", "mode": "backfill", "status": "completed"},
        observations=[],
        pages=[],
        conflicts=[],
        field_observations=[],
    )
    html = render_review_html(payload)

    assert '<title>Gary review console</title>' in html
    assert 'id="gary-review-data"' in html
    assert "Export decisions" in html
    assert "localStorage" in html
    assert "window.__GARY_REVIEW__" in html
    assert "Open this file in Safari" in html


def test_normalize_decision_record_keeps_only_supported_labels():
    decision = normalize_decision_record(
        {
            "observation_id": "obs_1",
            "identity": "same_call",
            "page_action": "static_sufficient",
            "fields": {"deadline": "host", "unknown_field": "pw", "entry_fee": "unknown"},
            "notes": "The host has the current season page.",
        }
    )

    assert decision == {
        "observation_id": "obs_1",
        "identity": "same_call",
        "page_action": "static_sufficient",
        "fields": {"deadline": "host", "entry_fee": "unknown"},
        "notes": "The host has the current season page.",
    }


def test_normalize_decision_record_rejects_unknown_identity_label():
    with pytest.raises(ValueError, match="identity"):
        normalize_decision_record({"observation_id": "obs_1", "identity": "publish_it"})
