// The 11 business documents (receipt, invoice, payment confirmation, quotation, service order, agreement,
// advance receipt, key handover, checklist, completion, incident) inside the app: filled in on the phone,
// prefilled from a customer, a calculation or a quotation, saved on the phone and exported as PDF.
// Wording and layout come from documentos/_generator/docs.py (see js/docs-data.js), in Spanish or English.
import { S, t, esc, money, num, date, toast, uid, withLang, shareOrDownload, saveMeta, svcName, ownerLine } from './core.js';
import { db } from './db.js';
import { DOCS } from './docs-data.js';
import { jsPDF, pdfLogo, pdfText } from './quote.js';
import { signaturePad } from './keys.js';
import { docModel, shown, resultOf, modName } from './presupuestos.js';
import { go, rerender } from './app.js';

export const DOC_ICONS = ['🧾', '💶', '✅', '📝', '📋', '🤝', '💰', '🔑', '☑️', '🏁', '⚠️'];
const PREFIX = ['REC', 'FAC', 'JUS', 'PRE', 'ORD', 'ACU', 'ANT', 'LLA', 'LIS', 'FIN', 'INC'];
export const DOC_LANGS = [['es', 'Español'], ['en', 'English']];
// Document texts exist in Spanish and English; the app's other languages use one of the two.
const uiDocLang = () => (['en', 'fr', 'de', 'nl', 'ar', 'it', 'pt'].includes(S.settings.locale.language) ? 'en' : 'es');
export const docType = (n, lang = uiDocLang()) => (DOCS[lang] || DOCS.es)[n - 1];
export const docTitle = (n, lang) => docType(n, lang)?.title || '';

let D = null; // document being edited
let saveTimer = null;
const norm = (v) => String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);
const nf = (x) => new Intl.NumberFormat(S.settings.locale.numberLocale || 'es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x || 0);
const parseNum = (s) => {
  let v = String(s ?? '').replace(/[^\d,.-]/g, '');
  if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// ---------- storage ----------
export async function loadDocs() { S.docs = await db.all('docs'); }
async function saveDoc(d) {
  d.updatedAt = new Date().toISOString();
  await db.put('docs', JSON.parse(JSON.stringify(d)));
  const i = S.docs.findIndex((x) => x.id === d.id);
  if (i >= 0) S.docs[i] = d; else S.docs.push(d);
}
async function deleteDoc(id) { await db.del('docs', id); S.docs = S.docs.filter((x) => x.id !== id); }
const queueSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => D && saveDoc(D), 400); };

function nextNumber(n) {
  const c = (S.meta.docCounters ||= {});
  c[n] = (c[n] || 0) + 1;
  saveMeta();
  return `${PREFIX[n - 1]}-${new Date().getFullYear()}-${String(c[n]).padStart(4, '0')}`;
}

// ---------- structure walk ----------
// Every fillable spot gets a key from its position, so the Spanish and English versions share the same values.
function walk(body, fn) {
  body.forEach((b, bi) => {
    const k = b[0];
    if (k === 'meta') b[1].forEach((m, i) => fn({ key: `m${bi}_${i}`, label: m[0], def: m[2] || '', kind: 'text', block: 'meta', i }));
    else if (k === 'box') {
      const role = b[1].some((r) => r.some((f) => f.kind === 'static')) ? 'issuer' : '';
      b[1].forEach((row, r) => row.forEach((f, c) => fn({ key: `f${bi}_${r}_${c}`, label: f.label, def: f.value || '', kind: f.kind, options: f.options, block: 'box', role })));
    } else if (k === 'totals') b[1].forEach((x, i) => fn({ key: `s${bi}_${i}`, label: x[0], def: '', kind: 'text', block: 'totals' }));
    else if (k === 'clauses') b[1].forEach(([, text], ci) => [...text.matchAll(/\[\[([^|\]]+)\|?(\d*)\]\]/g)].forEach((mm, fi) => fn({ key: `c${bi}_${ci}_${fi}`, label: mm[1], def: '', kind: 'text', block: 'clause' })));
    else if (k === 'table') fn({ key: `t${bi}`, label: '', kind: 'table', cols: b[1], rows: b[2], block: 'table' });
  });
}

// ---------- prefill from a customer, a calculation or a quotation ----------
const SERVICE_IDX = { home: 0, deep: 1, rental: 2, construction: 3, offices: 4, communities: 5 };
const svcIdxOfJob = (id = '') => (/deep|general/.test(id) ? 1 : /empty|tenancy|move/.test(id) ? 2 : /construction|renovation/.test(id) ? 3 : /office/.test(id) ? 4 : /community/.test(id) ? 5 : /house|regular/.test(id) ? 0 : 6);

