// Property access authorization and key handover form: filled in and signed on the phone,
// written in the customer's language, saved with the job, printed or exported as PDF.
import { S, t, esc, date, toast, saveJob, shareOrDownload, withLang, languages, dirOf, isRtl, ownerLine } from './core.js';
import { docLang, jsPDF, pdfLogo, pdfText, pdfLanguage, rtlPdf } from './quote.js';
import { rerender } from './app.js';

const SIGS = ['custSig', 'compSig', 'returnSig'];
const today = () => new Date().toISOString().slice(0, 10);

function formData(job) {
  const cust = S.customers.find((c) => c.id === job.customerId) || {};
  const k = (job.keyForm ||= {});
  return {
    name: k.name ?? cust.name ?? '', phone: k.phone ?? cust.phone ?? '', address: k.address ?? job.address ?? cust.address ?? '',
    handoverDate: k.handoverDate ?? today(), cleaningDate: k.cleaningDate ?? job.jobDate ?? '', keys: k.keys ?? '',
    signName: k.signName ?? k.name ?? cust.name ?? '', signDate: k.signDate ?? today(), representative: k.representative ?? '',
    returnAt: k.returnAt ?? '', custSig: k.custSig || '', compSig: k.compSig || '', returnSig: k.returnSig || '',
    language: k.language || docLang(job),
  };
}

const dateTime = (v) => (v ? `${date(v)} ${v.slice(11, 16)}`.trim() : '');

