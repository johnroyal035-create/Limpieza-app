// Central price engine of the "Calculadora de Limpieza y Presupuestos". Pure functions, no screen code:
// every module, the quotation PDF and the tests use calcBudget(). Money is handled in whole cents.

export const cents = (eur) => Math.round((Number(eur) || 0) * 100);
const lerp = (a, b, p) => a + (b - a) * p;
const clamp01 = (x) => Math.min(1, Math.max(0, Number(x) || 0));
const pos = (x) => Math.max(0, Number(x) || 0);

// Price range [min, max] (euros) for an area, read from rows sorted by m².
// Between two rows: straight line between them. Below the first row: the first row (smallest job).
// Above the last row: the last row's price per m² × the area. `exact` is false when the area is not a row.
export function rangeAt(rows, area, pick = (r) => [r.min, r.max]) {
  const rs = [...(rows || [])].filter((r) => Number(r.m2) > 0).sort((a, b) => a.m2 - b.m2);
  const a = pos(area);
  if (!rs.length || !(a > 0)) return null;
  const first = rs[0], last = rs[rs.length - 1];
  const at = (r) => pick(r).map(Number);
  const hit = rs.find((r) => Number(r.m2) === a);
  if (hit) return { min: at(hit)[0], max: at(hit)[1], exact: true };
  if (a < first.m2) { const [lo, hi] = at(first); return { min: lo, max: hi, exact: false, below: true }; }
  if (a > last.m2) { const [lo, hi] = at(last); const f = a / last.m2; return { min: lo * f, max: hi * f, exact: false, above: true }; }
  const i = rs.findIndex((r) => r.m2 > a);
  const r0 = rs[i - 1], r1 = rs[i];
  const p = (a - r0.m2) / (r1.m2 - r0.m2);
  const [l0, h0] = at(r0), [l1, h1] = at(r1);
  return { min: lerp(l0, l1, p), max: lerp(h0, h1, p), exact: false };
}

// Monthly contract: interpolate between the visits-per-week columns, then between the m² rows.
function contractRange(p, area, visitsPerWeek) {
  const vs = [...(p.visits || [])].map(Number).sort((a, b) => a - b);
  const v = pos(visitsPerWeek) || 1;
  const pick = (row) => {
    const col = (x) => row.cols[x].map(Number);
    if (vs.includes(v)) return col(v);
    if (v < vs[0]) return col(vs[0]).map((x) => (x * v) / vs[0]);
    if (v > vs[vs.length - 1]) { const top = vs[vs.length - 1]; return col(top).map((x) => (x * v) / top); }
    const j = vs.findIndex((x) => x > v);
    const a = vs[j - 1], b = vs[j];
    return [0, 1].map((k) => lerp(col(a)[k], col(b)[k], (v - a) / (b - a)));
  };
  const r = rangeAt(p.rows, area, pick);
  if (r && !vs.includes(v)) r.exact = false;
  return r;
}

// Visits per month for recurring work (52 weeks / 12 months).
export function visitsPerMonth(prop) {
  const f = prop?.frequency || 'once';
  if (f === 'once') return 0;
  if (f === 'monthly') return 1;
  if (f === 'biweekly') return 26 / 12;
  return (pos(prop.visitsPerWeek) || 1) * 52 / 12;
}

export const KINDS = ['table', 'cols', 'contract', 'm2', 'lm', 'unit', 'fixed', 'month', 'pct', 'inspect'];
export const AREA_KINDS = ['table', 'cols', 'contract'];
const MONTHLY_KINDS = ['month', 'contract'];

// The parts of a price-list item a quotation line keeps, so issued quotations never change when rates change.
export function snapshotItem(it) {
  const keep = ['kind', 'min', 'max', 'rows', 'columns', 'visits', 'minCharge', 'inspection', 'open', 'includes', 'perWindow', 'tag', 'perVisit', 'estimate', 'package', 'module'];
  const p = {};
  for (const k of keep) if (it[k] !== undefined && it[k] !== null) p[k] = JSON.parse(JSON.stringify(it[k]));
  return p;
}
export function snapshotSettings(T) {
  const { conditions, columnPosition, columnByCondition, vatIncluded, minJobCharge, validityDays } = T;
  return JSON.parse(JSON.stringify({ conditions, columnPosition, columnByCondition, vatIncluded, minJobCharge, validityDays }));
}

