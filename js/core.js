// Shared state, persistence and formatting helpers.
import { db, uid } from './db.js';
import { defaultSettings, DEFAULT_SERVICES, DEFAULT_CATEGORIES, upgradeServices } from './defaults.js';
import { DICT } from './i18n.js';
import { calculate, toDisplayArea, round2 } from './engine.js';
import { defaultTariffs, upgradeTariffs } from './tariffs-data.js';
import { engineTables } from './tariffs.js';

export const S = { settings: null, services: [], categories: [], customers: [], jobs: [], log: [], meta: {}, tariffs: null, budgets: [], docs: [] };
export { uid };

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
function fillMissing(target, defaults) {
  for (const [k, v] of Object.entries(defaults)) {
    if (!(k in target)) target[k] = JSON.parse(JSON.stringify(v));
    else if (isObj(v) && isObj(target[k])) fillMissing(target[k], v);
  }
  return target;
}

export async function loadAll() {
  let settings = await db.get('kv', 'settings');
  if (!settings) { settings = defaultSettings(); await db.put('kv', settings, 'settings'); }
  else {
    const def = defaultSettings();
    fillMissing(settings, def);
    // Tasks added in newer versions (e.g. bedrooms, living rooms, hallways) join the owner's table.
    for (const tr of def.taskRates) if (!settings.taskRates.some((x) => x.id === tr.id)) settings.taskRates.push(tr);
  }
  let services = await db.get('kv', 'services');
  if (!services) { services = JSON.parse(JSON.stringify(DEFAULT_SERVICES)); await db.put('kv', services, 'services'); }
  else if (upgradeServices(services)) await db.put('kv', services, 'services');
  let categories = await db.get('kv', 'categories');
  if (!categories) { categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)); await db.put('kv', categories, 'categories'); }
  S.settings = settings;
  S.services = services;
  S.categories = categories;
  // Central price list of the Calculadora de Limpieza y Presupuestos; the room-by-room calculator reads its tables too.
  let tariffs = await db.get('kv', 'tariffs');
  if (!tariffs) { tariffs = defaultTariffs(); await db.put('kv', tariffs, 'tariffs'); }
  else if (upgradeTariffs(tariffs)) await db.put('kv', tariffs, 'tariffs');
  S.tariffs = tariffs;
  S.settings.pricing.priceTables = engineTables(tariffs);
  S.budgets = await db.all('budgets');
  S.meta = (await db.get('kv', 'meta')) || { quoteCounter: 0 };
  S.customers = await db.all('customers');
  S.jobs = await db.all('jobs');
  S.log = (await db.all('log')).sort((a, b) => (a.at < b.at ? 1 : -1));
}

export const saveSettings = () => db.put('kv', S.settings, 'settings');
export const saveServices = () => db.put('kv', S.services, 'services');
export const saveCategories = () => db.put('kv', S.categories, 'categories');
export const saveMeta = () => db.put('kv', S.meta, 'meta');
export async function saveTariffs() {
  S.tariffs.updatedAt = new Date().toISOString();
  await db.put('kv', S.tariffs, 'tariffs');
  S.settings.pricing.priceTables = engineTables(S.tariffs);
}
export async function saveBudget(b) {
  b.updatedAt = new Date().toISOString();
  await db.put('budgets', JSON.parse(JSON.stringify(b)));
  const i = S.budgets.findIndex((x) => x.id === b.id);
  if (i >= 0) S.budgets[i] = b; else S.budgets.push(b);
}
export async function deleteBudget(id) {
  await db.del('budgets', id);
  S.budgets = S.budgets.filter((x) => x.id !== id);
}

export async function saveJob(job) {
  job.updatedAt = new Date().toISOString();
  // Keep a compact copy of the latest estimate for lists, reports and learning.
  const r = calculate(job, S.settings, S.services);
  if (r.service) job.estimate = summarise(r);
  await db.put('jobs', JSON.parse(JSON.stringify(job)));
  const i = S.jobs.findIndex((j) => j.id === job.id);
  if (i >= 0) S.jobs[i] = job; else S.jobs.push(job);
}