export function renderKeys(job) {
  const d = formData(job);
  const B = S.settings.business;
  const pick = `<label class="field no-print"><span>${t('key.language')}</span><select data-k="language">${languages().map((l) => `<option value="${l.id}" ${l.id === d.language ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label>`;
  // The form itself is shown in the customer's language so they can read what they sign.
  return `<a class="crumb no-print" href="#/job/${job.id}">‹ ${t('job.title')}</a>
  <section class="card no-print">${pick}<p class="small muted">${t('key.help')}</p></section>
  ${withLang(d.language, () => formHtml(job, d, B))}
  <div class="actions no-print">
    <button class="btn btn-xl" data-act="keyPdf" data-id="${job.id}">${t('key.pdf')}</button>
    <button class="btn btn-outline" data-act="keyPrint">${t('q.print')}</button>
    <button class="btn btn-outline" data-act="keyBlankPdf" data-id="${job.id}">${t('key.blank')}</button>
  </div>`;
}

function formHtml(job, d, B) {
  const inp = (k, type = 'text', extra = '') => `<input type="${type}" data-k="${k}" value="${esc(d[k])}" ${extra}>`;
  const field = (label, html) => `<label class="field"><span>${label}</span>${html}</label>`;
  const pad = (k) => `<div class="sig-wrap"><canvas class="sig" data-sig="${k}"></canvas><button class="btn btn-small btn-outline no-print" data-act="keySigClear" data-k="${k}">${t('key.clear')}</button></div>`;
  return `<div class="key-doc" data-kid="${job.id}" dir="${dirOf()}" lang="${d.language}">
    <header><img class="q-logo" src="icons/logo-128.png" alt=""><div><h2>${esc(B.name)}</h2><div class="small">${esc(t('key.title'))}</div></div></header>
    <h3>${t('key.customerInfo')}</h3>
    ${field(t('key.name'), inp('name'))}${field(t('key.phone'), inp('phone', 'tel'))}${field(t('key.address'), inp('address'))}
    <h3>${t('key.authTitle')}</h3>
    <p>${esc(t('key.authText', { company: B.name }))}</p>
    <p>${esc(t('key.handedText'))}</p>
    <div class="two">${field(t('key.handoverDate'), inp('handoverDate', 'date'))}${field(t('key.cleaningDate'), inp('cleaningDate', 'date'))}</div>
    ${field(t('key.keys'), inp('keys', 'number', 'inputmode="numeric" min="1" step="1"'))}
    <h3>${t('key.declTitle')}</h3>
    <p>${esc(t('key.declText'))}</p>
    ${field(t('key.signName'), inp('signName'))}
    <div class="field"><span>${t('key.custSig')}</span>${pad('custSig')}</div>
    ${field(t('key.date'), inp('signDate', 'date'))}
    ${field(t('key.representative'), inp('representative'))}
    <div class="field"><span>${t('key.compSig')}</span>${pad('compSig')}</div>
    <h3>${t('key.returnTitle')}</h3>
    ${field(t('key.returnAt'), inp('returnAt', 'datetime-local'))}
    <div class="field"><span>${t('key.returnSig')}</span>${pad('returnSig')}</div>
  </div>`;
}

export function mountKeys(id) {
  const box = document.querySelector('[data-kid]');
  const job = S.jobs.find((j) => j.id === id);
  if (!box || !job) return;
  const save = async (k, v) => { (job.keyForm ||= {})[k] = v; await saveJob(job); };
  const onEdit = async (ev) => {
    const el = ev.target;
    if (!el.dataset.k) return;
    await save(el.dataset.k, el.value);
    if (el.dataset.k === 'language') rerender();
  };
  box.addEventListener('change', onEdit);
  document.querySelector('[data-k="language"]')?.addEventListener('change', onEdit);
  box.querySelectorAll('canvas[data-sig]').forEach((c) => signaturePad(c, job.keyForm?.[c.dataset.sig], (url) => save(c.dataset.sig, url)));
}

// Finger signature on a canvas, saved as a PNG image with the job.
function signaturePad(canvas, saved, onDone) {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 300, h = 150;
  canvas.width = w * ratio; canvas.height = h * ratio; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  const blank = () => ctx.clearRect(0, 0, w, h); // transparent, so the PDF line under it stays visible
  blank();
  if (saved) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, w, h); img.src = saved; }
  ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#10213a';
  let drawing = false, drew = false;
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); drawing = true; canvas.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke(); drew = true; });
  canvas.addEventListener('pointermove', (e) => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); });
  const end = () => { if (!drawing) return; drawing = false; if (drew) onDone(canvas.toDataURL('image/png')); };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas._clear = () => { blank(); drew = false; onDone(''); };
}

// ---------- PDF ----------
function buildKeyPdf(Js, d, { logo, blank }) {
  return withLang(d.language, () => {
    const doc = rtlPdf(new Js({ unit: 'mm', format: 'a4' }));
    const W = doc.internal.pageSize.getWidth();
    const T = pdfText;
    const B = S.settings.business;
    const v = (x) => (blank ? '' : x || '');
    doc.setFillColor(21, 87, 176); doc.rect(0, 0, W, 28, 'F');
    if (logo) { doc.setFillColor(255, 255, 255); doc.circle(24, 14, 11.5, 'F'); doc.addImage(logo, 'JPEG', 13.5, 3.5, 21, 21); }
    const x0 = logo ? 38 : 14;
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(T(B.name), x0, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(T(t('key.title')), x0, 19, { maxWidth: W - x0 - 14 });
    doc.setTextColor(20);
    let y = 38;
    const heading = (s) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.text(T(s), 14, y); y += 6; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); };
    const para = (s) => { const lines = doc.splitTextToSize(T(s), W - 28); doc.text(lines, 14, y); y += lines.length * 5 + 2; };
    // A label followed by its value written on a line, so a blank form can be filled in by hand.
    const line = (label, value, x = 14, width = W - 28) => {
      const lw = Math.min(doc.getTextWidth(T(label + ': ')) + 1, width * 0.6);
      doc.text(T(label + ':'), x, y, { maxWidth: width * 0.6 });
      doc.setDrawColor(150); doc.line(x + lw, y + 1, x + width, y + 1);
      if (value) doc.text(T(String(value)), x + lw + 1, y - 0.5, { maxWidth: width - lw - 2 });
      y += 9;
    };
    const sig = (label, img) => {
      doc.text(T(label + ':'), 14, y);
      if (img && !blank) doc.addImage(img, 'PNG', 70, y - 9, 56, 15);
      doc.setDrawColor(150); doc.line(70, y + 6.5, W - 14, y + 6.5);
      y += 14;
    };
    heading(t('key.customerInfo'));
    line(t('key.name'), v(d.name)); line(t('key.phone'), v(d.phone)); line(t('key.address'), v(d.address));
    y += 2; heading(t('key.authTitle'));
    para(t('key.authText', { company: B.name })); para(t('key.handedText'));
    line(t('key.handoverDate'), v(date(d.handoverDate))); line(t('key.cleaningDate'), v(date(d.cleaningDate))); line(t('key.keys'), v(d.keys));
    y += 2; heading(t('key.declTitle'));
    para(t('key.declText'));
    line(t('key.signName'), v(d.signName));
    sig(t('key.custSig'), d.custSig);
    line(t('key.date'), v(date(d.signDate)));
    line(t('key.representative'), v(d.representative));
    sig(t('key.compSig'), d.compSig);
    y += 2; heading(t('key.returnTitle'));
    line(t('key.returnAt'), v(dateTime(d.returnAt)));
    sig(t('key.returnSig'), d.returnSig);
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(T([B.address, B.phone, B.email].filter(Boolean).join('  ·  ')), W / 2, 286.5, { align: 'center', maxWidth: W - 28 });
    if (ownerLine(B)) doc.text(T(ownerLine(B)), W / 2, 290.5, { align: 'center', maxWidth: W - 28 });
    return doc;
  });
}

async function exportKeyPdf(job, blank) {
  const d = formData(job);
  await pdfLanguage(d.language);
  const doc = buildKeyPdf(await jsPDF(), d, { logo: await pdfLogo(), blank });
  const who = blank ? '' : '-' + (d.name || '').replace(/[^\wÀ-ſ-]+/g, '_');
  const res = await shareOrDownload(doc.output('blob'), `${withLang(isRtl(d.language) ? 'en' : d.language, () => t('key.file'))}${who}.pdf`, t('key.title'));
  if (res !== 'cancelled') toast(t(res === 'shared' ? 'q.shared' : 'q.downloaded'));
}

export const keyActions = {
  keyPdf(el) { const j = S.jobs.find((x) => x.id === el.dataset.id); if (j) exportKeyPdf(j, false); },
  keyBlankPdf(el) { const j = S.jobs.find((x) => x.id === el.dataset.id); if (j) exportKeyPdf(j, true); },
  keyPrint() { window.print(); },
  keySigClear(el) { document.querySelector(`canvas[data-sig="${el.dataset.k}"]`)?._clear?.(); },
};

export { buildKeyPdf, SIGS, signaturePad };
