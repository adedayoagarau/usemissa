# @missa/decisions

Typed, recorded decisions about Missa's own data, made by Jev (TypeSafe AI's
System One model) and written to the `data_decisions` ledger (migration 0090).

Jev never writes text. You send it a record and a set of typed questions, and
it returns a calibrated probability for each:

| Kind   | Answers                       | Use for                                  |
| ------ | ----------------------------- | ---------------------------------------- |
| noul   | probability the answer is yes | "Is this one opportunity?", "Same call?" |
| choice | one of up to 255 declared ids | fee status, lifecycle state, page type   |
| score  | one of 2–10 ordered levels    | usefulness, urgency, fit                 |

## How a decision works

1. **Define the question once** with `defineQuestion`: a dotted key, a version,
   the subject type, the field it fills, its data class and a routing policy.
   Bump the version whenever the wording, options or thresholds change.
2. **Ask every question about one record in one call** with `decide`.
3. **Each answer is routed by its own policy**:
   - `apply` / `reject`: confident enough to act on;
   - `review`: send to a person;
   - `unavailable`: Jev is not configured, failed, or may not see this data,
     so keep the current behaviour.
4. **Every routed answer is recorded** in `data_decisions` with the question
   version, input hash, model version, probability and full distribution.

## Re-checks are free

When a record is checked again with exactly the same input, `decide` reuses
the recorded answer for each question version instead of calling Jev, and
routes it under the current mode. A changed input or a new question version
is asked again.

## Modes

Everything starts in **shadow**: decisions are recorded but `actionable` is
always false. Switch one area at a time once its decisions agree with people:

```
DECISIONS_MODE=shadow                 # default for everything
DECISIONS_MODE_REVIEW_QUEUE=live      # one scope at a time
```

## Configuration

| Variable                         | Meaning                                                           |
| -------------------------------- | ----------------------------------------------------------------- |
| `JEV_API_KEY`                    | Required for any call. Without it every outcome is `unavailable`. |
| `JEV_BASE_URL`                   | Defaults to `https://thejevai.com`.                               |
| `JEV_MODEL`                      | Defaults to `jev-latest`; the served version is recorded per row. |
| `JEV_TIMEOUT_MS`                 | Per-request timeout, default 10s. 429/529 retry with backoff.     |
| `JEV_ALLOW_CREATOR_PRIVATE_DATA` | `1` only once a no-retention agreement covers creator data.       |

## Rules

- **Data classes.** `public` and `operational` state may be sent.
  `creator-private` state (emails, manuscripts, submissions, messages) is
  refused unless `JEV_ALLOW_CREATOR_PRIVATE_DATA=1`. Missa never trains on
  creator work.
- **No creator-facing AI.** Jev may order, route and flag. Anything a creator
  reads must still be explained by plain rules over recorded facts.
- **People keep the final say** on applicant decisions, organization claims,
  image rights and ranking scores. Questions there may only triage.
