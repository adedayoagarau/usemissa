from pw_grants_crawler.promotion import money_cents, opportunity_type, slug
from test_ai_reviewer import candidate


def test_money_and_slug_normalization() -> None:
    assert money_cents("Entry fee: $1,250.50") == 125050
    assert money_cents("No fee") is None
    assert slug("The New Prize!", "fallback") == "the-new-prize"


def test_opportunity_type_uses_call_content() -> None:
    assert opportunity_type(candidate(title="Emerging Writer Fellowship")) == "fellowship"
    assert opportunity_type(candidate(title="Project Grant")) == "grant"
