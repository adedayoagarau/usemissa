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
  select, button.action, input.field { font:inherit; padding:.25rem .5rem; border-radius:6px; border:1px solid #8886; cursor:pointer; background:none; }
  input.field { cursor:text; }
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
  .error { color: var(--bad); font-size:.85rem; }
  #authGate { max-width:380px; margin:3rem auto; }
  #authGate .switch { text-align:center; margin-top:.8rem; font-size:.85rem; color:var(--muted); }
  #authGate .switch a { color: var(--accent); cursor:pointer; }
  #authGate form { display:flex; flex-direction:column; gap:.6rem; }
  #authGate input.field { width:100%; padding:.5rem .6rem; }
  #authGate button.action { padding:.5rem; }
</style>
</head>
<body>
<header id="appHeader" style="display:none">
  <h1><span>Missa</span> Radar</h1>
  <nav>
    <button data-tab="discover" class="active">Discover</button>
    <button data-tab="inbox">Inbox</button>
    <button data-tab="tracker">Tracker</button>
    <button data-tab="workspace" id="workspaceTabBtn">Workspace</button>
    <button data-tab="admin" id="adminTabBtn">Admin</button>
  </nav>
  <span style="flex:1"></span>
  <label id="orgPicker">Org: <select id="org"></select></label>
  <span class="meta" id="whoami"></span>
  <button class="action" id="logout">Log out</button>
</header>
<main id="main">Loading…</main>
<div id="authGate" style="display:none">
  <h2 style="text-align:center"><span style="color:var(--accent)">Missa</span> Radar</h2>
  <form id="loginForm">
    <input class="field" name="email" type="email" placeholder="Email" autocomplete="username" required>
    <input class="field" name="password" type="password" placeholder="Password" autocomplete="current-password" required>
    <button class="action" type="submit">Log in</button>
    <div class="error" id="loginError"></div>
  </form>
  <form id="signupForm" style="display:none">
    <input class="field" name="displayName" type="text" placeholder="Name" autocomplete="name" required>
    <input class="field" name="email" type="email" placeholder="Email" autocomplete="username" required>
    <input class="field" name="password" type="password" placeholder="Password (min 8 characters)" autocomplete="new-password" minlength="8" required>
    <button class="action" type="submit">Sign up</button>
    <div class="error" id="signupError"></div>
  </form>
  <div class="switch"><a id="toSignup">Sign up</a> · <a id="toLogin" style="display:none">Log in instead</a></div>
</div>
<footer class="tickbar" id="tickbar" style="display:none">
  <button class="action" id="tick">Run Radar tick</button>
  <span id="tickinfo" class="meta"></span>
</footer>
<script>
const STATUSES = ["interested","saved","preparing","draft-started","ready-to-submit","submitted","received","in-review","longlisted","shortlisted","finalist","accepted","declined","waitlisted","revision-requested","withdrawn","partially-withdrawn","delivered","archived"];
let tab = 'discover', me = null, orgId = null;

async function api(path, opts) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...(opts ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(opts) } : {}),
  });
  if (res.status === 401) { showGate(); throw new Error('Please log in.'); }
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
  const opps = await api('/api/users/' + me.user.id + '/discover');
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
    await api('/api/users/' + me.user.id + '/track', { opportunityId: b.dataset.track });
    render();
  });
}

async function renderInbox(el) {
  const d = await api('/api/users/' + me.user.id + '/inbox');
  const section = (name, alerts) => alerts.length ? '<div class="stage"><h2>' + name + '</h2>' +
    alerts.map(a => '<div class="card"><b>' + esc(a.title) + '</b><div>' + esc(a.body) + '</div><div class="alert-reason">why: ' + esc(a.reason) + '</div></div>').join('') + '</div>' : '';
  el.innerHTML = '<div class="summary">' + esc(d.summary) + '</div>'
    + section('New for you', d.newForYou)
    + section('Closing soon', d.closingSoon)
    + section('Opening soon / expected back', d.openingSoon)
    + section('Recently updated', d.recentlyUpdated)
    + section('From organizations you follow', d.fromFollowedOrgs)
    + section('Deadline reminders', d.reminders ?? [])
    + section('No word back yet', d.overdue ?? [])
    + section('Got an acceptance — consider withdrawing elsewhere', d.withdrawalSuggestions ?? []);
}

