/**
 * Missa hi-fi prototype — screen navigation & interactions
 */
const SCREENS = {
  opportunities: { title: 'Opportunities', subtitle: '1,042 sources · 847 open calls matching your profile' },
  alerts: { title: 'Alerts', subtitle: '14 updates since yesterday' },
  tracker: { title: 'Tracker', subtitle: '23 opportunities in your pipeline' },
  submissions: { title: 'Submissions', subtitle: 'Active packets across magazines, grants, and residencies' },
  saved: { title: 'Saved', subtitle: '4 saved searches · 12 followed organizations' },
  registry: { title: 'Source registry', subtitle: '1,042 monitored sources across 49 verticals' },
  verify: { title: 'Verification queue', subtitle: 'Admin · 37 items need review' },
};

const OPPS = [
  {
    id: 'kenyon',
    title: 'The Kenyon Review — General submissions',
    org: 'The Kenyon Review',
    type: 'Literary magazine',
    vertical: 'Fiction · Poetry · CNF',
    deadline: 'Mar 15, 2026',
    deadlineNote: 'Extended 2 weeks ago',
    fee: 'No fee',
    status: 'closing',
    fit: 'strong',
    fitReasons: ['Accepts poetry', 'No reading fee', 'Simultaneous subs OK'],
    trust: 'High confidence',
    verified: true,
    checked: '4 hours ago',
    location: 'United States',
    genres: ['Fiction', 'Poetry', 'CNF'],
  },
  {
    id: 'iscp',
    title: 'ISCP Residency — Spring 2027',
    org: 'International Studio & Curatorial Program',
    type: 'Residency',
    vertical: 'Visual arts',
    deadline: 'Oct 1, 2026',
    fee: '$45 application fee',
    status: 'open',
    fit: 'possible',
    fitReasons: ['Visual arts residency', 'International artists welcome'],
    fitWatch: ['Fee required', 'Portfolio-heavy application'],
    trust: 'Medium confidence',
    verified: true,
    checked: '1 day ago',
    location: 'Brooklyn, NY',
    genres: ['Visual arts', 'Curatorial'],
  },
  {
    id: 'nea',
    title: 'NEA Creative Writing Fellowships',
    org: 'National Endowment for the Arts',
    type: 'Fellowship',
    vertical: 'Grants',
    deadline: 'Mar 12, 2026',
    fee: 'No fee',
    status: 'closing',
    fit: 'strong',
    fitReasons: ['Poetry eligible', 'US citizens', 'No application fee'],
    trust: 'High confidence',
    verified: true,
    checked: '2 hours ago',
    location: 'United States',
    genres: ['Poetry', 'Prose'],
  },
  {
    id: 'sundance',
    title: 'Sundance Screenwriters Lab',
    org: 'Sundance Institute',
    type: 'Fellowship',
    vertical: 'Film',
    deadline: 'May 18, 2026',
    fee: 'No fee',
    status: 'open',
    fit: 'weak',
    fitReasons: ['Feature screenplay'],
    fitDisq: ['Requires completed feature script'],
    trust: 'High confidence',
    verified: true,
    checked: '6 hours ago',
    location: 'United States',
    genres: ['Screenwriting'],
  },
  {
    id: 'hilltop',
    title: 'Hilltop Foundation Arts Grant',
    org: 'Hilltop Foundation',
    type: 'Grant',
    vertical: 'Grants',
    deadline: 'Apr 10 vs Apr 25',
    fee: 'No fee',
    status: 'verify',
    fit: 'not-eligible',
    fitDisq: ['501(c)(3) required', 'Min. budget $250k'],
    trust: 'Needs verification',
    verified: false,
    checked: '3 hours ago',
    conflict: 'Directory lists Apr 25; org site says Apr 10',
    location: 'United States',
    genres: ['Nonprofit arts'],
  },
  {
    id: 'transartists',
    title: 'Fully funded residencies 2026 — Vaasa, Finland',
    org: 'Platform RF (via Res Artis)',
    type: 'Residency',
    vertical: 'Visual arts',
    deadline: 'Jun 30, 2026',
    fee: 'Fully funded',
    status: 'open',
    fit: 'possible',
    fitReasons: ['Fully funded', 'Visual artists', 'Up to 3 months'],
    fitWatch: ['Apply via email + PDF', 'Jury not named publicly'],
    trust: 'Medium confidence',
    verified: false,
    checked: '12 hours ago',
    location: 'Vaasa, Finland',
    genres: ['Visual arts'],
  },
];

