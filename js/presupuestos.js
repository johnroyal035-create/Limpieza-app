// Calculadora de Limpieza y Presupuestos: modules, quotation form, history, rate settings and PDF.
// All prices come from the central price list (S.tariffs) and every total from calcBudget() in tariffs.js.
import { S, t, L, esc, money, num, date, toast, uid, saveBudget, deleteBudget, saveTariffs, saveCustomer, saveSettings, logChange, nextQuoteRef, withLang, languages, dirOf, shareOrDownload, lang, getPath, setPath, ownerLine } from './core.js';
import { calcBudget, newBudget, makeLine, refreshPrices, snapshotSettings, AREA_KINDS, KINDS, rangeAt } from './tariffs.js';
import { TARIFF_MODULES, defaultTariffs } from './tariffs-data.js';
import { jsPDF, pdfLogo, pdfText, pdfLanguage, rtlPdf } from './quote.js';
import { hashPin } from './backup.js';
import { go, rerender } from './app.js';

const m = (c) => money((c || 0) / 100);
const eur = (x) => money(Number(x) || 0);
const range = (lo, hi) => (lo === hi ? m(lo) : `${m(lo)} – ${m(hi)}`);
export const modName = (id) => { const md = TARIFF_MODULES.find((x) => x.id === id); return md ? L(md.name, 'tmod:' + id) : id; };
export const itemName = (it) => L(it.name, 'tar:' + it.id);
const lineName = (l) => L(l.name, 'tar:' + l.itemId);
const items = (mod) => S.tariffs.items.filter((it) => it.active !== false && (it.module === mod || (it.alsoIn || []).includes(mod)));
const PRICE_MODULES = TARIFF_MODULES.filter((x) => !x.tool);
export const STATUSES = ['draft', 'issued', 'inspection', 'sent', 'accepted', 'rejected', 'completed', 'cancelled'];
const CONDITIONS = ['light', 'medium', 'heavy', 'extreme'];
const PROPERTY_TYPES = ['flat', 'house', 'office', 'shop', 'community', 'garage', 'warehouse', 'hotel', 'health', 'other'];
const METHODS = ['area', 'hours', 'package', 'combined'];
const FREQS = ['once', 'weekly', 'biweekly', 'monthly'];
const unitOf = (kind) => t('b.unit.' + kind);

function priceText(it) {
  if (it.kind === 'inspect') return t('b.onInspection');
  if (it.kind === 'pct') return `${num(it.min)}–${num(it.max)} %`;
  if (AREA_KINDS.includes(it.kind)) return t('b.byArea');
  return `${eur(it.min)} – ${eur(it.max)}${it.open ? ' ' + t('b.orMore') : ''} ${unitOf(it.kind)}`;
}

// ---------- Section home ----------
function renderHome() {
  const recent = [...S.budgets].sort((a, b) => ((a.updatedAt || a.createdAt) < (b.updatedAt || b.createdAt) ? 1 : -1)).slice(0, 4);
  const quick = ['deep', 'construction', 'home', 'rental', 'kitbath', 'windows'];
  return `<h1>${t('b.section')}</h1>
  <p class="small muted">${t('b.sectionHelp', { region: esc(S.tariffs.region) })}</p>
  <button class="btn btn-xl" data-act="bNew" data-m="">＋ ${t('b.new')}</button>
  <div class="two"><a class="btn btn-outline" href="#/calc/m2">📐 ${t('b.m2calc')}</a><a class="btn btn-outline" href="#/calc/hours">⏱ ${t('b.hourcalc')}</a></div>
  <h2>${t('b.quick')}</h2>
  <div class="chips">${quick.map((id) => `<button class="chip" data-act="bNew" data-m="${id}">${TARIFF_MODULES.find((x) => x.id === id).icon} ${esc(modName(id))}</button>`).join('')}</div>
  <section class="card"><label class="field"><span>${t('b.searchService')}</span><input data-bsearch placeholder="${t('b.searchPlaceholder')}" autocomplete="off"></label><div id="bSearchOut"></div></section>
  <h2>${t('b.modules')}</h2>
  <div class="grid">${TARIFF_MODULES.map((md) => `<a class="grid-item" href="#/calc/${md.id}"><span class="ico">${md.icon}</span><span>${esc(modName(md.id))}</span></a>`).join('')}</div>
  <h2>${t('b.recent')}</h2>
  ${recent.length ? recent.map(budgetCard).join('') + `<a class="btn btn-outline" href="#/calc/history">${t('b.historyAll')}</a>` : `<p class="muted small">${t('b.noBudgets')}</p>`}`;
}

function searchResults(q) {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return '';
  const hits = S.tariffs.items.filter((it) => it.active !== false && (itemName(it).toLowerCase().includes(s) || modName(it.module).toLowerCase().includes(s))).slice(0, 12);
  return hits.length ? hits.map((it) => `<button class="card row between w100" data-act="bNew" data-m="${it.module}" data-item="${it.id}"><span><b>${esc(itemName(it))}</b><br><span class="small muted">${esc(modName(it.module))} · ${priceText(it)}</span></span><span>＋</span></button>`).join('') : `<p class="muted small">${t('none')}</p>`;
}

export function budgetCard(b) {
  const r = resultOf(b);
  const cust = b.customer?.name || t('noCustomer');
  return `<a class="card job-card" href="#/pres/${b.id}"><div class="row between"><b>${esc(cust)}</b><span class="badge st-${b.status}">${t('b.st.' + b.status)}</span></div>
  <div class="small muted">${esc(b.number || t('b.noNumber'))} · ${esc(b.module ? modName(b.module) : t('b.method.' + b.method))} · ${date(b.issued?.at || b.createdAt)}</div>
  <div class="row between"><span class="small">${esc(b.customer?.phone || '')}</span><b>${r.showRange && r.low.total !== r.high.total ? range(r.low.total, r.high.total) : m(r.total)}</b></div></a>`;
}

// Issued quotations show their frozen copy; others are calculated with their own copy of the rates.
export const shown = (b) => (b.issued && b.status !== 'draft' ? b.issued.budget : b);
export const resultOf = (b) => (b.issued && b.status !== 'draft' ? b.issued.result : calcBudget(b));

// ---------- Module pages ----------
function renderModule(id) {
  const md = TARIFF_MODULES.find((x) => x.id === id);
  if (!md) return renderHome();
  if (md.tool === 'm2') return renderM2Calc();
  if (md.tool === 'hours') return renderHourCalc();
  if (md.tool === 'history') return renderHistory();
  if (md.tool === 'config') return renderConfig();
  if (md.tool === 'custom') return `${crumb()}<h1>${md.icon} ${esc(modName(id))}</h1><p class="small muted">${t('b.customHelp')}</p><button class="btn btn-xl" data-act="bNew" data-m="custom">＋ ${t('b.new')}</button>`;
  const list = items(id);
  return `${crumb()}<h1>${md.icon} ${esc(modName(id))}</h1>
  <button class="btn btn-xl" data-act="bNew" data-m="${id}">＋ ${t('b.newIn', { module: esc(modName(id)) })}</button>
  <p class="small muted">${t('b.ratesNote')}</p>
  ${list.map(rateCard).join('')}
  <a class="btn btn-outline btn-small" href="#/tarifas/${id}">⚙ ${t('b.editRates')}</a>`;
}
const crumb = () => `<a class="crumb" href="#/calc">‹ ${t('b.section')}</a>`;

