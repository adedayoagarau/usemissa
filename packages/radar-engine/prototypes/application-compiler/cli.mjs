import process from 'node:process';
import readline from 'node:readline';

import { compileApplication, transition } from './compiler.mjs';
import { assets, opportunity, packs, playbook, profiles } from './fixtures.mjs';

const bold = '\u001b[1m';
const dim = '\u001b[2m';
const reset = '\u001b[0m';

let fixture = 'writer';
let lastError = '';

function fresh(name) {
  fixture = name;
  lastError = '';
  return compileApplication({
    opportunity,
    playbook,
    packs: packs[name],
    profile: profiles[name],
    assets,
    applicationId: `prototype-application-${name}`,
  });
}

let manifest = fresh(fixture);

function act(action) {
  try {
    manifest = transition(manifest, action);
    lastError = '';
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
  }
}

function first(type) {
  return manifest.components.find((component) => component.type === type);
}

function render() {
  console.clear();
  console.log(`${bold}APPLICATION COMPILER - THROWAWAY LOGIC PROTOTYPE${reset}`);
  console.log(`${dim}Question: can one deterministic manifest serve different practices without guessing?${reset}\n`);
  console.log(`${bold}Fixture${reset} ${fixture}`);
  console.log(`${bold}Application state${reset} ${manifest.status}`);
  console.log(`${bold}Readiness${reset} ${manifest.readiness}`);
  console.log(`${bold}Pinned versions${reset} ${manifest.opportunity.version} | ${manifest.playbook.version} | ${manifest.profileSnapshotVersion}`);
  console.log(`${bold}Active packs${reset} ${manifest.activePacks.join(', ')}`);
  if (lastError) console.log(`\n${bold}Blocked action${reset} ${lastError}`);

  console.log(`\n${bold}Components${reset}`);
  for (const component of manifest.components) {
    const candidate = component.candidateAssetVersionIds.length ? ` candidates=${component.candidateAssetVersionIds.join(',')}` : '';
    const choice = component.needsPracticeChoice ? ' practice-choice=required' : component.practice ? ` practice=${component.practice}` : '';
    console.log(`  ${component.id.padEnd(18)} ${component.state.padEnd(10)} ${component.type}${choice}${candidate}`);
  }

  console.log(`\n${bold}Blockers${reset}`);
  if (manifest.blockers.length === 0) console.log('  none');
  for (const blocker of manifest.blockers) console.log(`  ${blocker.code}: ${blocker.message}`);

  console.log(`\n${bold}Generated work${reset}`);
  for (const task of manifest.tasks) console.log(`  ${task.id} <- [${task.dependsOn.join(', ') || 'root'}]`);
  console.log(`${bold}Calendar projections${reset} ${manifest.calendar.length} private generic-title events`);
  console.log(`${bold}External mappings${reset} ${manifest.externalMappings.length} verified mappings`);
  console.log(`${bold}Submission proof${reset} ${manifest.submissionProof ?? 'none'}`);

  console.log(`\n${bold}[1]${reset}${dim} writer  ${reset}${bold}[2]${reset}${dim} musician  ${reset}${bold}[3]${reset}${dim} multi  ${reset}${bold}[e]${reset}${dim} eligible  ${reset}${bold}[u]${reset}${dim} unknown${reset}`);
  console.log(`${bold}[a]${reset}${dim} select asset  ${reset}${bold}[n]${reset}${dim} narrative  ${reset}${bold}[b]${reset}${dim} budget  ${reset}${bold}[r]${reset}${dim} rights  ${reset}${bold}[p]${reset}${dim} prepare${reset}`);
  console.log(`${bold}[f]${reset}${dim} filled external  ${reset}${bold}[s]${reset}${dim} submit with proof  ${reset}${bold}[v]${reset}${dim} new opportunity version  ${reset}${bold}[q]${reset}${dim} quit${reset}`);
}

function onKey(key) {
  const eligibility = first('eligibility_claim');
  const sample = first('work_sample');
  const narrative = first('narrative');
  const budget = first('budget');
  const rights = first('legal_attestation');

  if (key === '1') manifest = fresh('writer');
  else if (key === '2') manifest = fresh('musician');
  else if (key === '3') manifest = fresh('multidisciplinary');
  else if (key === 'e') act({ type: 'set-eligibility', componentId: eligibility.id, value: 'eligible' });
  else if (key === 'u') act({ type: 'set-eligibility', componentId: eligibility.id, value: 'unknown' });
  else if (key === 'a') {
    if (sample.needsPracticeChoice) act({ type: 'choose-practice', componentId: sample.id, practice: 'writer' });
    const refreshed = first('work_sample');
    const candidate = refreshed.candidateAssetVersionIds[0];
    if (candidate) act({ type: 'select-asset', componentId: refreshed.id, assetVersionId: candidate });
    else lastError = 'No valid asset candidate is available.';
  } else if (key === 'n') act({ type: 'write-response', componentId: narrative.id, value: 'Synthetic project summary for prototype validation.' });
  else if (key === 'b') act({ type: 'write-response', componentId: budget.id, value: 'USD 5,000 synthetic prototype budget.' });
  else if (key === 'r') act({ type: 'write-response', componentId: rights.id, value: 'Explicitly reviewed prototype attestation.' });
  else if (key === 'p') act({ type: 'mark-prepared' });
  else if (key === 'f') act({ type: 'mark-filled-externally' });
  else if (key === 's') act({ type: 'record-submission', proof: 'prototype-user-confirmed-proof' });
  else if (key === 'v') act({ type: 'supersede-opportunity', version: 'opp-v2' });
  render();
}

if (process.argv.includes('--demo')) {
  const writer = fresh('writer');
  const musician = fresh('musician');
  const multi = fresh('multidisciplinary');
  console.log(JSON.stringify({
    writer: { eligibility: writer.components[0].eligibility, sample: writer.components.find((component) => component.type === 'work_sample') },
    musician: { eligibility: musician.components[0].eligibility, sample: musician.components.find((component) => component.type === 'work_sample') },
    multidisciplinary: { blockers: multi.blockers },
  }, null, 2));
  process.exit(0);
}

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.on('keypress', (_input, key) => {
  if (key.name === 'q' || (key.ctrl && key.name === 'c')) process.exit(0);
  onKey(key.sequence);
});
render();