async function renderTracker(el) {
  const t = await api('/api/users/' + me.user.id + '/tracker');
  const s = t.stats;
  const item = (i) => \`
    <div class="card">
      <div class="row">
        <div>
          <h3>\${esc(i.title)}</h3>
          <div class="meta">\${esc(i.organizationName ?? '')} · opportunity: \${esc(i.opportunityStatus)}
            \${i.deadline ? ' · deadline ' + esc(i.deadline) + ' (' + i.daysToDeadline + 'd)' : ''}
            \${i.daysOverdue ? ' · <span class="error">' + i.daysOverdue + 'd past their usual response time</span>' : ''}</div>
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
    <div class="stage"><button class="action" id="calFeedBtn">Copy calendar feed link</button> <span class="meta" id="calFeedInfo"></span></div>
    \${stage('Planning', 'planning')}\${stage('Submitted', 'submitted')}\${stage('In progress', 'in-progress')}\${stage('Outcomes', 'outcome')}\${stage('Archived', 'archived')}\`
    || '<p>Nothing tracked yet — find something in Discover.</p>';
  el.querySelectorAll('select[data-opp]').forEach(sel => sel.onchange = async () => {
    await api('/api/users/' + me.user.id + '/status', { opportunityId: sel.dataset.opp, status: sel.value });
    render();
  });
  const calBtn = document.getElementById('calFeedBtn');
  if (calBtn) calBtn.onclick = async () => {
    const { token } = await api('/api/users/' + me.user.id + '/calendar-token');
    const feedUrl = location.origin + '/api/users/' + me.user.id + '/calendar.ics?token=' + encodeURIComponent(token);
    try { await navigator.clipboard.writeText(feedUrl); document.getElementById('calFeedInfo').textContent = 'Copied — subscribe to it from Google/Apple/Outlook Calendar.'; }
    catch { document.getElementById('calFeedInfo').textContent = feedUrl; }
  };
}

async function renderNoMembership(el) {
  const orgs = await api('/api/organizations');
  const opps = await api('/api/opportunities');
  el.innerHTML = '<h2>Missa Workspace</h2><p class="meta">You are not a member of any organization yet. Request a claim on a listing your organization owns — a domain match approves instantly, otherwise an admin reviews it.</p>'
    + '<form id="claimForm" class="card">'
    + '<label>Organization <select name="organizationId">' + orgs.map(o => '<option value="' + o.id + '">' + esc(o.name) + '</option>').join('') + '</select></label><br><br>'
    + '<label>Opportunity <select name="opportunityId">' + opps.map(o => '<option value="' + o.id + '">' + esc(o.title) + '</option>').join('') + '</select></label><br><br>'
    + '<button class="action" type="submit">Request claim</button>'
    + '<div class="error" id="claimError"></div>'
    + '</form>';
  document.getElementById('claimForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const claim = await api('/api/orgs/' + fd.get('organizationId') + '/claims', { opportunityId: fd.get('opportunityId') });
      await refreshMe();
      if (claim.status === 'approved') { orgId = claim.organizationId; render(); }
      else { el.insertAdjacentHTML('beforeend', '<p class="meta">Claim requested — pending admin review.</p>'); }
    } catch (err) { document.getElementById('claimError').textContent = err.message; }
  };
}

async function renderWorkspace(el) {
  if (!orgId) return renderNoMembership(el);
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
    + '<div class="stage"><h2>Claim requests</h2>' + (claims.length ? claims.map(c => '<div class="card"><b>' + esc(c.requestedBy) + '</b><div class="meta">' + esc(c.status) + ' · ' + esc(c.verificationMethod) + '</div></div>').join('') : '<p class="meta">No claim requests.</p>') + '</div>';
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => {
    const deadline = prompt('New deadline (YYYY-MM-DD):', b.dataset.deadline);
    if (!deadline) return;
    await fetch('/api/orgs/' + orgId + '/opportunities/' + b.dataset.edit, {
      method: 'PATCH', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
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
            <div class="meta">requested by \${esc(c.requestedBy)} · \${esc(c.verificationMethod)}</div></div>
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
  el.querySelectorAll('[data-approve]').forEach(b => b.onclick = async () => { await api('/api/admin/claims/approve', { claimId: b.dataset.approve }); render(); });
  el.querySelectorAll('[data-reject]').forEach(b => b.onclick = async () => { await api('/api/admin/claims/reject', { claimId: b.dataset.reject }); render(); });
  el.querySelectorAll('[data-resolve]').forEach(b => b.onclick = async () => { await api('/api/admin/verification-tasks/' + b.dataset.resolve + '/resolve', {}); render(); });
  el.querySelectorAll('[data-dismiss]').forEach(b => b.onclick = async () => { await api('/api/admin/verification-tasks/' + b.dataset.dismiss + '/resolve', { dismiss: true }); render(); });
}

async function render() {
  const el = document.getElementById('main');
  try {
    if (tab === 'discover') await renderDiscover(el);
    else if (tab === 'inbox') await renderInbox(el);
    else if (tab === 'tracker') await renderTracker(el);
    else if (tab === 'workspace') await renderWorkspace(el);
    else await renderAdmin(el);
  } catch (e) { el.innerHTML = '<p class="error">' + esc(e.message) + '</p>'; }
}

function setTab(name) {
  tab = name;
  location.hash = name;
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('active', x.dataset.tab === name));
  document.getElementById('orgPicker').style.display = name === 'workspace' && me.memberships.length ? '' : 'none';
  render();
}
document.querySelectorAll('nav button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
document.getElementById('tick').onclick = async () => {
  const r = await api('/api/tick', {});
  document.getElementById('tickinfo').textContent =
    'checked ' + r.sourcesChecked + ' sources, ' + r.changes.length + ' changes, ' + r.alerts.length + ' alerts';
  render();
};
document.getElementById('logout').onclick = async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  location.reload();
};

function showGate() {
  document.getElementById('appHeader').style.display = 'none';
  document.getElementById('tickbar').style.display = 'none';
  document.getElementById('main').innerHTML = '';
  document.getElementById('authGate').style.display = '';
}
function showApp() {
  document.getElementById('authGate').style.display = 'none';
  document.getElementById('appHeader').style.display = '';
  document.getElementById('tickbar').style.display = '';
}

document.getElementById('toSignup').onclick = () => {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('signupForm').style.display = '';
  document.getElementById('toSignup').style.display = 'none';
  document.getElementById('toLogin').style.display = '';
};
document.getElementById('toLogin').onclick = () => {
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('loginForm').style.display = '';
  document.getElementById('toLogin').style.display = 'none';
  document.getElementById('toSignup').style.display = '';
};
document.getElementById('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const res = await fetch('/api/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }) });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Login failed');
    me = await res.json();
    await boot();
  } catch (err) { document.getElementById('loginError').textContent = err.message; }
};
document.getElementById('signupForm').onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const res = await fetch('/api/auth/signup', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: fd.get('email'), password: fd.get('password'), displayName: fd.get('displayName') }) });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Sign up failed');
    me = await res.json();
    await boot();
  } catch (err) { document.getElementById('signupError').textContent = err.message; }
};

async function refreshMe() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (!res.ok) { showGate(); return; }
  me = await res.json();
}

async function boot() {
  showApp();
  document.getElementById('whoami').textContent = me.account.email + (me.account.isAdmin ? ' (admin)' : '');
  document.getElementById('workspaceTabBtn').style.display = me.memberships.length ? '' : '';
  document.getElementById('adminTabBtn').style.display = me.account.isAdmin ? '' : 'none';

  const orgSel = document.getElementById('org');
  orgSel.innerHTML = me.memberships.map(m => '<option value="' + m.organizationId + '">' + esc(m.organizationName ?? m.organizationId) + '</option>').join('');
  orgId = me.memberships[0]?.organizationId ?? null;
  orgSel.onchange = () => { orgId = orgSel.value; render(); };

  const initial = location.hash.replace('#', '');
  setTab(['discover', 'inbox', 'tracker', 'workspace', 'admin'].includes(initial) ? initial : 'discover');
}

(async () => {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (res.ok) { me = await res.json(); await boot(); }
  else showGate();
})();
</script>
</body>
</html>`;
