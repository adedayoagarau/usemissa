# Creator workspace direction — September 5, 2026

## Agreed experience

Useful, reversible, aesthetically pleasing. Reduce remembering, finding and re-entering information. Do not frame applying as hard work. Ideate before further implementation.

My applications is centered on saved opportunities, deadlines, submitted applications and expected response windows. Saving a Missa opportunity should populate known organization, destination and deadline automatically. Manual entry is a fallback for opportunities found elsewhere. Apply opens the official form directly; no duplicate preparation form or required manuscript upload.

Submission status is explicitly confirmed by the creator and reversible. Opening an external link is not submission evidence.

## Expected response feature

After a creator records a submission date, use relevant response-time data to estimate when they might hear back. Prefer a range with source/freshness context over a promised date. Crawled sources such as Chill Subs and Duotrope were discussed as potential inputs; availability, usage rights, field semantics and actual data coverage still require verification. Do not treat an average as a distribution, invent a range from a lone average, or double-count syndicated reports. Distinguish stated, observed, average, median and range values. Account for discipline/call differences where supported.

Notification dropdown: application deadline, expected response/check-in, custom date and next reading period where supported. Reuse account channel preferences with per-application overrides. Stop deadline reminders after submission and waiting reminders after a recorded response. An estimate passing is not proof of an overdue response. No claim that a response arrived without evidence. When response data is insufficient, offer a personal check-in date.

## Prototype status

Creator onboarding direction was approved. Application preparation and the manual My applications editor were reviewed and rejected as the primary application journey. Preserve them only as exploratory progress, not approved production UX. The proposed save-once, direct-apply, response-aware workspace has not been implemented. Calendar export is not live sync; notification controls in the tracker do not send notifications. Local preview storage is not account persistence.

## Checkpoint scope and unresolved integration

This checkpoint preserves current shared backend/Gemini work, including onboarding, email webhook changes, rankings, directory/profile geography, ingestion scripts, and frontend research/prototypes. Attribution is based on the user's shared-checkout request, not verified per-file authorship.

Migration review required before rollout: both 0042_creator_product_states.sql and 0042_missa_magazine_rankings.sql exist. The current migration journal lists the rankings migration but not creator_product_states or 0043_profile_and_opportunity_geography. Preserve migration history until the backend worker reconciles intended execution and already-applied database state. No migrations or ingestion scripts were executed for this checkpoint.
