// Customer quotations: preview, owner approval, PDF export, sharing and printing.
import { S, t, L, svcName, money, num, hrs, dur, area, date, esc, toast, saveJob, nextQuoteRef, summarise, taskLabel, checkText, shareOrDownload, lang, withLang, customerLang, languages, isRtl, dirOf } from './core.js';
import { calculate } from './engine.js';
import { FIELDS, TASK_CHECKLISTS } from './defaults.js';
import { pricingHtml, tilesHtml, go, rerender } from './app.js';

// Everything the quotation shows, resolved to text so an issued quotation never changes afterwards.
// Language of a job's customer documents: chosen on the quotation, else the customer's language.
export const docLang = (job) => {
  const cust = S.customers.find((c) => c.id === job.customerId);
  return job.quote?.language || customerLang(cust);
};

export function quoteModel(job, r) {
  return withLang(docLang(job), () => buildModel(job, r));
}

function buildModel(job, r) {
  const svc = r.service;
  const cust = S.customers.find((c) => c.id === job.customerId) || {};
  const q = job.quote || {};
  const B = S.settings.business;
  const measurements = FIELDS.filter((f) => svc.fields.includes(f.id) && Number(job.m?.[f.id]) > 0)
    .map((f) => ({ label: t('f.' + f.id), value: f.unit === 'area' ? area(job.m[f.id]) : num(job.m[f.id], 2) }));
  const c = job.cond || {};
  const condList = [t('cond.dirt') + ': ' + t('dirt.' + (c.dirt || 'normal'))];
  for (const k of ['furnished', 'occupied', 'constructionDust', 'grease', 'limescale', 'stains']) if (c[k]) condList.push(t('cond.' + k));
  if (c.access && c.access !== 'normal') condList.push(t('cond.access') + ': ' + t('access.' + c.access));
  const tasks = r.tasks.filter((x) => !x.removed && x.hours > 0).map((x) => ({
    label: taskLabel(x), hours: x.hours, details: x.checklist ? TASK_CHECKLISTS[x.checklist].map((k) => t('cl.' + k)).join(', ') : '',
  }));
  const p = r.pricing;
  const lines = p.lines.map((l) => ({ label: l.label || t(l.k, { ...l.p, rate: l.p?.rate !== undefined ? money(l.p.rate) : undefined, hours: l.p?.hours !== undefined ? num(l.p.hours, 2) : undefined }), amount: l.amount }));
  return {
    lang: lang(),
    business: { name: B.name, address: B.address, taxId: B.taxId, phone: B.phone, email: B.email, web: B.web },
    customer: { name: cust.name || '', phone: cust.phone || '', email: cust.email || '' },
    address: job.address || cust.address || '',
    service: svcName(svc), level: t('level.' + svc.level),
    description: q.description ?? '', exclusions: q.exclusions ?? '',
    paymentTerms: q.paymentTerms ?? B.paymentTerms, conditions: q.conditions ?? B.conditions, validityDays: Number(q.validityDays ?? B.validityDays) || 30,
    showTaskHours: q.showTaskHours !== false,
    measurements, conditionsText: condList.join(' · '), tasks,
    workerHours: r.workerHours, workers: r.workers, makespan: r.schedule.makespan, onSite: r.schedule.onSiteHours, days: r.schedule.days,
    lines, subtotal: p.subtotal, taxLabel: S.settings.tax.label, taxRate: p.taxRate, taxAmount: p.taxAmount, total: p.total, currency: S.settings.locale.currency,
    needsInspection: r.needsInspection, jobDate: job.date || '',
  };
}

function previewHtml(m, opts) {
  return withLang(m.lang, () => previewInner(m, opts));
}

