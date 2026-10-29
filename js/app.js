// Main app: router, dashboard and the job (cleaning calculation) editor.
import { S, loadAll, saveJob, saveCustomer, saveSettings, saveMeta, logChange, newJob, t, svcName, catName, money, num, hrs, dur, area, areaUnit, date, esc, taskLabel, checkText, assumptionText, toast, getPath, setPath, deleteJob, uid, L, summarise, languages, dirOf } from './core.js';
import { calculate, toDisplayArea, fromDisplayArea, round2 } from './engine.js';
import { FIELDS, TASK_CHECKLISTS, LEVELS } from './defaults.js';
import { requestPersistence } from './db.js';
import * as pages from './pages.js';
import { renderMediaSection, mountMedia, mediaActions } from './media.js';
import { renderQuote, mountQuote, quoteActions } from './quote.js';
import { renderKeys, mountKeys, keyActions } from './keys.js';
import { hashPin } from './backup.js';
import { accessGate } from './access.js';
import * as pres from './presupuestos.js';
import * as docs from './documentos.js';
import * as search from './search.js';

const main = () => document.getElementById('main');
let J = null; // job being edited
let R = null; // its latest calculation
let saveTimer = null;

// ---------------- Router ----------------
const routes = {
  '': renderDashboard,
  job: renderJobPage,
  quote: (id) => { const j = S.jobs.find((x) => x.id === id); return j ? renderQuote(j) : notFound(); },
  inspection: renderInspection,
  keys: (id) => { const j = S.jobs.find((x) => x.id === id); return j ? renderKeys(j) : notFound(); },
  ...pages.routes,
  ...pres.routes,
  ...docs.docRoutes,
  ...search.searchRoutes,
  'mis-datos': renderOwnerLink,
};

// A private link from the owner (#/mis-datos?nie=...&ss=...) fills their details once on this phone.
// The part after # never reaches the web server, so the numbers are not stored online.
function renderOwnerLink() {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const B = S.settings.business;
  const v = { taxId: q.get('nie') ?? B.taxId ?? '', ssNumber: q.get('ss') ?? B.ssNumber ?? '', iban: q.get('iban') ?? B.iban ?? '' };
  const f = (k, label) => `<label class="field"><span>${label}</span><input id="own_${k}" value="${esc(v[k])}" autocomplete="off"></label>`;
  return `<h1>${t('d.ownerAdd')}</h1><section class="card"><p class="small muted">${t('set.ownerHelp')}</p>
    ${f('taxId', t('set.nie'))}${f('ssNumber', t('set.ssNumber'))}${f('iban', t('set.iban'))}
    <button class="btn btn-xl" data-act="saveOwner">${t('b.save')}</button></section>`;
}

export function go(hash) { location.hash = hash; }

async function route() {
  const [name0, arg] = location.hash.replace(/^#\/?/, '').split('/');
  const name = (name0 || '').split('?')[0];
  const fn = routes[name] || notFound;
  if (name !== 'job') J = null;
  await pres.beforeRoute(name);
  await docs.docBeforeRoute(name);
  window.scrollTo(0, 0);
  const html = await fn(arg);
  if (html !== undefined) main().innerHTML = html;
  document.getElementById('back').hidden = !name;
  const navName = { calc: 'calc', pres: 'calc', tarifas: 'calc', doc: 'docs', customer: 'customers' }[name] || name || '';
  document.querySelectorAll('.bottom-nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#/' + navName));
  if (name === 'job' && J) afterJobRender();
  if (name === 'quote') mountQuote(arg);
  if (name === 'keys') mountKeys(arg);
  pages.afterRender?.(name, arg);
  docs.docAfterRender(name);
  search.searchAfterRender(name);
}
export const rerender = route;

function notFound() { return `<div class="card"><p>${t('notFound')}</p><a class="btn" href="#/">${t('nav.home')}</a></div>`; }

// ---------------- Result tiles ----------------
export function tilesHtml(e, opts = {}) {
  if (!e) return '';
  const site = e.days > 1 ? `${e.days} ${t('days')} · ${dur(e.onSiteHours)}` : dur(e.onSiteHours);
  const cls = e.profit < 0 ? 'neg' : '';
  return `<div class="tiles ${opts.compact ? 'compact' : ''}">
    <div class="tile"><span>${t('r.workerHours')}</span><b>${hrs(e.workerHours)}</b></div>
    <div class="tile"><span>${t('r.workers')}</span><b>${e.workers}</b></div>
    <div class="tile"><span>${t('r.onSite')}</span><b>${site}</b></div>
    <div class="tile"><span>${t('r.labourCost')}</span><b>${money(e.labourCost)}</b></div>
    <div class="tile accent"><span>${t('r.total')}</span><b>${money(e.total)}</b></div>
    <div class="tile ${cls}"><span>${t('r.profit')}</span><b>${money(e.profit)}</b></div>
  </div>`;
}

// ---------------- Dashboard ----------------
// Every screen of the app, in the groups shown on the home screen (the search finds them too).
export const SECTION_GROUPS = [
  ['grp.calc', [['calc', 'sec.budgets', '🧾'], ['job/new', 'sec.new', '＋'], ['hours', 'sec.hours', '⏱'], ['inspection', 'sec.ai', '📷'], ['calc/history', 'b.historyAll', '🗂'], ['quotes', 'sec.quotes', '📄'], ['jobs', 'sec.saved', '💾']]],
  ['grp.people', [['customers', 'sec.customers', '👥'], ['docs', 'sec.docs', '📁']]],
  ['grp.business', [['services', 'sec.services', '🧹'], ['tasks', 'sec.tasks', '📐'], ['costs', 'sec.costs', '💶'], ['tarifas', 'grp.rates', '🏷'], ['rates', 'sec.rates', '⚙'], ['profit', 'sec.profit', '📈'], ['reports', 'sec.reports', '📊']]],
  ['grp.settings', [['locale', 'sec.locale', '🌍'], ['backup', 'sec.backup', '🔒'], ['settings', 'sec.settings', '🛠']]],
];
export const SECTIONS = SECTION_GROUPS.flatMap(([, list]) => list);

