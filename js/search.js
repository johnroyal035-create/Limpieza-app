// One search for the whole app: screens, customers, quotations, calculations, documents, services and prices.
import { S, t, esc, money, date, svcName, L } from './core.js';
import { SECTIONS } from './app.js';
import { TARIFF_MODULES } from './tariffs-data.js';
import { modName, itemName, resultOf } from './presupuestos.js';
import { DOCS } from './docs-data.js';
import { DOC_ICONS, docTitle, custName } from './documentos.js';

// Lower case without accents, so "limpieza a fondo" finds "Limpieza a Fondo" and "dueño" finds "dueno".
export const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const EXTRA_SCREENS = [['docs', 'sec.docs', '📁'], ['search', 'sec.search', '🔍']];

function index() {
  const out = [];
  const add = (group, icon, title, sub, href, ...words) => out.push({ group, icon, title, sub, href, words: norm([title, sub, ...words].join(' ')) });
  for (const [h, k, i] of [...SECTIONS, ...EXTRA_SCREENS]) add('screens', i, t(k), '', '#/' + h, k);
  for (const md of TARIFF_MODULES) add('screens', md.icon, modName(md.id), t('b.section'), '#/calc/' + md.id, L(md.name), md.name.es, md.name.en);
  for (const d of DOCS.es) add('screens', DOC_ICONS[d.n - 1], docTitle(d.n), t('sec.docs'), `#/docs`, d.title, DOCS.en[d.n - 1].title, d.code);
  for (const c of S.customers) add('customers', '👤', c.name, [c.phone, c.address].filter(Boolean).join(' · '), '#/customer/' + c.id, c.email, c.notes);
  for (const b of S.budgets) {
    let total = '';
    try { total = money(resultOf(b).total / 100); } catch { /* unreadable quotation */ }
    add('budgets', '🧾', `${b.number || t('b.noNumber')} · ${b.customer?.name || t('noCustomer')}`, [b.module ? modName(b.module) : '', t('b.st.' + b.status), total, date(b.createdAt)].filter(Boolean).join(' · '), '#/pres/' + b.id, b.customer?.phone, b.customer?.email, b.property?.address, b.property?.municipality);
  }
  for (const j of S.jobs) {
    const c = S.customers.find((x) => x.id === j.customerId);
    const s = S.services.find((x) => x.id === j.serviceId);
    add('jobs', '🧹', `${c?.name || t('noCustomer')} · ${svcName(s)}`, [j.issued?.ref, j.estimate?.total ? money(j.estimate.total) : '', t('status.' + j.status), date(j.updatedAt || j.createdAt)].filter(Boolean).join(' · '), '#/job/' + j.id, j.address, c?.phone);
  }
  for (const d of S.docs || []) {
    const vals = Object.values(d.v || {}).filter((v) => typeof v === 'string').join(' ');
    add('docs', DOC_ICONS[d.type - 1], `${docTitle(d.type)} · ${d.number}`, [custName(d), date(d.updatedAt || d.createdAt)].filter(Boolean).join(' · '), '#/doc/' + d.id, vals);
  }
  for (const s of S.services) add('services', '🧽', svcName(s), t('sec.services'), '#/service/' + s.id, L(s.name));
  for (const it of S.tariffs?.items || []) if (it.active !== false) add('services', '💶', itemName(it), modName(it.module), '#/calc/' + it.module, L(it.name), it.name?.es, it.name?.en);
  return out;
}

const GROUPS = ['screens', 'customers', 'budgets', 'jobs', 'docs', 'services'];
export function searchHtml(q) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length || norm(q).length < 2) return `<p class="muted small">${t('s.hint')}</p>`;
  const hits = index().filter((e) => words.every((w) => e.words.includes(w)));
  if (!hits.length) return `<p class="muted">${t('s.none', { q: esc(q) })}</p>`;
  return GROUPS.map((g) => {
    const list = hits.filter((h) => h.group === g);
    if (!list.length) return '';
    return `<h3>${t('s.' + g)} <span class="muted small">${list.length}</span></h3>${list.slice(0, 25).map((h) => `<a class="card row between s-hit" href="${h.href}"><span><b>${h.icon} ${esc(h.title)}</b>${h.sub ? `<br><span class="small muted">${esc(h.sub)}</span>` : ''}</span><span>›</span></a>`).join('')}`;
  }).join('');
}

let lastQ = '';
export function searchBox(q = lastQ, autofocus = false) {
  return `<label class="field search-field"><input type="search" data-gsearch value="${esc(q)}" placeholder="🔍 ${t('s.placeholder')}" autocomplete="off" ${autofocus ? 'autofocus' : ''}></label>`;
}
function renderSearch() {
  const q = decodeURIComponent((location.hash.split('?q=')[1] || '')) || lastQ;
  return `<h1>🔍 ${t('sec.search')}</h1>${searchBox(q, true)}<div id="gResults">${q ? searchHtml(q) : `<p class="muted small">${t('s.help')}</p>`}</div>`;
}
export function handleSearchEvent(ev) {
  const el = ev.target;
  if (!el.matches?.('[data-gsearch]')) return false;
  lastQ = el.value;
  const box = document.getElementById('gResults');
  if (box) box.innerHTML = el.value.trim() ? searchHtml(el.value) : (location.hash.startsWith('#/search') ? `<p class="muted small">${t('s.help')}</p>` : '');
  return true;
}
export function searchAfterRender(name) {
  if (name === 'search') { const i = document.querySelector('[data-gsearch]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
}
export const searchRoutes = { search: renderSearch };