function rateCard(it) {
  const desc = it.desc ? `<p class="small muted">${esc(L(it.desc, 'tdesc:' + it.id))}</p>` : '';
  const flags = [it.inspection || it.kind === 'inspect' ? `<span class="badge warn">${t('b.needsInspection')}</span>` : '', it.estimate ? `<span class="badge">${t('b.ourEstimate')}</span>` : '', it.package ? `<span class="badge">${t('b.package')}</span>` : ''].join(' ');
  let body = '';
  if (it.kind === 'table') body = `<table class="tbl"><thead><tr><th>m²</th><th class="r">${t('b.min')}</th><th class="r">${t('b.max')}</th></tr></thead><tbody>${it.rows.map((r) => `<tr><td>${num(r.m2)}</td><td class="r">${eur(r.min)}</td><td class="r">${eur(r.max)}${it.open ? ' ' + t('b.orMore') : ''}</td></tr>`).join('')}</tbody></table>`;
  else if (it.kind === 'cols' || it.kind === 'contract') {
    const cols = it.kind === 'cols' ? it.columns : it.visits;
    const head = (c) => (it.kind === 'cols' ? t('b.col.' + c) : t('b.visitsWeek', { n: c }));
    body = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>m²</th>${cols.map((c) => `<th class="r">${head(c)}</th>`).join('')}</tr></thead><tbody>${it.rows.map((r) => `<tr><td>${num(r.m2)}</td>${cols.map((c) => `<td class="r">${eur(r.cols[c][0])}–${eur(r.cols[c][1])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  } else body = `<p><b>${priceText(it)}</b></p>`;
  const inc = it.includes ? `<p class="small">${t('b.includes')}: ${Object.entries(it.includes).map(([id, q]) => `${q} × ${esc(itemName(S.tariffs.items.find((x) => x.id === id) || { id, name: id }))}`).join(', ')}</p>` : '';
  const vars = it.variants ? `<p class="small">${it.variants.map((v) => esc(L(v.name, 'tvar:' + v.id))).join(' · ')}</p>` : '';
  return `<section class="card"><div class="row between"><h3>${esc(itemName(it))}</h3><button class="btn btn-small" data-act="bNew" data-m="${it.module}" data-item="${it.id}">＋</button></div>${flags}${desc}${vars}${body}${inc}</section>`;
}

// Quick calculators: a temporary quotation run through the same engine; "Crear presupuesto" keeps it.
let Q = null;
function quickBudget(kind) {
  if (!Q || Q.kind !== kind) {
    const b = newBudget(S.tariffs, { taxRateId: S.settings.tax.defaultRateId, taxRate: taxRateById(S.settings.tax.defaultRateId) });
    if (kind === 'm2') { b.method = 'area'; b.property.area = 100; const it = S.tariffs.items.find((x) => x.id === 'deep-home'); if (it) b.lines = [makeLine(it, '')]; }
    else { b.method = 'hours'; b.labour = { workers: 2, hoursPerWorker: 5, rateId: '', rate: S.tariffs.defaultHourlyRate }; }
    Q = { kind, b };
  }
  return Q.b;
}
function renderM2Calc() {
  const b = quickBudget('m2');
  const areaItems = S.tariffs.items.filter((it) => it.active !== false && (AREA_KINDS.includes(it.kind) || it.kind === 'm2'));
  const l = b.lines[0];
  return `${crumb()}<h1>📐 ${t('b.m2calc')}</h1><section class="card" data-quick="m2">
    <label class="field"><span>${t('b.service')}</span><select data-q="item">${PRICE_MODULES.map((md) => { const its = areaItems.filter((it) => it.module === md.id); return its.length ? `<optgroup label="${esc(modName(md.id))}">${its.map((it) => `<option value="${it.id}" ${l?.itemId === it.id ? 'selected' : ''}>${esc(itemName(it))}</option>`).join('')}</optgroup>` : ''; }).join('')}</select></label>
    <div class="two"><label class="field"><span>${t('b.area')} (m²)</span><input type="number" inputmode="decimal" min="0" step="any" data-q="area" value="${esc(b.property.area)}"></label>
    ${condSelect(b.property.condition, 'data-q="condition"')}</div>
    ${l?.p.kind === 'contract' ? `<label class="field"><span>${t('b.visitsPerWeek')}</span><input type="number" min="1" max="7" step="1" data-q="visits" value="${esc(b.property.visitsPerWeek || 1)}"></label>` : ''}
  </section><div id="quickOut">${breakdownHtml(b, calcBudget(b))}</div>
  <button class="btn btn-xl" data-act="bFromQuick">${t('b.createFrom')}</button>`;
}
function renderHourCalc() {
  const b = quickBudget('hours');
  const Lb = b.labour;
  const X = b.extras;
  return `${crumb()}<h1>⏱ ${t('b.hourcalc')}</h1><section class="card" data-quick="hours">
    <div class="two"><label class="field"><span>${t('b.workers')}</span><input type="number" min="0" step="1" inputmode="numeric" data-q="workers" value="${esc(Lb.workers)}"></label>
    <label class="field"><span>${t('b.hoursPerWorker')}</span><input type="number" min="0" step="any" inputmode="decimal" data-q="hours" value="${esc(Lb.hoursPerWorker)}"></label></div>
    ${rateTypeSelect(Lb.rateId, 'data-q="rateId"')}
    <label class="field"><span>${t('b.ratePerHour')} (€)</span><input type="number" min="0" step="any" inputmode="decimal" data-q="rate" value="${esc(Lb.rate)}"></label>
    <p class="small muted">${t('b.rateNotWage')}</p>
    <div class="two">${['materials', 'travel', 'other'].map((k) => `<label class="field"><span>${t('b.x.' + k)} (€)</span><input type="number" min="0" step="any" inputmode="decimal" data-q="x.${k}" value="${esc(X[k])}"></label>`).join('')}
    <label class="field"><span>${t('b.discountPct')}</span><input type="number" min="0" max="100" step="any" data-q="discount" value="${esc(b.discount.value)}"></label></div>
    ${taxSelect(b.taxRateId, 'data-q="tax"')}
  </section><div id="quickOut">${breakdownHtml(b, calcBudget(b))}</div>
  <button class="btn btn-xl" data-act="bFromQuick">${t('b.createFrom')}</button>`;
}
function onQuick(el) {
  const b = Q?.b; if (!b) return;
  const k = el.dataset.q, v = el.value;
  const nv = v === '' ? '' : Number(v);
  if (k === 'item') { const it = S.tariffs.items.find((x) => x.id === v); b.lines = it ? [makeLine(it, '')] : []; return rerender(); }
  if (k === 'area') b.property.area = nv;
  if (k === 'condition') b.property.condition = v;
  if (k === 'visits') { b.property.frequency = 'weekly'; b.property.visitsPerWeek = nv; }
  if (k === 'workers') b.labour.workers = nv;
  if (k === 'hours') b.labour.hoursPerWorker = nv;
  if (k === 'rate') b.labour.rate = nv;
  if (k === 'rateId') { b.labour.rateId = v; b.labour.rate = suggestedRate(v); return rerender(); }
  if (k.startsWith('x.')) b.extras[k.slice(2)] = nv;
  if (k === 'discount') b.discount = { type: 'pct', value: nv };
  if (k === 'tax') { b.taxRateId = v; b.taxRate = taxRateById(v); }
  if (b.lines[0]?.p.kind === 'contract' && k !== 'visits' && !b.property.visitsPerWeek) { b.property.frequency = 'weekly'; b.property.visitsPerWeek = 1; }
  document.getElementById('quickOut').innerHTML = breakdownHtml(b, calcBudget(b));
}

const taxRateById = (id) => Number(S.settings.tax.rates.find((r) => r.id === id)?.rate ?? 21);
const suggestedRate = (rateId) => {
  const r = S.tariffs.hourlyRates.find((x) => x.id === rateId);
  const d = Number(S.tariffs.defaultHourlyRate) || 15;
  return r ? Math.min(Math.max(d, Number(r.min)), Number(r.max)) : d;
};
function condSelect(v, attr) {
  return `<label class="field"><span>${t('b.condition')}</span><select ${attr}>${CONDITIONS.map((c) => `<option value="${c}" ${v === c ? 'selected' : ''}>${t('b.cond.' + c)}</option>`).join('')}</select></label>`;
}
function rateTypeSelect(v, attr) {
  return `<label class="field"><span>${t('b.rateType')}</span><select ${attr}><option value="">${t('b.rateDefault', { rate: eur(S.tariffs.defaultHourlyRate) })}</option>${S.tariffs.hourlyRates.map((r) => `<option value="${r.id}" ${v === r.id ? 'selected' : ''}>${esc(L(r.name, 'thr:' + r.id))} (${eur(r.min)}–${eur(r.max)}${r.open ? ' ' + t('b.orMore') : ''})</option>`).join('')}</select></label>`;
}
function taxSelect(v, attr) {
  return `<label class="field"><span>${t('b.tax')}</span><select ${attr}>${S.settings.tax.rates.map((r) => `<option value="${r.id}" ${v === r.id ? 'selected' : ''}>${esc(L(r.name, 'tax:' + r.id))}</option>`).join('')}</select></label>`;
}

// ---------- Breakdown (shown before the final price) ----------
function lineDetail(l) {
  const bits = [];
  if (AREA_KINDS.includes(l.kind)) bits.push(`${num(l.qty)} m²`);
  else if (l.kind === 'pct') bits.push(`${num(l.pctValue)} %`);
  else if (l.kind !== 'inspect' && l.kind !== 'fixed' && l.kind !== 'month') bits.push(`${num(l.qty)} ${t('b.qtyUnit.' + l.kind)}`);
  else if (l.qty > 1) bits.push(`${num(l.qty)} ×`);
  if (l.column) bits.push(t('b.col.' + l.column));
  if (l.included) bits.push(t('b.includedN', { n: num(l.included) }));
  if (l.perVisit) bits.push(t('b.perVisitX', { n: num(l.perVisit, 2) }));
  if (l.adjustPct) bits.push(`${l.adjustPct > 0 ? '+' : ''}${num(l.adjustPct)} %`);
  if (l.estimated) bits.push(t('b.estimatedShort'));
  if (l.notes.includes('override')) bits.push(t('b.manualPrice'));
  return bits.join(' · ');
}
export function breakdownHtml(b, r) {
  const rows = [];
  for (const l of r.lines) {
    const name = esc(lineName((b.lines || []).find((x) => x.id === l.id) || { name: l.name, itemId: l.itemId }));
    const varName = l.variant ? ` (${esc(variantName(l.itemId, l.variant))})` : '';
    const amt = l.kind === 'inspect' ? `<span class="small">${t('b.onInspection')}</span>` : m(l.amount);
    rows.push(`<tr><td>${name}${varName}<div class="small muted">${lineDetail(l)}</div></td><td class="r">${l.kind !== 'inspect' && l.low !== l.high ? `<span class="small muted">${range(l.low, l.high)}</span><br>` : ''}${amt}</td></tr>`);
  }
  if (r.labour) rows.push(`<tr><td>${t('b.labourLine')}<div class="small muted">${t('b.labourDetail', { w: num(r.labour.workers), h: num(r.labour.hoursPerWorker), wh: num(r.labour.workerHours), rate: eur(r.labour.rate) })}${r.labour.perVisit ? ' · ' + t('b.perVisitX', { n: num(r.labour.perVisit, 2) }) : ''}</div></td><td class="r">${m(r.labour.amount)}</td></tr>`);
  if (r.minAdj) rows.push(`<tr><td>${t('b.minAdj')}</td><td class="r">${m(r.minAdj)}</td></tr>`);
  for (const x of r.extras) rows.push(`<tr><td>${t('b.x.' + x.k)}</td><td class="r">${m(x.amount)}</td></tr>`);
  rows.push(`<tr class="sub"><td>${t('b.subtotal')}</td><td class="r">${m(r.subtotal)}</td></tr>`);
  if (r.discount) rows.push(`<tr><td>${t('b.discount')}${r.discountPct ? ` (${num(r.discountPct)} %)` : ''}</td><td class="r">−${m(r.discount)}</td></tr>`);
  rows.push(`<tr><td>${t('b.base')}</td><td class="r">${m(r.base)}</td></tr>`);
  rows.push(`<tr><td>${esc(S.settings.tax.label || 'IVA')} ${num(r.taxRate)} %${r.vatIncluded ? ' ' + t('b.vatIncludedNote') : ''}</td><td class="r">${m(r.tax)}</td></tr>`);
  const per = r.recurring ? ` ${t('b.perMonth')}` : '';
  const warn = [...r.warnings.filter((w) => w !== 'empty').map((w) => `<li>${t('b.w.' + w)}</li>`), ...(r.inspection ? [`<li class="neg">${t('b.inspectionNeeded')}: ${r.reasons.map((x) => t('b.reason.' + x)).join(', ')}</li>`] : [])];
  return `<section class="card" id="breakdown"><h3>${t('b.breakdown')}</h3>
    <table class="tbl"><tbody>${rows.join('')}</tbody></table>
    <div class="total-line">${t('b.total')}${per}: <b class="big">${m(r.total)}</b><div class="small muted">${r.vatIncluded ? t('b.pricesWithVat') : t('b.pricesWithoutVat')}</div></div>
    ${r.showRange && r.low.total !== r.high.total ? `<div class="range-line">${t('b.rangeTotal')}${per}: <b>${range(r.low.total, r.high.total)}</b>${r.lines.some((l) => l.open) ? ' ' + t('b.orMore') : ''}</div>` : ''}
    ${r.recurring ? `<p class="small">${t('b.recurringNote', { n: num(r.recurring.visitsPerMonth, 2) })}</p>` : ''}
    ${warn.length ? `<ul class="small checks-list">${warn.join('')}</ul>` : ''}</section>`;
}
const variantName = (itemId, vid) => { const v = S.tariffs.items.find((x) => x.id === itemId)?.variants?.find((x) => x.id === vid); return v ? L(v.name, 'tvar:' + v.id) : vid; };

// ---------- Quotation editor ----------
let B = null;
function findB(id) { return S.budgets.find((x) => x.id === id); }
const locked = (b) => !!b.issued && b.status !== 'draft';

function renderBudget(id) {
  B = findB(id);
  if (!B) return `<div class="card"><p>${t('notFound')}</p><a class="btn" href="#/calc">${t('b.section')}</a></div>`;
  const b = shown(B);
  const r = resultOf(B);
  const lk = locked(B);
  const dis = lk ? 'disabled' : '';
  const P = b.property;
  const f = (path, label, type = 'text', extra = '') => `<label class="field"><span>${label}</span><input type="${type}" data-b="${path}" value="${esc(getPath(b, path) ?? '')}" ${type === 'number' ? 'inputmode="decimal" min="0" step="any"' : ''} ${extra} ${dis}></label>`;
  const sel = (path, opts, label) => `<label class="field"><span>${label}</span><select data-b="${path}" ${dis}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(getPath(b, path)) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const chk = (path, label) => `<label class="check"><input type="checkbox" data-b="${path}" ${getPath(b, path) ? 'checked' : ''} ${dis}> ${label}</label>`;
  const showLabour = b.method === 'hours' || b.method === 'combined';
  const Lb = b.labour || { workers: '', hoursPerWorker: '', rateId: '', rate: S.tariffs.defaultHourlyRate };
  return `<a class="crumb no-print" href="#/calc">‹ ${t('b.section')}</a>
  <div class="row between no-print"><h1>${esc(B.number || t('b.draftTitle'))}</h1><span class="badge st-${B.status}">${t('b.st.' + B.status)}</span></div>
  <p class="small muted no-print">${B.priceType === 'fixed' ? t('b.fixedNote') : t('b.estimateNote')}${lk ? ' ' + t('b.lockedNote') : ''}</p>
  <section class="card no-print"><div class="two">${sel('status', STATUSES.map((s) => [s, t('b.st.' + s)]), t('b.status')).replace(dis, '')}
    <label class="field"><span>${t('b.docLanguage')}</span><select data-b="language">${languages().map((l) => `<option value="${l.id}" ${B.language === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label></div>
    ${lk ? '' : chk('inspected', t('b.inspectedDone'))}</section>

  <section class="card no-print"><h3>${t('b.customerSec')}</h3>
    ${S.customers.length && !lk ? `<label class="field"><span>${t('b.pickCustomer')}</span><select data-bcust><option value="">—</option>${[...S.customers].sort((a, c) => a.name.localeCompare(c.name)).map((c) => `<option value="${c.id}" ${b.customerId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>` : ''}
    ${f('customer.name', t('b.custName'))}<div class="two">${f('customer.phone', t('b.custPhone'), 'tel')}${f('customer.email', t('b.custEmail'), 'email')}</div>
    ${!lk && !b.customerId && b.customer.name ? `<button class="btn btn-outline btn-small" data-act="bSaveCustomer">${t('b.saveCustomer')}</button>` : ''}</section>

  <section class="card no-print"><h3>${t('b.propertySec')}</h3>
    ${f('property.address', t('b.address'))}<div class="two">${f('property.municipality', t('b.municipality'))}${sel('property.type', [['', '—'], ...PROPERTY_TYPES.map((x) => [x, t('b.ptype.' + x)])], t('b.propertyType'))}</div>
    ${sel('module', [['', '—'], ...PRICE_MODULES.map((md) => [md.id, modName(md.id)]), ['custom', modName('custom')]], t('b.cleaningType'))}
    <div class="three">${f('property.area', t('b.area') + ' (m²)', 'number')}${f('property.rooms', t('b.rooms'), 'number')}${f('property.bathrooms', t('b.bathrooms'), 'number')}${f('property.kitchens', t('b.kitchens'), 'number')}${f('property.windows', t('b.windows'), 'number')}${f('property.floors', t('b.floors'), 'number')}</div>
    ${condSelect(P.condition, `data-b="property.condition" ${dis}`)}<p class="small muted">${t('b.condHelp.' + P.condition)}</p>
    <div class="two">${sel('property.furnished', [['true', t('b.furnished')], ['false', t('b.empty')]], t('b.furniture'))}${sel('property.frequency', FREQS.map((x) => [x, t('b.freq.' + x)]), t('b.frequency'))}</div>
    ${P.frequency === 'weekly' ? f('property.visitsPerWeek', t('b.visitsPerWeek'), 'number', 'max="7"') : ''}
    <div class="two">${f('property.startDate', t('b.startDate'), 'date')}${f('property.machinery', t('b.machineryReq'))}</div>
    ${f('property.additional', t('b.additionalServices'))}
    ${chk('property.materialsIncluded', t('b.materialsIncluded'))}${chk('property.difficultAccess', t('b.difficultAccess'))}
    <label class="field"><span>${t('b.notes')}</span><textarea data-b="property.notes" rows="2" ${dis}>${esc(P.notes)}</textarea></label></section>

  <section class="card no-print"><h3>${t('b.methodSec')}</h3>${sel('method', METHODS.map((x) => [x, t('b.method.' + x)]), t('b.method'))}<p class="small muted">${t('b.methodHelp.' + b.method)}</p></section>

  <section class="card no-print" id="bLines"><h3>${t('b.servicesSec')}</h3>${linesTable(b, r, lk)}
    ${lk ? '' : addLineHtml(b)}</section>

  ${showLabour ? `<section class="card no-print"><h3>${t('b.labourSec')}</h3><div class="two">
    <label class="field"><span>${t('b.workers')}</span><input type="number" min="0" step="1" data-bl="workers" value="${esc(Lb.workers)}" ${dis}></label>
    <label class="field"><span>${t('b.hoursPerWorker')}</span><input type="number" min="0" step="any" data-bl="hoursPerWorker" value="${esc(Lb.hoursPerWorker)}" ${dis}></label></div>
    ${rateTypeSelect(Lb.rateId, `data-bl="rateId" ${dis}`)}
    <label class="field"><span>${t('b.ratePerHour')} (€)</span><input type="number" min="0" step="any" data-bl="rate" value="${esc(Lb.rate)}" ${dis}></label><p class="small muted">${t('b.rateNotWage')}</p></section>` : ''}

  <section class="card no-print"><h3>${t('b.extrasSec')}</h3><p class="small muted">${t('b.extrasHelp')}</p><div class="two">
    ${['materials', 'machinery', 'travel', 'parking', 'other'].map((k) => f('extras.' + k, t('b.x.' + k) + ' (€)', 'number')).join('')}</div></section>

  <section class="card no-print"><h3>${t('b.discountTax')}</h3>
    ${S.tariffs.discounts.length ? `<label class="field"><span>${t('b.discountPreset')}</span><select data-bdisc ${dis}><option value="">—</option>${S.tariffs.discounts.map((d) => `<option value="${d.id}" ${b.discount.presetId === d.id ? 'selected' : ''}>${esc(L(d.name, 'tdis:' + d.id))} (${num(d.pct)} %)</option>`).join('')}</select></label>` : ''}
    <div class="two">${sel('discount.type', [['pct', '%'], ['eur', '€']], t('b.discountType'))}${f('discount.value', t('b.discount'), 'number')}</div>
    ${taxSelect(b.taxRateId, `data-b="taxRateId" ${dis}`)}<p class="small muted">${b.pp.vatIncluded ? t('b.pricesWithVat') : t('b.pricesWithoutVat')}</p></section>

  <div id="bBreak">${breakdownHtml(b, r)}</div>

  <section class="card no-print"><h3>${t('b.textsSec')}</h3>
    <label class="field"><span>${t('b.excluded')}</span><textarea data-b="excluded" rows="2" ${dis}>${esc(b.excluded || '')}</textarea></label>
    <label class="field"><span>${t('b.terms')}</span><textarea data-bterms rows="3" ${dis}>${esc(L(b.terms, 'tterms') || '')}</textarea></label></section>

  <div class="actions no-print">
    ${lk ? `<button class="btn" data-act="bRevise">${t('b.revise')}</button>` : `<button class="btn btn-xl" data-act="bIssue">${t('b.issue')}</button>`}
    <button class="btn btn-outline" data-act="bSave">${t('b.save')}</button>
    <button class="btn btn-outline" data-act="bPdf">${t('b.pdf')}</button>
    <button class="btn btn-outline" data-act="bShare">${t('b.share')}</button>
    <button class="btn btn-outline" data-act="bPrint">${t('q.print')}</button>
    <button class="btn btn-outline" data-act="bDuplicate">${t('b.duplicate')}</button>
    <a class="btn btn-outline" href="#/docs?budget=${B.id}">📁 ${t('btn.docs')}</a>
    ${lk ? '' : `<button class="btn btn-outline" data-act="bRefresh">${t('b.refresh')}</button>`}
    <button class="btn btn-outline danger" data-act="bDelete">${t('b.delete')}</button>
  </div>
  <h2 class="no-print">${t('b.preview')}</h2>
  <div id="bDoc">${docHtml(B)}</div>`;
}

function linesTable(b, r, lk) {
  if (!b.lines.length) return `<p class="muted small">${t('b.noLines')}</p>`;
  const dis = lk ? 'disabled' : '';
  return `<div class="lines">${b.lines.map((l) => {
    const res = r.lines.find((x) => x.id === l.id) || {};
    const it = S.tariffs.items.find((x) => x.id === l.itemId);
    const kind = l.p.kind;
    const qtyLabel = AREA_KINDS.includes(kind) ? 'm²' : kind === 'pct' || kind === 'inspect' ? '' : t('b.qtyUnit.' + kind);
    const custom = l.itemId === 'custom';
    return `<div class="line-row" data-lid="${l.id}">
      <div class="row between"><b>${custom ? '' : esc(lineName(l))}</b><button class="x-btn" data-act="bDelLine" data-id="${l.id}" ${dis} title="${t('b.remove')}">✕</button></div>
      ${custom ? `<input type="text" data-l="${l.id}.label" value="${esc(L(l.name) || '')}" placeholder="${t('b.customDesc')}" ${dis}>` : ''}
      ${it?.variants ? `<select data-l="${l.id}.variant" ${dis}>${it.variants.map((v) => `<option value="${v.id}" ${l.variant === v.id ? 'selected' : ''}>${esc(L(v.name, 'tvar:' + v.id))}</option>`).join('')}</select>` : ''}
      <div class="row wrap">
        ${qtyLabel ? `<label class="mini"><span>${qtyLabel}</span><input type="number" min="0" step="any" inputmode="decimal" data-l="${l.id}.qty" value="${esc(l.qty ?? '')}" ${AREA_KINDS.includes(kind) ? `placeholder="${esc(b.property.area || '')}" title="${t('b.blankUsesArea')}"` : ''} ${l.p.perWindow ? 'disabled' : dis}></label>` : ''}
        ${kind === 'cols' ? `<label class="mini"><span>${t('b.level')}</span><select data-l="${l.id}.column" ${dis}><option value="">${t('b.byCondition')}</option>${l.p.columns.map((c) => `<option value="${c}" ${l.column === c ? 'selected' : ''}>${t('b.col.' + c)}</option>`).join('')}</select></label>` : ''}
        ${kind !== 'inspect' ? `<label class="mini"><span>${kind === 'pct' ? t('b.manualPct') : custom ? t('b.unitPrice') : t('b.manualPrice')}</span><input type="number" min="0" step="any" inputmode="decimal" data-l="${l.id}.override" value="${esc(l.override ?? '')}" placeholder="${t('b.auto')}" ${dis}></label>` : ''}
        <span class="grow r" data-amt="${l.id}">${amtCell(res)}</span>
      </div></div>`;
  }).join('')}</div>`;
}
const amtCell = (res) => (res.kind === 'inspect' ? `<span class="badge warn">${t('b.onInspection')}</span>` : `${res.low !== res.high ? `<span class="small muted">${range(res.low, res.high)}</span><br>` : ''}<b>${m(res.amount)}</b>${res.notes?.includes('included') ? `<br><span class="small">${t('b.includedN', { n: num(res.included) })}</span>` : ''}`);

function addLineHtml(b) {
  const mods = PRICE_MODULES;
  const cur = b.module && b.module !== 'custom' ? b.module : mods[0].id;
  return `<div class="add-line"><label class="field"><span>${t('b.addFrom')}</span><select data-baddmod>${mods.map((md) => `<option value="${md.id}" ${md.id === cur ? 'selected' : ''}>${esc(modName(md.id))}</option>`).join('')}</select></label>
    <div class="row"><select class="grow" data-badditem>${items(cur).map((it) => `<option value="${it.id}">${esc(itemName(it))} · ${priceText(it)}</option>`).join('')}</select><button class="btn" data-act="bAddLine">＋</button></div>
    <button class="btn btn-outline btn-small" data-act="bAddCustom">＋ ${t('b.addCustom')}</button></div>`;
}

// ---------- The quotation document (preview, print, PDF all use this model) ----------
export function docModel(b0) {
  const b = shown(b0);
  const r = resultOf(b0);
  return withLang(b.language || 'es', () => {
    const B2 = S.settings.business;
    const lines = r.lines.map((l) => ({
      label: (l.itemId === 'custom' ? L((b.lines.find((x) => x.id === l.id) || {}).name) : lineName(b.lines.find((x) => x.id === l.id) || { name: l.name, itemId: l.itemId })) + (l.variant ? ` (${variantName(l.itemId, l.variant)})` : ''),
      detail: lineDetail(l), amount: l.kind === 'inspect' ? t('b.onInspection') : m(l.amount), range: l.kind !== 'inspect' && l.low !== l.high ? range(l.low, l.high) : '',
    }));
    if (r.labour) lines.push({ label: t('b.labourLine'), detail: t('b.labourDetail', { w: num(r.labour.workers), h: num(r.labour.hoursPerWorker), wh: num(r.labour.workerHours), rate: eur(r.labour.rate) }), amount: m(r.labour.amount), range: '' });
    if (r.minAdj) lines.push({ label: t('b.minAdj'), detail: '', amount: m(r.minAdj), range: '' });
    for (const x of r.extras) lines.push({ label: t('b.x.' + x.k), detail: '', amount: m(x.amount), range: '' });
    const included = [...new Set(b.lines.map((l) => { const it = S.tariffs.items.find((x) => x.id === l.itemId); return it?.desc ? L(it.desc, 'tdesc:' + it.id) : ''; }).filter(Boolean))];
    const P = b.property;
    const per = r.recurring ? ' ' + t('b.perMonth') : '';
    const fixed = b0.priceType === 'fixed';
    const validity = b.pp.validityDays || S.tariffs.validityDays || 30;
    return {
      dir: dirOf(), lang: b.language || 'es', business: B2, owner: ownerLine(B2),
      title: fixed ? t('b.docFixed') : r.inspection && !b.inspected ? t('b.docPreliminary') : t('b.docEstimate'),
      number: b0.number || t('b.noNumber'), issuedAt: b0.issued?.at || b0.createdAt, validity: t('b.validity', { n: validity }), status: t('b.st.' + b0.status),
      customer: [b.customer.name, b.customer.phone, b.customer.email].filter(Boolean),
      address: [P.address, P.municipality].filter(Boolean).join(', '),
      service: b.module ? modName(b.module) : t('b.method.' + b.method),
      facts: [
        P.type ? [t('b.propertyType'), t('b.ptype.' + P.type)] : null,
        P.area ? [t('b.area'), `${num(P.area)} m²`] : null,
        [t('b.condition'), t('b.cond.' + P.condition)],
        [t('b.furniture'), String(P.furnished) === 'false' ? t('b.empty') : t('b.furnished')],
        P.rooms ? [t('b.rooms'), num(P.rooms)] : null, P.bathrooms ? [t('b.bathrooms'), num(P.bathrooms)] : null, P.kitchens ? [t('b.kitchens'), num(P.kitchens)] : null,
        P.windows ? [t('b.windows'), num(P.windows)] : null, P.floors ? [t('b.floors'), num(P.floors)] : null,
        [t('b.frequency'), t('b.freq.' + P.frequency) + (P.frequency === 'weekly' ? ` · ${t('b.visitsWeek', { n: num(P.visitsPerWeek || 1) })}` : '')],
        r.labour ? [t('b.teamDuration'), t('b.teamText', { w: num(r.labour.workers), h: num(r.labour.hoursPerWorker) })] : null,
        P.startDate ? [t('b.startDate'), date(P.startDate)] : null,
        P.machinery ? [t('b.machineryReq'), P.machinery] : null,
        [t('b.materials'), P.materialsIncluded ? t('b.materialsYes') : t('b.materialsNo')],
      ].filter(Boolean),
      lines, included, excluded: [b.excluded, t('b.alwaysExcluded')].filter(Boolean).join('\n'),
      totals: [[t('b.subtotal'), m(r.subtotal)], ...(r.discount ? [[`${t('b.discount')}${r.discountPct ? ` (${num(r.discountPct)} %)` : ''}`, '−' + m(r.discount)]] : []), [t('b.base'), m(r.base)], [`${S.settings.tax.label || 'IVA'} ${num(r.taxRate)} %`, m(r.tax)]],
      total: [t('b.total') + per, m(r.total)],
      rangeText: r.showRange && !fixed && r.low.total !== r.high.total ? `${t('b.rangeTotal')}${per}: ${range(r.low.total, r.high.total)}${r.lines.some((l) => l.open) ? ' ' + t('b.orMore') : ''}` : '',
      vatNote: r.vatIncluded ? t('b.pricesWithVat') : t('b.pricesWithoutVat'),
      notes: [r.inspection && !b.inspected ? t('b.inspectionDoc') : '', fixed ? t('b.fixedDoc') : t('b.estimateDoc'), r.recurring ? t('b.recurringNote', { n: num(r.recurring.visitsPerMonth, 2) }) : ''].filter(Boolean),
      terms: L(b.terms, 'tterms') || '',
      accept: t('b.acceptText'),
      labels: { customer: t('b.customerSec'), address: t('b.address'), service: t('b.serviceDesc'), facts: t('b.jobData'), lines: t('b.breakdown'), included: t('b.tasksIncluded'), excluded: t('b.tasksExcluded'), terms: t('b.terms'), number: t('b.number'), date: t('b.issueDate'), signName: t('q.signName'), signDate: t('q.signDate'), signature: t('q.signature'), acceptance: t('b.acceptance') },
    };
  });
}

function docHtml(b0) {
  const d = docModel(b0);
  return `<div class="quote-doc" dir="${d.dir}" lang="${d.lang}">
    <header class="q-head"><img class="q-logo" src="icons/logo-128.png" alt=""><div><h2>${esc(d.business.name)}</h2><div class="small">${esc([d.business.address, d.business.phone, d.business.email].filter(Boolean).join(' · '))}</div>${d.owner ? `<div class="small">${esc(d.owner)}</div>` : ''}</div></header>
    <h3>${esc(d.title)}</h3>
    <p class="small">${d.labels.number}: <b>${esc(d.number)}</b> · ${d.labels.date}: ${date(d.issuedAt)} · ${esc(d.validity)}</p>
    <div class="two"><div><b>${d.labels.customer}</b><br>${d.customer.map(esc).join('<br>') || '—'}</div><div><b>${d.labels.address}</b><br>${esc(d.address || '—')}</div></div>
    <h4>${d.labels.service}: ${esc(d.service)}</h4>
    <table class="tbl small"><tbody>${d.facts.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
    <h4>${d.labels.lines}</h4>
    <table class="tbl"><tbody>${d.lines.map((l) => `<tr><td>${esc(l.label)}${l.detail ? `<div class="small muted">${esc(l.detail)}</div>` : ''}</td><td class="r">${l.range ? `<span class="small muted">${esc(l.range)}</span><br>` : ''}${esc(l.amount)}</td></tr>`).join('')}
    ${d.totals.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${esc(v)}</td></tr>`).join('')}
    <tr class="grand"><td>${esc(d.total[0])}</td><td class="r">${esc(d.total[1])}</td></tr></tbody></table>
    <p class="small">${esc(d.vatNote)}${d.rangeText ? ` · <b>${esc(d.rangeText)}</b>` : ''}</p>
    ${d.notes.map((x) => `<p class="small"><b>${esc(x)}</b></p>`).join('')}
    ${d.included.length ? `<h4>${d.labels.included}</h4><ul class="small">${d.included.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <h4>${d.labels.excluded}</h4><p class="small pre">${esc(d.excluded)}</p>
    ${d.terms ? `<h4>${d.labels.terms}</h4><p class="small pre">${esc(d.terms)}</p>` : ''}
    <h4>${d.labels.acceptance}</h4><p class="small">${esc(d.accept)}</p>
    <div class="two small"><div>${d.labels.signName}: ________________<br><br>${d.labels.signDate}: ________________<br><br>${d.labels.signature}: ________________</div><div>${esc(d.business.name)}<br><br><br>${d.labels.signature}: ________________</div></div>
  </div>`;
}

async function buildPdf(b0) {
  const d = docModel(b0);
  await pdfLanguage(d.lang);
  const Js = await jsPDF();
  const logo = await pdfLogo();
  return withLang(d.lang, () => {
    const doc = rtlPdf(new Js({ unit: 'mm', format: 'a4' }));
    const W = doc.internal.pageSize.getWidth();
    const T = pdfText;
    const BLUE = [21, 87, 176];
    doc.setFillColor(...BLUE); doc.rect(0, 0, W, 28, 'F');
    const x = logo ? 38 : 14;
    if (logo) { doc.setFillColor(255, 255, 255); doc.circle(24, 14, 11.5, 'F'); doc.addImage(logo, 'JPEG', 13.5, 3.5, 21, 21); }
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(T(d.business.name), x, 13);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text(T([d.business.address, d.business.phone, d.business.email, d.business.web].filter(Boolean).join('  ·  ')), x, d.owner ? 19.5 : 21, { maxWidth: W - x - 14 });
    if (d.owner) doc.text(T(d.owner), x, 24.5, { maxWidth: W - x - 14 });
    doc.setTextColor(20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(T(d.title), 14, 39, { maxWidth: W - 90 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    doc.text(T(`${d.labels.number}: ${d.number}`), W - 14, 36, { align: 'right' });
    doc.text(T(`${d.labels.date}: ${date(d.issuedAt)}`), W - 14, 41, { align: 'right' });
    doc.text(T(d.validity), W - 14, 46, { align: 'right' });
    let y = 54;
    doc.setFont('helvetica', 'bold'); doc.text(T(d.labels.customer), 14, y); doc.text(T(d.labels.address), W / 2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(T(d.customer.join('\n') || '—'), 14, y + 5);
    doc.text(T(d.address || '—'), W / 2, y + 5, { maxWidth: W / 2 - 14 });
    y += 22;
    const auto = (opts) => { doc.autoTable({ startY: y, margin: { left: 14, right: 14 }, styles: { fontSize: 9, cellPadding: 1.8 }, headStyles: { fillColor: BLUE }, ...opts }); y = doc.lastAutoTable.finalY + 5; };
    const heading = (s) => { y += 3; if (y > 265) { doc.addPage(); y = 20; } doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(T(s), 14, y); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); y += 2; };
    const para = (s, bold) => { if (!s) return; const ls = doc.splitTextToSize(T(s), W - 28); if (y + ls.length * 4.5 > 282) { doc.addPage(); y = 20; } if (bold) doc.setFont('helvetica', 'bold'); doc.text(ls, 14, y + 4); doc.setFont('helvetica', 'normal'); y += ls.length * 4.5 + 3; };
    heading(`${d.labels.service}: ${d.service}`);
    auto({ body: d.facts.map(([k, v]) => [T(k), T(v)]), theme: 'striped', columnStyles: { 0: { cellWidth: 60 } } });
    heading(d.labels.lines);
    const n = d.lines.length;
    auto({
      body: [...d.lines.map((l) => [T(l.label + (l.detail ? '\n' + l.detail : '')), T((l.range ? l.range + '\n' : '') + l.amount)]), ...d.totals.map(([k, v]) => [T(k), T(v)]), [T(d.total[0]), T(d.total[1])]],
      columnStyles: { 1: { halign: 'right', cellWidth: 48 } }, theme: 'plain',
      didParseCell: (c) => { if (c.row.index >= n) c.cell.styles.fontStyle = 'bold'; if (c.row.index === n + d.totals.length) { c.cell.styles.fillColor = BLUE; c.cell.styles.textColor = 255; c.cell.styles.fontSize = 11; } },
    });
    para(d.vatNote);
    if (d.rangeText) para(d.rangeText, true);
    for (const x2 of d.notes) para(x2, true);
    if (d.included.length) { heading(d.labels.included); para(d.included.map((s) => '• ' + s).join('\n')); }
    heading(d.labels.excluded); para(d.excluded);
    if (d.terms) { heading(d.labels.terms); para(d.terms); }
    if (y > 235) { doc.addPage(); y = 20; }
    heading(d.labels.acceptance); para(d.accept);
    y += 2;
    doc.text(T(`${d.labels.signName}: ______________________\n\n${d.labels.signDate}: ______________________\n\n${d.labels.signature}: ______________________`), 14, y + 4);
    doc.text(T(`${d.business.name}\n\n\n\n${d.labels.signature}: ______________________`), W / 2 + 4, y + 4);
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text(T(`${d.number} · ${d.status} · ${i}/${pages}`), W - 14, 290, { align: 'right' }); }
    return { doc, name: `${(b0.number || 'BORRADOR')}-${(shown(b0).customer.name || 'cliente').replace(/[^\wÀ-ſ-]+/g, '_')}.pdf` };
  });
}

// ---------- History ----------
const HF = { q: '', status: '', module: '', from: '', to: '' };
function historyList() {
  const q = HF.q.trim().toLowerCase();
  const list = S.budgets.filter((b) => {
    if (HF.status && b.status !== HF.status) return false;
    if (HF.module && b.module !== HF.module) return false;
    const d = (b.issued?.at || b.createdAt || '').slice(0, 10);
    if (HF.from && d < HF.from) return false;
    if (HF.to && d > HF.to) return false;
    if (!q) return true;
    return [b.customer?.name, b.customer?.phone, b.customer?.email, b.number, b.property?.address].some((x) => String(x || '').toLowerCase().includes(q));
  }).sort((a, b) => ((a.updatedAt || a.createdAt) < (b.updatedAt || b.createdAt) ? 1 : -1));
  return `<p class="small muted">${t('b.found', { n: list.length })}</p>${list.map(budgetCard).join('') || `<p class="muted">${t('none')}</p>`}`;
}
function renderHistory() {
  return `${crumb()}<h1>🗂 ${esc(modName('history'))}</h1>
  <section class="card"><input data-bh="q" placeholder="${t('b.historySearch')}" value="${esc(HF.q)}">
    <div class="two"><select data-bh="status"><option value="">${t('b.allStatuses')}</option>${STATUSES.map((s) => `<option value="${s}" ${HF.status === s ? 'selected' : ''}>${t('b.st.' + s)}</option>`).join('')}</select>
    <select data-bh="module"><option value="">${t('b.allServices')}</option>${[...PRICE_MODULES, TARIFF_MODULES.find((x) => x.id === 'custom')].map((md) => `<option value="${md.id}" ${HF.module === md.id ? 'selected' : ''}>${esc(modName(md.id))}</option>`).join('')}</select></div>
    <div class="two"><label class="field"><span>${t('b.from')}</span><input type="date" data-bh="from" value="${esc(HF.from)}"></label><label class="field"><span>${t('b.to')}</span><input type="date" data-bh="to" value="${esc(HF.to)}"></label></div></section>
  <div id="bHistList">${historyList()}</div>`;
}

// ---------- Rate settings (owner only) ----------
let unlockedAt = 0;
async function ownerOk() {
  const sec = S.settings.security;
  if (!sec?.pinHash || Date.now() - unlockedAt < 10 * 60 * 1000) return true;
  const v = prompt(t('b.pinForRates'));
  if (v === null) return false;
  const { hash } = await hashPin(v, sec.pinSalt);
  if (hash !== sec.pinHash) { toast(t('pin.wrong')); return false; }
  unlockedAt = Date.now();
  return true;
}

function cfgIn(path, { type = 'number', label, suffix = '', cls = '' } = {}) {
  const v = getPath(S.tariffs, path);
  return `<label class="field ${cls}"><span>${label}${suffix ? ` (${suffix})` : ''}</span><input type="${type}" ${type === 'number' ? 'inputmode="decimal" step="any"' : ''} data-tf="${path}" value="${esc(v ?? '')}"></label>`;
}
function renderConfig(modId) {
  if (S.settings.security?.pinHash && Date.now() - unlockedAt > 10 * 60 * 1000) {
    return `${crumb()}<h1>⚙ ${esc(modName('config'))}</h1><section class="card"><p>${t('b.ratesLocked')}</p><button class="btn" data-act="bUnlockRates">${t('pin.unlock')}</button></section>`;
  }
  const T = S.tariffs;
  if (modId) return renderConfigModule(modId);
  const C = T.conditions;
  return `${crumb()}<h1>⚙ ${esc(modName('config'))}</h1><p class="small muted">${t('b.configHelp')}</p>
  <section class="card"><h3>${t('b.general')}</h3>
    ${cfgIn('region', { type: 'text', label: t('b.region') })}
    <label class="field"><span>${t('b.currency')}</span><select data-scur>${['EUR', 'GBP', 'USD', 'CHF'].map((c) => `<option ${S.settings.locale.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" data-tf="vatIncluded" ${T.vatIncluded ? 'checked' : ''}> ${t('b.vatIncludedSetting')}</label>
    <div class="two">${cfgIn('validityDays', { label: t('b.validityDays') })}${cfgIn('defaultHourlyRate', { label: t('b.defaultHourly'), suffix: '€/h' })}${cfgIn('minJobCharge', { label: t('b.minJobCharge'), suffix: '€' })}${cfgIn('columnPosition', { label: t('b.columnPosition') })}</div>
    <p class="small muted">${t('b.positionHelp')}</p>
    <a class="btn btn-outline btn-small" href="#/locale">${t('b.taxSettings')}</a></section>
  <section class="card"><h3>${t('b.conditionsSec')}</h3><p class="small muted">${t('b.conditionsHelp')}</p>
    ${CONDITIONS.map((c) => `<h4>${t('b.cond.' + c)}</h4><div class="two">${cfgIn(`conditions.${c}.position`, { label: t('b.position') })}${cfgIn(`conditions.${c}.adjustPct`, { label: t('b.adjustPct'), suffix: '%' })}</div>`).join('')}</section>
  <section class="card"><h3>${t('b.hourlyRates')}</h3><p class="small muted">${t('b.rateNotWage')}</p>
    ${T.hourlyRates.map((r, i) => `<div class="band-level"><span class="small">${esc(L(r.name, 'thr:' + r.id))}</span>${['min', 'max'].map((k) => `<label>${t('b.' + k)}<input class="w-num" type="number" step="any" data-tf="hourlyRates.${i}.${k}" value="${esc(r[k])}"></label>`).join('')}</div>`).join('')}</section>
  <section class="card"><h3>${t('b.discounts')}</h3>
    ${T.discounts.map((d, i) => `<div class="band-level"><input type="text" data-tf="discounts.${i}.name.${lang()}" value="${esc(L(d.name, 'tdis:' + d.id))}"><label>%<input class="w-num" type="number" step="any" data-tf="discounts.${i}.pct" value="${esc(d.pct)}"></label><button class="btn btn-small btn-outline" data-act="bDelDiscount" data-i="${i}">✕</button></div>`).join('')}
    <button class="btn btn-outline btn-small" data-act="bAddDiscount">＋ ${t('b.addDiscount')}</button></section>
  <section class="card"><h3>${t('b.terms')}</h3><textarea rows="4" data-tf="terms.${lang()}">${esc(L(T.terms, 'tterms') || '')}</textarea></section>
  <h2>${t('b.servicesByModule')}</h2>
  ${PRICE_MODULES.map((md) => `<a class="card row between" href="#/tarifas/${md.id}"><span>${md.icon} ${esc(modName(md.id))}</span><span class="small muted">${t('b.nItems', { n: T.items.filter((x) => x.module === md.id).length })} ›</span></a>`).join('')}
  <section class="card"><h3>${t('b.changeLog')}</h3><p class="small muted">${t('b.changeLogHelp')}</p>${(() => { const log = S.log.filter((l) => l.type === 'tariff').slice(0, 40); return log.length ? `<ul class="small">${log.map((l) => `<li>${date(l.at)} ${String(l.at || '').slice(11, 16)} · ${esc(l.label || l.path)}: ${esc(l.from ?? '')} → ${esc(l.to ?? '')}</li>`).join('')}</ul>` : `<p class="muted small">${t('none')}</p>`; })()}</section>
  <button class="btn btn-outline" data-act="bResetTariffs">${t('b.resetTariffs')}</button>`;
}

function renderConfigModule(modId) {
  const T = S.tariffs;
  const list = T.items.map((it, i) => ({ it, i })).filter((x) => x.it.module === modId);
  const P = (i, k) => `items.${i}.${k}`;
  const row = ({ it, i }) => {
    const head = `<div class="row between"><h3>${esc(itemName(it))}</h3><label class="check"><input type="checkbox" data-tf="${P(i, 'active')}" ${it.active !== false ? 'checked' : ''}> ${t('b.active')}</label></div>
      <div class="two">${cfgIn(`${P(i, 'name')}.es`, { type: 'text', label: t('b.nameEs') })}${cfgIn(`${P(i, 'name')}.en`, { type: 'text', label: t('b.nameEn') })}</div>
      <p class="small muted">${t('b.kind.' + it.kind)}</p>`;
    let body = '';
    if (it.kind === 'table') body = `${it.rows.map((r, j) => `<div class="band-level"><label>m²<input class="w-num" type="number" step="any" data-tf="${P(i, 'rows')}.${j}.m2" value="${esc(r.m2)}"></label><label>${t('b.min')}<input class="w-num" type="number" step="any" data-tf="${P(i, 'rows')}.${j}.min" value="${esc(r.min)}"></label><label>${t('b.max')}<input class="w-num" type="number" step="any" data-tf="${P(i, 'rows')}.${j}.max" value="${esc(r.max)}"></label><button class="x-btn" data-act="bDelRow" data-i="${i}" data-j="${j}">✕</button></div>`).join('')}<button class="btn btn-small btn-outline" data-act="bAddRow" data-i="${i}">＋ ${t('b.addRow')}</button>`;
    else if (it.kind === 'cols' || it.kind === 'contract') {
      const cols = it.kind === 'cols' ? it.columns : it.visits;
      body = it.rows.map((r, j) => `<div class="band-row"><div class="band-level"><b>m²</b><label><input class="w-num" type="number" step="any" data-tf="${P(i, 'rows')}.${j}.m2" value="${esc(r.m2)}"></label><button class="x-btn" data-act="bDelRow" data-i="${i}" data-j="${j}">✕</button></div>
        ${cols.map((c) => `<div class="band-level"><span class="small">${it.kind === 'cols' ? t('b.col.' + c) : t('b.visitsWeek', { n: c })}</span><label>${t('b.min')}<input class="w-num" type="number" step="any" data-tf="${P(i, 'rows')}.${j}.cols.${c}.0" value="${esc(r.cols[c][0])}"></label><label>${t('b.max')}<input class="w-num" type="number" step="any" data-tf="${P(i, 'rows')}.${j}.cols.${c}.1" value="${esc(r.cols[c][1])}"></label></div>`).join('')}</div>`).join('') + `<button class="btn btn-small btn-outline" data-act="bAddRow" data-i="${i}">＋ ${t('b.addRow')}</button>`;
    } else if (it.kind !== 'inspect') body = `<div class="two">${cfgIn(P(i, 'min'), { label: t('b.min'), suffix: it.kind === 'pct' ? '%' : unitOf(it.kind) })}${cfgIn(P(i, 'max'), { label: t('b.max'), suffix: it.kind === 'pct' ? '%' : unitOf(it.kind) })}</div>`;
    const flags = `<div class="row wrap">${it.kind !== 'inspect' && it.kind !== 'pct' ? cfgIn(P(i, 'minCharge'), { label: t('b.minCharge'), suffix: '€', cls: 'mini' }) : ''}
      <label class="check"><input type="checkbox" data-tf="${P(i, 'inspection')}" ${it.inspection ? 'checked' : ''}> ${t('b.needsInspection')}</label>
      <label class="check"><input type="checkbox" data-tf="${P(i, 'open')}" ${it.open ? 'checked' : ''}> ${t('b.orMore')}</label></div>`;
    const inc = it.package || it.includes ? `<label class="field"><span>${t('b.includesEdit')}</span><input type="text" data-tinc="${i}" value="${esc(Object.entries(it.includes || {}).map(([k, q]) => `${k}:${q}`).join(', '))}"></label><p class="small muted">${t('b.includesHelp')}</p>` : '';
    return `<section class="card">${head}${body}${flags}${inc}<button class="btn btn-small btn-outline danger" data-act="bDelItem" data-i="${i}">${t('b.deleteService')}</button></section>`;
  };
  return `<a class="crumb" href="#/tarifas">‹ ${esc(modName('config'))}</a><h1>${esc(modName(modId))}</h1><p class="small muted">${t('b.ratesNote')}</p>
  ${list.map(row).join('')}
  <section class="card"><h3>${t('b.addService')}</h3><div class="row"><select class="grow" data-tnewkind>${KINDS.map((k) => `<option value="${k}">${t('b.kind.' + k)}</option>`).join('')}</select><button class="btn" data-act="bAddItem" data-m="${modId}">＋</button></div></section>`;
}

// ---------- Input handling ----------
let saveTimer = null;
function scheduleSave(full) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveBudget(B), 300);
  const b = shown(B);
  const r = resultOf(B);
  if (full) return rerender().then?.(() => {});
  const br = document.getElementById('bBreak'); if (br) br.innerHTML = breakdownHtml(b, r);
  for (const res of r.lines) { const cell = document.querySelector(`[data-amt="${res.id}"]`); if (cell) cell.innerHTML = amtCell(res); }
  const doc = document.getElementById('bDoc'); if (doc) doc.innerHTML = docHtml(B);
}
const numVal = (el) => (el.value === '' ? '' : Number(el.value));

// Returns true when the event belonged to this module.
export function handleEvent(ev, isChange) {
  const el = ev.target;
  if (el.dataset.q !== undefined) { if (isChange || el.tagName !== 'SELECT') onQuick(el); return true; }
  if (el.dataset.bsearch !== undefined) { document.getElementById('bSearchOut').innerHTML = searchResults(el.value); return true; }
  if (el.dataset.bh !== undefined) { HF[el.dataset.bh] = el.value; const out = document.getElementById('bHistList'); if (out) out.innerHTML = historyList(); return true; }
  if (el.dataset.tf !== undefined || el.dataset.tinc !== undefined || el.dataset.scur !== undefined) { if (isChange) onTariff(el); return true; }
  if (!B) return false;
  const discrete = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date';
  if (!isChange && discrete) return true;
  if (isChange && !discrete && !el.matches('textarea')) return true; // already handled while typing
  if (el.dataset.b === 'status') { setStatus(el.value); return true; }
  if (el.dataset.b === 'language') { B.language = el.value; if (B.issued) B.issued.budget.language = el.value; scheduleSave(true); return true; }
  if (locked(B)) return true;
  if (el.dataset.b !== undefined) {
    const path = el.dataset.b;
    let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? numVal(el) : el.value;
    if (path === 'property.furnished') v = v === 'true';
    if (path === 'taxRateId') { B.taxRate = taxRateById(v); }
    setPath(B, path, v);
    if (path === 'method' && (v === 'hours' || v === 'combined') && !B.labour) B.labour = { workers: 1, hoursPerWorker: '', rateId: '', rate: S.tariffs.defaultHourlyRate };
    if (path === 'method' && (v === 'area' || v === 'package')) B.labour = null;
    if (path === 'property.frequency' && v === 'weekly' && !B.property.visitsPerWeek) B.property.visitsPerWeek = 1;
    scheduleSave(discrete || path === 'module');
    return true;
  }
  if (el.dataset.bterms !== undefined) { B.terms = { ...(B.terms || {}), [B.language || 'es']: el.value }; scheduleSave(false); return true; }
  if (el.dataset.bl !== undefined) {
    B.labour ||= { workers: '', hoursPerWorker: '', rateId: '', rate: S.tariffs.defaultHourlyRate };
    const k = el.dataset.bl;
    if (k === 'rateId') { B.labour.rateId = el.value; B.labour.rate = suggestedRate(el.value); scheduleSave(true); return true; }
    B.labour[k] = numVal(el); scheduleSave(false); return true;
  }
  if (el.dataset.l !== undefined) {
    const [lid, k] = el.dataset.l.split('.');
    const l = B.lines.find((x) => x.id === lid); if (!l) return true;
    if (k === 'label') l.name = { es: el.value, en: el.value };
    else if (k === 'qty') l.qty = numVal(el);
    else if (k === 'override') l.override = el.value === '' ? null : Number(el.value);
    else l[k] = el.value;
    scheduleSave(discrete);
    return true;
  }
  if (el.dataset.bcust !== undefined) {
    const c = S.customers.find((x) => x.id === el.value);
    B.customerId = c ? c.id : '';
    if (c) { B.customer = { name: c.name, phone: c.phone || '', email: c.email || '' }; if (c.address) B.property.address = c.address; if (c.language) B.language = c.language; }
    scheduleSave(true); return true;
  }
  if (el.dataset.bdisc !== undefined) {
    const d = S.tariffs.discounts.find((x) => x.id === el.value);
    B.discount = d ? { type: 'pct', value: d.pct, presetId: d.id } : { type: 'pct', value: '', presetId: '' };
    scheduleSave(true); return true;
  }
  if (el.dataset.baddmod !== undefined) {
    const sel = document.querySelector('[data-badditem]');
    sel.innerHTML = items(el.value).map((it) => `<option value="${it.id}">${esc(itemName(it))} · ${priceText(it)}</option>`).join('');
    return true;
  }
  return el.dataset.badditem !== undefined;
}

async function onTariff(el) {
  if (el.dataset.scur !== undefined) { S.settings.locale.currency = el.value; await saveSettings(); toast(t('saved')); return; }
  if (el.dataset.tinc !== undefined) {
    const it = S.tariffs.items[Number(el.dataset.tinc)];
    const inc = {};
    for (const part of el.value.split(',')) { const [k, q] = part.split(':').map((x) => x.trim()); if (k) inc[k] = Number(q) || 1; }
    const from = JSON.stringify(it.includes || {});
    it.includes = inc;
    await saveTariffs();
    await logChange({ type: 'tariff', path: `items.${it.id}.includes`, label: `${itemName(it)} · ${t('b.includes')}`, from, to: JSON.stringify(inc) });
    return toast(t('saved'));
  }
  const path = el.dataset.tf;
  const old = getPath(S.tariffs, path);
  let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
  if (el.type === 'number' && v !== '' && (!Number.isFinite(v) || v < 0)) { toast(t('chk.negativeShort')); el.value = old ?? ''; return; }
  if (String(old) === String(v)) return;
  setPath(S.tariffs, path, v);
  if (path.endsWith('.rows') === false && /\.rows\.\d+\.m2$/.test(path)) { const i = Number(path.split('.')[1]); S.tariffs.items[i].rows.sort((a, b) => a.m2 - b.m2); }
  await saveTariffs();
  const label = labelForPath(path);
  await logChange({ type: 'tariff', path, label, from: old, to: v });
  toast(t('b.rateSaved'));
  if (el.type === 'checkbox' || /\.m2$/.test(path)) rerender();
}
function labelForPath(path) {
  const p = path.split('.');
  if (p[0] === 'items') { const it = S.tariffs.items[Number(p[1])]; return `${t('b.section')} · ${itemName(it)} · ${p.slice(2).join(' ')}`; }
  return `${t('b.section')} · ${path}`;
}

function setStatus(st) {
  if (!B) return;
  const r = resultOf(B);
  if (st === 'accepted' && r.inspection && !shown(B).inspected) {
    if (!confirm(t('b.acceptNeedsInspection'))) return rerender();
    B.status = 'inspection';
  } else B.status = st;
  if (B.status === 'accepted') B.priceType = 'fixed';
  if (['draft', 'rejected', 'cancelled'].includes(B.status)) B.priceType = 'estimate';
  (B.statusLog ||= []).push({ at: new Date().toISOString(), status: B.status });
  saveBudget(B).then(() => { toast(t('saved')); rerender(); });
}

// ---------- Actions ----------
async function createBudget(mod, itemId) {
  const b = newBudget(S.tariffs, { taxRateId: S.settings.tax.defaultRateId, taxRate: taxRateById(S.settings.tax.defaultRateId), module: mod || '' });
  if (mod === 'custom') { b.method = 'combined'; b.lines.push(customLine()); }
  const it = itemId ? S.tariffs.items.find((x) => x.id === itemId) : mod ? items(mod).find((x) => AREA_KINDS.includes(x.kind)) : null;
  if (it) {
    b.lines.push(makeLine(it, AREA_KINDS.includes(it.kind) ? '' : 1, it.variants ? { variant: it.variants[0].id } : {}));
    if (it.kind === 'contract') { b.property.frequency = 'weekly'; b.property.visitsPerWeek = 1; }
    b.method = AREA_KINDS.includes(it.kind) ? 'area' : 'package';
  }
  if (mod === 'hours') { b.method = 'hours'; b.labour = { workers: 1, hoursPerWorker: '', rateId: '', rate: S.tariffs.defaultHourlyRate }; }
  (b.statusLog ||= []).push({ at: b.createdAt, status: 'draft' });
  await saveBudget(b);
  go('#/pres/' + b.id);
}
const customLine = () => ({ id: uid(), itemId: 'custom', name: { es: '', en: '' }, qty: 1, override: null, variant: '', column: '', p: { kind: 'unit', min: 0, max: 0, module: 'custom' } });

export const actions = {
  bNew(el) { createBudget(el.dataset.m, el.dataset.item); },
  async bFromQuick() {
    const b = JSON.parse(JSON.stringify(Q.b));
    b.id = uid(); b.createdAt = new Date().toISOString(); b.module = b.lines[0]?.p.module || (b.labour ? 'hours' : '');
    if (Q.kind === 'hours') b.module = '';
    b.statusLog = [{ at: b.createdAt, status: 'draft' }];
    await saveBudget(b);
    Q = null;
    go('#/pres/' + b.id);
  },
  bAddLine() {
    const id = document.querySelector('[data-badditem]')?.value;
    const it = S.tariffs.items.find((x) => x.id === id);
    if (!it || locked(B)) return;
    B.lines.push(makeLine(it, AREA_KINDS.includes(it.kind) ? '' : it.perWindow ? 0 : 1, it.variants ? { variant: it.variants[0].id } : {}));
    if (it.kind === 'contract' && B.property.frequency !== 'weekly') { B.property.frequency = 'weekly'; B.property.visitsPerWeek ||= 1; }
    if (B.lines.length > 1 && B.method === 'area') B.method = 'combined';
    scheduleSave(true);
  },
  bAddCustom() { if (locked(B)) return; B.lines.push(customLine()); scheduleSave(true); },
  bDelLine(el) { if (locked(B)) return; B.lines = B.lines.filter((l) => l.id !== el.dataset.id); scheduleSave(true); },
  async bSave() { clearTimeout(saveTimer); await saveBudget(B); toast(t('b.savedReal')); },
  async bIssue() {
    clearTimeout(saveTimer);
    const r = calcBudget(B);
    if (!r.total && !r.inspection) return toast(t('b.nothingToIssue'));
    if (!confirm(t('b.confirmIssue', { total: m(r.total) }))) return;
    if (!B.number) B.number = B.baseNumber ? `${B.baseNumber}-R${B.rev}` : nextQuoteRef();
    B.status = r.inspection && !B.inspected ? 'inspection' : 'issued';
    B.priceType = 'estimate';
    const snap = JSON.parse(JSON.stringify({ ...B, issued: undefined }));
    B.issued = { at: new Date().toISOString(), result: r, budget: snap };
    (B.statusLog ||= []).push({ at: B.issued.at, status: B.status });
    await saveBudget(B);
    toast(t('b.issuedToast', { n: B.number }));
    rerender();
  },
  async bRevise() {
    const src = B.issued.budget;
    const c = JSON.parse(JSON.stringify(src));
    Object.assign(c, { id: uid(), createdAt: new Date().toISOString(), status: 'draft', priceType: 'estimate', issued: undefined, number: '', baseNumber: (B.baseNumber || B.number).replace(/-R\d+$/, ''), rev: (B.rev || 0) + 1, previousId: B.id, statusLog: [{ at: new Date().toISOString(), status: 'draft' }] });
    delete c.issued;
    await saveBudget(c);
    toast(t('b.revisionMade'));
    go('#/pres/' + c.id);
  },
  async bDuplicate() {
    const c = JSON.parse(JSON.stringify(shown(B)));
    Object.assign(c, { id: uid(), createdAt: new Date().toISOString(), status: 'draft', priceType: 'estimate', number: '', baseNumber: '', rev: 0, previousId: '', inspected: false, statusLog: [{ at: new Date().toISOString(), status: 'draft' }] });
    delete c.issued;
    refreshPrices(c, S.tariffs);
    await saveBudget(c);
    toast(t('b.duplicated'));
    go('#/pres/' + c.id);
  },
  async bRefresh() { if (locked(B)) return; if (!confirm(t('b.confirmRefresh'))) return; refreshPrices(B, S.tariffs); await saveBudget(B); toast(t('b.refreshed')); rerender(); },
  async bDelete() { if (!confirm(t('b.confirmDelete'))) return; await deleteBudget(B.id); B = null; go('#/calc/history'); },
  async bPdf() { const { doc, name } = await buildPdf(B); const res = await shareOrDownload(doc.output('blob'), name, B.number || 'Presupuesto'); if (res !== 'cancelled') toast(t(res === 'shared' ? 'q.shared' : 'q.downloaded')); },
  async bShare() {
    const { doc, name } = await buildPdf(B);
    const res = await shareOrDownload(doc.output('blob'), name, B.number || 'Presupuesto');
    if (res === 'cancelled') return;
    if (B.issued && ['issued', 'inspection'].includes(B.status)) { B.status = 'sent'; (B.statusLog ||= []).push({ at: new Date().toISOString(), status: 'sent' }); await saveBudget(B); rerender(); }
    toast(t(res === 'shared' ? 'q.shared' : 'q.downloaded'));
  },
  bPrint() { document.body.classList.add('print-budget'); window.print(); setTimeout(() => document.body.classList.remove('print-budget'), 500); },
  async bSaveCustomer() {
    const c = { id: uid(), name: B.customer.name.trim(), phone: B.customer.phone, email: B.customer.email, address: B.property.address, notes: '', language: B.language, createdAt: new Date().toISOString() };
    await saveCustomer(c);
    B.customerId = c.id; await saveBudget(B); toast(t('b.customerSaved')); rerender();
  },
  async bUnlockRates() { if (await ownerOk()) rerender(); },
  async bAddRow(el) {
    const it = S.tariffs.items[Number(el.dataset.i)];
    const last = it.rows[it.rows.length - 1];
    const nr = JSON.parse(JSON.stringify(last)); nr.m2 = (Number(last.m2) || 0) + 50;
    it.rows.push(nr); await saveTariffs(); await logChange({ type: 'tariff', path: `items.${it.id}.rows`, label: `${itemName(it)} · ${t('b.addRow')}`, from: '', to: nr.m2 }); rerender();
  },
  async bDelRow(el) {
    const it = S.tariffs.items[Number(el.dataset.i)];
    if (it.rows.length <= 1) return toast(t('b.keepOneRow'));
    if (!confirm(t('b.confirmDelRow'))) return;
    const [rm] = it.rows.splice(Number(el.dataset.j), 1); await saveTariffs(); await logChange({ type: 'tariff', path: `items.${it.id}.rows`, label: `${itemName(it)} · ${t('b.deleteRow')}`, from: rm.m2, to: '' }); rerender();
  },
  async bDelItem(el) {
    const it = S.tariffs.items[Number(el.dataset.i)];
    if (!confirm(t('b.confirmDelService', { name: itemName(it) }))) return;
    S.tariffs.items.splice(Number(el.dataset.i), 1);
    (S.tariffs.deletedIds ||= []).push(it.id);
    await saveTariffs(); await logChange({ type: 'tariff', path: `items.${it.id}`, label: `${itemName(it)} · ${t('b.deleteService')}`, from: 'on', to: '' }); rerender();
  },
  async bAddItem(el) {
    const kind = document.querySelector('[data-tnewkind]').value;
    const name = prompt(t('b.newServiceName'));
    if (!name) return;
    const it = { id: 'own-' + uid().slice(0, 8), module: el.dataset.m, kind, name: { es: name, en: name }, active: true, minCharge: 0 };
    if (kind === 'table') it.rows = [{ m2: 50, min: 0, max: 0 }, { m2: 100, min: 0, max: 0 }];
    else if (kind === 'cols') { it.columns = ['light', 'standard', 'heavy']; it.rows = [{ m2: 100, cols: { light: [0, 0], standard: [0, 0], heavy: [0, 0] } }]; }
    else if (kind === 'contract') { it.visits = [1, 2, 5]; it.rows = [{ m2: 100, cols: { 1: [0, 0], 2: [0, 0], 5: [0, 0] } }]; }
    else if (kind !== 'inspect') { it.min = 0; it.max = 0; }
    if (kind === 'fixed' && confirm(t('b.isPackage'))) { it.package = true; it.includes = {}; }
    S.tariffs.items.push(it);
    await saveTariffs(); await logChange({ type: 'tariff', path: `items.${it.id}`, label: `${name} · ${t('b.addService')}`, from: '', to: kind }); rerender();
  },
  async bAddDiscount() { S.tariffs.discounts.push({ id: 'd-' + uid().slice(0, 6), name: { es: t('b.newDiscount'), en: t('b.newDiscount') }, pct: 5 }); await saveTariffs(); rerender(); },
  async bDelDiscount(el) { S.tariffs.discounts.splice(Number(el.dataset.i), 1); await saveTariffs(); rerender(); },
  async bResetTariffs() {
    if (!confirm(t('b.confirmReset'))) return;
    const old = S.tariffs; S.tariffs = defaultTariffs();
    await saveTariffs(); await logChange({ type: 'tariff', path: 'tariffs', label: t('b.resetTariffs'), from: old.updatedAt || '', to: 'default' }); rerender();
  },
};

export const routes = {
  calc: (arg) => (arg ? renderModule(arg) : renderHome()),
  pres: (id) => renderBudget(id),
  tarifas: (arg) => renderConfig(arg),
};
export async function beforeRoute(name) {
  if (name === 'tarifas' || (name === 'calc' && location.hash.startsWith('#/calc/config'))) await ownerOk();
  if (name !== 'pres' && B) { clearTimeout(saveTimer); await saveBudget(B); B = null; }
}
