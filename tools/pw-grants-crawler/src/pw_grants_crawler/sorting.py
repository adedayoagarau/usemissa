from datetime import date

from .models import CallSummary


def sort_calls(calls: list[CallSummary]) -> list[CallSummary]:
    return sorted(
        calls,
        key=lambda call: (
            call.deadline or date.max,
            call.title.casefold(),
            call.organizer.casefold(),
        ),
    )
