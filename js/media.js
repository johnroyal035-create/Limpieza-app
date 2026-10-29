// Photos, videos, voice notes and the AI visual inspection client.
// The AI call goes to the owner's own backend (server/), which holds the secret API key.
import { S, t, esc, toast, uid, num, svcName, taskLabel, money, hrs, lang, areaUnit } from './core.js';
import { db } from './db.js';
import { FIELDS } from './defaults.js';

const ROOMS = ['general', 'kitchen', 'bathroom', 'livingRoom', 'bedroom', 'windows', 'floors', 'stairs', 'balcony', 'garage', 'office', 'exterior', 'other'];
const MAX_IMAGES = 20;
const FRAMES_PER_VIDEO = 6;
let current = null; // { job, onChange, getCalc }
const urls = new Map();

export function renderMediaSection(job) {
  const connected = !!S.settings.ai.endpoint;
  const cust = S.customers.find((c) => c.id === job.customerId);
  const ai = job.ai;
  return `<h3>4. ${t('media.title')}</h3>
  ${cust && !cust.mediaConsent ? `<p class="small warn-text">${t('media.consentReminder')}</p>` : ''}
  <label class="field"><span>${t('media.roomForNew')}</span><select id="mediaRoom">${ROOMS.map((r) => `<option value="${r}">${t('room.' + r)}</option>`).join('')}</select></label>
  <div class="media-buttons">
    <label class="btn">${t('btn.takePhoto')}<input type="file" accept="image/*" capture="environment" data-media="photo" hidden></label>
    <label class="btn">${t('btn.uploadPhotos')}<input type="file" accept="image/*" multiple data-media="photo" hidden></label>
    <label class="btn">${t('btn.recordVideo')}<input type="file" accept="video/*" capture="environment" data-media="video" hidden></label>
    <label class="btn">${t('btn.uploadVideo')}<input type="file" accept="video/*" multiple data-media="video" hidden></label>
  </div>
  <div id="gallery" class="gallery"></div>
  <label class="field"><span>${t('media.inspectionNotes')}</span>
    <div class="row"><textarea id="inspNotes" rows="3" class="grow" data-bind="inspectionNotes">${esc(job.inspectionNotes || '')}</textarea>${hasSpeech() ? `<button class="btn btn-small btn-outline" data-act="dictate" data-target="inspNotes" title="${t('media.dictate')}">🎤</button>` : ''}</div></label>
  <button class="btn btn-xl" data-act="analyse" ${connected ? '' : 'disabled'}>${t('btn.analyse')}</button>
  ${connected ? `<p class="small muted">${t('media.privacyShort')}</p>` : `<p class="small warn-text">${t('ai.notConnected')} <a href="#/settings">${t('sec.settings')}</a></p><p class="small muted">${t('media.manualFallback')}</p>`}
  <div id="aiReport">${ai ? reportHtml(ai) : ''}</div>`;
}

function hasSpeech() { return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window; }

export async function mountMedia(job, opts) {
  current = { job, ...opts };
  await drawGallery();
  document.querySelectorAll('[data-media]').forEach((inp) => {
    inp.onchange = async () => {
      const files = [...inp.files];
      inp.value = '';
      const room = document.getElementById('mediaRoom').value;
      for (const f of files) {
        await db.put('media', { id: uid(), jobId: job.id, type: inp.dataset.media, mime: f.type, name: f.name, size: f.size, room, note: '', createdAt: new Date().toISOString(), blob: f });
      }
      toast(t('media.added', { n: files.length }));
      current.onChange();
      drawGallery();
    };
  });
}

