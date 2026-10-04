import assert from "node:assert/strict";
import test from "node:test";

import { CONFIRMED_DATES_PARAM, parseOpportunityBrowseQuery } from "./opportunityQuery.ts";

test("confirmed dates only is off unless the URL asks for it", () => {
  assert.equal(parseOpportunityBrowseQuery(new URLSearchParams("")).confirmedDatesOnly, undefined);
  assert.equal(parseOpportunityBrowseQuery(new URLSearchParams(`${CONFIRMED_DATES_PARAM}=0`)).confirmedDatesOnly, undefined);
});

test("confirmed dates only combines with the existing deadline window", () => {
  const query = parseOpportunityBrowseQuery(new URLSearchParams(`deadlineWithinDays=30&${CONFIRMED_DATES_PARAM}=1`));
  assert.equal(query.confirmedDatesOnly, true);
  assert.equal(query.deadlineWithinDays, 30);
  assert.equal(parseOpportunityBrowseQuery(new URLSearchParams(`${CONFIRMED_DATES_PARAM}=true`)).confirmedDatesOnly, true);
});

test("an invalid query still keeps the confirmed-dates choice on the safe default", () => {
  const query = parseOpportunityBrowseQuery(new URLSearchParams(`sort=not-a-sort&${CONFIRMED_DATES_PARAM}=1`));
  assert.equal(query.confirmedDatesOnly, true);
  assert.equal(query.sort, parseOpportunityBrowseQuery(new URLSearchParams("")).sort);
});
