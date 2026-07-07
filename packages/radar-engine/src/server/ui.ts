/**
 * The minimal single-page UI for the user opportunity loop, served at "/".
 * Vanilla JS + fetch against the JSON API — no build step, no dependencies.
 */
export const UI_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Missa Radar</title>
<style>
  :root { color-scheme: light dark; --accent:#6c5ce7; --ok:#2e9e5b; --warn:#c97a10; --bad:#c0392b; --muted:#888; }
  * { box-sizing: border-box; }
  body { font: 15px/1.5 system-ui, sans-serif; margin: 0; }
  header { display:flex; gap:1rem; align-items:center; padding:.8rem 1.2rem; border-bottom:1px solid #8884; flex-wrap:wrap; }
  header h1 { font-size:1.1rem; margin:0; }
  header h1 span { color: var(--accent); }
  nav button { background:none; border:none; font:inherit; padding:.4rem .8rem; cursor:pointer; border-radius:6px; }
  nav button.active { background: var(--accent); color:#fff; }
  select, button.action { font:inherit; padding:.25rem .5rem; border-radius:6px; border:1px solid #8886; cursor:pointer; background:none; }
  main { max-width: 860px; margin: 0 auto; padding: 1rem 1.2rem 4rem; }
  .card { border:1px solid #8884; border-radius:10px; padding: .9rem 1rem; margin: .8rem 0; }
  .card h3 { margin:0 0 .2rem; font-size:1rem; }
  .meta { color: var(--muted); font-size:.85rem; }
  .badge { display:inline-block; font-size:.75rem; padding:.1rem .5rem; border-radius:999px; border:1px solid #8886; margin-right:.35rem; }
  .badge.status { border-color: var(--accent); color: var(--accent); }
  .fit-strong { color: var(--ok); font-weight:600; }
  .fit-possible { color: var(--warn); font-weight:600; }
  .fit-weak, .fit-unknown { color: var(--muted); font-weight:600; }
  .fit-not-eligible { color: var(--bad); font-weight:600; }
  ul.fit { margin:.3rem 0 0; padding-left:1.2rem; font-size:.85rem; }
  .row { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; flex-wrap:wrap; }
  .summary { white-space:pre-line; background:#8881; border-radius:10px; padding:.8rem 1rem; }
  .stage { margin-top:1.2rem; }
  .stage h2 { font-size:.85rem; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
  .alert-reason { color: var(--muted); font-size:.8rem; }
  .stats { display:flex; gap:1.5rem; flex-wrap:wrap; margin:.8rem 0; }
  .stats div b { display:block; font-size:1.3rem; }
  footer.tickbar { position:fixed; bottom:0; left:0; right:0; padding:.5rem 1.2rem; border-top:1px solid #8884; background: Canvas; display:flex; gap:1rem; align-items:center; font-size:.85rem; }
</style>
</head>
<body>
<header>
  <h1><span>Missa</span> Radar</h1>
  <nav>
    <button data-tab="discover" class="active">Discover</button>
    <button data-tab="inbox">Inbox</button>
    <button data-tab="tracker">Tracker</button>
    <button data-tab="workspace">Workspace</button>
    <button data-tab="admin">Admin</button>
  </nav>
  <span style="flex:1"></span>
  <label id="userPicker">User: <select id="user"></select></label>
  <label id="orgPicker">Org: <select id="org"></select></label>
</header>
<main id="main">Loading…</main>
<footer class="tickbar">
  <button class="action" id="tick">Run Radar tick</button>
  <span id="tickinfo" class="meta"></span>
</footer>
<script>
const STATUSES = ["interested","saved","preparing","draft-started","ready-to-submit","submitted","received","in-review","longlisted","shortlisted","finalist","accepted","declined","waitlisted","revision-requested","withdrawn","partially-withdrawn","delivered","archived"];
let tab = 'discover', userId = null, orgId = null;

async function api(path, opts) {
  const res = await fetch(path, opts ? { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(opts) } : undefined);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function fitHtml(fit) {
  const items = [
    ...fit.reasons.map(r => '<li>\\u2713 ' + esc(r) + '</li>'),
    ...fit.watchouts.map(w => '<li>\\u26a0 ' + esc(w) + '</li>'),
    ...fit.disqualifiers.map(d => '<li>\\u2715 ' + esc(d) + '</li>'),
  ].join('');
  return '<span class="fit-' + fit.level + '">' + fit.level.replace('-', ' ') + ' fit</span><ul class="fit">' + items + '</ul>';
}

async function renderDiscover(el) {
  const opps = await api('/api/users/' + userId + '/discover');
  el.innerHTML = '<h2>Open opportunities</h2>' + opps.map(o => \`
    <div class="card">
      <div class="row">
        <div>
          <h3>\${esc(o.title)}</h3>
          <div class="meta">\${esc(o.organizationName ?? 'Unknown organization')} · \${esc(o.type)} ·
            deadline: \${esc(o.deadline ?? o.deadlineKind)} · trust \${o.trust}/100 · \${o.tracked ? 'tracked' : ''}</div>
          <span class="badge status">\${esc(o.status)}</span>
          \${o.genres.map(g => '<span class="badge">' + esc(g) + '</span>').join('')}
          <div>\${fitHtml(o.fit)}</div>
        </div>
        <div>\${o.tracked ? '' : '<button class="action" data-track="' + o.id + '">Track</button>'}</div>
      </div>
    </div>\`).join('');
  el.querySelectorAll('[data-track]').forEach(b => b.onclick = async () => {
    await api('/api/users/' + userId + '/track', { opportunityId: b.dataset.track });
    render();
  });
}

async function renderInbox(el) {
  const d = await api('/api/users/' + userId + '/inbox');
  const section = (name, alerts) => alerts.length ? '<div class="stage"><h2>' + name + '</h2>' +
    alerts.map(a => '<div class="card"><b>' + esc(a.title) + '</b><div>' + esc(a.body) + '</div><div class="alert-reason">why: ' + esc(a.reason) + '</div></div>').join('') + '</div>' : '';
  el.innerHTML = '<div class="summary">' + esc(d.summary) + '</div>'
    + section('New for you', d.newForYou)
    + section('Closing soon', d.closingSoon)
    + section('Opening soon / expected back', d.openingSoon)
    + section('Recently updated', d.recentlyUpdated)
    + section('From organizations you follow', d.fromFollowedOrgs)
    + section('Deadline reminders', d.reminders ?? []);
}

async function renderTracker(el) {
  const t = await api('/api/users/' + userId + '/tracker');
  const s = t.stats;
  const item = (i) => \`
    <div class="card">
      <div class="row">
        <div>
          <h3>\${esc(i.title)}</h3>
          <div class="meta">\${esc(i.organizationName ?? '')} · opportunity: \${esc(i.opportunityStatus)}
            \${i.deadline ? ' · deadline ' + esc(i.deadline) + ' (' + i.daysToDeadline + 'd)' : ''}</div>
          <div>\${fitHtml(i.fit)}</div>
        </div>
        <div>
          <label class="meta">my status<br>
            <select data-opp="\${i.opportunityId}">\${STATUSES.map(st => '<option' + (st === i.myStatus ? ' selected' : '') + '>' + st + '</option>').join('')}</select>
          </label>
        </div>
      </div>
    </div>\`;
  const stage = (name, key) => t.pipeline[key].length ? '<div class="stage"><h2>' + name + ' (' + t.pipeline[key].length + ')</h2>' + t.pipeline[key].map(item).join('') + '</div>' : '';
  el.innerHTML = \`
    <div class="stats">
      <div><b>\${s.tracked}</b>tracked</div>
      <div><b>\${s.planning}</b>planning</div>
      <div><b>\${s.awaitingResponse}</b>awaiting response</div>
      <div><b>\${s.accepted}</b>accepted</div>
      <div><b>\${s.acceptanceRate != null ? Math.round(s.acceptanceRate * 100) + '%' : '—'}</b>acceptance</div>
    </div>
    \${t.deadlines.length ? '<div class="stage"><h2>Next deadlines</h2><div class="meta">' + t.deadlines.map(i => esc(i.title) + ' — ' + i.daysToDeadline + 'd').join(' · ') + '</div></div>' : ''}
    \${stage('Planning', 'planning')}\${stage('Submitted', 'submitted')}\${stage('In progress', 'in-progress')}\${stage('Outcomes', 'outcome')}\${stage('Archived', 'archived')}\`
    || '<p>Nothing tracked yet — find something in Discover.</p>';
  el.querySelectorAll('select[data-opp]').forEach(sel => sel.onchange = async () => {
    await api('/api/users/' + userId + '/status', { opportunityId: sel.dataset.opp, status: sel.value });
    render();
  });
}

async function renderWorkspace(el) {
  if (!orgId) { el.innerHTML = '<p>No organizations yet.</p>'; return; }
  const [org, listings, claims, analytics] = await Promise.all([
    api('/api/orgs/' + orgId),
    api('/api/orgs/' + orgId + '/opportunities'),
    api('/api/orgs/' + orgId + '/claims'),
    api('/api/orgs/' + orgId + '/analytics'),
  ]);
  el.innerHTML = '<h2>' + esc(org.name) + (org.verified ? ' <span class="badge status">verified</span>' : '') + '</h2>'
    + '<div class="stats">'
    + '<div><b>' + analytics.claimedListings + '</b>claimed listings</div>'
    + '<div><b>' + analytics.openListings + '</b>open</div>'
    + '<div><b>' + analytics.followers + '</b>followers</div>'
    + '<div><b>' + (analytics.avgTrust ?? '—') + '</b>avg trust</div>'
    + '<div><b>' + analytics.openVerificationTasks + '</b>pending review</div>'
    + '</div>'
    + '<div class="stage"><h2>Claimed listings</h2>' + (listings.length ? listings.map(o => \`
      <div class="card">
        <div class="row">
          <div>
            <h3>\${esc(o.title)}</h3>
            <div class="meta">\${esc(o.type)} · deadline: \${esc(o.deadline ?? o.deadlineKind)} · trust \${o.trust}/100</div>
            <span class="badge status">\${esc(o.status)}</span>
          </div>
          <div><button class="action" data-edit="\${o.id}" data-deadline="\${esc(o.deadline ?? '')}">Edit deadline</button></div>
        </div>
      </div>\`).join('') : '<p class="meta">Nothing claimed yet.</p>') + '</div>'
    + '<div class="stage"><h2>Claim requests</h2>' + (claims.length ? claims.map(c => '<div class="card"><b>' + esc(c.opportunityId) + '</b><div class="meta">' + esc(c.status) + ' · ' + esc(c.verificationMethod) + '</div></div>').join('') : '<p class="meta">No claim requests.</p>') + '</div>';
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
    const deadline = prompt('New deadline (YYYY-MM-DD):', b.dataset.deadline);
    if (!deadline) return;
    await fetch('/api/orgs/' + orgId + '/opportunities/' + b.dataset.edit, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deadline: { kind: 'exact', date: deadline } }),
    });
    render();
  });
}

async function renderAdmin(el) {
  const [queue, claims, stats] = await Promise.all([
    api('/api/admin/verification-queue'),
    api('/api/admin/claims'),
    api('/api/admin/stats'),
  ]);
  el.innerHTML = '<h2>Radar health</h2><div class="stats">'
    + '<div><b>' + stats.opportunitiesDiscovered + '</b>discovered</div>'
    + '<div><b>' + stats.opportunitiesOpen + '</b>open</div>'
    + '<div><b>' + stats.openVerificationTasks + '</b>open tasks</div>'
    + '<div><b>' + Math.round(stats.duplicateRate * 100) + '%</b>duplicate rate</div>'
    + '</div>'
    + '<div class="stage"><h2>Pending claim reviews</h2>' + (claims.length ? claims.map(c => \`
      <div class="card">
        <div class="row">
          <div><b>\${esc(c.organizationName ?? c.organizationId)}</b> wants "\${esc(c.opportunityTitle ?? c.opportunityId)}"
            <div class="meta">\${esc(c.verificationMethod)}</div></div>
          <div><button class="action" data-approve="\${c.id}">Approve</button> <button class="action" data-reject="\${c.id}">Reject</button></div>
        </div>
      </div>\`).join('') : '<p class="meta">Nothing pending.</p>') + '</div>'
    + Object.entries(queue).map(([reason, tasks]) => tasks.length ? '<div class="stage"><h2>' + esc(reason) + ' (' + tasks.length + ')</h2>'
      + tasks.map(t => \`
        <div class="card">
          <div class="row">
            <div>\${esc(t.details)}</div>
            <div><button class="action" data-resolve="\${t.id}">Resolve</button> <button class="action" data-dismiss="\${t.id}">Dismiss</button></div>
          </div>
        </div>\`).join('') + '</div>' : '').join('');
  el.querySelectorAll('[data-approve]').forEach(b => b.onclick = async () => { await api('/api/admin/claims/approve', { claimId: b.dataset.approve, decidedBy: 'admin' }); render(); });
  el.querySelectorAll('[data-reject]').forEach(b => b.onclick = async () => { await api('/api/admin/claims/reject', { claimId: b.dataset.reject, decidedBy: 'admin' }); render(); });
  el.querySelectorAll('[data-resolve]').forEach(b => b.onclick = async () => { await api('/api/admin/verification-tasks/' + b.dataset.resolve + '/resolve', { resolvedBy: 'admin' }); render(); });
  el.querySelectorAll('[data-dismiss]').forEach(b => b.onclick = async () => { await api('/api/admin/verification-tasks/' + b.dataset.dismiss + '/resolve', { resolvedBy: 'admin', dismiss: true }); render(); });
}

async function render() {
  const el = document.getElementById('main');
  try {
    if (tab === 'discover') await renderDiscover(el);
    else if (tab === 'inbox') await renderInbox(el);
    else if (tab === 'tracker') await renderTracker(el);
    else if (tab === 'workspace') await renderWorkspace(el);
    else await renderAdmin(el);
  } catch (e) { el.innerHTML = '<p>' + esc(e.message) + '</p>'; }
}

function setTab(name) {
  tab = name;
  location.hash = name;
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('active', x.dataset.tab === name));
  document.getElementById('userPicker').style.display = ['discover', 'inbox', 'tracker'].includes(name) ? '' : 'none';
  document.getElementById('orgPicker').style.display = name === 'workspace' ? '' : 'none';
  render();
}
document.querySelectorAll('nav button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
document.getElementById('tick').onclick = async () => {
  const r = await api('/api/tick', {});
  document.getElementById('tickinfo').textContent =
    'checked ' + r.sourcesChecked + ' sources, ' + r.changes.length + ' changes, ' + r.alerts.length + ' alerts';
  render();
};
(async () => {
  const users = await api('/api/users');
  const sel = document.getElementById('user');
  sel.innerHTML = users.map(u => '<option value="' + u.id + '">' + esc(u.displayName) + '</option>').join('');
  userId = users[0]?.id;
  sel.onchange = () => { userId = sel.value; render(); };

  const orgs = await api('/api/organizations');
  const orgSel = document.getElementById('org');
  orgSel.innerHTML = orgs.map(o => '<option value="' + o.id + '">' + esc(o.name) + '</option>').join('');
  orgId = orgs[0]?.id;
  orgSel.onchange = () => { orgId = orgSel.value; render(); };

  const initial = location.hash.replace('#', '');
  setTab(['discover', 'inbox', 'tracker', 'workspace', 'admin'].includes(initial) ? initial : 'discover');
})();
</script>
</body>
</html>`;