async function drawGallery() {
  const box = document.getElementById('gallery');
  if (!box) return;
  for (const u of urls.values()) URL.revokeObjectURL(u);
  urls.clear();
  const items = (await db.byIndex('media', 'jobId', current.job.id)).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  box.innerHTML = items.map((m) => {
    const u = m.blob ? URL.createObjectURL(m.blob) : '';
    urls.set(m.id, u);
    return `<div class="media-item" data-mid="${m.id}">
      ${m.type === 'video' ? `<video src="${u}" controls preload="metadata" playsinline></video>` : `<img src="${u}" alt="">`}
      <select data-mfield="room">${ROOMS.map((r) => `<option value="${r}" ${r === m.room ? 'selected' : ''}>${t('room.' + r)}</option>`).join('')}</select>
      <input data-mfield="note" value="${esc(m.note)}" placeholder="${t('media.note')}">
      <div class="row between small"><span class="muted">${num((m.size || 0) / 1048576, 1)} MB${m.analysedAt ? ' · AI ✓' : ''}</span><button class="btn btn-small btn-danger" data-act="delMedia" data-id="${m.id}">✕</button></div>
    </div>`;
  }).join('') || `<p class="muted small">${t('media.none')}</p>`;
  box.querySelectorAll('[data-mfield]').forEach((el) => {
    el.onchange = async () => {
      const id = el.closest('[data-mid]').dataset.mid;
      const m = await db.get('media', id);
      m[el.dataset.mfield] = el.value;
      await db.put('media', m);
    };
  });
}

// ---------- image preparation ----------
function loadImage(blob) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = URL.createObjectURL(blob); });
}
function toJpeg(source, w, h, max = 1280) {
  const scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8).split(',')[1];
}
async function photoFrames(m) {
  const img = await loadImage(m.blob);
  const data = toJpeg(img, img.naturalWidth, img.naturalHeight);
  URL.revokeObjectURL(img.src);
  return [{ data, media_type: 'image/jpeg', room: m.room, note: m.note, source: 'photo' }];
}
function videoFrames(m) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.src = URL.createObjectURL(m.blob);
    const out = [];
    const fail = () => { URL.revokeObjectURL(v.src); resolve(out); };
    v.onerror = fail;
    v.onloadedmetadata = async () => {
      const d = v.duration;
      if (!Number.isFinite(d) || d <= 0) return fail();
      const n = Math.min(FRAMES_PER_VIDEO, Math.max(1, Math.ceil(d / 3)));
      for (let i = 0; i < n; i++) {
        const at = (d * (i + 0.5)) / n;
        await new Promise((r) => { v.onseeked = r; v.currentTime = at; setTimeout(r, 4000); });
        try { out.push({ data: toJpeg(v, v.videoWidth, v.videoHeight), media_type: 'image/jpeg', room: m.room, note: m.note, source: `video ${num(at, 1)}s` }); } catch { /* frame not decodable */ }
      }
      URL.revokeObjectURL(v.src);
      resolve(out);
    };
  });
}

