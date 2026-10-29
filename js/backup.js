// Backup, restore and PIN helpers (Web Crypto, runs offline).
import { db } from './db.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (buf) => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(password, salt, usage) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey', 'deriveBits']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, usage);
}

export async function hashPin(pin, saltB64) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, 256);
  return { hash: b64(bits), salt: b64(salt) };
}

const blobToB64 = (blob) => blob.arrayBuffer().then(b64);

export async function buildBackup({ includeMedia }) {
  const data = { app: 'limpieza-vitoria-alava', version: 1, exportedAt: new Date().toISOString(), kv: {}, customers: [], jobs: [], budgets: [], docs: [], log: [], media: [] };
  for (const k of ['settings', 'services', 'categories', 'meta', 'tariffs']) data.kv[k] = await db.get('kv', k);
  data.customers = await db.all('customers');
  data.jobs = await db.all('jobs');
  data.budgets = await db.all('budgets');
  data.docs = await db.all('docs');
  data.log = await db.all('log');
  if (includeMedia) {
    for (const m of await db.all('media')) {
      const { blob, ...rest } = m;
      data.media.push({ ...rest, data: blob ? await blobToB64(blob) : null });
    }
  }
  return data;
}

export async function encryptBackup(obj, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { app: 'limpieza-vitoria-alava', encrypted: true, salt: b64(salt), iv: b64(iv), data: b64(ct) };
}

export async function decryptBackup(wrapper, password) {
  const key = await deriveKey(password, unb64(wrapper.salt), ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(wrapper.iv) }, key, unb64(wrapper.data));
  return JSON.parse(dec.decode(pt));
}

export function validateBackup(data) {
  if (!data || data.app !== 'limpieza-vitoria-alava') throw new Error('notBackup');
  if (!data.kv || !Array.isArray(data.jobs) || !Array.isArray(data.customers)) throw new Error('corrupt');
  return true;
}

// mode 'replace' wipes the phone's data first; 'merge' keeps existing records and adds/overwrites by id.
export async function restoreBackup(data, mode) {
  validateBackup(data);
  if (mode === 'replace') await db.clearAll();
  for (const [k, v] of Object.entries(data.kv)) if (v !== undefined && v !== null) await db.put('kv', v, k);
  for (const c of data.customers) await db.put('customers', c);
  for (const j of data.jobs) await db.put('jobs', j);
  for (const b of data.budgets || []) await db.put('budgets', b);
  for (const d of data.docs || []) await db.put('docs', d);
  for (const l of data.log || []) await db.put('log', l);
  for (const m of data.media || []) {
    const { data: d, ...rest } = m;
    await db.put('media', { ...rest, blob: d ? new Blob([unb64(d)], { type: rest.mime || 'application/octet-stream' }) : null });
  }
}
