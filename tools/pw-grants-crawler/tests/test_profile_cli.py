import pytest

from pw_grants_crawler.profile_cli import main


def test_profile_cli_requires_a_bound_for_detail_fetches():
    with pytest.raises(SystemExit, match="--fetch-details requires --limit"):
        main(["--fetch-details"])
