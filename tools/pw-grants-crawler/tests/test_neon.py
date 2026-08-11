from psycopg.types.json import Jsonb

from pw_grants_crawler.neon import NeonStore, _json, _normalized_host_key, _text


class RecordingConnection:
    def __init__(self):
        self.statements = []

    def execute(self, query, params=None):
        self.statements.append((query, params))


def test_json_payload_removes_postgres_unsupported_nul_characters():
    payload = _json({"description": "before\x00after", "nested": ["ok\x00"]})

    assert isinstance(payload, Jsonb)
    assert payload.obj == {"description": "beforeafter", "nested": ["ok"]}


def test_text_payload_removes_postgres_unsupported_nul_characters():
    assert _text("before\x00after") == "beforeafter"
    assert _text(None) is None


def test_neon_upsert_refreshes_stale_canonical_identity_labels(monkeypatch):
    store = NeonStore("postgres://example.test/gary")
    connection = RecordingConnection()
    monkeypatch.setattr(store, "_existing_records", lambda connection, incoming: [])

    store._insert_call(
        connection,
        "run_test",
        "pw.org",
        {
            "organizer": "Academy of American Poets",
            "title": "First Book Award",
            "deadline": "2026-09-01",
            "official_website": "https://poets.org/academy-american-poets/american-poets-prizes",
            "source": {"detail_url": "https://www.pw.org/writing_contests/first_book_award"},
        },
    )

    opportunity_sql, params = connection.statements[0]
    assert "organizer = excluded.organizer" in opportunity_sql
    assert "title = excluded.title" in opportunity_sql
    assert "identity_key = excluded.identity_key" in opportunity_sql
    assert params[6:8] == ("Academy of American Poets", "First Book Award")


def test_neon_insert_profile_persists_profile_specific_fields():
    store = NeonStore("postgres://example.test/gary")
    connection = RecordingConnection()
    profile = {
        "kind": "literary_magazine",
        "name": "Sample Journal",
        "summary": "A careful journal.",
        "genres": ["Poetry"],
        "subgenres": [],
        "source": {
            "index_url": "https://www.pw.org/literary_magazines",
            "detail_url": "https://www.pw.org/literary_magazines/sample_journal",
        },
        "detail": {
            "kind": "literary_magazine",
            "name": "Sample Journal",
            "detail_url": "https://www.pw.org/literary_magazines/sample_journal",
            "website_url": "https://sample.test",
            "image_url": None,
            "genres": ["Poetry"],
            "representative_authors": "An Author",
            "book_types": [],
            "formats": ["Online"],
            "submission_guidelines_url": "https://sample.test/submit",
            "reading_period": "Jan 1 to Dec 31",
            "response_time": "Less than 3 months",
            "reading_fee": "No",
            "unsolicited_submissions": "Yes",
            "simultaneous_submissions": "Yes",
            "payment": "Yes",
            "editorial_focus": "A careful journal.",
            "editorial_tips": None,
            "contact_name": "An Editor",
            "contact_email": "editor@sample.test",
            "contact_details": "1 Main Street",
            "issues_per_year": "4",
            "issue_price": None,
            "subscription_price": None,
            "circulation": "Less than 1,000",
            "titles_per_year": None,
            "publishes_through_contests_only": None,
            "last_updated": "Aug 1, 2026",
            "full_text": "Sample profile text.",
        },
    }

    store._insert_profile(connection, "run_test", "pw.org.literary_magazines", profile)

    sql = "\n".join(statement for statement, _ in connection.statements)
    assert "CREATE" not in sql
    assert "website_url" in sql
    assert "reading_period" in sql
    assert "gary_profile_observations" in sql


def test_profile_identity_uses_host_and_name_not_name_alone():
    store = NeonStore("postgres://example.test/gary")
    first = RecordingConnection()
    second = RecordingConnection()
    base_profile = {
        "kind": "literary_magazine",
        "name": "Sample Journal",
        "summary": "A careful journal.",
        "genres": ["Poetry"],
        "subgenres": [],
        "source": {
            "index_url": "https://www.pw.org/literary_magazines",
            "detail_url": "https://www.pw.org/literary_magazines/sample_journal",
        },
        "detail": {
            "kind": "literary_magazine",
            "name": "Sample Journal",
            "detail_url": "https://www.pw.org/literary_magazines/sample_journal",
            "website_url": "https://first.example",
            "image_url": None,
            "genres": ["Poetry"],
            "representative_authors": None,
            "book_types": [],
            "formats": [],
            "submission_guidelines_url": None,
            "reading_period": None,
            "response_time": None,
            "reading_fee": None,
            "unsolicited_submissions": None,
            "simultaneous_submissions": None,
            "payment": None,
            "editorial_focus": None,
            "editorial_tips": None,
            "contact_name": None,
            "contact_email": None,
            "contact_details": None,
            "issues_per_year": None,
            "issue_price": None,
            "subscription_price": None,
            "circulation": None,
            "titles_per_year": None,
            "publishes_through_contests_only": None,
            "last_updated": None,
            "full_text": "Sample profile text.",
        },
    }
    other_profile = {
        **base_profile,
        "detail": {**base_profile["detail"], "website_url": "https://second.example"},
    }

    first_profile_id, _ = store._insert_profile(first, "run_test", "pw.org.literary_magazines", base_profile)
    second_profile_id, _ = store._insert_profile(second, "run_test", "pw.org.literary_magazines", other_profile)

    assert first_profile_id != second_profile_id
    assert _normalized_host_key("https://www.first.example/path") == "first.example"