export function jobCard(j) {
  const c = S.customers.find((x) => x.id === j.customerId);
  const s = S.services.find((x) => x.id === j.serviceId);
  return `<a class="card job-card" href="#/job/${j.id}">
    <div class="row between"><b>${esc(c?.name || t('noCustomer'))}</b><span class="badge st-${j.status}">${t('status.' + j.status)}</span></div>
    <div class="muted small">${esc(svcName(s))}${j.m?.areaM2 ? ' · ' + area(j.m.areaM2) : ''} · ${date(j.updatedAt || j.createdAt)}${j.issued ? ' · ' + esc(j.issued.ref) : ''}</div>
    ${j.estimate ? tilesHtml(j.estimate, { compact: true }) : ''}
  </a>`;
}

function renderDashboard() {
  const recent = [...S.jobs].sort((a, b) => ((a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1)).slice(0, 5);
  const last = recent.find((j) => j.estimate);
  const backupDue = !S.meta.lastBackupAt || Date.now() - new Date(S.meta.lastBackupAt) > 14 * 864e5;
  return `
  ${search.searchBox('')}<div id="gResults"></div>
  <a class="btn btn-xl" href="#/calc">🧾 ${t('b.section')}</a>
  <div class="two"><a class="btn btn-outline" href="#/job/new">＋ ${t('sec.new')}</a><a class="btn btn-outline" href="#/docs">📁 ${t('sec.docs')}</a></div>
  ${S.meta.setupDone ? '' : setupCard()}
  ${backupDue && S.jobs.length ? `<a class="card warn-card" href="#/backup">${t('backupReminder')}</a>` : ''}
  ${last ? `<h2>${t('dash.latest')}</h2>${jobCard(last)}` : `<div class="card"><p>${t('dash.empty')}</p></div>`}
  ${SECTION_GROUPS.map(([g, list]) => `<h2>${t(g)}</h2><div class="grid">${list.map(([h, k, i]) => `<a class="grid-item" href="#/${h}"><span class="ico">${i}</span><span>${t(k)}</span></a>`).join('')}</div>`).join('')}
  ${recent.length > 1 ? `<h2>${t('dash.recent')}</h2>${recent.filter((j) => j !== last).map(jobCard).join('')}<a class="btn btn-outline" href="#/jobs">${t('dash.allJobs')}</a>` : ''}`;
}

// First-run card: the two rates every price depends on, plus quotation details.
function setupCard() {
  const p = S.settings.pricing.rateProfiles[0];
  const B = S.settings.business;
  const cur = S.settings.locale.currency;
  const f = (id, label, val, type = 'number') => `<label class="field"><span>${label}</span><input id="${id}" type="${type}" ${type === 'number' ? 'inputmode="decimal" step="any" min="0"' : ''} value="${esc(val ?? '')}"></label>`;
  return `<section class="card warn-card"><h3>${t('setup.title')}</h3><p class="small">${t('setup.help')}</p>
    ${f('suCost', `${t('costs.costRate')} (${cur}/h)`, p.costRate)}
    ${f('suTaxId', t('set.taxId'), B.taxId, 'text')}${f('suPhone', t('c.phone'), B.phone, 'tel')}${f('suEmail', t('c.email'), B.email, 'email')}
    <button class="btn" data-act="saveSetup">${t('setup.save')}</button> <button class="btn btn-outline" data-act="skipSetup">${t('setup.later')}</button></section>`;
}

function renderInspection() {
  const drafts = [...S.jobs].filter((j) => !['completed', 'cancelled'].includes(j.status)).sort((a, b) => ((a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1)).slice(0, 10);
  const connected = !!S.settings.ai.endpoint;
  return `<h1>${t('sec.ai')}</h1>
  <div class="card ${connected ? '' : 'warn-card'}"><p>${connected ? t('ai.connectedInfo') : t('ai.notConnected')}</p>${connected ? '' : `<a class="btn btn-outline" href="#/settings">${t('sec.settings')}</a>`}</div>
  <div class="card"><p>${t('ai.howItWorks')}</p></div>
  <a class="btn btn-xl" href="#/job/new?media">${t('ai.newWithPhotos')}</a>
  ${drafts.length ? `<h2>${t('ai.addToJob')}</h2>${drafts.map((j) => `<a class="card row between" href="#/job/${j.id}?media"><span>${esc(S.customers.find((c) => c.id === j.customerId)?.name || t('noCustomer'))} · ${esc(svcName(S.services.find((s) => s.id === j.serviceId)))}</span><span>›</span></a>`).join('')}` : ''}`;
}

// ---------------- Job editor ----------------
function renderJobPage(arg) {
  const [id, query] = (arg || '').split('?');
  if (id === 'new' || id?.startsWith('new')) {
    J = newJob();
    const cust = new URLSearchParams(location.hash.split('?')[1] || '').get('customer');
    if (cust) { J.customerId = cust; J.address = S.customers.find((c) => c.id === cust)?.address || ''; }
    J._unsaved = true;
    history.replaceState(null, '', `#/job/${J.id}${location.hash.includes('?media') ? '?media' : ''}`);
  } else if (!J || J.id !== id) {
    const found = S.jobs.find((j) => j.id === id);
    if (!found) return notFound();
    J = JSON.parse(JSON.stringify(found));
  }
  return jobHtml();
}

function fieldInput(f) {
  const raw = J.m[f.id];
  const isArea = f.unit === 'area';
  const shown = raw === undefined || raw === '' ? '' : isArea ? round2(toDisplayArea(Number(raw), S.settings.locale.units)) : raw;
  return `<label class="field"><span>${t('f.' + f.id)}${isArea ? ` (${areaUnit()})` : ''}</span>
    <input type="number" inputmode="decimal" min="0" step="any" data-bind="m.${f.id}" data-area="${isArea ? 1 : ''}" value="${esc(shown)}" placeholder="0"></label>`;
}

function jobHtml() {
  const svc = S.services.find((s) => s.id === J.serviceId);
  const cats = S.categories;
  const fields = FIELDS.filter((f) => svc?.fields.includes(f.id));
  const P = S.settings.pricing;
  const custOpts = [...S.customers].sort((a, b) => a.name.localeCompare(b.name)).map((c) => `<option value="${c.id}" ${c.id === J.customerId ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  const cond = J.cond || {};
  const sel = (path, opts, cur) => `<select data-bind="${path}">${opts.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const chk = (path, cur, label, disabled) => `<label class="check"><input type="checkbox" data-bind="${path}" ${cur ? 'checked' : ''} ${disabled ? 'disabled' : ''}> ${label}</label>`;
  const issued = J.issued;
  return `
  <div id="sticky" class="sticky-results"></div>
  <h1>${t('job.title')} ${J.issued ? `<small>${esc(J.issued.ref)}</small>` : ''}</h1>
  ${issued ? `<div id="issuedBanner"></div>` : ''}

  <section class="card">
    <h3>1. ${t('job.customer')}</h3>
    <label class="field"><span>${t('customer')}</span>
      <div class="row"><select data-bind="customerId"><option value="">${t('noCustomer')}</option>${custOpts}</select>
      <button class="btn btn-small" data-act="quickCustomer">＋</button></div></label>
    <label class="field"><span>${t('c.address')}</span><input data-bind="address" value="${esc(J.address)}"></label>
    <div class="two">
      <label class="field"><span>${t('job.date')}</span><input type="date" data-bind="date" value="${esc(J.date)}"></label>
      <label class="field"><span>${t('job.startTime')}</span><input type="time" data-bind="startTime" value="${esc(J.startTime || '08:00')}"></label>
    </div>
    <div class="two">
      <label class="field"><span>${t('job.status')}</span>${sel('status', ['draft', 'quoted', 'accepted', 'rejected', 'completed', 'cancelled'].map((s) => [s, t('status.' + s)]), J.status)}</label>
      <label class="field"><span>${t('job.shift')}</span>${sel('shift', P.shiftTypes.map((s) => [s.id, t('shift.' + s.id)]), J.shift)}</label>
    </div>
  </section>

  <section class="card">
    <h3>2. ${t('job.service')}</h3>
    <label class="field"><span>${t('job.service')}</span><select data-bind="serviceId" data-rerender="1">
      ${cats.map((c) => `<optgroup label="${esc(L(c.name, "cat:" + c.id))}">${S.services.filter((s) => s.category === c.id && (s.active || s.id === J.serviceId)).map((s) => `<option value="${s.id}" ${s.id === J.serviceId ? 'selected' : ''}>${esc(svcName(s))}</option>`).join('')}</optgroup>`).join('')}
    </select></label>
    ${svc ? `<p class="muted small">${t('level.' + svc.level)} · ${svc.areaRate ? t('svc.rateShort', { rate: num(svc.areaRate, 1) }) : t('svc.taskOnly')}</p>` : ''}
    ${svc?.pricing === 'quote' ? `<label class="field"><span>${t('job.quotedPrice')} (${S.settings.locale.currency})</span><input type="number" inputmode="decimal" min="0" step="any" data-bind="quotedPrice" value="${esc(J.quotedPrice ?? '')}" placeholder="0"></label><p class="muted small">${t('job.quotedPriceHelp')}</p>` : ''}
    <div class="two">
      <label class="field"><span>${t('job.rateProfile')}</span>${sel('rateProfile', [['', t('fromService')], ...P.rateProfiles.map((p) => [p.id, L(p.name, "rp:" + p.id)])], J.rateProfile || '')}</label>
      <label class="field"><span>${S.settings.tax.label}</span>${sel('taxRateId', [['', t('fromSettings')], ...S.settings.tax.rates.map((r) => [r.id, L(r.name, "tax:" + r.id)])], J.taxRateId || '')}</label>
    </div>
  </section>

  <section class="card" id="sec-measure">
    <h3>3. ${t('btn.addMeasurements')}</h3>
    <p class="muted small">${t('job.onlyRelevant')}</p>
    <div class="two">${fields.map(fieldInput).join('')}</div>
    <h4>${t('job.conditions')}</h4>
    <div class="two">
      <label class="field"><span>${t('cond.dirt')}</span>${sel('cond.dirt', ['light', 'normal', 'heavy', 'extreme'].map((d) => [d, t('dirt.' + d)]), cond.dirt || 'normal')}</label>
      <label class="field"><span>${t('cond.access')}</span>${sel('cond.access', ['normal', 'difficult', 'veryDifficult'].map((d) => [d, t('access.' + d)]), cond.access || 'normal')}</label>
    </div>
    <div class="checks">
      ${chk('cond.furnished', svc?.forceEmpty ? false : cond.furnished !== false, t('cond.furnished'), svc?.forceEmpty)}
      ${chk('cond.occupied', svc?.forceOccupied ? true : svc?.forceEmpty ? false : cond.occupied, t('cond.occupied'), svc?.forceOccupied || svc?.forceEmpty)}
      ${chk('cond.constructionDust', cond.constructionDust || svc?.forceConstruction, t('cond.constructionDust'), svc?.forceConstruction)}
      ${chk('cond.grease', cond.grease, t('cond.grease'))}
      ${chk('cond.limescale', cond.limescale, t('cond.limescale'))}
      ${chk('cond.stains', cond.stains, t('cond.stains'))}
    </div>
  </section>

  <section class="card" id="sec-media">${renderMediaSection(J)}</section>

  <section class="card">
    <h3>5. ${t('job.team')}</h3>
    <div class="two">
      <label class="field"><span>${t('r.workers')}</span>${sel('workers', [['auto', t('job.autoWorkers')], ...Array.from({ length: Math.max(S.settings.productivity.maxTeam, 30) }, (_, i) => [i + 1, String(i + 1)])], J.workers)}</label>
    </div>
    <div id="teamOptions"></div>
  </section>

  <section class="card">
    <h3>6. ${t('job.costs')}</h3>
    <div class="two">
      ${['materials', 'equipment', 'subcontract', 'other'].map((k) => `<label class="field"><span>${t('cost.' + k)} (${S.settings.locale.currency})</span><input type="number" inputmode="decimal" min="0" step="any" data-bind="costs.${k}" value="${esc(J.costs[k] ?? '')}" placeholder="0"></label>`).join('')}
      <label class="field"><span>${t('cost.distanceKm')}</span><input type="number" inputmode="decimal" min="0" step="any" data-bind="costs.distanceKm" value="${esc(J.costs.distanceKm ?? '')}" placeholder="0"></label>
      <label class="field"><span>${t('cost.discountPct')}</span><input type="number" inputmode="decimal" min="0" max="99" step="any" data-bind="costs.discountPct" value="${esc(J.costs.discountPct ?? '')}" placeholder="0"></label>
    </div>
    <h4>${t('job.charges')}</h4>
    <div id="charges">${(J.charges || []).map((c, i) => `<div class="row"><input data-bind="charges.${i}.label" value="${esc(c.label)}" placeholder="${t('job.chargeLabel')}"><input type="number" inputmode="decimal" step="any" data-bind="charges.${i}.amount" value="${esc(c.amount)}" placeholder="0" class="w-num"><button class="btn btn-small btn-danger" data-act="delCharge" data-i="${i}">✕</button></div>`).join('')}</div>
    <button class="btn btn-small btn-outline" data-act="addCharge">＋ ${t('job.addCharge')}</button>
    <label class="field"><span>${t('job.equipmentNeeded')}</span><textarea data-bind="equipmentNeeded" rows="2">${esc(J.equipmentNeeded)}</textarea></label>
    <label class="field"><span>${t('job.notes')}</span><textarea data-bind="notes" rows="2">${esc(J.notes)}</textarea></label>
  </section>

  <button class="btn btn-xl" data-act="generate">${t('btn.generate')}</button>

  <section class="card" id="sec-results">
    <h3>${t('job.results')}</h3>
    <div id="results"></div>
    <div id="checks"></div>
  </section>

  <section class="card" id="sec-tasks">
    <h3>${t('btn.reviewTasks')}</h3>
    <div id="tasks"></div>
    <button class="btn btn-small btn-outline" data-act="addTask">＋ ${t('task.add')}</button>
  </section>

  <section class="card"><h3>${t('job.schedule')}</h3><div id="schedule"></div></section>
  <section class="card"><h3>${t('job.price')}</h3><div id="pricing"></div></section>
  <section class="card"><h3>${t('job.method')}</h3><div id="assumptions"></div></section>

  ${['accepted', 'completed'].includes(J.status) ? actualHtml() : ''}

  <div class="actions">
    <button class="btn btn-xl" data-act="saveJob">${t('btn.saveJob')}</button>
    <button class="btn btn-xl btn-outline" data-act="createQuote">${t('btn.createQuote')}</button>
    <button class="btn btn-outline" data-act="openKeys">🔑 ${t('btn.keyForm')}</button>
    <button class="btn btn-outline" data-act="openDocs">📁 ${t('btn.docs')}</button>
    <button class="btn btn-outline" data-act="exportPdf">${t('btn.exportPdf')}</button>
    <button class="btn btn-outline" data-act="duplicateJob">${t('btn.duplicate')}</button>
    <button class="btn btn-danger" data-act="deleteJob">${t('btn.delete')}</button>
  </div>`;
}

function actualHtml() {
  const a = J.actual || {};
  const f = (k, label) => `<label class="field"><span>${label}</span><input type="number" inputmode="decimal" min="0" step="any" data-bind="actual.${k}" value="${esc(a[k] ?? '')}"></label>`;
  return `<section class="card"><h3>${t('job.actual')}</h3><p class="muted small">${t('job.actualHelp')}</p>
    <div class="two">${f('hours', t('actual.hours'))}${f('labourCost', t('actual.labourCost'))}${f('expenses', t('actual.expenses'))}${f('revenue', t('actual.revenue'))}</div>
    <label class="field"><span>${t('job.notes')}</span><textarea data-bind="actual.notes" rows="2">${esc(a.notes || '')}</textarea></label></section>`;
}

function recalc() {
  R = calculate(J, S.settings, S.services);
  return R;
}

function afterJobRender() {
  recalc();
  updateDynamic();
  mountMedia(J, { onChange: onJobChanged, getCalc: () => R });
  if (location.hash.includes('?media')) document.getElementById('sec-media')?.scrollIntoView();
}

function updateDynamic() {
  const r = R;
  const est = r.service ? summarise(r) : null;
  const el = (id) => document.getElementById(id);
  if (!el('results')) return;
  el('sticky').innerHTML = est && r.workerHours > 0 ? tilesHtml(est, { compact: true }) : `<div class="muted small pad">${t('job.enterData')}</div>`;
  el('results').innerHTML = est && r.workerHours > 0 ? tilesHtml(est) + (r.needsInspection ? `<div class="flag">⚠ ${t('job.needsInspection')}</div>` : '') : `<p class="muted">${t('job.enterData')}</p>`;
  el('checks').innerHTML = r.checks.length ? `<ul class="checks-list">${r.checks.map((c) => `<li class="lvl-${c.level}">${esc(checkText(c))}</li>`).join('')}</ul>` : `<p class="ok">✓ ${t('chk.allGood')}</p>`;
  el('tasks').innerHTML = tasksHtml(r);
  el('schedule').innerHTML = r.service ? scheduleHtml(r) : '';
  el('pricing').innerHTML = r.pricing ? pricingHtml(r.pricing) : '';
  el('assumptions').innerHTML = `<ul class="small">${r.assumptions.map((a) => `<li>${esc(assumptionText(a))}</li>`).join('')}</ul><p class="small muted">${t('job.formula')}</p>`;
  el('teamOptions').innerHTML = teamHtml(r);
  if (el('issuedBanner') && J.issued) {
    const cur = est?.total;
    const diff = cur !== undefined && Math.abs(cur - J.issued.estimate.total) > 0.009;
    el('issuedBanner').innerHTML = `<div class="card ${diff ? 'warn-card' : ''}"><p>${t('issued.info', { ref: J.issued.ref, date: date(J.issued.at), total: money(J.issued.estimate.total) })}</p>
      ${diff ? `<p>${t('issued.diff', { total: money(cur) })}</p><button class="btn btn-small" data-act="reissue">${t('issued.reissue')}</button>` : ''}</div>`;
  }
}

function tasksHtml(r) {
  if (!r.tasks?.length) return `<p class="muted">${t('job.enterData')}</p>`;
  const workers = r.workers;
  const wOpts = (cur) => `<option value="">${t('task.anyWorker')}</option>` + Array.from({ length: workers }, (_, i) => `<option value="${i + 1}" ${Number(cur) === i + 1 ? 'selected' : ''}>${t('worker')} ${i + 1}</option>`).join('');
  return `<div class="task-list">${r.tasks.map((tk) => {
    const isCustom = tk.key.startsWith('custom:');
    const cid = isCustom ? tk.key.slice(7) : null;
    const ct = isCustom ? J.customTasks.find((x) => x.id === cid) : null;
    const edit = J.taskEdits[tk.key] || {};
    const how = tk.rate ? `${tk.unit === 'each' ? `${num(tk.qty, 0)} × ${num(tk.rate, 2)} h` : `${area(tk.qty)} ÷ ${num(tk.rate, 1)} m²/h`}${tk.mult !== 1 ? ` × ${num(tk.mult, 2)}` : ''}${tk.key === 'area' || tk.key === 'areaFloors' ? ` × ${tk.key === 'area' ? num(1 - S.settings.productivity.floorsShare, 2) : num(S.settings.productivity.floorsShare, 2)}` : ''}` : tk.autoInspection ? t('task.inspectionHow', { pct: S.settings.productivity.inspectionPct }) : '';
    const list = tk.checklist ? TASK_CHECKLISTS[tk.checklist] : null;
    return `<div class="task ${tk.removed ? 'removed' : ''}">
      <div class="row between">
        ${isCustom ? `<input class="grow" data-bind="customTasks.@${cid}.name" value="${esc(ct?.name)}" placeholder="${t('task.name')}">` : `<b>${esc(taskLabel(tk))}</b>`}
        ${tk.source === 'ai' ? `<span class="badge ai">AI</span>` : ''}
      </div>
      ${how ? `<div class="muted small">${esc(how)} = ${hrs(tk.calcHours ?? tk.hours)}</div>` : ''}
      ${list ? `<div class="muted small">${list.map((c) => t('cl.' + c)).join(' · ')}</div>` : ''}
      <div class="row wrap">
        <label class="mini">${t('task.hours')}<input type="number" inputmode="decimal" min="0" step="0.05" ${isCustom ? `data-bind="customTasks.@${cid}.hours" value="${esc(ct?.hours)}"` : `data-edit="${tk.key}" data-k="hours" value="${esc(edit.hours ?? '')}" placeholder="${num(tk.calcHours ?? tk.hours, 2)}"`}></label>
        <label class="mini">${t('worker')}<select ${isCustom ? `data-bind="customTasks.@${cid}.worker"` : `data-edit="${tk.key}" data-k="worker"`}>${wOpts(isCustom ? ct?.worker : edit.worker)}</select></label>
        ${isCustom ? `<label class="mini">${t('task.phase')}<select data-bind="customTasks.@${cid}.phase">${[1, 2, 3].map((p) => `<option value="${p}" ${Number(ct?.phase || 2) === p ? 'selected' : ''}>${t('phase.' + p)}</option>`).join('')}</select></label>
          <label class="mini">${t('task.maxParallel')}<input type="number" min="1" step="1" data-bind="customTasks.@${cid}.maxParallel" value="${esc(ct?.maxParallel || 1)}"></label>` : ''}
        ${tk.source === 'ai' ? `<label class="check"><input type="checkbox" data-bind="customTasks.@${cid}.approved" ${ct?.approved ? 'checked' : ''}> ${t('task.approve')}</label>` : ''}
        ${isCustom ? `<button class="btn btn-small btn-danger" data-act="delTask" data-id="${cid}">✕</button>` : tk.autoInspection ? '' : `<button class="btn btn-small ${tk.removed ? '' : 'btn-outline'}" data-act="toggleTask" data-key="${tk.key}">${tk.removed ? t('task.restore') : t('task.remove')}</button>`}
        ${tk.edited ? `<button class="btn btn-small btn-outline" data-act="resetTask" data-key="${tk.key}">${t('task.reset')}</button>` : ''}
      </div></div>`;
  }).join('')}</div><p class="total-line">${t('r.workerHours')}: <b>${hrs(r.workerHours)}</b></p>`;
}

function teamHtml(r) {
  if (!r.teamOptions?.length) return '';
  return `<p class="muted small">${t('team.help')}</p><table class="tbl"><thead><tr><th>${t('r.workers')}</th><th>${t('team.elapsed')}</th><th>${t('team.days')}</th><th></th></tr></thead><tbody>
  ${r.teamOptions.filter((o) => o.workers <= Math.max(r.recommendedWorkers + 2, r.workers, 3)).map((o) => `<tr class="${o.workers === r.workers ? 'sel' : ''}" data-act="setWorkers" data-w="${o.workers}"><td>${o.workers}${o.workers === r.recommendedWorkers ? ' ★' : ''}</td><td>${dur(o.makespan)}</td><td>${o.days}</td><td>${o.workers === r.workers ? '✓' : ''}</td></tr>`).join('')}
  </tbody></table><p class="muted small">★ ${t('team.recommended')}</p>`;
}

function clock(startHHMM, offsetProductive, P) {
  const per = Math.max(0.5, P.shiftHours - P.breakHours);
  const day = Math.floor(offsetProductive / per + 1e-9);
  let within = offsetProductive - day * per;
  if (within > P.breakAfterHours + 1e-9) within += P.breakHours;
  const [h, m] = (startHHMM || '08:00').split(':').map(Number);
  const mins = Math.round(h * 60 + m + within * 60);
  return { day: day + 1, time: `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}` };
}

function scheduleHtml(r) {
  const s = r.schedule;
  if (!(s.makespan > 0)) return '';
  const P = S.settings.productivity;
  const start = J.startTime || '08:00';
  const head = `<p>${t('sched.summary', { wh: hrs(r.workerHours), w: r.workers, elapsed: dur(s.makespan), onsite: dur(s.onSiteHours), days: s.days })}</p>
    <p class="muted small">${t('sched.distinction')}</p>`;
  const bars = s.perWorker.map((segs, i) => `<div class="gantt-row"><span class="gantt-label">${t('worker')} ${i + 1}</span><div class="gantt">${segs.map((sg) => `<i class="ph${sg.task.phase}" style="left:${(sg.start / s.makespan) * 100}%;width:${Math.max(((sg.end - sg.start) / s.makespan) * 100, 0.5)}%" title="${esc(taskLabel(sg.task))}"></i>`).join('')}</div></div>`).join('');
  const lists = s.perWorker.map((segs, i) => `<details><summary>${t('worker')} ${i + 1} · ${hrs(s.loads[i])}</summary><ul class="small">${segs.map((sg) => {
    const a = clock(start, sg.start, P); const b = clock(start, sg.end, P);
    return `<li>${s.days > 1 ? `${t('day')} ${a.day} ` : ''}${a.time}–${b.time} · ${esc(taskLabel(sg.task))}${sg.of > 1 ? ` (${sg.part}/${sg.of})` : ''}</li>`;
  }).join('')}</ul></details>`).join('');
  return head + `<div class="gantt-wrap">${bars}</div><div class="legend small">${[1, 2, 3, 4].map((n) => `<span><i class="ph${n}"></i>${t('phase.' + n)}</span>`).join('')}</div>` + lists;
}

export function pricingHtml(p) {
  const lineLabel = (l) => (l.label ? esc(l.label) : esc(t(l.k, { ...l.p, rate: l.p?.rate !== undefined ? money(l.p.rate) : undefined, hours: l.p?.hours !== undefined ? num(l.p.hours, 2) : undefined })));
  return `<table class="tbl">
    <tbody>${p.lines.map((l) => `<tr><td>${lineLabel(l)}</td><td class="r">${money(l.amount)}</td></tr>`).join('')}
    <tr class="strong"><td>${t('p.subtotal')}</td><td class="r">${money(p.subtotal)}</td></tr>
    <tr><td>${esc(S.settings.tax.label)} ${num(p.taxRate, 2)}%</td><td class="r">${money(p.taxAmount)}</td></tr>
    <tr class="total"><td>${t('r.total')}</td><td class="r">${money(p.total)}</td></tr></tbody></table>
  <h4>${t('p.costs')}</h4>
  <table class="tbl"><tbody>
    <tr><td>${t('r.labourCost')} (${money(p.costRate)}/h)</td><td class="r">${money(p.labourCost)}</td></tr>
    <tr><td>${t('p.materialsEquipment')}${p.materialsAuto ? ' *' : ''}</td><td class="r">${money(p.materialsCost + p.equipmentCost)}</td></tr>
    <tr><td>${t('p.travelOther')}</td><td class="r">${money(p.travelCost + p.subcontract + p.otherCost)}</td></tr>
    <tr class="strong"><td>${t('p.directCost')}</td><td class="r">${money(p.directCost)}</td></tr>
    <tr><td>${t('p.priceBeforeTax')}</td><td class="r">${money(p.subtotal)}</td></tr>
    <tr class="${p.profit < 0 ? 'neg' : 'strong'}"><td>${t('r.profit')}</td><td class="r">${money(p.profit)}</td></tr>
    <tr><td>${t('p.margin')}</td><td class="r">${num(p.marginPct, 1)}%</td></tr>
    <tr><td>${t('p.markup')}</td><td class="r">${num(p.markupPct, 1)}%</td></tr>
  </tbody></table>${p.materialsAuto ? `<p class="small muted">* ${t('p.materialsAuto')}</p>` : ''}`;
}

// ---------------- Job input handling ----------------
function resolvePath(path) {
  // customTasks.@<id>.field -> customTasks.<index>.field
  return path.replace(/customTasks\.@([^.]+)/, (_, id) => `customTasks.${J.customTasks.findIndex((x) => x.id === id)}`);
}

function onJobChanged({ full } = {}) {
  if (full) { const y = window.scrollY; main().innerHTML = jobHtml(); afterJobRender(); window.scrollTo(0, y); }
  else { recalc(); updateDynamic(); }
  scheduleSave();
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => { delete J._unsaved; await saveJob(J); }, 600);
}

function onJobInput(el) {
  const path = resolvePath(el.dataset.bind);
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'number') {
    v = el.value === '' ? '' : Number(el.value);
    if (v !== '' && el.dataset.area) v = round2(fromDisplayArea(v, S.settings.locale.units) * 1e4) / 1e4;
  } else v = el.value;
  if (path === 'workers' && v !== 'auto') v = Number(v);
  if (/\.(worker|phase|maxParallel)$/.test(path) && v !== '') v = Number(v);
  setPath(J, path, v);
  onJobChanged({ full: !!el.dataset.rerender || path === 'workers' || path === 'status' });
}

function onTaskEdit(el) {
  const key = el.dataset.edit;
  const e = (J.taskEdits[key] ||= {});
  const v = el.value;
  if (el.dataset.k === 'hours') { if (v === '') delete e.hours; else e.hours = Number(v); }
  if (el.dataset.k === 'worker') { if (v === '') delete e.worker; else e.worker = Number(v); }
  if (!Object.keys(e).length) delete J.taskEdits[key];
  onJobChanged();
}

// ---------------- Actions ----------------
const actions = {
  generate() { recalc(); updateDynamic(); document.getElementById('sec-results').scrollIntoView({ behavior: 'smooth' }); },
  async saveJob() { clearTimeout(saveTimer); delete J._unsaved; await saveJob(J); toast(t('saved')); },
  setWorkers(el) { J.workers = Number(el.dataset.w); onJobChanged({ full: true }); },
  addCharge() { (J.charges ||= []).push({ label: '', amount: '' }); onJobChanged({ full: true }); },
  delCharge(el) { J.charges.splice(Number(el.dataset.i), 1); onJobChanged({ full: true }); },
  addTask() { J.customTasks.push({ id: uid(), name: '', hours: 1, phase: 2, maxParallel: 1, source: 'manual' }); onJobChanged(); },
  delTask(el) { J.customTasks = J.customTasks.filter((x) => x.id !== el.dataset.id); onJobChanged(); },
  toggleTask(el) { const e = (J.taskEdits[el.dataset.key] ||= {}); e.removed = !e.removed; if (!e.removed) delete e.removed; if (!Object.keys(e).length) delete J.taskEdits[el.dataset.key]; onJobChanged(); },
  resetTask(el) { delete J.taskEdits[el.dataset.key]; onJobChanged(); },
  async quickCustomer() {
    const name = prompt(t('c.name'));
    if (!name) return;
    const phone = prompt(t('c.phone')) || '';
    const c = { id: uid(), name: name.trim(), phone, email: '', address: J.address || '', notes: '', createdAt: new Date().toISOString() };
    await saveCustomer(c);
    J.customerId = c.id;
    onJobChanged({ full: true });
  },
  async openDocs() { clearTimeout(saveTimer); delete J._unsaved; await saveJob(J); go('#/docs?job=' + J.id); },
  async openKeys() { clearTimeout(saveTimer); delete J._unsaved; await saveJob(J); go('#/keys/' + J.id); },
  async createQuote() { clearTimeout(saveTimer); delete J._unsaved; await saveJob(J); go('#/quote/' + J.id); },
  async exportPdf() {
    clearTimeout(saveTimer); delete J._unsaved; await saveJob(J);
    const { exportQuotePdf } = await import('./quote.js');
    await exportQuotePdf(S.jobs.find((x) => x.id === J.id));
  },
  async duplicateJob() {
    clearTimeout(saveTimer); if (!J._unsaved) await saveJob(J);
    const copy = JSON.parse(JSON.stringify(J));
    Object.assign(copy, { id: uid(), createdAt: new Date().toISOString(), status: 'draft', issued: null, actual: {}, date: '' });
    delete copy._unsaved;
    for (const ct of copy.customTasks) ct.id = uid();
    copy.taskEdits = Object.fromEntries(Object.entries(copy.taskEdits).filter(([k]) => !k.startsWith('custom:')));
    await saveJob(copy);
    toast(t('duplicated'));
    J = null;
    go('#/job/' + copy.id);
  },
  async deleteJob() {
    if (!confirm(t('confirm.deleteJob'))) return;
    clearTimeout(saveTimer);
    await deleteJob(J.id);
    J = null;
    go('#/jobs');
  },
  async reissue() { go('#/quote/' + J.id); },
  async saveSetup() {
    const cost = Number(document.getElementById('suCost').value);
    if (!(cost > 0)) return toast(t('chk.positiveShort'));
    for (const p of S.settings.pricing.rateProfiles) {
      for (const [k, v] of [['costRate', cost]]) {
        if (p[k] !== v) await logChange({ type: 'rate', path: `pricing.rateProfiles.${p.id}.${k}`, label: `${L(p.name, "rp:" + p.id)} · ${t(k === 'sellRate' ? 'costs.sellRate' : 'costs.costRate')}`, from: p[k], to: v });
        p[k] = v;
      }
    }
    Object.assign(S.settings.business, { taxId: document.getElementById('suTaxId').value.trim(), phone: document.getElementById('suPhone').value.trim(), email: document.getElementById('suEmail').value.trim() });
    await saveSettings();
    S.meta.setupDone = true; await saveMeta();
    toast(t('saved'));
    route();
  },
  async saveOwner() {
    for (const k of ['taxId', 'ssNumber', 'iban']) S.settings.business[k] = document.getElementById('own_' + k).value.trim();
    await saveSettings();
    history.replaceState(null, '', '#/');
    toast(t('saved'));
    route();
  },
  async skipSetup() { S.meta.setupDone = true; await saveMeta(); route(); },
  back() { history.length > 1 ? history.back() : go('#/'); },
};


function wire() {
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const fn = actions[el.dataset.act];
    if (fn) { ev.preventDefault(); fn(el, ev); }
  });
  const isJobField = (el) => J && document.getElementById('sec-results') && (el.dataset.bind || el.dataset.edit);
  const handleJob = (el) => (el.dataset.edit ? onTaskEdit(el) : onJobInput(el));
  const discrete = (el) => el.tagName === 'SELECT' || ['checkbox', 'radio', 'date', 'time', 'file'].includes(el.type);
  // Text and number fields recalculate while typing, except inside the task list, which is redrawn
  // on recalculation and would lose focus; those recalculate when the field is left.
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (isJobField(el)) { if (discrete(el) || el.closest('#tasks') || el.closest('#charges')) handleJob(el); return; }
    if (search.handleSearchEvent(ev) || docs.handleDocEvent(ev, true)) return;
    if (pres.handleEvent(ev, true)) return;
    pages.onChange?.(ev);
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (isJobField(el)) { if (!discrete(el) && !el.closest('#tasks')) handleJob(el); return; }
    if (search.handleSearchEvent(ev) || docs.handleDocEvent(ev, false)) return;
    if (pres.handleEvent(ev, false)) return;
    pages.onInput?.(ev);
  });
  window.addEventListener('hashchange', route);
}