// One line for one pricing point: 'price' (the condition's point), 'low' (minimum) or 'high' (maximum).
function lineRange(line, b, pp) {
  const p = line.p || {};
  const prop = b.property || {};
  const qty = pos(line.qty);
  // Area services with no quantity of their own use the property's m².
  const area = line.qty === '' || line.qty == null ? pos(prop.area) : pos(line.qty);
  switch (p.kind) {
    case 'table': return { r: rangeAt(p.rows, area), mult: 1 };
    case 'cols': {
      const col = line.column || pp.columnByCondition?.[prop.condition || 'medium'] || p.columns?.[1];
      return { r: rangeAt(p.rows, area, (row) => row.cols[col] || [0, 0]), mult: 1, col };
    }
    case 'contract': return { r: contractRange(p, area, prop.frequency === 'weekly' ? prop.visitsPerWeek : 1), mult: 1 };
    case 'm2': case 'lm': case 'unit': case 'fixed': case 'month':
      return { r: { min: Number(p.min) || 0, max: Number(p.max) || 0, exact: true }, mult: (p.kind === 'fixed' || p.kind === 'month') && (line.qty === '' || line.qty == null) ? 1 : qty };
    default: return { r: null, mult: 0 };
  }
}

export function calcBudget(b, opts = {}) {
  const pp = b.pp || {};
  const prop = b.property || {};
  const cond = prop.condition || 'medium';
  const C = pp.conditions?.[cond] || { position: 0.5, adjustPct: 0 };
  const vpm = visitsPerMonth(prop);
  const recurring = vpm > 0;
  const warnings = [];
  const reasons = [];
  if (C.inspection || cond === 'extreme') reasons.push('extreme');
  if (prop.difficultAccess) reasons.push('access');

  // Packages: what each one already includes, so those items are not charged twice.
  const included = {};
  for (const l of b.lines || []) {
    if (!l.p?.includes) continue;
    for (const [id, q] of Object.entries(l.p.includes)) included[id] = (included[id] || 0) + q * (pos(l.qty) || 1);
  }
  const used = {};
  const windowCount = (b.lines || []).filter((l) => l.p?.tag === 'window').reduce((s, l) => s + pos(l.qty), 0);

  const out = [];
  for (const l0 of b.lines || []) {
    const l = { ...l0 };
    const p = l.p || {};
    const useArea = AREA_KINDS.includes(p.kind) && (l.qty === '' || l.qty == null);
    const res = { id: l.id, itemId: l.itemId, module: p.module, name: l.name, variant: l.variant, kind: p.kind, qty: useArea ? pos(prop.area) : pos(l.qty), fromArea: useArea, notes: [], inspection: !!p.inspection || p.kind === 'inspect', open: !!p.open, estimated: !!p.estimate, monthly: MONTHLY_KINDS.includes(p.kind) };
    if (p.perWindow) { l.qty = windowCount; res.qty = windowCount; res.notes.push('perWindow'); }
    // Included in a package on the same quotation: only what is beyond the package is charged.
    if (!p.package && included[l.itemId]) {
      const free = Math.min(res.qty, included[l.itemId] - (used[l.itemId] || 0));
      if (free > 0) { used[l.itemId] = (used[l.itemId] || 0) + free; res.included = free; res.notes.push('included'); l.qty = res.qty - free; }
    }
    if (res.inspection) reasons.push('item');
    if (p.kind === 'inspect') { res.low = res.high = res.amount = 0; out.push(res); continue; }
    if (p.kind === 'pct') { res.pct = true; out.push(res); continue; }
    const { r, mult, col } = lineRange(l, b, pp);
    if (col) res.column = col;
    if (!r) { res.low = res.high = res.amount = 0; if (pos(l.qty) > 0 || AREA_KINDS.includes(p.kind)) res.notes.push('noQty'); out.push(res); continue; }
    if (!r.exact) { res.estimated = true; res.notes.push(r.above ? 'above' : r.below ? 'below' : 'interpolated'); }
    const isService = AREA_KINDS.includes(p.kind);
    const position = p.kind === 'cols' ? clamp01(pp.columnPosition ?? 0.5) : clamp01(C.position);
    const adj = isService ? 1 + (Number(C.adjustPct) || 0) / 100 : 1;
    const perVisit = recurring && !res.monthly ? vpm : 1;
    const mk = (eur) => {
      let c = cents(eur * mult * adj);
      if (c > 0 && Number(p.minCharge) > 0) c = Math.max(c, cents(p.minCharge));
      return Math.round(c * perVisit);
    };
    res.unitMin = r.min; res.unitMax = r.max;
    res.low = mk(r.min); res.high = mk(r.max); res.amount = mk(lerp(r.min, r.max, position));
    if (l.override !== null && l.override !== undefined && l.override !== '') { res.amount = res.low = res.high = Math.round(cents(l.override) * (mult || 1) * perVisit); res.notes.push('override'); }
    if (perVisit !== 1) res.perVisit = vpm;
    if (adj !== 1) res.adjustPct = Number(C.adjustPct);
    out.push(res);
  }
  // Surcharges in %: on the other lines of the same module.
  for (const res of out.filter((x) => x.pct)) {
    const l = (b.lines || []).find((x) => x.id === res.id);
    const base = (k) => out.filter((x) => !x.pct && x.module === res.module).reduce((s, x) => s + x[k], 0);
    const pmin = Number(l.p.min) || 0, pmax = Number(l.p.max) || 0;
    const pc = l.override !== null && l.override !== undefined && l.override !== '' ? [Number(l.override), Number(l.override), Number(l.override)] : [pmin, pmax, lerp(pmin, pmax, clamp01(C.position))];
    res.low = Math.round((base('low') * pc[0]) / 100); res.high = Math.round((base('high') * pc[1]) / 100); res.amount = Math.round((base('amount') * pc[2]) / 100);
    res.pctValue = pc[2];
    if (!base('amount')) res.notes.push('pctNoBase');
  }

  // Labour by the hour: workers × hours per worker × rate per worker-hour.
  let labour = null;
  const Lb = b.labour;
  if (Lb && pos(Lb.workers) > 0 && pos(Lb.hoursPerWorker) > 0) {
    const workerHours = pos(Lb.workers) * pos(Lb.hoursPerWorker);
    const per = recurring ? vpm : 1;
    const amount = Math.round(Math.round(workerHours * pos(Lb.rate) * 100) * per);
    labour = { workers: pos(Lb.workers), hoursPerWorker: pos(Lb.hoursPerWorker), workerHours, rate: pos(Lb.rate), amount, perVisit: per !== 1 ? vpm : undefined };
  }

  const sum = (k) => out.reduce((s, x) => s + (x[k] || 0), 0) + (labour ? labour.amount : 0);
  const X = b.extras || {};
  const extras = ['materials', 'machinery', 'travel', 'parking', 'other'].map((k) => ({ k, amount: cents(X[k]) })).filter((x) => x.amount > 0);
  const extrasTotal = extras.reduce((s, x) => s + x.amount, 0);
  const D = b.discount || {};
  const rate = Number(b.taxRate) || 0;

  const totals = (k) => {
    const services = sum(k);
    const minC = cents(pp.minJobCharge);
    const minAdj = services > 0 && minC > services ? minC - services : 0;
    const subtotal = services + minAdj + extrasTotal;
    let discount = 0;
    if (D.type === 'eur') discount = Math.min(cents(D.value), subtotal);
    else if (pos(D.value) > 0) discount = Math.round((subtotal * Math.min(pos(D.value), 100)) / 100);
    const after = subtotal - discount;
    let base, tax, total;
    if (pp.vatIncluded) { base = Math.round((after * 100) / (100 + rate)); tax = after - base; total = after; }
    else { base = after; tax = Math.round((after * rate) / 100); total = after + tax; }
    return { services, minAdj, subtotal, discount, base, tax, total };
  };
  const price = totals('amount');
  const low = totals('low');
  const high = totals('high');

  if (out.some((x) => x.open)) warnings.push('open');
  if (out.some((x) => x.estimated)) warnings.push('estimated');
  if (out.some((x) => x.notes.includes('included'))) warnings.push('included');
  const ids = (b.lines || []).map((l) => l.itemId + '|' + (l.variant || '')).filter((x) => !x.startsWith('custom'));
  if (new Set(ids).size !== ids.length) warnings.push('duplicate');
  if (!price.total && !reasons.length) warnings.push('empty');
  if (prop.frequency === 'weekly' && !(pos(prop.visitsPerWeek) > 0)) warnings.push('visits');
  if ((b.lines || []).some((l) => l.p?.kind === 'contract') && prop.frequency !== 'weekly') warnings.push('contractWeekly');

  const inspection = reasons.length > 0;
  return {
    lines: out, labour, extras, extrasTotal, ...price, low, high, taxRate: rate, vatIncluded: !!pp.vatIncluded,
    recurring: recurring ? { visitsPerMonth: vpm, frequency: prop.frequency, visitsPerWeek: pos(prop.visitsPerWeek) } : null,
    inspection, reasons: [...new Set(reasons)], warnings, showRange: inspection || b.priceType !== 'fixed',
    discountPct: D.type === 'eur' ? null : pos(D.value),
  };
}

