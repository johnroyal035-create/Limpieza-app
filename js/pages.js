// Settings, catalogue, customers, lists, reports, backup and the quick hours calculator.
import { S, t, L, svcName, catName, money, num, hrs, dur, area, areaUnit, date, esc, toast, getPath, setPath, saveSettings, saveServices, saveCategories, saveCustomer, deleteCustomer, logChange, uid, download, shareOrDownload, languages, saveMeta, saveJob } from './core.js';
import { quickHours, learnedRates, round2, toDisplayArea, fromDisplayArea } from './engine.js';
import { FIELDS, LEVELS, DEFAULT_SERVICES, DEFAULT_TASK_RATES, defaultSettings } from './defaults.js';
import { db } from './db.js';
import { buildBackup, encryptBackup, decryptBackup, restoreBackup, hashPin, validateBackup } from './backup.js';
import { rerender, go, jobCard, applyChrome } from './app.js';
import { budgetCard } from './presupuestos.js';
import { docCard } from './documentos.js';

const APP_VERSION = '1.2.3';

// ---------- small form helpers ----------
const sInput = (path, { type = 'number', rate = false, step = 'any', label, suffix = '' } = {}) => {
  const v = getPath(S.settings, path);
  return `<label class="field"><span>${label}${suffix ? ` (${suffix})` : ''}</span><input type="${type}" ${type === 'number' ? 'inputmode="decimal" step="' + step + '"' : ''} data-s="${path}" ${rate ? 'data-rate="1"' : ''} value="${esc(v ?? '')}"></label>`;
};
const sSelect = (path, opts, label) => {
  const v = getPath(S.settings, path);
  return `<label class="field"><span>${label}</span><select data-s="${path}">${opts.map(([val, l]) => `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
};
const sCheck = (path, label) => `<label class="check"><input type="checkbox" data-s="${path}" ${getPath(S.settings, path) ? 'checked' : ''}> ${label}</label>`;
const back = (href, label) => `<a class="crumb" href="${href}">‹ ${label}</a>`;