// ---------- AI report ----------
function reportHtml(ai) {
  const r = ai.result || {};
  const list = (arr, f = (x) => esc(typeof x === 'string' ? x : JSON.stringify(x))) => (arr && arr.length ? `<ul>${arr.map((x) => `<li>${f(x)}</li>`).join('')}</ul>` : `<p class="muted small">—</p>`);
  const added = (current?.job.customTasks || []).some((c) => c.source === 'ai' && c.aiRun === ai.at);
  return `<div class="ai-report">
    <h4>${t('ai.report')} <small class="muted">${new Date(ai.at).toLocaleString(S.settings.locale.numberLocale)}</small> · ${t('ai.imagesUsed', { n: ai.imageCount })}</h4>
    ${r.summary ? `<p>${esc(r.summary)}</p>` : ''}
    <h5>${t('ai.rooms')}</h5>${list(r.areas, (a) => `<b>${esc(a.name)}</b>${a.conditions?.length ? ': ' + esc(a.conditions.join(', ')) : ''}${a.confidence ? ` <span class="muted small">(${esc(t('conf.' + a.confidence))})</span>` : ''}`)}
    <h5>${t('ai.tasks')}</h5>${list(r.tasks, (x) => `<b>${esc(x.name)}</b> · ${hrs(Number(x.hours) || 0)}${x.area ? ` · ${esc(x.area)}` : ''}${x.method ? `<br><span class="small">${esc(x.method)}</span>` : ''}${x.reason ? `<br><span class="small muted">${esc(x.reason)}</span>` : ''}`)}
    ${r.suggested_measurements && Object.values(r.suggested_measurements).some((v) => v !== null) ? `<h5>${t('ai.counts')}</h5>${list(Object.entries(r.suggested_measurements).filter(([, v]) => v !== null), ([k, v]) => `${esc(t('f.' + k))}: ${esc(v)}`)}` : ''}
    ${r.suggested_conditions ? `<h5>${t('ai.conditions')}</h5>${list(Object.entries(r.suggested_conditions).filter(([, v]) => v !== null && v !== undefined), ([k, v]) => `${esc(t('cond.' + k))}: ${esc(typeof v === 'boolean' ? (v ? t('yes') : t('no')) : t('dirt.' + v) || v)}`)}` : ''}
    <h5>${t('ai.materials')}</h5>${list(r.materials_equipment)}
    <h5>${t('ai.missing')}</h5>${list(r.missing_information)}
    <h5>${t('ai.assumptions')}</h5>${list(r.assumptions)}
    ${r.needs_physical_inspection ? `<p class="flag">⚠ ${t('job.needsInspection')}</p>` : ''}
    <div class="row wrap">
      <button class="btn" data-act="aiAddTasks" ${added ? 'disabled' : ''}>${added ? t('ai.tasksAdded') : t('ai.addTasks')}</button>
      ${r.suggested_conditions || r.suggested_measurements ? `<button class="btn btn-outline" data-act="aiApplyConditions">${t('ai.applyConditions')}</button>` : ''}
      <button class="btn btn-outline" data-act="gotoResults">${t('btn.generate')}</button>
    </div>
    <p class="small muted">${t('ai.reviewNote')}</p></div>`;
}