// Engine tables for the room-by-room calculator, taken from this same price list so prices live in one place.
export function engineTables(T) {
  const find = (id) => T.items.find((x) => x.id === id && x.active !== false);
  const out = {};
  const deep = find('deep-home'); if (deep) out.deep = deep.rows;
  const rental = find('rental'); if (rental) out.empty = rental.rows;
  const dis = find('disinfection'); if (dis) out.disinfection = dis.rows;
  const con = find('construction'); if (con) out.construction = con.rows;
  return out;
}

// ---------- Building quotations (shared by the screens and the tests) ----------
const rid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export function newBudget(T, extra = {}) {
  return {
    id: rid(), number: '', rev: 0, createdAt: new Date().toISOString(), updatedAt: '', status: 'draft', priceType: 'estimate', language: 'es',
    module: '', method: 'area', customerId: '',
    customer: { name: '', phone: '', email: '' },
    property: { address: '', municipality: 'Vitoria-Gasteiz', type: '', area: '', rooms: '', bathrooms: '', kitchens: '', windows: '', floors: '',
      condition: 'medium', furnished: true, frequency: 'once', visitsPerWeek: '', startDate: '', notes: '', materialsIncluded: false, machinery: '', additional: '', difficultAccess: false },
    lines: [], labour: null,
    extras: { materials: '', machinery: '', travel: '', parking: '', other: '' },
    discount: { type: 'pct', value: '', presetId: '' },
    taxRateId: 'iva21', taxRate: 21, inspected: false,
    terms: JSON.parse(JSON.stringify(T.terms || {})), excluded: '',
    pp: snapshotSettings(T), statusLog: [],
    ...extra,
  };
}

export function makeLine(item, qty, extra = {}) {
  return { id: rid(), itemId: item.id, name: JSON.parse(JSON.stringify(item.name)), qty: qty ?? (AREA_KINDS.includes(item.kind) ? '' : 1), override: null, variant: '', column: '', p: snapshotItem(item), ...extra };
}

// Puts the current price list into a quotation that is not issued yet (lines, conditions, VAT setting).
export function refreshPrices(b, T) {
  for (const l of b.lines) {
    const it = T.items.find((x) => x.id === l.itemId);
    if (it) l.p = snapshotItem(it);
  }
  b.pp = snapshotSettings(T);
  return b;
}