// ---------- Saved jobs & quotations ----------
let jobFilter = { q: '', status: '' };
function renderJobs() {
  const q = jobFilter.q.toLowerCase();
  const list = S.jobs.filter((j) => {
    if (jobFilter.status && j.status !== jobFilter.status) return false;
    if (!q) return true;
    const c = S.customers.find((x) => x.id === j.customerId);
    return [c?.name, j.address, svcName(S.services.find((s) => s.id === j.serviceId)), j.issued?.ref].join(' ').toLowerCase().includes(q);
  }).sort((a, b) => ((a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1));
  return `<h1>${t('sec.saved')}</h1>
  <div class="row"><input data-filter="q" placeholder="${t('search')}" value="${esc(jobFilter.q)}" class="grow">
  <select data-filter="status"><option value="">${t('all')}</option>${['draft', 'quoted', 'accepted', 'rejected', 'completed', 'cancelled'].map((s) => `<option value="${s}" ${jobFilter.status === s ? 'selected' : ''}>${t('status.' + s)}</option>`).join('')}</select></div>
  <a class="btn" href="#/job/new">${t('btn.newCalc')}</a>
  <div id="jobList">${list.map(jobCard).join('') || `<p class="muted">${t('none')}</p>`}</div>`;
}

function renderQuotes() {
  const list = S.jobs.filter((j) => j.issued || j.status === 'quoted').sort((a, b) => ((a.issued?.at || '') < (b.issued?.at || '') ? 1 : -1));
  const drafts = S.jobs.filter((j) => !j.issued && j.status === 'draft' && j.estimate?.ok);
  return `<h1>${t('sec.quotes')}</h1>
  ${list.map((j) => `<div class="card"><div class="row between"><b>${esc(j.issued?.ref || '')} · ${esc(S.customers.find((c) => c.id === j.customerId)?.name || t('noCustomer'))}</b><span class="badge st-${j.status}">${t('status.' + j.status)}</span></div>
    <div class="muted small">${date(j.issued?.at)} · ${money(j.issued?.estimate.total)}</div>
    <div class="row wrap"><a class="btn btn-small" href="#/quote/${j.id}">${t('open')}</a>
    ${j.status === 'quoted' ? `<button class="btn btn-small" data-act="setStatus" data-id="${j.id}" data-s="accepted">${t('q.accept')}</button><button class="btn btn-small btn-outline" data-act="setStatus" data-id="${j.id}" data-s="rejected">${t('q.reject')}</button>` : ''}
    ${j.status === 'accepted' ? `<button class="btn btn-small" data-act="setStatus" data-id="${j.id}" data-s="completed">${t('q.complete')}</button>` : ''}</div></div>`).join('') || `<p class="muted">${t('q.none')}</p>`}
  ${drafts.length ? `<h2>${t('q.readyDrafts')}</h2>${drafts.map((j) => `<a class="card row between" href="#/quote/${j.id}"><span>${esc(S.customers.find((c) => c.id === j.customerId)?.name || t('noCustomer'))} · ${money(j.estimate.total)}</span><span>›</span></a>`).join('')}` : ''}`;
}

// ---------- Customers ----------
let custQ = '';
function renderCustomers() {
  const list = S.customers.filter((c) => !custQ || [c.name, c.phone, c.email, c.address].join(' ').toLowerCase().includes(custQ.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  return `<h1>${t('sec.customers')}</h1>
  <div class="row"><input data-filter="cust" placeholder="${t('search')}" value="${esc(custQ)}" class="grow"><button class="btn" data-act="newCustomer">＋</button></div>
  ${list.map((c) => {
    const jobs = S.jobs.filter((j) => j.customerId === c.id);
    return `<a class="card" href="#/customer/${c.id}"><b>${esc(c.name)}</b><div class="muted small">${esc(c.phone || '')} ${esc(c.address || '')}</div><div class="small">${t('c.jobsCount', { n: jobs.length })}</div></a>`;
  }).join('') || `<p class="muted">${t('none')}</p>`}`;
}

function renderCustomer(id) {
  const c = S.customers.find((x) => x.id === id);
  if (!c) return `<p>${t('notFound')}</p>`;
  const jobs = S.jobs.filter((j) => j.customerId === id).sort((a, b) => ((a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1));
  const f = (k, type = 'text') => `<label class="field"><span>${t('c.' + k)}</span><input type="${type}" data-c="${k}" value="${esc(c[k] || '')}"></label>`;
  const est = jobs.filter((j) => j.status === 'completed');
  return `${back('#/customers', t('sec.customers'))}<h1>${esc(c.name)}</h1>
  <section class="card" data-cid="${c.id}">
    ${f('name')}${f('phone', 'tel')}${f('email', 'email')}${f('address')}
    <label class="field"><span>${t('c.language')}</span><select data-c="language"><option value="">${t('c.languageApp')}</option>${languages().map((l) => `<option value="${l.id}" ${c.language === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>
    <label class="field"><span>${t('c.notes')}</span><textarea data-c="notes" rows="3">${esc(c.notes || '')}</textarea></label>
    <label class="check"><input type="checkbox" data-c="mediaConsent" ${c.mediaConsent ? 'checked' : ''}> ${t('c.mediaConsent')}</label>
    ${c.mediaConsentAt ? `<p class="small muted">${t('c.consentDate', { date: date(c.mediaConsentAt) })}</p>` : ''}
    <div class="row wrap">${c.phone ? `<a class="btn btn-small btn-outline" href="tel:${esc(c.phone)}">${t('c.call')}</a>` : ''}${c.email ? `<a class="btn btn-small btn-outline" href="mailto:${esc(c.email)}">${t('c.mail')}</a>` : ''}</div>
  </section>
  <div class="two"><a class="btn" href="#/job/new?customer=${c.id}">${t('btn.newCalc')}</a><a class="btn btn-outline" href="#/docs?customer=${c.id}">📁 ${t('btn.docs')}</a></div>
  ${(() => { const bs = S.budgets.filter((b) => b.customerId === c.id || (b.customer?.name && b.customer.name === c.name)); return bs.length ? `<h2>${t('sec.budgets')}</h2>${bs.map(budgetCard).join('')}` : ''; })()}
  ${(() => { const ds = (S.docs || []).filter((d) => d.customerId === c.id); return ds.length ? `<h2>${t('sec.docs')}</h2>${ds.map(docCard).join('')}` : ''; })()}
  ${est.length ? `<div class="card small">${t('c.history', { n: est.length, est: hrs(est.reduce((s, j) => s + (j.estimate?.workerHours || 0), 0)), act: hrs(est.reduce((s, j) => s + (Number(j.actual?.hours) || 0), 0)) })}</div>` : ''}
  <h2>${t('c.jobs')}</h2>${jobs.map(jobCard).join('') || `<p class="muted">${t('none')}</p>`}
  <button class="btn btn-danger" data-act="deleteCustomer" data-id="${c.id}">${t('c.delete')}</button>`;
}

// ---------- Services catalogue ----------
function renderServices() {
  return `<h1>${t('sec.services')}</h1><p class="muted small">${t('svc.help')}</p>
  <div class="row wrap"><button class="btn" data-act="newService">＋ ${t('svc.new')}</button><button class="btn btn-outline" data-act="newCategory">＋ ${t('svc.newCategory')}</button></div>
  ${S.categories.map((c) => `<h2>${esc(L(c.name, "cat:" + c.id))}</h2>${S.services.filter((s) => s.category === c.id).map((s) => `<a class="card row between ${s.active ? '' : 'inactive'}" href="#/service/${s.id}"><span><b>${esc(svcName(s))}</b><br><span class="small muted">${t('level.' + s.level)} · ${s.areaRate ? t('svc.rateShort', { rate: num(s.areaRate, 1) }) : t('svc.taskOnly')} · ${svcPriceText(s)}${s.active ? '' : ' · ' + t('svc.inactive')}</span></span><span>›</span></a>`).join('') || `<p class="muted small">${t('none')}</p>`}`).join('')}`;
}

function renderService(id) {
  const s = S.services.find((x) => x.id === id);
  if (!s) return `<p>${t('notFound')}</p>`;
  const langs = languages();
  const taxOpts = [['', t('fromSettings')], ...S.settings.tax.rates.map((r) => [r.id, L(r.name, "tax:" + r.id)])];
  return `${back('#/services', t('sec.services'))}<h1>${esc(svcName(s))}</h1>
  <section class="card" data-sid="${s.id}">
    ${langs.map((l) => `<label class="field"><span>${t('svc.name')} (${l.name})</span><input data-svc="name.${l.id}" value="${esc(s.name[l.id] || '')}"></label>`).join('')}
    <label class="field"><span>${t('svc.category')}</span><select data-svc="category">${S.categories.map((c) => `<option value="${c.id}" ${c.id === s.category ? 'selected' : ''}>${esc(L(c.name, "cat:" + c.id))}</option>`).join('')}</select></label>
    <label class="field"><span>${t('svc.level')}</span><select data-svc="level">${LEVELS.map((l) => `<option value="${l}" ${l === s.level ? 'selected' : ''}>${t('level.' + l)}</option>`).join('')}</select></label>
    <label class="field"><span>${t('svc.areaRate')}</span><input type="number" inputmode="decimal" step="any" min="0" data-svc="areaRate" data-rate="1" value="${esc(s.areaRate ?? '')}" placeholder="${t('svc.taskOnly')}"></label>
    <label class="field"><span>${t('svc.pricing')}</span><select data-svc="pricing"><option value="" ${s.pricing !== 'quote' ? 'selected' : ''}>${t('svc.pricingHourly')}</option><option value="quote" ${s.pricing === 'quote' ? 'selected' : ''}>${t('svc.pricingQuote')}</option><option value="m2" ${s.pricing === 'm2' ? 'selected' : ''}>${t('svc.pricingM2')}</option></select></label>
    ${s.pricing === 'm2' ? `<label class="field"><span>${t('svc.pricePerM2')} (${S.settings.locale.currency}/m²)</span><input type="number" inputmode="decimal" step="any" min="0" data-svc="pricePerM2" value="${esc(s.pricePerM2 ?? '')}"></label>` : ''}
    ${s.pricing === 'quote' ? '' : `<label class="field"><span>${t('svc.minPricePerM2')} (${S.settings.locale.currency}/m²)</span><input type="number" inputmode="decimal" step="any" min="0" data-svc="minPricePerM2" value="${esc(s.minPricePerM2 ?? '')}"></label><p class="small muted">${t('svc.minPricePerM2Help')}</p>`}
    ${s.pricing === 'quote' || s.pricing === 'm2' ? '' : `<label class="field"><span>${t('svc.sellRate')} (${S.settings.locale.currency}/h)</span><input type="number" inputmode="decimal" step="any" min="0" data-svc="sellRate" value="${esc(s.sellRate ?? '')}" placeholder="${t('svc.sellRateFromGroup', { rate: money(groupRate(s)) })}"></label>`}
    <label class="field"><span>${t('job.rateProfile')}</span><select data-svc="rateProfile">${S.settings.pricing.rateProfiles.map((p) => `<option value="${p.id}" ${p.id === s.rateProfile ? 'selected' : ''}>${esc(L(p.name, "rp:" + p.id))} (${money(p.sellRate)}/h)</option>`).join('')}</select></label>
    <label class="field"><span>${S.settings.tax.label}</span><select data-svc-tax="${s.id}">${taxOpts.map(([v, l]) => `<option value="${v}" ${(S.settings.tax.serviceRates[s.id] || '') === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" data-svc="active" ${s.active ? 'checked' : ''}> ${t('svc.active')}</label>
    <label class="check"><input type="checkbox" data-svc="forceEmpty" ${s.forceEmpty ? 'checked' : ''}> ${t('svc.forceEmpty')}</label>
    <label class="check"><input type="checkbox" data-svc="forceOccupied" ${s.forceOccupied ? 'checked' : ''}> ${t('svc.forceOccupied')}</label>
    <label class="check"><input type="checkbox" data-svc="forceConstruction" ${s.forceConstruction ? 'checked' : ''}> ${t('svc.forceConstruction')}</label>
    <label class="check"><input type="checkbox" data-svc="noInspection" ${s.noInspection ? 'checked' : ''}> ${t('svc.noInspection')}</label>
  </section>
  <section class="card"><h3>${t('svc.fields')}</h3><p class="muted small">${t('svc.fieldsHelp')}</p>
    <div class="checks">${FIELDS.map((f) => `<label class="check"><input type="checkbox" data-svc-list="fields" value="${f.id}" ${s.fields.includes(f.id) ? 'checked' : ''}> ${t('f.' + f.id)}</label>`).join('')}</div></section>
  <section class="card"><h3>${t('svc.included')}</h3><p class="muted small">${t('svc.includedHelp')}</p>
    <div class="checks">${S.settings.taskRates.map((tr) => `<label class="check"><input type="checkbox" data-svc-list="included" value="${tr.id}" ${(s.included || []).includes(tr.id) ? 'checked' : ''}> ${t('task.' + tr.id)}</label>`).join('')}</div></section>
  <div class="row wrap"><button class="btn btn-outline" data-act="dupService" data-id="${s.id}">${t('btn.duplicate')}</button>
  ${S.jobs.some((j) => j.serviceId === s.id) ? '' : `<button class="btn btn-danger" data-act="delService" data-id="${s.id}">${t('btn.delete')}</button>`}</div>`;
}

// ---------- Measurements and task rates ----------
function renderTasks() {
  return `<h1>${t('sec.tasks')}</h1><p class="muted small">${t('tasks.help')}</p>
  ${S.settings.taskRates.map((tr, i) => `<section class="card"><h3>${t('task.' + tr.id)}</h3>
    <p class="small muted">${tr.mode === 'each' ? t('tasks.perItem', { field: t('f.' + tr.field) }) : t('tasks.perArea', { field: t('f.' + tr.field) })}</p>
    <div class="two">${LEVELS.map((l) => sInput(`taskRates.${i}.${tr.mode === 'each' ? 'hours' : 'rate'}.${l}`, { rate: true, label: t('level.' + l), suffix: tr.mode === 'each' ? 'h' : 'm²/h' })).join('')}
    ${sInput(`taskRates.${i}.maxParallel`, { label: t('task.maxParallel'), step: 1 })}</div></section>`).join('')}`;
}

// ---------- Productivity & pricing ----------
function renderRates() {
  const P = 'productivity';
  const learned = learnedRates(S.jobs, S.services);
  const rateLog = S.log.filter((l) => l.type === 'rate' || l.type === 'tariff').slice(0, 30);
  return `<h1>${t('sec.rates')}</h1><p class="muted small">${t('rates.help')}</p>
  <section class="card"><h3>${t('rates.pricing')}</h3>
    ${sSelect('pricing.mode', [['hourly', t('mode.hourly')], ['cost', t('mode.cost')]], t('rates.mode'))}
    <div class="two">
    ${sInput('pricing.targetMarginPct', { rate: true, label: t('rates.margin'), suffix: '%' })}
    ${sInput('pricing.minJobCharge', { rate: true, label: t('rates.minCharge'), suffix: S.settings.locale.currency })}
    ${sInput('pricing.minBillableHours', { rate: true, label: t('rates.minHours'), suffix: 'h' })}
    ${sInput('pricing.billableHoursStep', { label: t('rates.hoursStep'), suffix: 'h' })}
    ${sInput('pricing.priceRoundingStep', { label: t('rates.priceRounding'), suffix: S.settings.locale.currency })}
    ${sInput('pricing.lowMarginWarnPct', { label: t('rates.lowMargin'), suffix: '%' })}
    ${sInput('pricing.pricePerM2Warn.min', { label: t('rates.ppmMin'), suffix: S.settings.locale.currency + '/m²' })}
    ${sInput('pricing.pricePerM2Warn.max', { label: t('rates.ppmMax'), suffix: S.settings.locale.currency + '/m²' })}
    </div><p class="small muted">${t('rates.marginNote')}</p>
    <a class="btn btn-outline btn-small" href="#/costs">${t('sec.costs')} ›</a></section>
  <section class="card"><h3>${t('rates.serviceRates')}</h3><p class="small muted">${t('rates.serviceRatesHelp')}</p>
    <table class="tbl"><tbody>${S.services.filter((s) => s.areaRate).map((s) => `<tr><td>${esc(svcName(s))}</td><td class="r"><input class="w-num" type="number" inputmode="decimal" step="any" min="0.1" data-svc-rate="${s.id}" value="${esc(s.areaRate)}"></td></tr>`).join('')}</tbody></table>
    <a class="btn btn-outline btn-small" href="#/tasks">${t('sec.tasks')} ›</a></section>
  <section class="card"><h3>${t('rates.minHours')}</h3><p class="small muted">${t('rates.minHoursHelp')}</p><div class="two">
    ${LEVELS.map((l) => sInput(`${P}.minWorkerHours.${l}`, { rate: true, label: t('level.' + l), suffix: 'h' })).join('')}</div></section>
  <section class="card"><h3>${t('rates.conditions')}</h3><p class="small muted">${t('rates.conditionsHelp')}</p><div class="two">
    ${['light', 'normal', 'heavy', 'extreme'].map((d) => sInput(`${P}.dirt.${d}`, { rate: true, label: t('dirt.' + d), suffix: '×' })).join('')}
    ${sInput(`${P}.furnished`, { rate: true, label: t('cond.furnished'), suffix: '×' })}
    ${sInput(`${P}.occupied`, { rate: true, label: t('cond.occupied'), suffix: '×' })}
    ${sInput(`${P}.constructionDust`, { rate: true, label: t('cond.constructionDust'), suffix: '×' })}
    ${sInput(`${P}.grease`, { rate: true, label: t('cond.grease'), suffix: '×' })}
    ${sInput(`${P}.limescale`, { rate: true, label: t('cond.limescale'), suffix: '×' })}
    ${['normal', 'difficult', 'veryDifficult'].map((d) => sInput(`${P}.access.${d}`, { rate: true, label: t('access.' + d), suffix: '×' })).join('')}
    ${sInput(`${P}.maxCombinedMultiplier`, { rate: true, label: t('rates.maxMult'), suffix: '×' })}
  </div></section>
  <section class="card"><h3>${t('rates.scheduling')}</h3><div class="two">
    ${sInput(`${P}.shiftHours`, { label: t('rates.shiftHours'), suffix: 'h' })}
    ${sInput(`${P}.breakHours`, { label: t('rates.breakHours'), suffix: 'h' })}
    ${sInput(`${P}.breakAfterHours`, { label: t('rates.breakAfter'), suffix: 'h' })}
    ${sInput(`${P}.maxTeam`, { label: t('rates.maxTeam'), step: 1 })}
    ${sInput(`${P}.minAreaPerWorkerM2`, { label: t('rates.minAreaPerWorker'), suffix: 'm²' })}
    ${sInput(`${P}.floorsShare`, { rate: true, label: t('rates.floorsShare'), suffix: '0–0.9' })}
    ${sInput(`${P}.inspectionPct`, { rate: true, label: t('rates.inspectionPct'), suffix: '%' })}
    ${sInput(`${P}.inspectionMinHours`, { rate: true, label: t('rates.inspectionMin'), suffix: 'h' })}
    ${sInput(`${P}.largeJobInspectionM2`, { label: t('rates.largeJob'), suffix: 'm²' })}
  </div></section>
  <section class="card"><h3>${t('rates.learned')}</h3><p class="small muted">${t('rates.learnedHelp')}</p>
    ${learned.length ? `<table class="tbl"><thead><tr><th>${t('job.service')}</th><th>${t('rates.jobs')}</th><th>${t('rates.current')}</th><th>${t('rates.suggested')}</th><th></th></tr></thead><tbody>${learned.map((x) => `<tr><td>${esc(svcName(S.services.find((s) => s.id === x.serviceId)))}</td><td>${x.jobs}</td><td>${num(x.current, 1)}</td><td>${num(x.suggested, 1)}</td><td><button class="btn btn-small" data-act="applyLearned" data-id="${x.serviceId}" data-v="${x.suggested}">${t('rates.apply')}</button></td></tr>`).join('')}</tbody></table>` : `<p class="muted small">${t('rates.noLearned')}</p>`}</section>
  <section class="card"><h3>${t('rates.history')}</h3>${rateLog.length ? `<ul class="small">${rateLog.map((l) => `<li>${date(l.at)} · ${esc(l.label || l.path)}: ${esc(l.from)} → ${esc(l.to)}</li>`).join('')}</ul>` : `<p class="muted small">${t('none')}</p>`}</section>`;
}

// Prices by size live in the central price list (Configuración de tarifas); here only how they are used.
function priceTablesCard(pr) {
  return `<section class="card"><h3>${t('costs.tables')}</h3><p class="small muted">${t('costs.tablesHelp2')}</p>
    ${sSelect('pricing.priceTableMode', [['range', t('costs.tableRange')], ['min', t('costs.tableMin')]], t('costs.tableMode'))}
    <a class="btn btn-outline btn-small" href="#/tarifas">⚙ ${t('b.editRates')}</a></section>`;
}

function renderCosts() {
  const pr = S.settings.pricing;
  const cur = S.settings.locale.currency;
  return `<h1>${t('sec.costs')}</h1><p class="muted small">${t('costs.help')}</p>
  <section class="card"><h3>${t('costs.serviceSell')}</h3><p class="small muted">${t('costs.serviceSellHelp')}</p>
    <table class="tbl"><tbody>${S.services.filter((s) => s.active).map((s) => `<tr><td>${esc(svcName(s))}</td><td class="r">${s.pricing === 'quote' || s.pricing === 'm2' ? `<span class="small muted" style="white-space: normal">${svcPriceText(s)}</span>` : `<input class="w-num" type="number" inputmode="decimal" step="any" min="0" data-svc-sell="${s.id}" value="${esc(s.sellRate ?? '')}" placeholder="${num(groupRate(s), 2)}">`}</td></tr>`).join('')}</tbody></table></section>
  ${priceTablesCard(pr)}
  ${pr.rateProfiles.map((p, i) => `<section class="card"><h3>${esc(L(p.name, "rp:" + p.id))}</h3>
    ${languages().map((l) => sInput(`pricing.rateProfiles.${i}.name.${l.id}`, { type: 'text', label: `${t('svc.name')} (${l.name})` })).join('')}
    <div class="two">${sInput(`pricing.rateProfiles.${i}.sellRate`, { rate: true, label: t('costs.sellRate'), suffix: cur + '/h' })}${sInput(`pricing.rateProfiles.${i}.costRate`, { rate: true, label: t('costs.costRate'), suffix: cur + '/h' })}</div>
    <p class="small muted">${t('costs.usedBy', { list: S.services.filter((s) => s.rateProfile === p.id).map(svcName).join(', ') || t('none') })}</p></section>`).join('')}
  <button class="btn btn-outline btn-small" data-act="addProfile">＋ ${t('costs.addProfile')}</button>
  <section class="card"><h3>${t('costs.shifts')}</h3><p class="small muted">${t('costs.shiftsHelp')}</p>
    ${pr.shiftTypes.map((s, i) => `<h4>${t('shift.' + s.id)}</h4><div class="two">${sInput(`pricing.shiftTypes.${i}.sellPct`, { rate: true, label: t('costs.sellSurcharge'), suffix: '%' })}${sInput(`pricing.shiftTypes.${i}.costPct`, { rate: true, label: t('costs.costSurcharge'), suffix: '%' })}</div>`).join('')}</section>
  <section class="card"><h3>${t('costs.materialsTravel')}</h3><div class="two">
    ${sInput('pricing.materialsMarkupPct', { rate: true, label: t('costs.materialsMarkup'), suffix: '%' })}
    ${sInput('pricing.equipmentMarkupPct', { rate: true, label: t('costs.equipmentMarkup'), suffix: '%' })}
    ${sInput('pricing.subcontractMarkupPct', { rate: true, label: t('costs.subcontractMarkup'), suffix: '%' })}
    ${sInput('pricing.autoMaterialsPctOfLabour', { rate: true, label: t('costs.autoMaterials'), suffix: '%' })}
    ${sInput('pricing.callOutCharge', { rate: true, label: t('costs.callOut'), suffix: cur })}
    ${sInput('pricing.travelChargePerKm', { rate: true, label: t('costs.travelCharge'), suffix: cur + '/km' })}
    ${sInput('pricing.travelCostPerKm', { rate: true, label: t('costs.travelCost'), suffix: cur + '/km' })}
  </div></section>`;
}

// ---------- Country, currency, tax ----------
const COUNTRY_PRESETS = {
  ES: { currency: 'EUR', numberLocale: 'es-ES', units: 'm2', taxLabel: 'IVA', language: 'es' },
  PT: { currency: 'EUR', numberLocale: 'pt-PT', units: 'm2', taxLabel: 'IVA' },
  FR: { currency: 'EUR', numberLocale: 'fr-FR', units: 'm2', taxLabel: 'TVA' },
  DE: { currency: 'EUR', numberLocale: 'de-DE', units: 'm2', taxLabel: 'MwSt' },
  IT: { currency: 'EUR', numberLocale: 'it-IT', units: 'm2', taxLabel: 'IVA' },
  GB: { currency: 'GBP', numberLocale: 'en-GB', units: 'm2', taxLabel: 'VAT', language: 'en' },
  IE: { currency: 'EUR', numberLocale: 'en-IE', units: 'm2', taxLabel: 'VAT', language: 'en' },
  US: { currency: 'USD', numberLocale: 'en-US', units: 'ft2', taxLabel: 'Sales tax', language: 'en' },
  CA: { currency: 'CAD', numberLocale: 'en-CA', units: 'ft2', taxLabel: 'GST/HST', language: 'en' },
  MX: { currency: 'MXN', numberLocale: 'es-MX', units: 'm2', taxLabel: 'IVA', language: 'es' },
  AR: { currency: 'ARS', numberLocale: 'es-AR', units: 'm2', taxLabel: 'IVA', language: 'es' },
  CO: { currency: 'COP', numberLocale: 'es-CO', units: 'm2', taxLabel: 'IVA', language: 'es' },
  NG: { currency: 'NGN', numberLocale: 'en-NG', units: 'm2', taxLabel: 'VAT', language: 'en' },
  AU: { currency: 'AUD', numberLocale: 'en-AU', units: 'm2', taxLabel: 'GST', language: 'en' },
  CH: { currency: 'CHF', numberLocale: 'de-CH', units: 'm2', taxLabel: 'MWST' },
};

function renderLocale() {
  const tx = S.settings.tax;
  return `<h1>${t('sec.locale')}</h1>
  <section class="card">
    <label class="field"><span>${t('loc.country')}</span><select data-act-change="countryPreset">${Object.keys(COUNTRY_PRESETS).map((c) => `<option value="${c}" ${S.settings.locale.country === c ? 'selected' : ''}>${c}</option>`).join('')}<option value="other" ${COUNTRY_PRESETS[S.settings.locale.country] ? '' : 'selected'}>${t('loc.other')}</option></select></label>
    <p class="small muted">${t('loc.presetNote')}</p>
    ${sInput('locale.region', { type: 'text', label: t('loc.region') })}
    ${sInput('locale.currency', { type: 'text', label: t('loc.currency') })}
    ${sSelect('locale.language', languages().map((l) => [l.id, l.name]), t('loc.language'))}
    ${sSelect('locale.units', [['m2', 'm² (metric)'], ['ft2', 'ft² (imperial)']], t('loc.units'))}
    ${sInput('locale.numberLocale', { type: 'text', label: t('loc.numberLocale') })}
  </section>
  <section class="card"><h3>${t('loc.taxes')}</h3><p class="small muted">${t('loc.taxHelp')}</p>
    ${sInput('tax.label', { type: 'text', label: t('loc.taxLabel') })}
    ${tx.rates.map((r, i) => `<div class="row"><input data-s="tax.rates.${i}.name" value="${esc(L(r.name, "tax:" + r.id))}" class="grow"><input type="number" inputmode="decimal" step="any" min="0" data-s="tax.rates.${i}.rate" data-rate="1" value="${esc(r.rate)}" class="w-num"><span>%</span>${tx.rates.length > 1 ? `<button class="btn btn-small btn-danger" data-act="delTax" data-i="${i}">✕</button>` : ''}</div>`).join('')}
    <button class="btn btn-small btn-outline" data-act="addTax">＋ ${t('loc.addTax')}</button>
    ${sSelect('tax.defaultRateId', tx.rates.map((r) => [r.id, L(r.name, "tax:" + r.id)]), t('loc.defaultTax'))}
    <p class="small muted">${t('loc.perServiceTax')}</p>
  </section>`;
}

// ---------- Working hours calculator ----------
let qh = { serviceId: '', areaM2: '', rate: '', workerHours: '', workers: 2 };
function renderHours() {
  const P = S.settings.productivity;
  const svc = S.services.find((s) => s.id === qh.serviceId);
  const rate = Number(qh.rate) || svc?.areaRate || 0;
  const r = quickHours({ areaM2: Number(qh.areaM2) || 0, rate, workerHours: Number(qh.workerHours) || 0, workers: Number(qh.workers) || 1, shiftHours: P.shiftHours, breakHours: P.breakHours });
  const units = S.settings.locale.units;
  return `<h1>${t('sec.hours')}</h1><p class="muted small">${t('hours.help')}</p>
  <section class="card">
    <label class="field"><span>${t('job.service')}</span><select data-qh="serviceId"><option value="">—</option>${S.services.filter((s) => s.areaRate).map((s) => `<option value="${s.id}" ${s.id === qh.serviceId ? 'selected' : ''}>${esc(svcName(s))} (${num(s.areaRate, 1)} m²/h)</option>`).join('')}</select></label>
    <div class="two">
      <label class="field"><span>${t('f.areaM2')} (${areaUnit()})</span><input type="number" inputmode="decimal" data-qh="areaM2" value="${esc(qh.areaM2 === '' ? '' : round2(toDisplayArea(Number(qh.areaM2), units)))}"></label>
      <label class="field"><span>${t('hours.rate')}</span><input type="number" inputmode="decimal" data-qh="rate" value="${esc(qh.rate)}" placeholder="${svc?.areaRate ?? ''}"></label>
      <label class="field"><span>${t('hours.orWorkerHours')}</span><input type="number" inputmode="decimal" data-qh="workerHours" value="${esc(qh.workerHours)}"></label>
      <label class="field"><span>${t('r.workers')}</span><input type="number" inputmode="numeric" min="1" step="1" data-qh="workers" value="${esc(qh.workers)}"></label>
    </div>
  </section>
  <section class="card" id="qhOut">${r.workerHours > 0 ? `
    <div class="tiles"><div class="tile"><span>${t('r.workerHours')}</span><b>${hrs(r.workerHours)}</b></div><div class="tile"><span>${t('r.workers')}</span><b>${r.workers}</b></div>
    <div class="tile"><span>${t('team.elapsed')}</span><b>${dur(r.elapsed)}</b></div><div class="tile"><span>${t('team.days')}</span><b>${r.days}</b></div></div>
    <table class="tbl"><thead><tr><th>${t('r.workers')}</th><th>${t('team.elapsed')}</th><th>${t('team.days')}</th></tr></thead><tbody>${[1, 2, 3, 4, 5, 6, 8, 10].map((w) => { const x = quickHours({ workerHours: r.workerHours, workers: w, shiftHours: P.shiftHours, breakHours: P.breakHours }); return `<tr><td>${w}</td><td>${dur(x.elapsed)}</td><td>${x.days}</td></tr>`; }).join('')}</tbody></table>
    <p class="small muted">${t('hours.note')}</p>` : `<p class="muted">${t('hours.enter')}</p>`}</section>`;
}

// ---------- Business expenses and profit ----------
const monthOf = (j) => (j.date || j.actual?.completedAt || j.updatedAt || j.createdAt || '').slice(0, 7);
function jobMoney(j) {
  const e = j.issued?.estimate || j.estimate || {};
  const a = j.actual || {};
  const actualCost = (Number(a.labourCost) || 0) + (Number(a.expenses) || 0);
  return {
    estRevenue: e.subtotal || 0, estCost: e.directCost || 0, estProfit: e.profit || 0,
    actRevenue: a.revenue !== undefined && a.revenue !== '' ? Number(a.revenue) : e.subtotal || 0,
    actCost: actualCost || (Number(a.hours) > 0 ? Number(a.hours) * ((e.labourCost || 0) / (e.workerHours || 1)) + (e.directCost - e.labourCost || 0) : e.directCost || 0),
  };
}
function renderProfit() {
  const jobs = S.jobs.filter((j) => ['accepted', 'completed'].includes(j.status));
  const months = {};
  for (const j of jobs) {
    const m = monthOf(j); const x = jobMoney(j);
    const r = (months[m] ||= { jobs: 0, estRevenue: 0, estCost: 0, actRevenue: 0, actCost: 0 });
    r.jobs++; r.estRevenue += x.estRevenue; r.estCost += x.estCost;
    if (j.status === 'completed') { r.actRevenue += x.actRevenue; r.actCost += x.actCost; }
  }
  const overheads = S.settings.overheads || [];
  const monthlyOverhead = overheads.reduce((s, o) => s + (Number(o.monthly) || 0), 0);
  const keys = Object.keys(months).sort().reverse();
  return `<h1>${t('sec.profit')}</h1><p class="muted small">${t('profit.help')}</p>
  <section class="card"><h3>${t('profit.overheads')}</h3><p class="small muted">${t('profit.overheadsHelp')}</p>
    ${overheads.map((o, i) => `<div class="row"><input data-s="overheads.${i}.label" value="${esc(o.label)}" class="grow" placeholder="${t('profit.overheadName')}"><input type="number" inputmode="decimal" step="any" data-s="overheads.${i}.monthly" value="${esc(o.monthly)}" class="w-num"><button class="btn btn-small btn-danger" data-act="delOverhead" data-i="${i}">✕</button></div>`).join('')}
    <button class="btn btn-small btn-outline" data-act="addOverhead">＋ ${t('profit.addOverhead')}</button>
    <p>${t('profit.monthlyTotal')}: <b>${money(monthlyOverhead)}</b></p></section>
  <section class="card"><h3>${t('profit.byMonth')}</h3>
  ${keys.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>${t('month')}</th><th>${t('rep.jobs')}</th><th>${t('profit.estRevenue')}</th><th>${t('profit.estProfit')}</th><th>${t('profit.actRevenue')}</th><th>${t('profit.actProfit')}</th><th>${t('profit.net')}</th></tr></thead><tbody>
  ${keys.map((k) => { const r = months[k]; const actP = r.actRevenue - r.actCost; return `<tr><td>${k || '—'}</td><td>${r.jobs}</td><td>${money(r.estRevenue)}</td><td>${money(r.estRevenue - r.estCost)}</td><td>${money(r.actRevenue)}</td><td>${money(actP)}</td><td class="${actP - monthlyOverhead < 0 ? 'neg' : ''}">${money(actP - monthlyOverhead)}</td></tr>`; }).join('')}</tbody></table></div>` : `<p class="muted">${t('profit.none')}</p>`}</section>`;
}

// ---------- Reports ----------
export function reportData() {
  const jobs = S.jobs;
  const issued = jobs.filter((j) => j.issued);
  const completed = jobs.filter((j) => j.status === 'completed');
  const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);
  const bySvc = {};
  for (const j of completed) {
    const r = (bySvc[j.serviceId] ||= { jobs: 0, est: 0, act: 0, area: 0 });
    r.jobs++; r.est += j.estimate?.workerHours || 0; r.act += Number(j.actual?.hours) || 0; r.area += Number(j.m?.areaM2) || 0;
  }
  const sizeBands = [[0, 60], [60, 120], [120, 250], [250, 1000], [1000, 4000], [4000, Infinity]];
  const bands = sizeBands.map(([a, b]) => {
    const js = jobs.filter((j) => j.estimate && Number(j.m?.areaM2) >= a && Number(j.m?.areaM2) < b);
    return { label: b === Infinity ? `≥ ${a} m²` : `${a}–${b} m²`, n: js.length, avg: js.length ? sum(js, (j) => j.estimate.workerHours) / js.length : 0 };
  }).filter((x) => x.n);
  return {
    totalJobs: jobs.filter((j) => j.estimate).length,
    quotes: issued.length,
    accepted: jobs.filter((j) => ['accepted', 'completed'].includes(j.status) && j.issued).length,
    rejected: jobs.filter((j) => j.status === 'rejected').length,
    estHours: sum(completed, (j) => j.estimate?.workerHours), actHours: sum(completed, (j) => j.actual?.hours),
    revenue: sum(completed, (j) => jobMoney(j).actRevenue),
    labour: sum(completed, (j) => j.actual?.labourCost || j.estimate?.labourCost),
    materialsTravel: sum(completed, (j) => (j.actual?.expenses !== undefined && j.actual?.expenses !== '' ? j.actual.expenses : (j.estimate?.materialsCost || 0) + (j.estimate?.travelCost || 0))),
    estProfit: sum(completed, (j) => j.estimate?.profit), actProfit: sum(completed, (j) => jobMoney(j).actRevenue - jobMoney(j).actCost),
    bySvc: Object.entries(bySvc).map(([id, r]) => ({ id, name: svcName(S.services.find((s) => s.id === id)) || id, ...r, diffPct: r.est ? ((r.act - r.est) / r.est) * 100 : 0, m2h: r.act ? r.area / r.act : 0 })).sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct)),
    bands,
    rateLog: S.log.filter((l) => l.type === 'rate' || l.type === 'tariff'),
  };
}

function renderReports() {
  const d = reportData();
  const kv = (k, v) => `<tr><td>${k}</td><td class="r">${v}</td></tr>`;
  return `<h1>${t('sec.reports')}</h1>
  <section class="card"><table class="tbl"><tbody>
    ${kv(t('rep.totalJobs'), d.totalJobs)}${kv(t('rep.quotes'), d.quotes)}${kv(t('rep.accepted'), d.accepted)}${kv(t('rep.rejected'), d.rejected)}
    ${kv(t('rep.estVsAct'), `${hrs(d.estHours)} / ${hrs(d.actHours)}`)}${kv(t('rep.revenue'), money(d.revenue))}${kv(t('rep.labour'), money(d.labour))}
    ${kv(t('rep.materialsTravel'), money(d.materialsTravel))}${kv(t('rep.estProfit'), money(d.estProfit))}${kv(t('rep.actProfit'), money(d.actProfit))}
  </tbody></table><p class="small muted">${t('rep.completedOnly')}</p></section>
  <section class="card"><h3>${t('rep.bySvc')}</h3>${d.bySvc.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>${t('job.service')}</th><th>${t('rep.jobs')}</th><th>${t('rep.est')}</th><th>${t('rep.act')}</th><th>${t('rep.diff')}</th><th>m²/h</th></tr></thead><tbody>${d.bySvc.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.jobs}</td><td>${hrs(r.est)}</td><td>${hrs(r.act)}</td><td class="${Math.abs(r.diffPct) > 15 ? 'neg' : ''}">${num(r.diffPct, 0)}%</td><td>${num(r.m2h, 1)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted small">${t('rep.noCompleted')}</p>`}</section>
  <section class="card"><h3>${t('rep.bySize')}</h3>${d.bands.length ? `<table class="tbl"><tbody>${d.bands.map((b) => kv(`${b.label} (${b.n})`, hrs(b.avg))).join('')}</tbody></table>` : `<p class="muted small">${t('none')}</p>`}</section>
  <section class="card"><h3>${t('rates.history')}</h3>${d.rateLog.length ? `<ul class="small">${d.rateLog.slice(0, 50).map((l) => `<li>${date(l.at)} · ${esc(l.label || l.path)}: ${esc(l.from)} → ${esc(l.to)}</li>`).join('')}</ul>` : `<p class="muted small">${t('none')}</p>`}</section>
  <div class="actions"><button class="btn" data-act="reportPdf">${t('rep.pdf')}</button><button class="btn btn-outline" data-act="reportCsv">${t('rep.csv')}</button></div>`;
}

// ---------- Backup ----------
async function renderBackup() {
  let est = '';
  try { const e = await navigator.storage.estimate(); est = `${num(e.usage / 1048576, 1)} MB`; } catch { /* unsupported */ }
  return `<h1>${t('sec.backup')}</h1>
  <section class="card"><h3>${t('bk.export')}</h3><p class="small muted">${t('bk.exportHelp')}</p>
    <label class="check"><input type="checkbox" id="bkMedia" checked> ${t('bk.includeMedia')}</label>
    <label class="field"><span>${t('bk.password')}</span><input type="password" id="bkPass" autocomplete="new-password"></label>
    <button class="btn" data-act="exportBackup">${t('bk.exportBtn')}</button>
    <p class="small muted">${t('bk.last', { date: S.meta.lastBackupAt ? date(S.meta.lastBackupAt) : t('never') })}</p></section>
  <section class="card"><h3>${t('bk.restore')}</h3><p class="small muted">${t('bk.restoreHelp')}</p>
    <input type="file" id="bkFile" accept=".json,application/json">
    <label class="field"><span>${t('bk.passwordIf')}</span><input type="password" id="bkRPass"></label>
    <label class="field"><span>${t('bk.mode')}</span><select id="bkMode"><option value="merge">${t('bk.merge')}</option><option value="replace">${t('bk.replace')}</option></select></label>
    <button class="btn btn-outline" data-act="restoreBackup">${t('bk.restoreBtn')}</button></section>
  <section class="card small"><p>${t('bk.storage', { used: est || '—', persisted: S.persisted ? t('yes') : t('no') })}</p><p class="muted">${t('bk.storageHelp')}</p></section>`;
}

// ---------- App settings ----------
function renderSettings() {
  const b = 'business';
  return `<h1>${t('sec.settings')}</h1>
  <section class="card"><h3>${t('set.business')}</h3>
    ${sInput(`${b}.name`, { type: 'text', label: t('set.bizName') })}${sInput(`${b}.address`, { type: 'text', label: t('c.address') })}
    ${sInput(`${b}.taxId`, { type: 'text', label: t('set.nie') })}${sInput(`${b}.ssNumber`, { type: 'text', label: t('set.ssNumber') })}${sInput(`${b}.iban`, { type: 'text', label: t('set.iban') })}
    <p class="small muted">${t('set.ownerHelp')}</p>${sInput(`${b}.phone`, { type: 'tel', label: t('c.phone') })}
    ${sInput(`${b}.email`, { type: 'email', label: t('c.email') })}${sInput(`${b}.web`, { type: 'text', label: t('set.web') })}
    ${sInput(`${b}.validityDays`, { label: t('set.validity'), step: 1 })}
    <label class="field"><span>${t('set.paymentTerms')}</span><textarea data-s="${b}.paymentTerms" rows="2">${esc(S.settings.business.paymentTerms)}</textarea></label>
    <label class="field"><span>${t('set.conditions')}</span><textarea data-s="${b}.conditions" rows="3">${esc(S.settings.business.conditions)}</textarea></label>
  </section>
  <section class="card"><h3>${t('loc.language')}</h3>${sSelect('locale.language', languages().map((l) => [l.id, l.name]), t('loc.language'))}<a class="btn btn-outline btn-small" href="#/locale">${t('sec.locale')} ›</a></section>
  <section class="card"><h3>${t('set.security')}</h3><p class="small muted">${t('set.securityHelp')}</p>
    ${S.settings.security.pinHash ? `<button class="btn btn-outline" data-act="removePin">${t('set.removePin')}</button>` : `<button class="btn" data-act="setPin">${t('set.setPin')}</button>`}</section>
  <section class="card"><h3>${t('set.ai')}</h3><p class="small muted">${t('set.aiHelp')}</p>
    ${sInput('ai.endpoint', { type: 'url', label: t('set.aiEndpoint') })}
    ${sInput('ai.appToken', { type: 'password', label: t('set.aiToken') })}
    ${sCheck('ai.retainMediaAfterAnalysis', t('set.retainMedia'))}
    <button class="btn btn-outline btn-small" data-act="testAi">${t('set.testAi')}</button></section>
  <section class="card"><h3>${t('set.privacy')}</h3><p class="small">${t('set.privacyText')}</p></section>
  <section class="card"><h3>${t('set.data')}</h3>
    <button class="btn btn-outline" data-act="resetCatalogue">${t('set.resetCatalogue')}</button>
    <button class="btn btn-danger" data-act="wipeAll">${t('set.wipe')}</button></section>
  <p class="small muted center">LIMPIEZA VITORIA ALAVA · v${APP_VERSION}</p>`;
}

export const routes = {
  jobs: renderJobs, quotes: renderQuotes, customers: renderCustomers, customer: renderCustomer, services: renderServices, service: renderService,
  tasks: renderTasks, rates: renderRates, costs: renderCosts, locale: renderLocale, hours: renderHours, profit: renderProfit, reports: renderReports,
  backup: renderBackup, settings: renderSettings,
};

// ---------- Input handling for these pages ----------
const RATE_LABEL = (path) => path;

async function changeSetting(el) {
  const path = el.dataset.s;
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'number') {
    if (el.value === '') v = '';
    else { v = Number(el.value); if (!Number.isFinite(v) || v < 0) { toast(t('chk.negativeShort')); el.value = getPath(S.settings, path) ?? ''; return; } }
  } else v = el.value;
  const old = getPath(S.settings, path);
  if (String(old) === String(v)) return;
  if (el.dataset.rate && !confirm(t('confirm.rate', { from: old ?? '—', to: v }))) { el.value = old ?? ''; return; }
  setPath(S.settings, path, v);
  await saveSettings();
  if (el.dataset.rate) await logChange({ type: 'rate', path, label: RATE_LABEL(path), from: old, to: v });
  if (path.startsWith('locale.') || path === 'business.name') { applyChrome(); rerender(); }
  if (path.startsWith('locale.')) return;
  if (el.tagName === 'SELECT' || path.startsWith('pricing.rateProfiles') && path.endsWith('name.' + S.settings.locale.language)) rerender();
  toast(t('saved'));
}

const groupRate = (s) => (S.settings.pricing.rateProfiles.find((p) => p.id === s.rateProfile) || S.settings.pricing.rateProfiles[0]).sellRate;
const svcPriceText = (s) => (s.pricing === 'quote' ? t('svc.pricingQuote') : s.pricing === 'm2' ? `${money(s.pricePerM2)} ${t('costs.perM2Short')}` : `${money(Number(s.sellRate) > 0 ? s.sellRate : groupRate(s))}/h`) + (Number(s.minPricePerM2) > 0 ? ` · min ${money(s.minPricePerM2)}/m²` : '') + (s.priceTable ? ` · ${t('svc.priceTable', { table: t('costs.table.' + s.priceTable) })}` : '');

async function changeService(el) {
  const sid = el.closest('[data-sid]')?.dataset.sid || el.dataset.svcRate || el.dataset.svcSell;
  const s = S.services.find((x) => x.id === sid);
  if (!s) return;
  const PRICE_KEYS = { sellRate: 'costs.sellRate', pricePerM2: 'svc.pricePerM2', minPricePerM2: 'svc.minPricePerM2' };
  const pk = el.dataset.svcSell !== undefined ? 'sellRate' : PRICE_KEYS[el.dataset.svc] ? el.dataset.svc : null;
  if (pk) {
    const old = s[pk] ?? null;
    const v = el.value === '' ? null : Number(el.value);
    if (v !== null && !(v > 0)) { toast(t('chk.positiveShort')); el.value = old ?? ''; return; }
    if (old === v) return;
    if (!confirm(t('confirm.rate', { from: old ?? '—', to: v ?? '—' }))) { el.value = old ?? ''; return; }
    s[pk] = v;
    await saveServices();
    await logChange({ type: 'rate', path: `service.${s.id}.${pk}`, label: `${svcName(s)} · ${t(PRICE_KEYS[pk])}`, from: old ?? '—', to: v ?? '—' });
    toast(t('saved'));
    return;
  }
  if (el.dataset.svcRate !== undefined || el.dataset.svc === 'areaRate') {
    const old = s.areaRate;
    const v = el.value === '' ? null : Number(el.value);
    if (v !== null && !(v > 0)) { toast(t('chk.positiveShort')); el.value = old ?? ''; return; }
    if (old === v) return;
    if (!confirm(t('confirm.rate', { from: old ?? '—', to: v ?? '—' }))) { el.value = old ?? ''; return; }
    s.areaRate = v;
    await saveServices();
    await logChange({ type: 'rate', path: `service.${s.id}.areaRate`, label: `${svcName(s)} m²/h`, from: old, to: v });
    toast(t('saved'));
    return;
  }
  if (el.dataset.svcList) {
    const list = new Set(s[el.dataset.svcList] || []);
    if (el.checked) list.add(el.value); else list.delete(el.value);
    s[el.dataset.svcList] = [...list];
  } else {
    const v = el.type === 'checkbox' ? el.checked : el.value;
    setPath(s, el.dataset.svc, v);
  }
  await saveServices();
  toast(t('saved'));
  if (el.dataset.svc === 'category' || el.dataset.svc === 'pricing') rerender();
}

async function changeCustomer(el) {
  const c = S.customers.find((x) => x.id === el.closest('[data-cid]').dataset.cid);
  const k = el.dataset.c;
  c[k] = el.type === 'checkbox' ? el.checked : el.value.trim();
  if (k === 'mediaConsent') c.mediaConsentAt = el.checked ? new Date().toISOString() : null;
  await saveCustomer(c);
  toast(t('saved'));
}

export async function onChange(ev) {
  const el = ev.target;
  if (el.dataset.s !== undefined) return changeSetting(el);
  if (el.dataset.svc !== undefined || el.dataset.svcList !== undefined || el.dataset.svcRate !== undefined || el.dataset.svcSell !== undefined) return changeService(el);
  if (el.dataset.svcTax) { if (el.value) S.settings.tax.serviceRates[el.dataset.svcTax] = el.value; else delete S.settings.tax.serviceRates[el.dataset.svcTax]; await saveSettings(); return toast(t('saved')); }
  if (el.dataset.c !== undefined) return changeCustomer(el);
  if (el.dataset.actChange === 'countryPreset') return applyCountry(el.value);
  if (el.dataset.qh !== undefined) return onQh(el, true);
  if (el.dataset.filter === 'status') { jobFilter.status = el.value; rerender(); }
}

export function onInput(ev) {
  const el = ev.target;
  if (el.dataset.filter === 'q') { jobFilter.q = el.value; document.getElementById('jobList').innerHTML = (renderJobs().split('<div id="jobList">')[1] || '').replace(/<\/div>$/, ''); }
  if (el.dataset.filter === 'cust') { custQ = el.value; const pos = el.selectionStart; rerender().then(() => { const i = document.querySelector('[data-filter="cust"]'); i.focus(); i.setSelectionRange(pos, pos); }); }
  if (el.dataset.qh !== undefined) onQh(el, false);
}

function onQh(el, isChange) {
  const k = el.dataset.qh;
  let v = el.value;
  if (k === 'areaM2' && v !== '') v = fromDisplayArea(Number(v), S.settings.locale.units);
  qh[k] = v;
  if (k === 'serviceId') qh.rate = '';
  if (isChange && el.tagName === 'SELECT') return rerender();
  const html = renderHours();
  const out = html.split('<section class="card" id="qhOut">')[1];
  document.getElementById('qhOut').innerHTML = out.slice(0, out.lastIndexOf('</section>'));
}

async function applyCountry(code) {
  const p = COUNTRY_PRESETS[code];
  S.settings.locale.country = code;
  if (p) {
    Object.assign(S.settings.locale, { currency: p.currency, numberLocale: p.numberLocale, units: p.units });
    if (p.language) S.settings.locale.language = p.language;
    S.settings.tax.label = p.taxLabel;
  }
  await saveSettings();
  applyChrome();
  rerender();
  toast(t('loc.presetApplied'));
}

export function afterRender() {}

// ---------- Actions ----------
export const pageActions = {
  async setStatus(el) {
    const j = S.jobs.find((x) => x.id === el.dataset.id);
    j.status = el.dataset.s;
    if (j.status === 'completed') { j.actual ||= {}; j.actual.completedAt = new Date().toISOString(); }
    await saveJob(j);
    if (j.status === 'completed') { toast(t('q.enterActual')); go('#/job/' + j.id); } else rerender();
  },
  async newCustomer() {
    const name = prompt(t('c.name'));
    if (!name) return;
    const c = { id: uid(), name: name.trim(), phone: '', email: '', address: '', notes: '', createdAt: new Date().toISOString() };
    await saveCustomer(c);
    go('#/customer/' + c.id);
  },
  async deleteCustomer(el) {
    const c = S.customers.find((x) => x.id === el.dataset.id);
    const n = S.jobs.filter((j) => j.customerId === c.id).length;
    if (!confirm(t('confirm.deleteCustomer', { name: c.name, n }))) return;
    await deleteCustomer(c.id);
    go('#/customers');
  },
  async newService() {
    const name = prompt(t('svc.name'));
    if (!name) return;
    const s = { id: 'custom-' + uid().slice(0, 8), category: S.categories[0].id, name: { en: name, es: name }, active: true, level: 'regular', areaRate: 25, rateProfile: 'standard', sellRate: null, fields: ['areaM2', 'kitchens', 'bathrooms', 'toilets', 'windows', 'doors'], included: [] };
    S.services.push(s);
    await saveServices();
    await logChange({ type: 'rate', path: `service.${s.id}.areaRate`, label: `${name} m²/h`, from: '—', to: s.areaRate });
    go('#/service/' + s.id);
  },
  async dupService(el) {
    const s = JSON.parse(JSON.stringify(S.services.find((x) => x.id === el.dataset.id)));
    s.id = 'custom-' + uid().slice(0, 8);
    for (const k of Object.keys(s.name)) s.name[k] += ' (2)';
    S.services.push(s);
    await saveServices();
    go('#/service/' + s.id);
  },
  async delService(el) {
    if (!confirm(t('confirm.delete'))) return;
    S.services = S.services.filter((s) => s.id !== el.dataset.id);
    await saveServices();
    go('#/services');
  },
  async newCategory() {
    const name = prompt(t('svc.category'));
    if (!name) return;
    S.categories.push({ id: 'cat-' + uid().slice(0, 8), name: { en: name, es: name } });
    await saveCategories();
    rerender();
  },
  async addProfile() {
    const name = prompt(t('svc.name'));
    if (!name) return;
    const base = S.settings.pricing.rateProfiles[0];
    S.settings.pricing.rateProfiles.push({ id: 'rp-' + uid().slice(0, 8), name: { en: name, es: name }, sellRate: base.sellRate, costRate: base.costRate });
    await saveSettings();
    rerender();
  },
  async addTax() {
    S.settings.tax.rates.push({ id: 'tax-' + uid().slice(0, 8), name: t('loc.newTax'), rate: 0 });
    await saveSettings();
    rerender();
  },
  async delTax(el) {
    const r = S.settings.tax.rates[Number(el.dataset.i)];
    if (!confirm(t('confirm.delete'))) return;
    S.settings.tax.rates.splice(Number(el.dataset.i), 1);
    if (S.settings.tax.defaultRateId === r.id) S.settings.tax.defaultRateId = S.settings.tax.rates[0].id;
    await saveSettings();
    await logChange({ type: 'rate', path: 'tax', label: L(r.name, "tax:" + r.id), from: r.rate, to: t('btn.delete') });
    rerender();
  },
  async addOverhead() { (S.settings.overheads ||= []).push({ label: '', monthly: 0 }); await saveSettings(); rerender(); },
  async delOverhead(el) { S.settings.overheads.splice(Number(el.dataset.i), 1); await saveSettings(); rerender(); },
  async applyLearned(el) {
    const s = S.services.find((x) => x.id === el.dataset.id);
    const v = Number(el.dataset.v);
    if (!confirm(t('confirm.rate', { from: s.areaRate, to: v }))) return;
    const old = s.areaRate;
    s.areaRate = v;
    await saveServices();
    await logChange({ type: 'rate', path: `service.${s.id}.areaRate`, label: `${svcName(s)} m²/h (${t('rates.learned')})`, from: old, to: v });
    rerender();
  },
  async exportBackup() {
    const includeMedia = document.getElementById('bkMedia').checked;
    const pass = document.getElementById('bkPass').value;
    let data = await buildBackup({ includeMedia });
    if (pass) data = await encryptBackup(data, pass);
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    await shareOrDownload(blob, `limpieza-backup-${stamp}.json`, 'Backup');
    S.meta.lastBackupAt = new Date().toISOString();
    await saveMeta();
    toast(t('bk.done'));
    rerender();
  },
  async restoreBackup() {
    const file = document.getElementById('bkFile').files[0];
    if (!file) return toast(t('bk.chooseFile'));
    try {
      let data = JSON.parse(await file.text());
      if (data.encrypted) {
        const pass = document.getElementById('bkRPass').value;
        if (!pass) return toast(t('bk.needPassword'));
        try { data = await decryptBackup(data, pass); } catch { return toast(t('bk.wrongPassword')); }
      }
      validateBackup(data);
      const mode = document.getElementById('bkMode').value;
      if (!confirm(t(mode === 'replace' ? 'confirm.restoreReplace' : 'confirm.restoreMerge', { jobs: data.jobs.length, customers: data.customers.length }))) return;
      await restoreBackup(data, mode);
      await logChange({ type: 'rate', path: 'backup', label: t('bk.restoredLog'), from: '', to: data.exportedAt });
      location.reload();
    } catch (e) {
      toast(t('bk.invalid') + ' ' + (e.message || ''));
    }
  },
  async setPin() {
    const a = prompt(t('pin.new'));
    if (!a || a.length < 4) return a !== null && toast(t('pin.tooShort'));
    if (prompt(t('pin.repeat')) !== a) return toast(t('pin.mismatch'));
    const { hash, salt } = await hashPin(a);
    S.settings.security = { pinHash: hash, pinSalt: salt };
    await saveSettings();
    toast(t('saved'));
    rerender();
  },
  async removePin() {
    const a = prompt(t('pin.enter'));
    if (a === null) return;
    const { hash } = await hashPin(a, S.settings.security.pinSalt);
    if (hash !== S.settings.security.pinHash) return toast(t('pin.wrong'));
    S.settings.security = { pinHash: '', pinSalt: '' };
    await saveSettings();
    rerender();
  },
  async testAi() {
    const { testConnection } = await import('./media.js');
    toast(await testConnection(), 4000);
  },
  async resetCatalogue() {
    if (!confirm(t('confirm.resetCatalogue'))) return;
    const custom = S.services.filter((s) => s.id.startsWith('custom-'));
    S.services = JSON.parse(JSON.stringify(DEFAULT_SERVICES)).concat(custom);
    S.settings.taskRates = JSON.parse(JSON.stringify(DEFAULT_TASK_RATES));
    await saveServices();
    await saveSettings();
    await logChange({ type: 'rate', path: 'catalogue', label: t('set.resetCatalogue'), from: '', to: 'defaults' });
    toast(t('saved'));
  },
  async wipeAll() {
    if (!confirm(t('confirm.wipe1'))) return;
    if (prompt(t('confirm.wipe2')) !== 'DELETE') return;
    await db.clearAll();
    location.hash = '';
    location.reload();
  },
  async reportCsv() {
    const rows = [['ref', 'status', 'customer', 'service', 'area_m2', 'date', 'worker_hours_est', 'worker_hours_actual', 'workers', 'labour_cost', 'direct_cost', 'subtotal', 'tax', 'total', 'profit_est', 'margin_pct', 'actual_revenue', 'actual_expenses']];
    for (const j of S.jobs) {
      const e = j.issued?.estimate || j.estimate || {};
      rows.push([j.issued?.ref || '', j.status, S.customers.find((c) => c.id === j.customerId)?.name || '', svcName(S.services.find((s) => s.id === j.serviceId)), j.m?.areaM2 || '', (j.date || j.updatedAt || '').slice(0, 10), e.workerHours ?? '', j.actual?.hours ?? '', e.workers ?? '', e.labourCost ?? '', e.directCost ?? '', e.subtotal ?? '', e.taxAmount ?? '', e.total ?? '', e.profit ?? '', e.marginPct ?? '', j.actual?.revenue ?? '', j.actual?.expenses ?? '']);
    }
    const csv = '﻿' + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    await shareOrDownload(new Blob([csv], { type: 'text/csv' }), `limpieza-jobs-${new Date().toISOString().slice(0, 10)}.csv`, 'CSV');
  },
  async reportPdf() {
    const { exportReportPdf } = await import('./quote.js');
    await exportReportPdf(reportData());
  },
};