function previewInner(m, { ref, at, draft }) {
  return `<div class="quote-doc ${draft ? 'draft' : ''}" dir="${dirOf()}" lang="${m.lang || lang()}">
    ${draft ? `<div class="watermark">${t('q.draftMark')}</div>` : ''}
    <header><img class="q-logo" src="icons/logo-128.png" alt=""><div><h2>${esc(m.business.name)}</h2><div class="small">${esc([m.business.address, m.business.phone, m.business.email, m.business.web, m.business.taxId && `NIF/CIF: ${m.business.taxId}`].filter(Boolean).join(' · '))}</div></div></header>
    <div class="row between wrap"><h3>${t('q.title')}</h3><div class="small r">${t('q.ref')}: <b>${esc(ref || t('q.pending'))}</b><br>${t('q.date')}: ${date(at || new Date().toISOString())}<br>${t('q.validity', { n: m.validityDays })}</div></div>
    <div class="two"><div><h4>${t('customer')}</h4><p>${esc(m.customer.name) || '—'}<br>${esc(m.customer.phone)}<br>${esc(m.customer.email)}</p></div>
      <div><h4>${t('c.address')}</h4><p>${esc(m.address) || '—'}${m.jobDate ? `<br>${t('job.date')}: ${date(m.jobDate)}` : ''}</p></div></div>
    <h4>${t('q.work')}</h4><p><b>${esc(m.service)}</b> · ${esc(m.level)}<br>${esc(m.conditionsText)}</p>${m.description ? `<p>${esc(m.description)}</p>` : ''}
    ${m.measurements.length ? `<h4>${t('q.measurements')}</h4><table class="tbl"><tbody>${m.measurements.map((x) => `<tr><td>${esc(x.label)}</td><td class="r">${esc(x.value)}</td></tr>`).join('')}</tbody></table>` : ''}
    <h4>${t('q.tasks')}</h4><table class="tbl"><tbody>${m.tasks.map((x) => `<tr><td>${esc(x.label)}${x.details ? `<br><span class="small muted">${esc(x.details)}</span>` : ''}</td>${m.showTaskHours ? `<td class="r">${hrs(x.hours)}</td>` : ''}</tr>`).join('')}</tbody></table>
    ${m.exclusions ? `<h4>${t('q.exclusions')}</h4><p>${esc(m.exclusions)}</p>` : ''}
    <h4>${t('q.estimate')}</h4><p>${t('q.estimateText', { wh: hrs(m.workerHours), w: m.workers, dur: m.days > 1 ? `${m.days} ${t('days')}` : dur(m.onSite) })}</p>
    <table class="tbl"><tbody>${m.lines.map((l) => `<tr><td>${esc(l.label)}</td><td class="r">${money(l.amount)}</td></tr>`).join('')}
      <tr class="strong"><td>${t('p.subtotal')}</td><td class="r">${money(m.subtotal)}</td></tr>
      <tr><td>${esc(m.taxLabel)} ${num(m.taxRate, 2)}%</td><td class="r">${money(m.taxAmount)}</td></tr>
      <tr class="total"><td>${t('r.total')}</td><td class="r">${money(m.total)}</td></tr></tbody></table>
    ${m.needsInspection ? `<p class="small">${t('q.inspectionNote')}</p>` : ''}
    ${m.paymentTerms ? `<h4>${t('set.paymentTerms')}</h4><p>${esc(m.paymentTerms)}</p>` : ''}
    ${m.conditions ? `<h4>${t('set.conditions')}</h4><p>${esc(m.conditions)}</p>` : ''}
    <div class="two sign"><div>${t('q.acceptance')}<br><br>${t('q.signName')}: ____________<br>${t('q.signDate')}: ____________<br>${t('q.signature')}: ____________</div><div>${esc(m.business.name)}<br><br>${t('q.signature')}: ____________</div></div>
  </div>`;
}

