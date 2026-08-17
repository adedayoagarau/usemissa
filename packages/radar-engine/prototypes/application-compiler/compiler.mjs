const COMPONENT_TYPES = new Set([
  'eligibility_claim',
  'identity_contact',
  'short_answer',
  'narrative',
  'structured_list',
  'work_sample',
  'file_upload',
  'budget',
  'timeline',
  'reference_request',
  'legal_attestation',
  'external_action',
]);

function clone(value) {
  return structuredClone(value);
}

function evaluateEligibility(component, profile) {
  const field = component.rule?.profileField;
  if (!field || profile[field] === undefined || profile[field] === null) return 'unknown';
  return component.rule.allowedValues.includes(profile[field]) ? 'eligible' : 'ineligible';
}

function resolvePracticeRule(requirement, activePacks) {
  if (!requirement.practiceRules) return { rule: {}, needsChoice: false };
  const matches = activePacks.filter((pack) => requirement.practiceRules[pack]);
  if (matches.length !== 1) return { rule: {}, needsChoice: matches.length > 1 };
  return { rule: requirement.practiceRules[matches[0]], needsChoice: false, practice: matches[0] };
}

function componentState(component) {
  if (component.type === 'eligibility_claim') return component.eligibility;
  if (component.needsPracticeChoice) return 'blocked';
  if (component.satisfiedByAssetVersionId || component.response?.trim()) return 'complete';
  return component.required ? 'missing' : 'optional';
}

function derive(manifest) {
  const components = manifest.components.map((component) => ({
    ...component,
    state: componentState(component),
  }));
  const blockers = [];

  for (const component of components) {
    if (component.type === 'eligibility_claim' && component.eligibility === 'ineligible') {
      blockers.push({ code: 'ineligible', componentId: component.id, message: component.label });
    } else if (component.type === 'eligibility_claim' && component.eligibility === 'unknown') {
      blockers.push({ code: 'eligibility-unknown', componentId: component.id, message: component.label });
    } else if (component.needsPracticeChoice) {
      blockers.push({ code: 'discipline-choice-required', componentId: component.id, message: component.label });
    } else if (component.required && component.state === 'missing') {
      blockers.push({ code: 'required-component-missing', componentId: component.id, message: component.label });
    }
  }

  if (manifest.status === 'needs_recompile') {
    blockers.push({ code: 'opportunity-version-changed', message: `Recompile against ${manifest.opportunity.version}` });
  }

  const readiness = blockers.length === 0 ? 'prepared' : 'preparing';
  return { ...manifest, components, blockers, readiness };
}

export function compileApplication({ opportunity, playbook, packs, profile, assets, applicationId }) {
  if (!opportunity.version || !playbook.version || packs.length === 0) {
    throw new Error('Opportunity version, playbook version, and at least one discipline pack are required.');
  }

  const components = opportunity.requirements.map((requirement) => {
    if (!COMPONENT_TYPES.has(requirement.type)) throw new Error(`Unknown component type: ${requirement.type}`);
    const practice = resolvePracticeRule(requirement, packs);
    const candidates = assets
      .filter((asset) => {
        if (requirement.type !== 'work_sample' && requirement.type !== 'file_upload') return false;
        if (practice.practice && asset.practice !== practice.practice) return false;
        if (practice.rule.formats && !practice.rule.formats.includes(asset.format)) return false;
        return true;
      })
      .map((asset) => asset.versionId);

    return {
      id: requirement.id,
      semanticKey: requirement.semanticKey,
      type: requirement.type,
      label: requirement.label,
      required: requirement.required,
      privacy: requirement.privacy,
      blocksReadiness: requirement.blocksReadiness,
      source: clone(requirement.source),
      constraints: { ...clone(requirement.constraints ?? {}), ...clone(practice.rule) },
      practice: practice.practice,
      needsPracticeChoice: practice.needsChoice,
      eligibility: requirement.type === 'eligibility_claim' ? evaluateEligibility(requirement, profile) : undefined,
      candidateAssetVersionIds: candidates,
      satisfiedByAssetVersionId: undefined,
      response: '',
      state: 'missing',
    };
  });

  const tasks = playbook.steps
    .filter((step) => step.whenComponentTypes.some((type) => components.some((component) => component.type === type)))
    .map((step) => ({ ...clone(step), state: 'pending' }));

  return derive({
    schemaVersion: 1,
    id: applicationId,
    opportunity: { id: opportunity.id, version: opportunity.version, title: opportunity.title },
    playbook: { id: playbook.id, version: playbook.version },
    activePacks: [...packs],
    profileSnapshotVersion: profile.version,
    components,
    tasks,
    calendar: tasks.filter((task) => task.offsetDays !== undefined).map((task) => ({
      taskId: task.id,
      title: 'Missa work session',
      offsetDays: task.offsetDays,
      privacy: 'private_projection',
    })),
    externalMappings: opportunity.externalMappings.map((mapping) => clone(mapping)),
    status: 'draft',
    readiness: 'preparing',
    blockers: [],
    submissionProof: null,
  });
}

export function transition(manifest, action) {
  const next = clone(manifest);
  const component = action.componentId
    ? next.components.find((candidate) => candidate.id === action.componentId)
    : undefined;

  switch (action.type) {
    case 'set-eligibility':
      if (!component || component.type !== 'eligibility_claim') throw new Error('Eligibility component not found.');
      component.eligibility = action.value;
      break;
    case 'choose-practice':
      if (!component || !component.needsPracticeChoice) throw new Error('No practice choice is required.');
      component.practice = action.practice;
      component.needsPracticeChoice = false;
      break;
    case 'select-asset':
      if (!component || !component.candidateAssetVersionIds.includes(action.assetVersionId)) {
        throw new Error('Asset version is not a valid candidate.');
      }
      component.satisfiedByAssetVersionId = action.assetVersionId;
      break;
    case 'write-response':
      if (!component) throw new Error('Component not found.');
      component.response = action.value;
      break;
    case 'mark-prepared': {
      const derived = derive(next);
      if (derived.readiness !== 'prepared') throw new Error('Cannot mark prepared while blockers remain.');
      derived.status = 'prepared';
      return derived;
    }
    case 'mark-filled-externally':
      if (next.status !== 'prepared') throw new Error('External fill requires a prepared manifest.');
      next.status = 'filled_externally';
      break;
    case 'record-submission':
      if (!['prepared', 'filled_externally'].includes(next.status)) throw new Error('Submission proof requires a prepared package.');
      if (!action.proof?.trim()) throw new Error('A provider receipt or explicit user proof is required.');
      next.status = 'submitted';
      next.submissionProof = action.proof.trim();
      break;
    case 'supersede-opportunity':
      next.opportunity.version = action.version;
      next.status = 'needs_recompile';
      return derive(next);
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }

  return derive(next);
}