export function contextFor({ customerId, jobId, budgetId }) {
  const x = { lines: [] };
  const cust = (id) => S.customers.find((c) => c.id === id);
  if (budgetId) {
    const b0 = S.budgets.find((b) => b.id === budgetId);
    if (b0) {
      const b = shown(b0), r = resultOf(b0), mdl = docModel(b0);
      const c = cust(b0.customerId) || {};
      Object.assign(x, { source: t('d.fromBudget', { n: b0.number || t('b.noNumber') }), name: b.customer?.name || c.name, phone: b.customer?.phone || c.phone, email: b.customer?.email || c.email, address: c.address || '' });
      x.svcAddress = [b.property.address, b.property.municipality].filter(Boolean).join(', ');
      x.ref = b0.number || '';
      x.serviceDate = b.property.startDate ? date(b.property.startDate) : '';
      x.area = b.property.area ? num(b.property.area) : '';
      x.rooms = b.property.rooms || ''; x.baths = b.property.bathrooms || '';
      x.ptype = b.property.type ? t('b.ptype.' + b.property.type) : '';
      x.serviceName = mdl.service; x.serviceIdx = SERVICE_IDX[b.module] ?? 6;
      x.freqIdx = { once: 0, weekly: 1, biweekly: 2, monthly: 3 }[b.property.frequency] ?? '';
      x.base = r.base / 100; x.tax = r.tax / 100; x.total = r.total / 100; x.taxRate = r.taxRate;
      x.included = mdl.included.join('\n'); x.excluded = mdl.excluded;
      if (r.labour) { x.staff = r.labour.workers; x.duration = `${num(r.labour.workers)} × ${num(r.labour.hoursPerWorker)} h`; }
      // Lines in the same order as the quotation document: services, labour, minimum, extras, discount.
      const amounts = [...r.lines.map((l) => (l.kind === 'inspect' ? null : l.amount)), ...(r.labour ? [r.labour.amount] : []), ...(r.minAdj ? [r.minAdj] : []), ...r.extras.map((e) => e.amount)];
      mdl.lines.forEach((l, i) => {
        const src = r.lines[i];
        const cents = amounts[i];
        const qty = src && ['unit', 'm2', 'lm'].includes(src.kind) && Number(src.qty) > 0 ? Number(src.qty) : 1;
        x.lines.push({ desc: l.label, qty: cents == null ? '' : num(qty), unit: cents == null ? '' : nf(cents / 100 / qty), amount: cents == null ? l.amount : nf(cents / 100) });
      });
      if (r.discount) x.lines.push({ desc: t('b.discount'), qty: '1', unit: '-' + nf(r.discount / 100), amount: '-' + nf(r.discount / 100) });
      customerId ||= b0.customerId;
    }
  } else if (jobId) {
    const j = S.jobs.find((y) => y.id === jobId);
    if (j) {
      const c = cust(j.customerId) || {};
      const s = S.services.find((y) => y.id === j.serviceId);
      const e = j.estimate || {};
      Object.assign(x, { source: t('d.fromJob'), name: c.name, phone: c.phone, email: c.email, address: c.address, svcAddress: j.address || c.address, ref: j.issued?.ref || '' });
      x.serviceDate = j.date ? date(j.date) : '';
      x.area = j.m?.areaM2 ? num(j.m.areaM2) : '';
      x.serviceName = svcName(s); x.serviceIdx = svcIdxOfJob(j.serviceId);
      if (e.total) {
        x.base = e.subtotal; x.tax = e.taxAmount; x.total = e.total; x.taxRate = e.taxRate;
        x.lines.push({ desc: x.serviceName + (x.area ? ` (${x.area} m²)` : ''), qty: '1', unit: nf(e.subtotal), amount: nf(e.subtotal) });
      }
      if (e.workers) { x.staff = e.workers; x.duration = `${num(e.workers)} × ${num(e.onSiteHours, 1)} h`; x.hours = num(e.workerHours, 1); }
      customerId ||= j.customerId;
    }
  }
  // A quotation typed with a customer's name belongs to that customer.
  if (!customerId && x.name) customerId = S.customers.find((c) => norm(c.name) === norm(x.name))?.id || '';
  const c = customerId && cust(customerId);
  if (c) {
    // Details missing from the quotation or calculation come from the customer's card.
    for (const [k, v] of Object.entries({ name: c.name, phone: c.phone, email: c.email, address: c.address, svcAddress: c.address })) if (!x[k] && v) x[k] = v;
    x.source ||= c.name;
  }
  x.customerId = customerId || '';
  return x;
}

function valueFor(f, x, d) {
  const B = S.settings.business;
  const L = f.label;
  if (f.block === 'meta' && f.i === 0) return d.number;
  if (f.role === 'issuer') {
    if (L === 'Owner / legal name') return B.name || '';
    if (L === 'NIF/NIE/CIF') return B.taxId || '';
    if (L === 'Tax address') return B.address || '';
    if (L === 'Phone') return B.phone || f.def;
    if (L === 'Email') return B.email || f.def;
    return '';
  }
  if (f.kind === 'checks') {
    if (L === 'Service' && x.serviceIdx !== undefined) return [x.serviceIdx];
    if (L === 'Frequency' && x.freqIdx !== undefined && x.freqIdx !== '') return [x.freqIdx];
    return null;
  }
  const money2 = (v) => (v || v === 0 ? money(v) : '');
  const map = {
    Date: date(today()), 'Issue date': date(today()), 'Valid until': date(new Date(Date.now() + (S.tariffs?.validityDays || 30) * 864e5).toISOString()),
    'Service date': x.serviceDate, 'Reserved date': x.serviceDate, 'Agreed cleaning date': x.serviceDate, 'Date carried out': x.serviceDate,
    'Quotation no.': x.ref, 'Related quotation / invoice no.': x.ref, 'Order / quotation no.': x.ref, 'Service / order no.': x.ref, 'Order / invoice no.': x.ref, 'Ref.': x.ref,
    'Customer / company': x.name, 'Name / company name': x.name, 'Full name': x.name, Customer: x.name,
    Address: x.address, Phone: x.phone, 'Telephone number': x.phone, Email: x.email,
    'Service address': x.svcAddress || x.address, 'Property address': x.svcAddress || x.address,
    'Service address (if different)': x.svcAddress && x.svcAddress !== x.address ? x.svcAddress : '',
    'Type of property': x.ptype, 'Size (m²)': x.area, m2: x.area, Rooms: x.rooms, Bathrooms: x.baths,
    IBAN: B.iban || '',
    'Agreed price (€)': x.total ? nf(x.total) : '', Price: x.total ? nf(x.total) : '',
    'Estimated duration': x.duration, 'Estimated duration / staff': x.duration, 'No. of staff': x.staff, 'Total hours': x.hours,
    'Concept / service paid for': [x.serviceName, x.ref].filter(Boolean).join(' · '),
    'Included tasks and areas': x.included, 'Excluded tasks / limitations / condition of the property': x.excluded,
  };
  if (f.block === 'totals') {
    const tot = { 'Total price of the service': x.total, Subtotal: x.base, 'Taxable base': x.base, 'IVA (__ %)': x.tax, TOTAL: x.total, 'TOTAL INVOICE': x.total };
    return L in tot ? money2(tot[L]) : '';
  }
  return map[L] ?? '';
}

