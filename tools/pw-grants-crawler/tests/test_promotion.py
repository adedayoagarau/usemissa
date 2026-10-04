from pw_grants_crawler.promotion import money_cents, opportunity_type, organizer_name, slug
from test_ai_reviewer import candidate


def test_money_and_slug_normalization() -> None:
    assert money_cents("Entry fee: $1,250.50") == 125050
    assert money_cents("No fee") is None
    assert slug("The New Prize!", "fallback") == "the-new-prize"


def test_opportunity_type_uses_call_content() -> None:
    assert opportunity_type(candidate(title="Emerging Writer Fellowship")) == "fellowship"
    assert opportunity_type(candidate(title="Project Grant")) == "grant"


def test_organizer_name_passes_only_real_names() -> None:
    assert organizer_name(candidate(organizer="Academy of American Poets", title="Ambroggio Prize")) == "Academy of American Poets"
    assert organizer_name(candidate(organizer="Chokechaka Artist Residency", title="Chokechaka Artist Residency")) is None
    assert organizer_name(candidate(organizer="Granada UNESCO City of Literature: Writers in Residence (Spain)", title="Writers in Residence")) is None
    assert organizer_name(candidate(organizer="Open Call – Fish Factory 2027", title="Fish Factory 2027")) is None
    assert organizer_name(candidate(organizer="  ", title="Prize")) is None