export function renderQuote(job) {
  const r = calculate(job, S.settings, S.services);
  if (!r.service) return `<p>${t('chk.noService')}</p>`;
  const q = (job.quote ||= {});
  const B = S.settings.business;
  const issued = job.issued;
  const live = quoteModel(job, r);
  const errors = r.checks.filter((c) => c.level === 'error');
  const unapprovedAi = r.checks.some((c) => c.k === 'chk.aiUnapproved');
  const changed = issued && Math.abs(issued.model.total - live.total) > 0.009;
  return `<a class="crumb" href="#/job/${job.id}">‹ ${t('job.title')}</a>
  <h1>${t('btn.createQuote')}</h1>
  ${issued ? `<div class="card ${changed ? 'warn-card' : ''}"><p>${t('issued.info', { ref: issued.ref, date: date(issued.at), total: money(issued.model.total) })}</p>${changed ? `<p>${t('issued.diff', { total: money(live.total) })}</p><button class="btn btn-small" data-act="approveQuote" data-id="${job.id}">${t('issued.reissue')}</button>` : ''}</div>` : `<div class="card warn-card"><p>${t('q.draftInfo')}</p></div>`}
  ${errors.length ? `<div class="card warn-card"><ul>${errors.map((c) => `<li>${esc(checkText(c))}</li>`).join('')}</ul></div>` : ''}
  <section class="card no-print" data-qid="${job.id}">
    ${issued ? '' : `<label class="field"><span>${t('q.language')}</span><select data-q="language">${languages().map((l) => `<option value="${l.id}" ${docLang(job) === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>`}
    <label class="field"><span>${t('q.description')}</span><textarea data-q="description" rows="3">${esc(q.description ?? '')}</textarea></label>
    <label class="field"><span>${t('q.exclusions')}</span><textarea data-q="exclusions" rows="2" placeholder="${t('q.exclusionsHint')}">${esc(q.exclusions ?? '')}</textarea></label>
    <label class="field"><span>${t('set.paymentTerms')}</span><textarea data-q="paymentTerms" rows="2">${esc(q.paymentTerms ?? B.paymentTerms)}</textarea></label>
    <label class="field"><span>${t('set.conditions')}</span><textarea data-q="conditions" rows="2">${esc(q.conditions ?? B.conditions)}</textarea></label>
    <label class="field"><span>${t('set.validity')}</span><input type="number" min="1" step="1" data-q="validityDays" value="${esc(q.validityDays ?? B.validityDays)}"></label>
    <label class="check"><input type="checkbox" data-q="showTaskHours" ${q.showTaskHours !== false ? 'checked' : ''}> ${t('q.showTaskHours')}</label>
  </section>
  <div class="actions no-print">
    ${!issued ? `<button class="btn btn-xl" data-act="approveQuote" data-id="${job.id}" ${errors.length || unapprovedAi ? 'disabled' : ''}>${t('q.approve')}</button>${unapprovedAi ? `<p class="small neg">${t('q.approveAiFirst')}</p>` : ''}` : ''}
    <button class="btn btn-xl btn-outline" data-act="quotePdf" data-id="${job.id}">${t('btn.exportPdf')}</button>
    <button class="btn btn-outline" data-act="quotePrint">${t('q.print')}</button>
  </div>
  <div id="quotePreview">${issued ? previewHtml(issued.model, { ref: issued.ref, at: issued.at, draft: false }) : previewHtml(live, { draft: true })}</div>`;
}

export function mountQuote(id) {
  const box = document.querySelector('[data-qid]');
  if (!box) return;
  const job = S.jobs.find((j) => j.id === id);
  const onEdit = async (ev) => {
    const el = ev.target;
    if (!el.dataset.q) return;
    job.quote ||= {};
    job.quote[el.dataset.q] = el.type === 'checkbox' ? el.checked : el.value;
    await saveJob(job);
    if (!job.issued) {
      const r = calculate(job, S.settings, S.services);
      document.getElementById('quotePreview').innerHTML = previewHtml(quoteModel(job, r), { draft: true });
    }
  };
  box.addEventListener('change', onEdit);
}

// ---------- PDF ----------
let pdfLib = null;
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(s); });
}
export async function jsPDF() {
  if (!pdfLib) {
    await loadScript('vendor/jspdf.umd.min.js');
    await loadScript('vendor/jspdf.plugin.autotable.min.js');
    pdfLib = window.jspdf.jsPDF;
  }
  return pdfLib;
}

// Standard PDF fonts only cover Western European characters; replace the rest.
// Right-to-left documents (Arabic) embed DejaVu Sans, which has the Arabic letters, so nothing is replaced.
const WIN = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
export const pdfText = (s) => {
  const v = String(s ?? '').replace(/[\u202f\u2009\u2007]/g, ' ');
  return isRtl() ? v.replace(/★/g, '*') : v.replace(/[^\x00-\xff]/g, (ch) => (WIN.has(ch) ? ch : ch === '★' ? '*' : ''));
};

// Loads the Arabic-capable font before building a PDF in a right-to-left language.
export async function pdfLanguage(code) {
  if (isRtl(code) && !window.LVA_FONT_AR) await loadScript('vendor/font-dejavu-ar.js');
}

// For right-to-left languages the page is mirrored: text starts on the right, tables read right to left.
// Called while the document's language is active (inside withLang).
export function rtlPdf(doc) {
  if (!isRtl() || !window.LVA_FONT_AR) return doc;
  doc.addFileToVFS('dv.ttf', window.LVA_FONT_AR.regular); doc.addFont('dv.ttf', 'DejaVu', 'normal');
  doc.addFileToVFS('dvb.ttf', window.LVA_FONT_AR.bold); doc.addFont('dvb.ttf', 'DejaVu', 'bold');
  const W = doc.internal.pageSize.getWidth();
  const o = { text: doc.text.bind(doc), setFont: doc.setFont.bind(doc), line: doc.line.bind(doc), circle: doc.circle.bind(doc), rect: doc.rect.bind(doc), addImage: doc.addImage.bind(doc), autoTable: doc.autoTable?.bind(doc) };
  const flip = { left: 'right', right: 'left', center: 'center', undefined: 'right' };
  doc.setFont = (name, style) => o.setFont(name === 'helvetica' ? 'DejaVu' : name, style === 'italic' ? 'normal' : style);
  doc.text = (txt, x, y, opts = {}) => (opts.align === 'center' ? o.text(txt, x, y, opts) : o.text(txt, W - x, y, { ...opts, align: flip[opts.align] }));
  doc.line = (x1, y1, x2, y2, st) => o.line(W - x1, y1, W - x2, y2, st);
  doc.circle = (x, y, r, st) => o.circle(W - x, y, r, st);
  doc.rect = (x, y, w, h, st) => o.rect(W - x - w, y, w, h, st);
  doc.addImage = (img, fmt, x, y, w, h, ...rest) => o.addImage(img, fmt, W - x - w, y, w, h, ...rest);
  if (o.autoTable) {
    doc.autoTable = (opts) => {
      const rev = (rows) => rows?.map((r) => [...r].reverse());
      const n = (opts.body?.[0] || opts.head?.[0] || []).length;
      const cs = {};
      for (const [k, v] of Object.entries(opts.columnStyles || {})) cs[n - 1 - Number(k)] = { ...v, halign: v.halign === 'right' ? 'left' : 'right' };
      for (let i = 0; i < n; i++) cs[i] ||= { halign: 'right' };
      const styles = { ...(opts.styles || {}), font: 'DejaVu', halign: 'right' };
      return o.autoTable({ ...opts, head: rev(opts.head), body: rev(opts.body), columnStyles: cs, styles, headStyles: { ...(opts.headStyles || {}), halign: 'right' } });
    };
  }
  doc.setFont('helvetica', 'normal');
  return doc;
}

const BLUE = [21, 87, 176];

// The business logo for PDF headers, read from the app's own (offline-cached) files.
let logoData;
export async function pdfLogo() {
  if (logoData !== undefined) return logoData;
  try {
    const blob = await (await fetch('icons/logo-pdf.jpg')).blob();
    logoData = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
  } catch { logoData = null; }
  return logoData;
}

export function buildQuotePdf(JsPDF, m, opts) {
  return withLang(m.lang, () => quotePdfInner(JsPDF, m, opts));
}

function quotePdfInner(JsPDF, m, { ref, at, draft, logo }) {
  const doc = rtlPdf(new JsPDF({ unit: 'mm', format: 'a4' }));
  const W = doc.internal.pageSize.getWidth();
  const T = (s) => pdfText(s);
  doc.setFillColor(...BLUE); doc.rect(0, 0, W, 28, 'F');
  const x = logo ? 38 : 14;
  if (logo) { doc.setFillColor(255, 255, 255); doc.circle(24, 14, 11.5, 'F'); doc.addImage(logo, 'JPEG', 13.5, 3.5, 21, 21); }
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(T(m.business.name), x, 13);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text(T([m.business.address, m.business.phone, m.business.email, m.business.web, m.business.taxId && `NIF/CIF: ${m.business.taxId}`].filter(Boolean).join('  ·  ')), x, 21, { maxWidth: W - x - 14 });
  doc.setTextColor(20);
  if (draft) { doc.saveGraphicsState?.(); doc.setTextColor(225, 232, 245); doc.setFontSize(70); doc.text(T(t('q.draftMark')), W / 2, 170, { align: 'center', angle: 35 }); doc.setTextColor(20); doc.restoreGraphicsState?.(); }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(T(t('q.title')), 14, 40);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.text(T(`${t('q.ref')}: ${ref || t('q.pending')}`), W - 14, 36, { align: 'right' });
  doc.text(T(`${t('q.date')}: ${date(at || new Date().toISOString())}`), W - 14, 41, { align: 'right' });
  doc.text(T(t('q.validity', { n: m.validityDays })), W - 14, 46, { align: 'right' });
  let y = 54;
  doc.setFont('helvetica', 'bold'); doc.text(T(t('customer')), 14, y); doc.text(T(t('c.address')), W / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(T([m.customer.name || '—', m.customer.phone, m.customer.email].filter(Boolean).join('\n')), 14, y + 5);
  doc.text(T([m.address || '—', m.jobDate ? `${t('job.date')}: ${date(m.jobDate)}` : ''].filter(Boolean).join('\n')), W / 2, y + 5, { maxWidth: W / 2 - 14 });
  y += 22;
  const auto = (opts) => { doc.autoTable({ startY: y, margin: { left: 14, right: 14 }, styles: { fontSize: 9, cellPadding: 1.8 }, headStyles: { fillColor: BLUE }, ...opts }); y = doc.lastAutoTable.finalY + 6; };
  const heading = (s) => { if (y > 265) { doc.addPage(); y = 20; } doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(T(s), 14, y); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); y += 2; };
  const para = (s) => { const lines = doc.splitTextToSize(T(s), W - 28); if (y + lines.length * 4.5 > 280) { doc.addPage(); y = 20; } doc.text(lines, 14, y + 4); y += lines.length * 4.5 + 4; };
  heading(t('q.work'));
  para(`${m.service} · ${m.level}\n${m.conditionsText}${m.description ? '\n' + m.description : ''}`);
  if (m.measurements.length) { heading(t('q.measurements')); auto({ body: m.measurements.map((x) => [T(x.label), T(x.value)]), columnStyles: { 1: { halign: 'right' } }, theme: 'striped' }); }
  heading(t('q.tasks'));
  auto({ head: [[T(t('q.task')), ...(m.showTaskHours ? [T(t('task.hours'))] : [])]], body: m.tasks.map((x) => [T(x.label + (x.details ? '\n' + x.details : '')), ...(m.showTaskHours ? [T(hrs(x.hours))] : [])]), columnStyles: { 1: { halign: 'right', cellWidth: 24 } } });
  if (m.exclusions) { heading(t('q.exclusions')); para(m.exclusions); }
  heading(t('q.estimate'));
  para(t('q.estimateText', { wh: hrs(m.workerHours), w: m.workers, dur: m.days > 1 ? `${m.days} ${t('days')}` : dur(m.onSite) }));
  auto({
    body: [...m.lines.map((l) => [T(l.label), T(money(l.amount))]), [T(t('p.subtotal')), T(money(m.subtotal))], [T(`${m.taxLabel} ${num(m.taxRate, 2)}%`), T(money(m.taxAmount))], [T(t('r.total')), T(money(m.total))]],
    columnStyles: { 1: { halign: 'right', cellWidth: 40 } }, theme: 'plain',
    didParseCell: (d) => { const n = m.lines.length; if (d.row.index === n || d.row.index === n + 2) d.cell.styles.fontStyle = 'bold'; if (d.row.index === n + 2) { d.cell.styles.fillColor = BLUE; d.cell.styles.textColor = 255; d.cell.styles.fontSize = 11; } },
  });
  if (m.needsInspection) para(t('q.inspectionNote'));
  if (m.paymentTerms) { heading(t('set.paymentTerms')); para(m.paymentTerms); }
  if (m.conditions) { heading(t('set.conditions')); para(m.conditions); }
  if (y > 240) { doc.addPage(); y = 20; }
  y += 4;
  doc.setFontSize(9.5);
  doc.text(T(`${t('q.acceptance')}\n\n${t('q.signName')}: ______________________\n\n${t('q.signDate')}: ______________________\n\n${t('q.signature')}: ______________________`), 14, y);
  doc.text(T(`${m.business.name}\n\n\n\n\n${t('q.signature')}: ______________________`), W / 2 + 4, y);
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text(T(`${ref || t('q.draftMark')} · ${i}/${pages}`), W - 14, 290, { align: 'right' }); }
  return doc;
}

export async function exportQuotePdf(job) {
  const r = calculate(job, S.settings, S.services);
  if (!r.service) return toast(t('chk.noService'));
  const Js = await jsPDF();
  const logo = await pdfLogo();
  const issued = job.issued;
  await pdfLanguage((issued ? issued.model : null)?.lang || docLang(job));
  const doc = issued ? buildQuotePdf(Js, issued.model, { ref: issued.ref, at: issued.at, draft: false, logo }) : buildQuotePdf(Js, quoteModel(job, r), { draft: true, logo });
  const cust = S.customers.find((c) => c.id === job.customerId)?.name || 'cliente';
  const name = `${issued ? issued.ref : 'BORRADOR'}-${cust.replace(/[^\wÀ-ſ-]+/g, '_')}.pdf`;
  const res = await shareOrDownload(doc.output('blob'), name, issued?.ref || 'Quotation');
  if (res !== 'cancelled') toast(t(res === 'shared' ? 'q.shared' : 'q.downloaded'));
}

export async function exportReportPdf(d) {
  const Js = await jsPDF();
  const logo = await pdfLogo();
  await pdfLanguage(lang());
  const doc = rtlPdf(new Js({ unit: 'mm', format: 'a4' }));
  const T = pdfText;
  doc.setFillColor(...BLUE); doc.rect(0, 0, 210, 22, 'F');
  if (logo) { doc.setFillColor(255, 255, 255); doc.circle(20, 11, 9, 'F'); doc.addImage(logo, 'JPEG', 11.8, 2.8, 16.4, 16.4); }
  doc.setTextColor(255); doc.setFontSize(15); doc.setFont('helvetica', 'bold'); doc.text(T(`${S.settings.business.name} · ${t('sec.reports')}`), logo ? 33 : 14, 14);
  doc.setTextColor(20); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(T(date(new Date().toISOString())), 196, 30, { align: 'right' });
  const tbl = (startY, head, body) => { doc.autoTable({ startY, head: head ? [head.map(T)] : undefined, body: body.map((r) => r.map((c) => T(c))), headStyles: { fillColor: BLUE }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } }); return doc.lastAutoTable.finalY + 8; };
  let y = tbl(34, null, [
    [t('rep.totalJobs'), d.totalJobs], [t('rep.quotes'), d.quotes], [t('rep.accepted'), d.accepted], [t('rep.rejected'), d.rejected],
    [t('rep.estVsAct'), `${hrs(d.estHours)} / ${hrs(d.actHours)}`], [t('rep.revenue'), money(d.revenue)], [t('rep.labour'), money(d.labour)],
    [t('rep.materialsTravel'), money(d.materialsTravel)], [t('rep.estProfit'), money(d.estProfit)], [t('rep.actProfit'), money(d.actProfit)],
  ]);
  if (d.bySvc.length) y = tbl(y, [t('job.service'), t('rep.jobs'), t('rep.est'), t('rep.act'), t('rep.diff'), 'm²/h'], d.bySvc.map((r) => [r.name, r.jobs, hrs(r.est), hrs(r.act), num(r.diffPct, 0) + '%', num(r.m2h, 1)]));
  if (d.bands.length) y = tbl(y, [t('rep.bySize'), t('rep.jobs'), t('r.workerHours')], d.bands.map((b) => [b.label, b.n, hrs(b.avg)]));
  if (d.rateLog.length) tbl(y, [t('q.date'), t('rates.history'), '', ''], d.rateLog.slice(0, 60).map((l) => [date(l.at), l.label || l.path, String(l.from ?? ''), String(l.to ?? '')]));
  await shareOrDownload(doc.output('blob'), `informe-${new Date().toISOString().slice(0, 10)}.pdf`, t('sec.reports'));
}

export const quoteActions = {
  async approveQuote(el) {
    const job = S.jobs.find((j) => j.id === el.dataset.id);
    const r = calculate(job, S.settings, S.services);
    if (!r.ok) return toast(t('q.fixErrors'));
    if (r.checks.some((c) => c.k === 'chk.aiUnapproved')) return toast(t('q.approveAiFirst'));
    const model = quoteModel(job, r);
    if (!confirm(t('q.confirmApprove', { total: money(model.total) }))) return;
    const prev = job.issued;
    const ref = prev ? `${prev.ref.replace(/-R\d+$/, '')}-R${(prev.rev || 0) + 1}` : nextQuoteRef();
    job.issued = { ref, rev: prev ? (prev.rev || 0) + 1 : 0, at: new Date().toISOString(), model, estimate: summarise(r), previous: prev ? { ref: prev.ref, total: prev.model.total, at: prev.at } : null };
    if (['draft', 'rejected'].includes(job.status) || prev) job.status = job.status === 'accepted' ? 'accepted' : 'quoted';
    await saveJob(job);
    toast(t('q.approved', { ref }));
    rerender();
  },
  async quotePdf(el) { await exportQuotePdf(S.jobs.find((j) => j.id === el.dataset.id)); },
  quotePrint() { window.print(); },
};