// Fills the empty fields of a document; returns how many were filled.
function fill(d, x) {
  const en = docType(d.type, 'en');
  let n = 0;
  walk(en.body, (f) => {
    if (f.kind === 'static') return;
    if (f.kind === 'table') {
      const cur = d.v[f.key];
      const empty = !cur || cur.every((row) => row.every((c) => !c));
      const isLines = f.cols.some((c) => /^Amount/.test(c[0])) && f.cols.some((c) => /^(Description|Service \/ task)/.test(c[0]));
      if (empty && isLines && x.lines.length) {
        d.v[f.key] = x.lines.slice(0, f.rows).map((l) => f.cols.map((c) => (/^Desc|^Service/.test(c[0]) ? l.desc : /^Qty|^Hours/.test(c[0]) ? l.qty : /^Unit/.test(c[0]) ? l.unit : /^IVA/.test(c[0]) ? num(x.taxRate ?? '') : /^Amount/.test(c[0]) ? l.amount : '')));
        n++;
      }
      return;
    }
    const cur = d.v[f.key];
    const isEmpty = cur === undefined || cur === '' || (Array.isArray(cur) && !cur.length);
    if (!isEmpty) return;
    const val = valueFor(f, x, d);
    if (val === null || val === undefined || val === '' || (Array.isArray(val) && !val.length)) { if (cur === undefined && f.def) d.v[f.key] = f.def; return; }
    d.v[f.key] = val; n++;
  });
  if (x.taxRate !== undefined && d.v._rate === undefined) d.v._rate = num(x.taxRate);
  return n;
}

export async function newDoc(type, ctx = {}) {
  const x = contextFor(ctx);
  const cust = S.customers.find((c) => c.id === x.customerId);
  const d = { id: uid(), type, lang: cust?.language === 'en' ? 'en' : uiDocLang() === 'en' && S.settings.locale.language === 'en' ? 'en' : 'es', number: nextNumber(type), createdAt: new Date().toISOString(), customerId: x.customerId, jobId: ctx.jobId || '', budgetId: ctx.budgetId || '', v: {}, sig: {} };
  if (type === 4 && x.ref) d.number = x.ref;
  fill(d, x);
  await saveDoc(d);
  return d;
}

// ---------- screens ----------
const ctxParams = () => Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || ''));
export const custName = (d) => S.customers.find((c) => c.id === d.customerId)?.name || d.v[firstNameKey(d)] || '';
function firstNameKey(d) {
  let k = '';
  walk(docType(d.type, 'en').body, (f) => { if (!k && ['Customer / company', 'Name / company name', 'Full name', 'Customer'].includes(f.label)) k = f.key; });
  return k;
}
export function docCard(d) {
  return `<a class="card job-card" href="#/doc/${d.id}"><div class="row between"><b>${DOC_ICONS[d.type - 1]} ${esc(docTitle(d.type))}</b><span class="small muted">${esc(d.number)}</span></div>
  <div class="small muted">${esc(custName(d) || t('noCustomer'))} · ${date(d.updatedAt || d.createdAt)}</div></a>`;
}