async function analyse() {
  const job = current.job;
  const items = await db.byIndex('media', 'jobId', job.id);
  if (!items.length && !(job.inspectionNotes || '').trim()) return toast(t('media.needMedia'));
  const btn = document.querySelector('[data-act="analyse"]');
  btn.disabled = true;
  const orig = btn.textContent;
  try {
    btn.textContent = t('ai.preparing');
    let images = [];
    for (const m of items) {
      if (images.length >= MAX_IMAGES) break;
      if (!m.blob) continue;
      try { images = images.concat(m.type === 'video' ? await videoFrames(m) : await photoFrames(m)); } catch { toast(t('ai.skipped', { name: m.name || '' })); }
    }
    images = images.slice(0, MAX_IMAGES);
    const r = current.getCalc();
    const svc = S.services.find((s) => s.id === job.serviceId);
    const context = {
      language: lang(), units: areaUnit(), business_location: `${S.settings.locale.region}, ${S.settings.locale.country}`,
      service: svcName(svc), service_level: svc?.level,
      measurements: Object.fromEntries(Object.entries(job.m || {}).filter(([, v]) => v !== '' && v !== undefined)),
      allowed_measurement_keys: FIELDS.map((f) => f.id),
      conditions: job.cond, notes: job.inspectionNotes || '', job_notes: job.notes || '',
      existing_tasks: (r?.tasks || []).filter((x) => !x.removed && x.source !== 'ai').map((x) => ({ name: taskLabel(x), hours: Math.round(x.hours * 100) / 100 })),
    };
    btn.textContent = t('ai.sending', { n: images.length });
    const res = await fetch(S.settings.ai.endpoint.replace(/\/$/, '') + '/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.settings.ai.appToken },
      body: JSON.stringify({ images, context }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    job.ai = { at: new Date().toISOString(), imageCount: images.length, result: body.result };
    for (const m of items) { m.analysedAt = job.ai.at; await db.put('media', m); }
    if (!S.settings.ai.retainMediaAfterAnalysis && confirm(t('ai.deleteMediaNow'))) {
      for (const m of items) await db.del('media', m.id);
    }
    current.onChange();
    document.getElementById('aiReport').innerHTML = reportHtml(job.ai);
    drawGallery();
    document.getElementById('aiReport').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    toast(t('ai.failed', { msg: e.message }), 6000);
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

export async function testConnection() {
  const ai = S.settings.ai;
  if (!ai.endpoint) return t('ai.notConnected');
  try {
    const res = await fetch(ai.endpoint.replace(/\/$/, '') + '/health', { headers: { Authorization: 'Bearer ' + ai.appToken } });
    const b = await res.json();
    return res.ok && b.ok ? t('ai.testOk', { model: b.model || '' }) : t('ai.failed', { msg: b.error || res.status });
  } catch (e) {
    return t('ai.failed', { msg: e.message });
  }
}

let recog = null;
export const mediaActions = {
  analyse,
  async delMedia(el) {
    if (!confirm(t('confirm.delete'))) return;
    await db.del('media', el.dataset.id);
    drawGallery();
  },
  dictate(el) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (recog) { recog.stop(); recog = null; el.classList.remove('rec'); return; }
    const target = document.getElementById(el.dataset.target);
    recog = new SR();
    recog.lang = t('_speech') !== '_speech' ? t('_speech') : S.settings.locale.numberLocale || 'es-ES';
    recog.continuous = true;
    recog.onresult = (e) => {
      const text = [...e.results].slice(e.resultIndex).filter((r) => r.isFinal).map((r) => r[0].transcript).join(' ');
      if (text) { target.value = (target.value ? target.value + ' ' : '') + text; target.dispatchEvent(new Event('input', { bubbles: true })); }
    };
    recog.onend = () => { recog = null; el.classList.remove('rec'); };
    recog.onerror = (e) => toast(t('media.dictateError', { msg: e.error }));
    recog.start();
    el.classList.add('rec');
  },
  aiAddTasks() {
    const job = current.job;
    const tasks = job.ai?.result?.tasks || [];
    for (const x of tasks) {
      const h = Number(x.hours);
      if (!(h >= 0)) continue;
      job.customTasks.push({ id: uid(), name: x.area ? `${x.name} (${x.area})` : x.name, hours: Math.round(h * 100) / 100, phase: [1, 2, 3].includes(x.phase) ? x.phase : 2, maxParallel: Math.max(1, Number(x.max_workers) || 1), source: 'ai', approved: false, aiRun: job.ai.at });
    }
    toast(t('ai.tasksAddedToast', { n: tasks.length }));
    current.onChange({ full: true });
    setTimeout(() => document.getElementById('sec-tasks')?.scrollIntoView({ behavior: 'smooth' }), 50);
  },
  aiApplyConditions() {
    const job = current.job;
    const r = job.ai?.result || {};
    const c = r.suggested_conditions || {};
    const m = r.suggested_measurements || {};
    const changes = [];
    for (const [k, v] of Object.entries(c)) if (v !== null && v !== undefined && job.cond[k] !== v) changes.push([`cond.${k}`, v]);
    for (const [k, v] of Object.entries(m)) if (FIELDS.some((f) => f.id === k) && !(Number(job.m[k]) > 0) && Number(v) > 0) changes.push([`m.${k}`, Number(v)]);
    if (!changes.length) return toast(t('ai.nothingToApply'));
    const text = changes.map(([k, v]) => `${k.startsWith('m.') ? t('f.' + k.slice(2)) : t('cond.' + k.slice(5))}: ${typeof v === 'boolean' ? (v ? t('yes') : t('no')) : k === 'cond.dirt' ? t('dirt.' + v) : v}`).join('\n');
    if (!confirm(t('ai.confirmApply') + '\n\n' + text)) return;
    for (const [k, v] of changes) { const [a, b] = k.split('.'); job[a][b] = v; }
    current.onChange({ full: true });
  },
  gotoResults() { document.getElementById('sec-results')?.scrollIntoView({ behavior: 'smooth' }); },
};
