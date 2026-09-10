// One definition for progress, application connections and recommendation scope.
export function goalOpportunityScope(goal = "g", opportunity = "o") {
  if (![goal, opportunity].every((v) => /^[a-z][a-z0-9_]*$/i.test(v)))
    throw new Error("Invalid goal scope alias");
  return `(${goal}.discipline is null or ${opportunity}.discipline=${goal}.discipline or ${goal}.discipline=any(${opportunity}.genres))
    and (cardinality(${goal}.opportunity_types)=0 or ${opportunity}.type=any(${goal}.opportunity_types))
    and (not exists(select 1 from creator_goal_targets gt where gt.goal_id=${goal}.id)
      or exists(select 1 from creator_goal_targets gt where gt.goal_id=${goal}.id and
        ((gt.kind='opportunity' and gt.target_id=${opportunity}.id) or (gt.kind='organization' and gt.target_id=${opportunity}.organization_id) or (gt.kind='program' and gt.target_id=${opportunity}.program_id))))`;
}
export function goalRecordedWorkScope(goal = "g", tracked = "t") {
  if (![goal, tracked].every((v) => /^[a-z][a-z0-9_]*$/i.test(v)))
    throw new Error("Invalid goal work alias");
  return `(${goal}.work_id is null or exists(select 1 from application_material_versions v where v.account_id=${goal}.account_id and v.tracked_opportunity_id=${tracked}.id and v.materials->'works' @> jsonb_build_array(jsonb_build_object('id',${goal}.work_id)))
    or (not exists(select 1 from application_material_versions v where v.account_id=${goal}.account_id and v.tracked_opportunity_id=${tracked}.id) and ${tracked}.work_id=${goal}.work_id))`;
}
export function goalProgressSQL(goal = "g") {
  return `(select count(distinct t.id)::int from tracked_opportunities t join opportunities scoped on scoped.id=t.opportunity_id
    where t.account_id=${goal}.account_id and ${goalOpportunityScope(goal, "scoped")} and ${goalRecordedWorkScope(goal)}
    and t.status in ('submitted','received','in-review','longlisted','shortlisted','finalist','accepted','declined','waitlisted','revision-requested','withdrawn','partially-withdrawn','delivered','archived')
    and (coalesce(t.submitted_at,(select coalesce(e.occurred_on::timestamp at time zone ${goal}.timezone,e.created_at) from tracked_status_events e where e.tracked_opportunity_id=t.id and e.account_id=${goal}.account_id and e.to_status='submitted' order by e.created_at limit 1)) at time zone ${goal}.timezone)::date between ${goal}.starts_on and ${goal}.ends_on)`;
}