function renderHub() {
  const p = ctxParams();
  const x = p.job || p.budget || p.customer ? contextFor({ customerId: p.customer, jobId: p.job, budgetId: p.budget }) : null;
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const list = [...S.docs].filter((d) => !x || (p.job && d.jobId === p.job) || (p.budget && d.budgetId === p.budget) || (x.customerId && d.customerId === x.customerId)).sort((a, b) => ((a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1));
  return `<h1>📁 ${t('sec.docs')}</h1>
  ${x ? `<div class="card"><p class="small">${t('d.for', { name: `<b>${esc(x.name || x.source || '')}</b>` })}${x.source && x.source !== x.name ? ` · ${esc(x.source)}` : ''}</p><p class="small muted">${t('d.forHelp')}</p></div>` : `<p class="small muted">${t('d.intro')}</p>`}
  ${S.settings.business.taxId || S.settings.business.ssNumber ? '' : `<a class="card warn-card" href="#/settings"><p class="small">${t('d.ownerMissing')}</p><b>${t('d.ownerAdd')} ›</b></a>`}
  <h2>${t('d.new')}</h2>
  <div class="grid">${DOCS.es.map((dt) => `<button class="grid-item" data-act="dNew" data-type="${dt.n}" data-q="${esc(q.toString())}"><span class="ico">${DOC_ICONS[dt.n - 1]}</span><span>${esc(docTitle(dt.n))}</span></button>`).join('')}</div>
  <h2>${t('d.saved')}</h2>
  ${S.docs.length > 4 && !x ? `<label class="field"><input data-dsearch placeholder="${t('d.searchPh')}" autocomplete="off"></label>` : ''}
  <div id="dList">${list.map(docCard).join('') || `<p class="muted small">${t('d.none')}</p>`}</div>`;
}

function fieldHtml(f, d, lang) {
  const v = d.v[f.key];
  const style = `style="--w:${f.w ?? 1}"`;
  if (f.kind === 'static') return `<div class="field df" ${style}><span>${esc(f.label)}</span><div class="static">${esc(S.settings.business.name || f.def)}</div></div>`;
  if (f.kind === 'checks') {
    const sel = Array.isArray(v) ? v : [];
    return `<div class="field df" ${style}>${f.label ? `<span>${esc(f.label)}</span>` : ''}<div class="dchecks">${f.options.map((o, i) => `<label class="check"><input type="checkbox" data-dck="${f.key}" data-i="${i}" ${sel.includes(i) ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div></div>`;
  }
  const label = esc(f.label.replace('__', d.v._rate ?? '__'));
  if (f.kind === 'area') return `<label class="field df" ${style}><span>${label}</span><textarea data-dv="${f.key}" rows="${Math.max(2, f.lines || 2)}">${esc(v ?? '')}</textarea></label>`;
  return `<label class="field df" ${style}><span>${label}</span><input data-dv="${f.key}" value="${esc(v ?? '')}" autocomplete="off"></label>`;
}

function tableHtml(bi, cols, rows, d) {
  const key = `t${bi}`;
  const data = d.v[key] || [];
  if (Array.isArray(rows)) {
    // Checklist: fixed rows of tasks, "#" rows are area headings.
    let r = -1;
    return `<div class="dtable">${rows.map((label) => {
      if (label.startsWith('#')) return `<h4>${esc(label.slice(1))}</h4>`;
      r++;
      const row = data[r] || [];
      return `<div class="drow"><div class="dtask">${esc(label)}</div><div class="dcells">${cols.slice(1).map((c, ci) => (c[2] === 'check'
        ? `<label class="check mini"><input type="checkbox" data-dtc="${bi}" data-r="${r}" data-c="${ci + 1}" ${row[ci + 1] ? 'checked' : ''}> ${esc(c[0])}</label>`
        : `<input class="dnote" data-dtc="${bi}" data-r="${r}" data-c="${ci + 1}" value="${esc(row[ci + 1] || '')}" placeholder="${esc(c[0])}">`)).join('')}</div></div>`;
    }).join('')}</div>`;
  }
  const filled = data.reduce((n, row, i) => (row?.some((c) => c) ? i + 1 : n), 0);
  const shownRows = Math.min(rows, Math.max(d.v['_rows' + bi] || 0, filled + 1, 1));
  let html = '<div class="dtable">';
  for (let r = 0; r < shownRows; r++) {
    const row = data[r] || [];
    html += `<div class="drow lines"><span class="rn">${r + 1}</span>${cols.map((c, ci) => (c[2] === 'num' ? '' : `<label class="field mini-f" style="--w:${c[1]}"><span>${esc(c[0].replace('__', d.v._rate ?? '__'))}</span><input data-dtc="${bi}" data-r="${r}" data-c="${ci}" value="${esc(row[ci] || '')}" ${/€|%|Qty|Quantity|Hours/.test(c[0]) ? 'inputmode="decimal"' : ''}></label>`)).join('')}</div>`;
  }
  html += '</div>';
  if (shownRows < rows) html += `<button class="btn btn-small btn-outline" data-act="dAddRow" data-b="${bi}">${t('d.addRow')}</button>`;
  return html;
}

function clauseHtml(bi, ci, title, text, d) {
  let fi = 0;
  const parts = text.split(/(\[\[[^\]]+\]\])/).map((tok) => {
    const mm = tok.match(/^\[\[([^|\]]+)\|?(\d*)\]\]$/);
    if (!mm) return esc(tok);
    const key = `c${bi}_${ci}_${fi++}`;
    const w = Math.min(Number(mm[2] || 90), 320);
    return `<input class="inl" data-dv="${key}" value="${esc(d.v[key] ?? '')}" placeholder="${esc(mm[1])}" style="width:${Math.max(70, w * 0.9)}px">`;
  });
  return `<div class="clause"><b>${ci + 1}. ${esc(title)}</b><p>${parts.join('')}</p></div>`;
}

function sigHtml(bi, labels, d, lang) {
  const tr = DOCS.TR[lang];
  return `<div class="dsigs">${labels.filter((l, i) => l || i === 0).map((l, side) => {
    const k = `g${bi}_${side}`;
    return `<div class="dsig"><b class="small">${esc(l || tr.signhere)}</b><div class="sig-wrap"><canvas class="sig" data-dsig="${k}"></canvas><button class="btn btn-small btn-outline no-print" data-act="dSigClear" data-k="${k}">${t('key.clear')}</button></div>
    <div class="two"><label class="field"><span>${esc(tr.name)}</span><input data-dv="${k}_n" value="${esc(d.v[k + '_n'] || '')}"></label><label class="field"><span>${esc(tr.date)}</span><input data-dv="${k}_d" value="${esc(d.v[k + '_d'] || '')}"></label></div></div>`;
  }).join('')}</div>`;
}

function formHtml(d) {
  const dt = docType(d.type, d.lang);
  const B = S.settings.business;
  let html = `<div class="doc-form" data-did="${d.id}" lang="${d.lang}" dir="ltr"><header><img class="q-logo" src="icons/logo-128.png" alt=""><div><h2>${esc(B.name)}</h2><div class="small">${esc(DOCS.TR[d.lang].tagline)}</div>${withLang(d.lang, () => ownerLine()) ? `<div class="small">${esc(withLang(d.lang, () => ownerLine()))}</div>` : ''}</div></header>
  <div class="row between"><h2 class="dtitle">${esc(dt.title)}</h2><span class="small muted">${esc(dt.code)}</span></div>${dt.subtitle ? `<p class="small muted">${esc(dt.subtitle)}</p>` : ''}`;
  dt.body.forEach((b, bi) => {
    const k = b[0];
    if (k === 'h') html += `<h3>${esc(b[1])}</h3>`;
    else if (k === 'p') html += `<p class="small ${b[2] === 'note' ? 'muted' : ''}">${b[2] === 'bold' ? `<b>${esc(b[1])}</b>` : esc(b[1])}</p>`;
    else if (k === 'meta') html += `<div class="frow">${b[1].map((m, i) => fieldHtml({ key: `m${bi}_${i}`, label: m[0], w: m[1], kind: 'text' }, d)).join('')}</div>`;
    else if (k === 'box') html += `<div class="dbox">${b[1].map((row, r) => `<div class="frow">${row.map((f, c) => fieldHtml({ ...f, key: `f${bi}_${r}_${c}`, def: f.value }, d)).join('')}</div>`).join('')}</div>`;
    else if (k === 'totals') html += `<div class="dtotals">${b[1].map((x, i) => `<label class="trow ${x[1] ? 'grand' : ''}"><span>${esc(x[0].replace('__', d.v._rate ?? '__'))}</span><input data-dv="s${bi}_${i}" value="${esc(d.v[`s${bi}_${i}`] ?? '')}" inputmode="decimal"></label>`).join('')}</div>`;
    else if (k === 'table') html += tableHtml(bi, b[1], b[2], d);
    else if (k === 'clauses') html += b[1].map(([title, text], ci) => clauseHtml(bi, ci, title, text, d)).join('');
    else if (k === 'sig') html += sigHtml(bi, [b[1], b[2]], d, d.lang);
  });
  return html + '</div>';
}

function hasLineTotals(d) {
  const en = docType(d.type, 'en');
  return en.body.some((b) => b[0] === 'table' && b[1].some((c) => /^Amount/.test(c[0]))) && en.body.some((b) => b[0] === 'totals');
}

// The owner's details (typed once in App settings) go into every document's empty issuer fields.
function fillOwner(d) {
  let n = 0;
  walk(docType(d.type, 'en').body, (f) => {
    if (!(f.role === 'issuer' || f.label === 'IBAN') || f.kind === 'static') return;
    if (d.v[f.key]) return;
    const v = valueFor(f, {}, d);
    if (v) { d.v[f.key] = v; n++; }
  });
  return n;
}

function renderDoc(id) {
  if (!D || D.id !== id) D = S.docs.find((x) => x.id === id) ? JSON.parse(JSON.stringify(S.docs.find((x) => x.id === id))) : null;
  if (D && fillOwner(D)) saveDoc(D);
  if (!D) return `<div class="card"><p>${t('notFound')}</p><a class="btn" href="#/docs">${t('sec.docs')}</a></div>`;
  const recentB = [...S.budgets].sort((a, b) => ((a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1)).slice(0, 15);
  const recentJ = [...S.jobs].sort((a, b) => ((a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1)).slice(0, 15);
  const cn = (cid) => S.customers.find((c) => c.id === cid)?.name || '';
  return `<a class="crumb no-print" href="#/docs">‹ ${t('sec.docs')}</a>
  <section class="card no-print">
    <div class="two"><label class="field"><span>${t('d.language')}</span><select data-dlang>${DOC_LANGS.map(([c, n]) => `<option value="${c}" ${c === D.lang ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="field"><span>${t('d.customer')}</span><select data-dcust><option value="">—</option>${[...S.customers].sort((a, b) => a.name.localeCompare(b.name)).map((c) => `<option value="${c.id}" ${c.id === D.customerId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label></div>
    <label class="field"><span>${t('d.fillFrom')}</span><select data-dfill><option value="">—</option>
      ${recentB.length ? `<optgroup label="${t('sec.budgets')}">${recentB.map((b) => `<option value="b:${b.id}">${esc(b.number || t('b.noNumber'))} · ${esc(b.customer?.name || '')}</option>`).join('')}</optgroup>` : ''}
      ${recentJ.length ? `<optgroup label="${t('sec.saved')}">${recentJ.map((j) => `<option value="j:${j.id}">${esc(cn(j.customerId) || t('noCustomer'))} · ${esc(svcName(S.services.find((s) => s.id === j.serviceId)))}</option>`).join('')}</optgroup>` : ''}
    </select></label><p class="small muted">${t('d.fillHelp')}</p>
    ${D.type === 2 ? `<p class="small warn-text">${t('d.invoiceNote')}</p>` : ''}
  </section>
  ${formHtml(D)}
  <div class="actions no-print">
    ${hasLineTotals(D) ? `<button class="btn btn-outline" data-act="dCalc">🧮 ${t('d.calcTotals')}</button>` : ''}
    <button class="btn btn-xl" data-act="dPdf">${t('d.pdf')}</button>
    <button class="btn btn-outline" data-act="dPrint">${t('q.print')}</button>
    <button class="btn btn-outline" data-act="dBlank">${t('d.blank')}</button>
    <button class="btn btn-outline" data-act="dDuplicate">${t('d.duplicate')}</button>
    <button class="btn btn-danger" data-act="dDelete">${t('d.delete')}</button>
  </div>`;
}

function mountDoc() {
  if (!D) return;
  document.querySelectorAll('canvas[data-dsig]').forEach((c) => signaturePad(c, D.sig[c.dataset.dsig], (url) => { D.sig[c.dataset.dsig] = url; queueSave(); }));
}

// ---------- input ----------
export function handleDocEvent(ev, isChange) {
  const el = ev.target;
  if (el.matches?.('[data-dsearch]')) {
    const s = el.value.trim().toLowerCase();
    const list = [...S.docs].filter((d) => !s || [docTitle(d.type), d.number, custName(d)].join(' ').toLowerCase().includes(s)).sort((a, b) => ((a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1));
    document.getElementById('dList').innerHTML = list.map(docCard).join('') || `<p class="muted small">${t('d.none')}</p>`;
    return true;
  }
  if (!D || !el.closest?.('[data-did], .card')) return false;
  if (el.dataset.dv !== undefined) { D.v[el.dataset.dv] = el.value; queueSave(); return true; }
  if (el.dataset.dck !== undefined) {
    if (!isChange) return true;
    const k = el.dataset.dck, i = Number(el.dataset.i);
    const set = new Set(Array.isArray(D.v[k]) ? D.v[k] : []);
    el.checked ? set.add(i) : set.delete(i);
    D.v[k] = [...set].sort(); queueSave(); return true;
  }
  if (el.dataset.dtc !== undefined) {
    if (el.type === 'checkbox' && !isChange) return true;
    const k = 't' + el.dataset.dtc, r = Number(el.dataset.r), c = Number(el.dataset.c);
    const rows = (D.v[k] ||= []);
    rows[r] ||= [];
    for (let i = 0; i < rows.length; i++) rows[i] ||= [];
    rows[r][c] = el.type === 'checkbox' ? el.checked : el.value;
    queueSave(); return true;
  }
  if (!isChange) return false;
  if (el.matches('[data-dlang]')) { D.lang = el.value; saveDoc(D).then(rerender); return true; }
  if (el.matches('[data-dcust]')) {
    D.customerId = el.value;
    const n = fill(D, contextFor({ customerId: el.value }));
    saveDoc(D).then(() => { toast(t('d.filled', { n })); rerender(); });
    return true;
  }
  if (el.matches('[data-dfill]')) {
    if (!el.value) return true;
    const [kind, id] = el.value.split(':');
    const x = contextFor(kind === 'b' ? { budgetId: id } : { jobId: id });
    if (kind === 'b') D.budgetId = id; else D.jobId = id;
    if (!D.customerId) D.customerId = x.customerId;
    const n = fill(D, x);
    saveDoc(D).then(() => { toast(t('d.filled', { n })); rerender(); });
    return true;
  }
  return false;
}

// Works out line amounts, base, IVA and total from the table of a quotation, invoice or payment list.
function calcTotals(d) {
  const en = docType(d.type, 'en');
  const tb = en.body.findIndex((b) => b[0] === 'table');
  const cols = en.body[tb][1];
  const ci = (re) => cols.findIndex((c) => re.test(c[0]));
  const iQ = ci(/^(Qty|Hours)/), iU = ci(/^Unit/), iA = ci(/^Amount/), iV = ci(/^IVA/);
  const rows = d.v['t' + tb] || [];
  let base = 0, rate = null;
  for (const row of rows) {
    if (!row) continue;
    const q = iQ >= 0 ? parseNum(row[iQ]) : null, u = iU >= 0 ? parseNum(row[iU]) : null;
    if ((row[iA] === undefined || row[iA] === '') && u !== null) row[iA] = nf((q ?? 1) * u);
    const a = parseNum(row[iA]);
    if (a !== null) base += a;
    if (iV >= 0 && rate === null && parseNum(row[iV]) !== null) rate = parseNum(row[iV]);
  }
  if (rate === null) rate = parseNum(d.v._rate) ?? S.settings.tax.rates?.find((r) => r.id === S.settings.tax.defaultRateId)?.rate ?? 21;
  d.v._rate = num(rate);
  const tax = Math.round(base * rate) / 100;
  const tot = en.body.findIndex((b) => b[0] === 'totals');
  en.body[tot][1].forEach(([label], i) => {
    const k = `s${tot}_${i}`;
    if (/^(Subtotal|Taxable base)$/.test(label)) d.v[k] = money(base);
    else if (/^IVA/.test(label)) d.v[k] = money(tax);
    else if (/^IRPF/.test(label)) { /* left to the owner */ }
    else if (/^TOTAL/.test(label)) d.v[k] = money(base + tax - (parseNum(d.v[`s${tot}_${i - 1}`]) && /^IRPF/.test(en.body[tot][1][i - 1]?.[0]) ? parseNum(d.v[`s${tot}_${i - 1}`]) : 0));
    else if (/^Total received$/.test(label)) d.v[k] = money(base);
  });
}

// ---------- PDF ----------
const NAVY = [11, 37, 69];
const BLUE = [21, 87, 176];
function buildDocPdf(Js, d, { logo, blank }) {
  return withLang(d.lang, () => {
    const dt = docType(d.type, d.lang);
    const tr = DOCS.TR[d.lang];
    const doc = new Js({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    const ML = 14, CW = W - 28, BOTTOM = H - 18;
    const T = pdfText;
    const val = (k) => (blank ? '' : d.v[k] ?? '');
    const rateTxt = blank ? '__' : d.v._rate ?? '__';
    let y = 0;
    const need = (h) => { if (y + h > BOTTOM) { doc.addPage(); y = 16; return true; } return false; };
    const font = (size, style = 'normal', color = [25, 30, 40]) => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); };
    // Header band
    doc.setFillColor(...BLUE); doc.rect(0, 0, W, 26, 'F');
    if (logo) { doc.setFillColor(255, 255, 255); doc.circle(22, 13, 10.5, 'F'); doc.addImage(logo, 'JPEG', 12.5, 3.5, 19, 19); }
    const x0 = logo ? 36 : ML;
    font(15, 'bold', [255, 255, 255]); doc.text(T(S.settings.business.name), x0, 12);
    const owner = ownerLine();
    font(8.2, 'normal', [255, 255, 255]); doc.text(T(tr.tagline), x0, owner ? 17.5 : 18.5, { maxWidth: W - x0 - 12 });
    if (owner) { font(7.8, 'normal', [255, 255, 255]); doc.text(T(owner), x0, 22.5, { maxWidth: W - x0 - 12 }); }
    y = 36;
    font(16, 'bold', NAVY);
    const tl = doc.splitTextToSize(T(dt.title.toUpperCase()), CW - 24);
    doc.text(tl, ML, y);
    font(9, 'normal', [110, 120, 135]); doc.text(T(dt.code), W - ML, y, { align: 'right' });
    y += 5.5 + (tl.length - 1) * 6.5;
    if (dt.subtitle) { font(9, 'normal', [90, 100, 115]); doc.text(T(dt.subtitle), ML, y, { maxWidth: CW }); y += 5; }
    y += 2;

    // A row of boxed fields: small label on top, the value below.
    const cellRow = (cells) => {
      font(9.5);
      const heights = cells.map((c) => {
        if (c.kind === 'checks') return checksHeight(c, c.w * CW);
        const lines = c.value ? doc.splitTextToSize(T(String(c.value)), c.w * CW - 4).length : 1;
        const min = c.kind === 'area' ? 6 + (c.lines || 2) * 4.4 : 10;
        return Math.max(min, 5.8 + lines * 4.2);
      });
      const h = Math.max(...heights);
      need(h);
      let x = ML;
      cells.forEach((c) => {
        const w = c.w * CW;
        doc.setDrawColor(200, 207, 218); doc.setLineWidth(0.25); doc.rect(x, y, w, h);
        if (c.label) { font(6.8, 'normal', [100, 110, 125]); doc.text(T(c.label), x + 2, y + 3.4, { maxWidth: w - 4 }); }
        if (c.kind === 'checks') drawChecks(c, x, y, w);
        else if (c.value) { font(9.5, c.kind === 'static' ? 'bold' : 'normal'); doc.text(doc.splitTextToSize(T(String(c.value)), w - 4), x + 2, y + 7.6); }
        x += w;
      });
      y += h;
    };
    const optLayout = (c, w) => {
      font(8.6);
      const rows = [[]]; let lx = 0;
      c.options.forEach((o, i) => {
        const ow = 4.5 + doc.getTextWidth(T(o)) + 4;
        if (lx + ow > w - 4 && rows[rows.length - 1].length) { rows.push([]); lx = 0; }
        rows[rows.length - 1].push({ o, i, x: lx }); lx += ow;
      });
      return rows;
    };
    const checksHeight = (c, w) => (c.label ? 5 : 1.5) + optLayout(c, w).length * 5 + 1.5;
    const box = (x, yy, on) => { doc.setDrawColor(90, 100, 115); doc.setLineWidth(0.3); doc.rect(x, yy - 2.7, 3, 3); if (on) { doc.setLineWidth(0.45); doc.line(x + 0.5, yy - 2.2, x + 2.5, yy - 0.2); doc.line(x + 2.5, yy - 2.2, x + 0.5, yy - 0.2); } };
    const drawChecks = (c, x, yy, w) => {
      const sel = Array.isArray(c.value) ? c.value : [];
      optLayout(c, w).forEach((row, ri) => row.forEach(({ o, i, x: lx }) => {
        const by = yy + (c.label ? 8.2 : 4.5) + ri * 5;
        box(x + 2 + lx, by, sel.includes(i));
        font(8.6); doc.text(T(o), x + 2 + lx + 4.5, by);
      }));
    };

    dt.body.forEach((b, bi) => {
      const k = b[0];
      if (k === 'h') { need(14); y += 5.5; font(10.5, 'bold', NAVY); doc.text(T(b[1].toUpperCase()), ML, y); doc.setDrawColor(...NAVY); doc.setLineWidth(0.4); doc.line(ML, y + 1.4, W - ML, y + 1.4); y += 4; }
      else if (k === 'p') {
        const st = b[2];
        font(st === 'note' ? 7.8 : 8.8, st === 'bold' ? 'bold' : st === 'note' ? 'italic' : 'normal', st === 'note' ? [95, 105, 120] : [25, 30, 40]);
        const lines = doc.splitTextToSize(T(b[1]), CW);
        need(lines.length * 4 + 3); y += 3; doc.text(lines, ML, y + 1); y += lines.length * (st === 'note' ? 3.5 : 4) + 1;
      } else if (k === 'meta') cellRow(b[1].map((m, i) => ({ label: m[0], w: m[1], value: blank ? (m[2] || '') : val(`m${bi}_${i}`) })));
      else if (k === 'box') {
        y += 1;
        b[1].forEach((row, r) => cellRow(row.map((f, c) => ({ ...f, value: f.kind === 'static' ? S.settings.business.name || f.value : blank ? (f.value || '') : val(`f${bi}_${r}_${c}`) }))));
      } else if (k === 'totals') {
        const w = 92, x = W - ML - w;
        y += 2;
        b[1].forEach(([label, bold], i) => {
          need(8);
          if (bold) { doc.setFillColor(...BLUE); doc.rect(x, y, w, 8, 'F'); font(10, 'bold', [255, 255, 255]); }
          else { doc.setDrawColor(200, 207, 218); doc.rect(x, y, w, 7); font(9); }
          const v = val(`s${bi}_${i}`);
          doc.text(T(label.replace('__', rateTxt)), x + 2.5, y + (bold ? 5.4 : 4.8));
          if (v) doc.text(T(String(v)), x + w - 2.5, y + (bold ? 5.4 : 4.8), { align: 'right' });
          y += bold ? 8 : 7;
        });
        y += 1;
      } else if (k === 'table') {
        const cols = b[1];
        const data = d.v['t' + bi] || [];
        let body;
        if (Array.isArray(b[2])) {
          let r = -1;
          body = b[2].map((label) => {
            if (label.startsWith('#')) return [{ content: T(label.slice(1)), colSpan: cols.length, styles: { fontStyle: 'bold', fillColor: [232, 238, 247], textColor: NAVY } }];
            r++;
            const row = blank ? [] : data[r] || [];
            return cols.map((c, ci) => (ci === 0 ? T(label) : c[2] === 'check' ? (row[ci] ? 'X' : '') : T(row[ci] || '')));
          });
        } else {
          const n = blank ? b[2] : Math.max(1, data.reduce((m, row, i) => (row?.some((c) => c) ? i + 1 : m), 0));
          body = Array.from({ length: n }, (_, r) => cols.map((c, ci) => (c[2] === 'num' ? String(r + 1) : T(blank ? '' : data[r]?.[ci] || ''))));
        }
        const right = cols.map((c) => /€|%|Qty|Hours|Quantity|Cant|Importe|Precio|horas/i.test(c[0]));
        need(20); y += 2;
        doc.autoTable({
          startY: y, margin: { left: ML, right: ML, bottom: 20 }, theme: 'grid',
          head: [cols.map((c) => T(c[0].replace('__', rateTxt)))], body,
          styles: { font: 'helvetica', fontSize: 8.4, cellPadding: 1.6, minCellHeight: Array.isArray(b[2]) ? 5.2 : 7, lineColor: [200, 207, 218], lineWidth: 0.2, textColor: [25, 30, 40] },
          headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8 },
          columnStyles: Object.fromEntries(cols.map((c, ci) => [ci, { cellWidth: c[1] * CW, halign: c[2] === 'check' || c[2] === 'num' ? 'center' : right[ci] ? 'right' : 'left' }])),
          didDrawPage: () => {},
        });
        y = doc.lastAutoTable.finalY + 2;
      } else if (k === 'clauses') {
        b[1].forEach(([title, text], ci) => {
          let fi = 0;
          const filled = text.replace(/\[\[([^|\]]+)\|?(\d*)\]\]/g, (_, label, w) => { const v = val(`c${bi}_${ci}_${fi++}`); return v ? String(v) : '_'.repeat(Math.max(6, Math.round(Number(w || 90) / 6))); });
          font(8.6);
          const lines = doc.splitTextToSize(T(filled), CW);
          need(6 + lines.length * 3.9);
          y += 2.5; font(9, 'bold', NAVY); doc.text(T(`${ci + 1}. ${title}`), ML, y); y += 4;
          font(8.6); doc.text(lines, ML, y); y += lines.length * 3.9;
        });
      } else if (k === 'sig') {
        const sides = [b[1], b[2]].filter((l, i) => l || i === 0);
        const w = (CW - 8) / 2;
        need(34); y += 4;
        sides.forEach((label, side) => {
          const x = ML + side * (w + 8);
          const kk = `g${bi}_${side}`;
          font(8.4, 'bold', NAVY); doc.text(doc.splitTextToSize(T(label || tr.signhere), w), x, y);
          const img = !blank && d.sig[kk];
          if (img) doc.addImage(img, 'PNG', x, y + 2, Math.min(w, 60), 15);
          doc.setDrawColor(120, 130, 145); doc.setLineWidth(0.3); doc.line(x, y + 18, x + w, y + 18);
          font(8, 'normal', [90, 100, 115]);
          const nm = blank ? '' : d.v[kk + '_n'] || '', dd = blank ? '' : d.v[kk + '_d'] || '';
          doc.text(T(`${tr.name}: ${nm}`), x, y + 23); doc.text(T(`${tr.date}: ${dd}`), x + w * 0.62, y + 23);
          if (!nm) doc.line(x + doc.getTextWidth(T(tr.name + ': ')) + 1, y + 23.6, x + w * 0.58, y + 23.6);
          if (!dd) doc.line(x + w * 0.62 + doc.getTextWidth(T(tr.date + ': ')) + 1, y + 23.6, x + w, y + 23.6);
        });
        y += 28;
      }
    });
    // Footer on every page
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setDrawColor(200, 207, 218); doc.setLineWidth(0.3); doc.line(ML, H - 13, W - ML, H - 13);
      font(7.2, 'normal', [110, 120, 135]);
      const B = S.settings.business;
      const contact = [B.phone && `Tel./WhatsApp: ${B.phone}`, B.email, B.web].filter(Boolean).join(' · ') || tr.contact;
      doc.text(T(contact), W / 2, H - 9, { align: 'center', maxWidth: CW });
      doc.text(T(`${dt.code} · ${blank ? tr.footer : d.number}`), ML, H - 5.5);
      doc.text(T(`${tr.page} ${p}/${pages}`), W - ML, H - 5.5, { align: 'right' });
    }
    return doc;
  });
}

async function exportDoc(d, { blank = false } = {}) {
  const doc = buildDocPdf(await jsPDF(), d, { logo: await pdfLogo(), blank });
  const dt = docType(d.type, d.lang);
  const who = blank ? '' : '-' + (custName(d) || '').replace(/[^\wÀ-ſ-]+/g, '_');
  const name = blank ? `${String(d.type).padStart(2, '0')}_${dt.file}.pdf` : `${d.number}${who}.pdf`;
  const blob = doc.output('blob');
  const res = await shareOrDownload(blob, name, dt.title);
  if (res !== 'cancelled') toast(t(res === 'shared' ? 'q.shared' : 'q.downloaded'));
}
export { buildDocPdf };

// ---------- actions and routes ----------
export const docActions = {
  async dNew(el) {
    const p = Object.fromEntries(new URLSearchParams(el.dataset.q || ''));
    const d = await newDoc(Number(el.dataset.type), { customerId: p.customer, jobId: p.job, budgetId: p.budget });
    D = null; go('#/doc/' + d.id);
  },
  dAddRow(el) { D.v['_rows' + el.dataset.b] = (D.v['_rows' + el.dataset.b] || 1) + 1; const tb = (D.v['t' + el.dataset.b] ||= []); D.v['_rows' + el.dataset.b] = Math.max(D.v['_rows' + el.dataset.b], tb.length + 1); saveDoc(D).then(rerender); },
  dCalc() { calcTotals(D); saveDoc(D).then(() => { toast(t('d.totalsDone')); rerender(); }); },
  async dPdf() { clearTimeout(saveTimer); await saveDoc(D); await exportDoc(D); },
  async dShare() { clearTimeout(saveTimer); await saveDoc(D); await exportDoc(D); },
  async dBlank() { await exportDoc(D, { blank: true }); },
  dPrint() { window.print(); },
  async dDuplicate() {
    clearTimeout(saveTimer); await saveDoc(D);
    const copy = JSON.parse(JSON.stringify(D));
    Object.assign(copy, { id: uid(), number: nextNumber(D.type), createdAt: new Date().toISOString(), sig: {} });
    const en = docType(D.type, 'en');
    copy.v[`m${en.body.findIndex((b) => b[0] === 'meta')}_0`] = copy.number;
    for (const k of Object.keys(copy.v)) if (/^g\d+_\d+_[nd]$/.test(k)) delete copy.v[k];
    await saveDoc(copy); D = null; toast(t('duplicated')); go('#/doc/' + copy.id);
  },
  async dDelete() { if (!confirm(t('d.confirmDelete'))) return; clearTimeout(saveTimer); await deleteDoc(D.id); D = null; go('#/docs'); },
  dSigClear(el) { document.querySelector(`canvas[data-dsig="${el.dataset.k}"]`)?._clear?.(); },
};

export const docRoutes = { docs: () => renderHub(), doc: (id) => renderDoc(id) };
export async function docBeforeRoute(name) { if (name !== 'doc' && D) { clearTimeout(saveTimer); await saveDoc(D); D = null; } }
export function docAfterRender(name) { if (name === 'doc') mountDoc(); }
export const docsFor = (key, id) => S.docs.filter((d) => d[key] === id);