export function summarise(r) {
  return {
    workerHours: round2(r.workerHours), workers: r.workers, onSiteHours: round2(r.schedule.onSiteHours), makespan: round2(r.schedule.makespan), days: r.schedule.days,
    labourCost: r.pricing.labourCost, directCost: r.pricing.directCost, subtotal: r.pricing.subtotal, taxAmount: r.pricing.taxAmount, taxRate: r.pricing.taxRate, total: r.pricing.total,
    profit: r.pricing.profit, marginPct: round2(r.pricing.marginPct), materialsCost: r.pricing.materialsCost, travelCost: r.pricing.travelCost, needsInspection: r.needsInspection, ok: r.ok,
  };
}

export async function deleteJob(id) {
  for (const m of await db.byIndex('media', 'jobId', id)) await db.del('media', m.id);
  await db.del('jobs', id);
  S.jobs = S.jobs.filter((j) => j.id !== id);
}

export async function saveCustomer(c) {
  c.updatedAt = new Date().toISOString();
  await db.put('customers', JSON.parse(JSON.stringify(c)));
  const i = S.customers.findIndex((x) => x.id === c.id);
  if (i >= 0) S.customers[i] = c; else S.customers.push(c);
}

export async function deleteCustomer(id) {
  for (const j of S.jobs.filter((x) => x.customerId === id)) await deleteJob(j.id);
  await db.del('customers', id);
  S.customers = S.customers.filter((c) => c.id !== id);
}

export async function logChange(entry) {
  const e = { id: uid(), at: new Date().toISOString(), ...entry };
  await db.put('log', e);
  S.log.unshift(e);
}

export function newJob(extra = {}) {
  return {
    id: uid(), createdAt: new Date().toISOString(), status: 'draft', serviceId: 'house-regular', customerId: '', address: '', date: '',
    m: {}, cond: { dirt: 'normal', furnished: true, occupied: false, access: 'normal' }, workers: 'auto', shift: 'normal',
    costs: {}, charges: [], customTasks: [], taskEdits: {}, notes: '', equipmentNeeded: '', exclusions: '', description: '', actual: {}, ...extra,
  };
}

export function nextQuoteRef() {
  S.meta.quoteCounter = (S.meta.quoteCounter || 0) + 1;
  saveMeta();
  const y = new Date().getFullYear();
  return `LVA-${y}-${String(S.meta.quoteCounter).padStart(4, '0')}`;
}

// ---------- i18n ----------
let langOverride = null;
export const lang = () => langOverride || S.settings?.locale.language || 'es';
// Languages written right to left.
export const RTL = ['ar'];
export const isRtl = (code = lang()) => RTL.includes(code);
export const dirOf = (code = lang()) => (isRtl(code) ? 'rtl' : 'ltr');
// Runs fn with texts in another language (a customer's), e.g. for quotations and forms.
export function withLang(code, fn) {
  const prev = langOverride;
  langOverride = DICT[code] ? code : null;
  try { return fn(); } finally { langOverride = prev; }
}
// Language a customer's documents are written in: their preferred language, else the app language.
export const customerLang = (cust) => (cust?.language && DICT[cust.language] ? cust.language : S.settings.locale.language);
export function t(key, p) {
  const d = DICT[lang()] || DICT.en;
  let s = d[key] ?? DICT.en[key] ?? key;
  if (p) s = s.replace(/\{(\w+)\}/g, (_, k) => (p[k] !== undefined ? p[k] : `{${k}}`));
  return s;
}
export const languages = () => Object.keys(DICT).map((id) => ({ id, name: DICT[id]._name }));
// Names typed by the owner win; built-in names come from the translation files; English is the fallback.
export const L = (obj, key) => (typeof obj === 'string' ? obj : obj ? obj[lang()] || (key && DICT[lang()]?.[key]) || obj.en || Object.values(obj)[0] : '');
// The owner's details printed at the top of every quotation and document (typed once in App settings).
export function ownerLine(B = S.settings.business) {
  return [B.ownerName && `${t('own.owner')}: ${B.ownerName}`, B.taxId && `${t('own.nie')}: ${B.taxId}`, B.ssNumber && `${t('own.ss')}: ${B.ssNumber}`].filter(Boolean).join('  ·  ');
}
export const svcName = (s) => (s ? L(s.name, 'svc:' + s.id) : '');
export const catName = (id) => L(S.categories.find((c) => c.id === id)?.name, 'cat:' + id) || id;
export const profileName = (p) => (p ? L(p.name, 'rp:' + p.id) : '');