function applyChrome() {
  document.documentElement.lang = S.settings.locale.language;
  document.documentElement.dir = dirOf(S.settings.locale.language);
  const ls = document.getElementById('langSel');
  ls.innerHTML = languages().map((l) => `<option value="${l.id}" label="${l.id.toUpperCase()}" ${l.id === S.settings.locale.language ? "selected" : ""}>${esc(l.name)}</option>`).join('');
  document.querySelector('#brand .brand-text').textContent = S.settings.business.name;
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
}
export { applyChrome };

// ---------------- PIN lock ----------------
let lockedAt = 0;
async function lockIfNeeded() {
  const sec = S.settings.security;
  if (!sec.pinHash) return;
  const box = document.getElementById('lock');
  box.hidden = false;
  box.innerHTML = `<div class="lock-box"><h2>${esc(S.settings.business.name)}</h2><p>${t('pin.enter')}</p><input id="pinIn" type="password" inputmode="numeric" autocomplete="off"><button class="btn" id="pinBtn">${t('pin.unlock')}</button><p id="pinErr" class="neg small"></p></div>`;
  const tryUnlock = async () => {
    const v = document.getElementById('pinIn').value;
    const { hash } = await hashPin(v, sec.pinSalt);
    if (hash === sec.pinHash) { box.hidden = true; box.innerHTML = ''; }
    else document.getElementById('pinErr').textContent = t('pin.wrong');
  };
  document.getElementById('pinBtn').onclick = tryUnlock;
  document.getElementById('pinIn').onkeydown = (e) => { if (e.key === 'Enter') tryUnlock(); };
  document.getElementById('pinIn').focus();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) lockedAt = Date.now();
  else if (lockedAt && Date.now() - lockedAt > 5 * 60 * 1000) lockIfNeeded();
});

// ---------------- Boot ----------------
async function boot() {
  try {
    await accessGate();
    await loadAll();
    await docs.loadDocs();
  } catch (e) {
    main().innerHTML = `<div class="card warn-card"><p>${esc(String(e))}</p></div>`;
    return;
  }
  Object.assign(actions, pages.pageActions, quoteActions, mediaActions, keyActions, pres.actions, docs.docActions);
  applyChrome();
  wire();
  await lockIfNeeded();
  route();
  requestPersistence().then((ok) => { S.persisted = ok; });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