let currentScreen = 'opportunities';
let selectedOpp = OPPS[0];

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function showScreen(id) {
  currentScreen = id;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.dataset.screen === id));
  $$('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.screen === id));
  const meta = SCREENS[id];
  $('#page-title').textContent = meta.title;
  $('#page-subtitle').textContent = meta.subtitle;
  $('#search-wrap').style.display = id === 'opportunities' || id === 'registry' ? '' : 'none';
}

function fitBadge(level) {
  const labels = {
    strong: 'Strong match',
    possible: 'Possible match',
    weak: 'Weak match',
    'not-eligible': 'Not eligible',
  };
  return `<span class="badge badge-fit-${level === 'not-eligible' ? 'not' : level}">${labels[level]}</span>`;
}

function statusBadge(status) {
  const map = {
    open: ['Open', 'badge-status-open'],
    closing: ['Closing soon', 'badge-status-closing'],
    extended: ['Deadline extended', 'badge-status-extended'],
    verify: ['Needs verification', 'badge-status-verify'],
  };
  const [label, cls] = map[status] || ['Open', 'badge-status-open'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderOppCard(opp) {
  return `
    <article class="card opp-card ${selectedOpp?.id === opp.id ? 'selected' : ''}" data-opp="${opp.id}">
      <div class="opp-card-header">
        <div>
          <h3>${opp.title}</h3>
          <div class="opp-meta"><strong>${opp.org}</strong> · ${opp.type} · ${opp.vertical}</div>
        </div>
        ${fitBadge(opp.fit)}
      </div>
      <div class="chip-row">
        ${opp.genres.map((g) => `<span class="chip">${g}</span>`).join('')}
      </div>
      <div class="opp-footer">
        ${statusBadge(opp.status)}
        <span class="mono" style="font-size:0.8rem;color:var(--ink-2)">Due ${opp.deadline}</span>
        <span style="font-size:0.8rem;color:var(--ink-3)">${opp.fee}</span>
        <span class="trust-line">
          ${opp.verified ? '<span class="verified">✓ Verified</span> ·' : ''}
          Checked ${opp.checked}
        </span>
      </div>
    </article>`;
}

function renderDetail(opp) {
  const fitList = [
    ...(opp.fitReasons || []).map((r) => `<li style="color:var(--green)">✓ ${r}</li>`),
    ...(opp.fitWatch || []).map((w) => `<li style="color:var(--amber)">⚠ ${w}</li>`),
    ...(opp.fitDisq || []).map((d) => `<li style="color:var(--red)">✕ ${d}</li>`),
  ].join('');

  return `
    <div class="card detail-panel">
      <div class="card-pad">
        <div class="chip-row" style="margin-bottom:var(--s4)">
          ${statusBadge(opp.status)}
          ${fitBadge(opp.fit)}
          <span class="chip">${opp.type}</span>
        </div>
        <h2>${opp.title}</h2>
        <div class="detail-org">${opp.org} · ${opp.location}</div>
        <div class="detail-actions">
          <button class="btn btn-primary">Track opportunity</button>
          <button class="btn">Save</button>
          <button class="btn btn-ghost icon-btn" title="Open source">↗</button>
        </div>

        <div class="field-row" style="margin-bottom:var(--s6)">
          <div class="field">
            <label>Deadline</label>
            <div class="value mono">${opp.deadline}</div>
            ${opp.deadlineNote ? `<div style="font-size:0.75rem;color:var(--blue);margin-top:2px">${opp.deadlineNote}</div>` : ''}
            ${opp.conflict ? `<div style="font-size:0.75rem;color:var(--red);margin-top:4px">⚠ ${opp.conflict}</div>` : ''}
          </div>
          <div class="field">
            <label>Application fee</label>
            <div class="value">${opp.fee}</div>
          </div>
        </div>

        <div class="section-title">How to apply</div>
        <div class="field-grid">
          <div class="field">
            <label>Submission URL</label>
            <div class="value mono" style="color:var(--blue)">https://${opp.id === 'kenyon' ? 'kenyonreview.org/submit' : opp.id === 'iscp' ? 'iscp-nyc.org/apply' : 'example.org/apply'}</div>
          </div>
          <div class="field">
            <label>Required materials</label>
            <div class="value">${opp.id === 'kenyon' ? '5 poems or 1 story · cover letter · bio' : opp.id === 'iscp' ? 'CV · project proposal · 20 work samples' : opp.id === 'transartists' ? 'PDF: motivation letter, portfolio (5 projects), CV · max 12 pages' : 'Project proposal · budget · org documents'}</div>
          </div>
          <div class="field">
            <label>Review process</label>
            <div class="value">${opp.id === 'transartists' ? 'Board of Platform selects; no obligation to justify' : opp.id === 'iscp' ? 'Curatorial committee; 2-round review' : opp.id === 'kenyon' ? 'Editorial staff reads blind' : 'Panel review · finalists interviewed'}</div>
          </div>
          <div class="field">
            <label>Jury / reviewers</label>
            <div class="value" style="color:var(--ink-3)">${opp.id === 'iscp' ? 'Named curators on website' : opp.id === 'kenyon' ? 'Not publicly listed' : 'Jury composition not structured in source'}</div>
          </div>
        </div>

        <div class="section-title">Fit for your profile</div>
        <ul style="list-style:none;font-size:0.85rem;display:flex;flex-direction:column;gap:4px;margin-bottom:var(--s6)">${fitList}</ul>

        <div class="section-title">Trust & evidence</div>
        <ul class="evidence-list" style="margin-bottom:var(--s6)">
          <li><span class="icon">✓</span><span>Found on official organization page (tier 0 source)</span></li>
          <li><span class="icon">✓</span><span>Last checked <strong>${opp.checked}</strong> · ${opp.trust}</span></li>
          ${opp.verified ? '<li><span class="icon">✓</span><span>Claimed by organization</span></li>' : '<li><span class="icon" style="color:var(--amber)">⚠</span><span>Discovered via directory — follow outbound link for canonical data</span></li>'}
          ${opp.conflict ? '<li><span class="icon" style="color:var(--red)">⚠</span><span>Conflicting deadline across sources — verification task opened</span></li>' : ''}
        </ul>

        <div class="section-title">Change history</div>
        <ul class="change-timeline">
          ${opp.deadlineNote ? '<li class="highlight"><strong>Deadline extended</strong> Mar 1 → Mar 15<br><span class="when">2 weeks ago · detected by Missa</span></li>' : ''}
          <li>Guidelines page updated<br><span class="when">1 week ago</span></li>
          <li>First discovered<br><span class="when">Jan 5, 2026</span></li>
        </ul>
      </div>
    </div>`;
}

function renderOpportunities() {
  const list = $('#opp-list');
  list.innerHTML = OPPS.map(renderOppCard).join('');
  $('#detail-mount').innerHTML = renderDetail(selectedOpp);
  $$('.opp-card', list).forEach((card) => {
    card.addEventListener('click', () => {
      selectedOpp = OPPS.find((o) => o.id === card.dataset.opp);
      renderOpportunities();
    });
  });
}

function init() {
  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });

  $$('.chip[data-filter]').forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
    });
  });

  renderOpportunities();
  showScreen('opportunities');
}

document.addEventListener('DOMContentLoaded', init);