// ---------- formatting ----------
const nl = () => S.settings?.locale.numberLocale || 'es-ES';
export function money(x) {
  try { return new Intl.NumberFormat(nl(), { style: 'currency', currency: S.settings.locale.currency || 'EUR' }).format(x || 0); }
  catch { return (x || 0).toFixed(2) + ' ' + (S.settings.locale.currency || ''); }
}
export const num = (x, d = 2) => new Intl.NumberFormat(nl(), { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(x || 0);
export const hrs = (h) => `${num(h, 1)} h`;
export function dur(h) {
  const totalMin = Math.round((h || 0) * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return mm ? `${hh} h ${mm} min` : `${hh} h`;
}
export const areaUnit = () => (S.settings.locale.units === 'ft2' ? 'ft²' : 'm²');
export const area = (m2) => `${num(toDisplayArea(m2 || 0, S.settings.locale.units), 1)} ${areaUnit()}`;
export const date = (iso) => (iso ? new Date(iso).toLocaleDateString(nl()) : '');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function taskLabel(task) {
  if (task.name) return task.name;
  if (task.k === 'task.area' || task.k === 'task.areaFloors') return t(task.k);
  const base = t(task.k);
  if (task.unit === 'each' && task.qty) return `${base} × ${num(task.qty, 0)}`;
  if (task.unit === 'm2' && task.qty) return `${base} (${area(task.qty)})`;
  return base;
}

export function checkText(c) {
  const p = { ...(c.p || {}) };
  if (c.k === 'chk.inspection') p.reasons = (p.reasons || []).map((r) => t('insp.' + r)).join('; ');
  if (p.task && DICT.en['task.' + p.task]) p.task = t('task.' + p.task);
  if (p.field) p.field = t('f.' + p.field);
  for (const k of ['profit']) if (p[k] !== undefined) p[k] = money(p[k]);
  for (const k of ['margin', 'value', 'idle', 'min', 'max']) if (typeof p[k] === 'number') p[k] = num(p[k], 2);
  return t(c.k, p);
}

export function assumptionText(a) {
  const p = { ...(a.p || {}) };
  if (p.task) p.task = t('task.' + p.task);
  if (p.area !== undefined) p.area = area(p.area);
  for (const k of ['sell', 'cost']) if (p[k] !== undefined) p[k] = money(p[k]);
  if (p.name && a.k === 'asm.profile') p.name = profileName(S.settings.pricing.rateProfiles.find((r) => r.id === p.name));
  if (p.name && typeof p.name === 'object') p.name = L(p.name);
  return t(a.k, p);
}

export function toast(msg, ms = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

export function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export async function shareOrDownload(blob, filename, title) {
  // File names stay in Latin letters so every phone and computer can save them (Arabic names are dropped).
  filename = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  filename = filename.replace(/[^\x20-\u024f]+/g, '').replace(/_+/g, '_').replace(/-_?(?=\.pdf$)|^[-_]+/g, '') || 'document.pdf';
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  }
  download(blob, filename);
  return 'downloaded';
}

export const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
export function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) { if (o[keys[i]] == null) o[keys[i]] = {}; o = o[keys[i]]; }
  o[keys[keys.length - 1]] = value;
}
