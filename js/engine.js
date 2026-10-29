// Calculation engine. Pure functions, no DOM, no storage: runs offline and in Node tests.
// Results carry translation keys (k) and params; the UI turns them into text.
import { rangeAt } from './tariffs.js';

export const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const roundTo = (x, step) => (step > 0 ? Math.round((x + Number.EPSILON) / step) * step : x);
const ceilTo = (x, step) => (step > 0 ? Math.ceil(x / step - 1e-9) * step : x);
const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
const EPS = 1e-6;
const AREA_FIELDS = ['areaM2', 'carpetM2', 'floorTreatmentM2', 'glassM2', 'garageM2'];

export function findService(services, id) {
  return services.find((s) => s.id === id) || null;
}

function rateProfile(settings, id) {
  const list = settings.pricing.rateProfiles;
  return list.find((p) => p.id === id) || list[0];
}

export function taxRateFor(job, settings) {
  const t = settings.tax;
  const id = job.taxRateId || t.serviceRates[job.serviceId] || t.defaultRateId;
  return t.rates.find((r) => r.id === id) || null;
}

// ---------- Validation of raw inputs ----------
function validateInputs(job, service, checks) {
  const m = job.m || {};
  for (const [k, v] of Object.entries(m)) {
    if (v === '' || v === null || v === undefined) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) checks.push({ level: 'error', k: 'chk.notNumber', p: { field: k } });
    else if (n < 0) checks.push({ level: 'error', k: 'chk.negative', p: { field: k } });
  }
  const c = job.costs || {};
  for (const k of ['materials', 'equipment', 'distanceKm', 'subcontract', 'other', 'discountPct']) {
    const n = num(c[k]);
    if (!Number.isFinite(n)) checks.push({ level: 'error', k: 'chk.notNumber', p: { field: k } });
    else if (n < 0) checks.push({ level: 'error', k: 'chk.negative', p: { field: k } });
  }
  if (num(c.discountPct) >= 100) checks.push({ level: 'error', k: 'chk.discountTooHigh' });
  if (job.workers !== 'auto') {
    const w = Number(job.workers);
    if (!Number.isInteger(w) || w < 1) checks.push({ level: 'error', k: 'chk.workersInvalid' });
  }
  if (service && service.areaRate && !(num(m.areaM2) > 0)) checks.push({ level: 'error', k: 'chk.areaRequired' });
}

// ---------- Task list ----------
// A home's rooms drive most of the work. When none are entered, typical rooms for its m² are used,
// shown as an assumption and flagged so the owner checks them.
const blank = (v) => v === undefined || v === null || v === '';
const ROOM_FIELDS = ['bedrooms', 'livingRooms', 'hallways', 'kitchens', 'bathrooms', 'toilets'];
export function estimateRooms(area) {
  return {
    bedrooms: Math.min(6, Math.max(1, Math.round((area - 20) / 25))),
    livingRooms: area >= 160 ? 2 : 1,
    hallways: area >= 130 ? 2 : 1,
    kitchens: 1,
    bathrooms: area < 75 ? 1 : area < 140 ? 2 : 3,
  };
}
function withEstimatedRooms(m, service, settings, checks, assumptions) {
  const area = num(m.areaM2);
  if (settings.productivity.estimateRooms === false || !service.fields.includes('bedrooms') || !(area > 0)) return m;
  if (!ROOM_FIELDS.filter((f) => service.fields.includes(f)).every((f) => blank(m[f]))) return m;
  const est = estimateRooms(area);
  for (const f of Object.keys(est)) if (!service.fields.includes(f)) delete est[f];
  assumptions.push({ k: 'asm.roomsEstimated', p: { area: round2(area), ...est } });
  checks.push({ level: 'warn', k: 'chk.roomsEstimated' });
  return { ...m, ...est };
}

export function buildTasks(job, settings, service, checks, assumptions) {
  const P = settings.productivity;
  const m = withEstimatedRooms(job.m || {}, service, settings, checks, assumptions);
  const cond = job.cond || {};
  const level = service.level;
  const tasks = [];

  const isConstructionLevel = level === 'construction';
  const constructionDust = (cond.constructionDust || service.forceConstruction) && !isConstructionLevel;
  if ((cond.constructionDust || service.forceConstruction) && isConstructionLevel) assumptions.push({ k: 'asm.dustInBase' });

  const dirt = P.dirt[cond.dirt || 'normal'] ?? 1;
  const access = P.access[cond.access || 'normal'] ?? 1;
  const furnished = service.forceEmpty ? false : cond.furnished !== false;
  const occupied = service.forceOccupied ? true : service.forceEmpty ? false : !!cond.occupied;

  const cap = (x, label) => {
    if (x > P.maxCombinedMultiplier) {
      checks.push({ level: 'warn', k: 'chk.multiplierCapped', p: { task: label, value: round2(x), max: P.maxCombinedMultiplier } });
      return P.maxCombinedMultiplier;
    }
    return x;
  };

  // Base area (general surfaces + floors)
  const area = num(m.areaM2);
  if (service.areaRate && area > 0) {
    let mult = dirt * access * (furnished ? P.furnished : 1) * (occupied ? P.occupied : 1) * (constructionDust ? P.constructionDust : 1);
    mult = cap(mult, 'area');
    const base = area / service.areaRate;
    const hours = base * mult;
    const share = Math.min(Math.max(P.floorsShare ?? 0.35, 0), 0.9);
    const maxPar = Math.max(1, Math.floor(area / P.minAreaPerWorkerM2));
    tasks.push({ key: 'area', k: 'task.area', qty: area, unit: 'm2', rate: service.areaRate, rateUnit: 'm2h', base: base * (1 - share), mult, hours: hours * (1 - share), phase: 2, maxParallel: maxPar, checklist: 'area' });
    tasks.push({ key: 'areaFloors', k: 'task.areaFloors', qty: area, unit: 'm2', rate: service.areaRate, rateUnit: 'm2h', base: base * share, mult, hours: hours * share, phase: 3, maxParallel: maxPar, checklist: 'areaFloors' });
    assumptions.push({ k: 'asm.baseRate', p: { rate: service.areaRate, area: round2(area), floorsPct: Math.round(share * 100) } });
    if (furnished) assumptions.push({ k: 'asm.furnished', p: { x: P.furnished } });
    if (occupied) assumptions.push({ k: 'asm.occupied', p: { x: P.occupied } });
  }

  // Window count is replaced by glass m² when both are given, so glass is not counted twice.
  const useGlass = num(m.glassM2) > 0;
  if (useGlass && num(m.windows) > 0) assumptions.push({ k: 'asm.glassInsteadOfWindows' });

  for (const tr of settings.taskRates) {
    if (!service.fields.includes(tr.field)) continue;
    const qty = num(m[tr.field]);
    if (!(qty > 0)) continue;
    if (tr.id === 'window' && useGlass) continue;
    if ((service.included || []).includes(tr.id)) {
      assumptions.push({ k: 'asm.included', p: { task: tr.id } });
      continue;
    }
    let mult = dirt * access * (constructionDust ? P.constructionDust : 1);
    if (tr.condition === 'grease' && cond.grease) mult *= P.grease;
    if (tr.condition === 'limescale' && cond.limescale) mult *= P.limescale;
    mult = cap(mult, tr.id);
    let base;
    let rate;
    if (tr.mode === 'area') {
      rate = tr.rate[level] ?? tr.rate.regular;
      if (!(rate > 0)) { checks.push({ level: 'error', k: 'chk.rateMissing', p: { task: tr.id } }); continue; }
      base = qty / rate;
    } else {
      rate = tr.hours[level] ?? tr.hours.regular;
      if (!(rate >= 0)) { checks.push({ level: 'error', k: 'chk.rateMissing', p: { task: tr.id } }); continue; }
      base = qty * rate;
    }
    const each = tr.mode === 'each';
    // Countable items become one task per item group so several workers can take different rooms.
    const maxParallel = tr.mode === 'area' ? Math.max(1, Math.floor(qty / P.minAreaPerWorkerM2)) : Math.max(1, Math.ceil(qty)) * (tr.maxParallel || 1);
    tasks.push({ key: 'unit:' + tr.id, k: 'task.' + tr.id, qty, unit: each ? 'each' : 'm2', rate, rateUnit: each ? 'heach' : 'm2h', base, mult, hours: base * mult, phase: tr.phase, maxParallel, checklist: TASK_CHECKLIST_FOR[tr.id] || null });
  }

  if (cond.stains && !num(m.stainSpots)) checks.push({ level: 'warn', k: 'chk.stainsNoCount' });
  assumptions.push({ k: 'asm.multipliers', p: { dirt, access } });
  if (constructionDust) assumptions.push({ k: 'asm.constructionDust', p: { x: P.constructionDust } });

  // Owner and AI-added tasks
  for (const ct of job.customTasks || []) {
    const h = num(ct.hours);
    if (!Number.isFinite(h) || h < 0) { checks.push({ level: 'error', k: 'chk.taskHoursInvalid', p: { task: ct.name || '?' } }); continue; }
    tasks.push({ key: 'custom:' + ct.id, name: ct.name, hours: h, base: h, mult: 1, phase: ct.phase || 2, maxParallel: Math.max(1, num(ct.maxParallel) || 1), source: ct.source || 'manual', approved: ct.source !== 'ai' || !!ct.approved, worker: ct.worker || null });
  }

  // Owner edits (override hours, remove, assign worker)
  const edits = job.taskEdits || {};
  for (const t of tasks) {
    const e = edits[t.key];
    if (!e) continue;
    if (e.removed) t.removed = true;
    if (e.hours !== undefined && e.hours !== '' && e.hours !== null) {
      const h = Number(e.hours);
      if (!Number.isFinite(h) || h < 0) checks.push({ level: 'error', k: 'chk.taskHoursInvalid', p: { task: t.key } });
      else { t.calcHours = t.hours; t.hours = h; t.edited = true; }
    }
    if (e.worker) t.worker = Number(e.worker);
  }
  return tasks;
}

const TASK_CHECKLIST_FOR = { kitchen: 'kitchen', bathroom: 'bathroom', toilet: 'toilet' };

// Tops a job up to the level's minimum worker-hours (e.g. a deep clean is never under 6 h).
function addMinimum(tasks, settings, service, assumptions) {
  const min = num(settings.productivity.minWorkerHours?.[service.level]);
  const work = tasks.filter((t) => !t.removed).reduce((s, t) => s + t.hours, 0);
  // Only whole-property services; a single bathroom or a few windows have no minimum.
  if (!service.areaRate || !(min > 0) || work <= EPS || work >= min - EPS) return;
  const h = min - work;
  tasks.push({ key: 'minimum', k: 'task.minimum', hours: h, base: h, mult: 1, phase: 2, maxParallel: 1 });
  assumptions.push({ k: 'asm.minHours', p: { min } });
}

function addInspection(tasks, settings, service) {
  const P = settings.productivity;
  const work = tasks.filter((t) => !t.removed).reduce((s, t) => s + t.hours, 0);
  if (work <= 0 || service.noInspection) return;
  const h = Math.max(P.inspectionMinHours, (work * P.inspectionPct) / 100);
  tasks.push({ key: 'inspection', k: 'task.inspection', hours: h, base: h, mult: 1, phase: 4, maxParallel: 99, checklist: 'inspection', autoInspection: true });
}

// ---------- Schedule ----------
// Phases run in order: [1+2] glass, rooms, kitchens, bathrooms -> [3] floors -> [4] final inspection.
const PHASE_GROUPS = [[1, 2], [3], [4]];

export function schedule(tasks, workers, settings) {
  const P = settings.productivity;
  const live = tasks.filter((t) => !t.removed && t.hours > EPS);
  const loads = Array(workers).fill(0);
  const perWorker = Array.from({ length: workers }, () => []);
  let clock = 0;
  const phases = [];
  for (const group of PHASE_GROUPS) {
    const gt = live.filter((t) => group.includes(t.phase));
    if (!gt.length) continue;
    const start = clock;
    const local = Array(workers).fill(start);
    const pieces = [];
    for (const t of gt) {
      let maxPar = t.maxParallel || 1;
      if (t.autoInspection) maxPar = Math.max(1, Math.ceil(workers / 3));
      const assigned = t.worker && t.worker >= 1 && t.worker <= workers ? t.worker - 1 : null;
      const n = assigned !== null ? 1 : Math.max(1, Math.min(maxPar, workers));
      for (let i = 0; i < n; i++) pieces.push({ t, h: t.hours / n, assigned, part: n > 1 ? i + 1 : 0, of: n });
    }
    // Pre-assigned pieces first, then by phase (glass before rooms), longest first, onto the least loaded worker.
    pieces.sort((a, b) => (a.assigned !== null) !== (b.assigned !== null) ? (a.assigned !== null ? -1 : 1) : a.t.phase !== b.t.phase ? a.t.phase - b.t.phase : b.h - a.h);
    for (const pc of pieces) {
      let w = pc.assigned;
      if (w === null) { w = 0; for (let i = 1; i < workers; i++) if (local[i] < local[w] - EPS) w = i; }
      perWorker[w].push({ key: pc.t.key, task: pc.t, start: local[w], end: local[w] + pc.h, part: pc.part, of: pc.of });
      local[w] += pc.h;
      loads[w] += pc.h;
    }
    clock = Math.max(...local);
    phases.push({ group, start, end: clock });
  }
  const makespan = clock;
  const productivePerShift = Math.max(0.5, P.shiftHours - P.breakHours);
  const days = makespan > EPS ? Math.max(1, Math.ceil(makespan / productivePerShift - 1e-9)) : 0;
  let breaks = 0;
  if (days === 1 && makespan > P.breakAfterHours) breaks = P.breakHours;
  else if (days > 1) breaks = days * P.breakHours;
  const scheduledHours = loads.reduce((s, x) => s + x, 0);
  return { workers, perWorker, loads, phases, makespan, days, breaks, onSiteHours: makespan + breaks, productivePerShift, scheduledHours, idleHours: workers * makespan - scheduledHours };
}

export function teamOptions(tasks, settings, upTo) {
  const out = [];
  for (let w = 1; w <= upTo; w++) {
    const s = schedule(tasks, w, settings);
    out.push({ workers: w, makespan: s.makespan, onSiteHours: s.onSiteHours, days: s.days, idleHours: s.idleHours });
  }
  return out;
}

export function recommendWorkers(options) {
  if (!options.length) return 1;
  const oneDay = options.find((o) => o.days <= 1);
  if (oneDay) return oneDay.workers;
  const best = Math.min(...options.map((o) => o.days));
  return options.find((o) => o.days === best).workers;
}

// ---------- Pricing ----------
export function price(job, settings, service, workerHours) {
  const Pr = settings.pricing;
  const c = job.costs || {};
  const profile = rateProfile(settings, job.rateProfile || service.rateProfile);
  const shift = Pr.shiftTypes.find((s) => s.id === (job.shift || 'normal')) || { sellPct: 0, costPct: 0 };
  // A rate group chosen on the job wins; otherwise the service's own selling rate, then its rate group.
  const ownRate = !job.rateProfile && num(service.sellRate) > 0;
  const sellRate = ownRate ? num(service.sellRate) : num(profile.sellRate);
  const quoted = service.pricing === 'quote';
  const quotedPrice = round2(num(job.quotedPrice));
  const costRate = num(profile.costRate);
  const lines = [];

  const labourCost = round2(workerHours * costRate * (1 + num(shift.costPct) / 100));
  let materialsCost = round2(num(c.materials));
  let materialsAuto = false;
  if (!(materialsCost > 0) && num(Pr.autoMaterialsPctOfLabour) > 0) { materialsCost = round2((labourCost * Pr.autoMaterialsPctOfLabour) / 100); materialsAuto = true; }
  const equipmentCost = round2(num(c.equipment));
  const km = num(c.distanceKm);
  const travelCost = round2(km * num(Pr.travelCostPerKm));
  const subcontract = round2(num(c.subcontract));
  const otherCost = round2(num(c.other));
  const directCost = round2(labourCost + materialsCost + equipmentCost + travelCost + subcontract + otherCost);

  const callOut = round2(num(Pr.callOutCharge));
  const travelCharge = round2(callOut + km * num(Pr.travelChargePerKm));
  const additional = (job.charges || []).map((x) => ({ label: x.label, amount: round2(num(x.amount)) }));
  const additionalTotal = round2(additional.reduce((s, x) => s + x.amount, 0));

  let billableHours = 0;
  const perM2 = service.pricing === 'm2';
  const m2Field = service.fields.find((f) => AREA_FIELDS.includes(f));
  const m2Qty = num((job.m || {})[m2Field]);
  if (perM2) {
    // Priced per m² (e.g. carpets); hours and labour cost are still worked out to show the profit.
    lines.push({ k: 'price.perM2', amount: round2(m2Qty * num(service.pricePerM2)), p: { qty: round2(m2Qty), rate: num(service.pricePerM2) } });
    if (materialsCost > 0 && num(c.materials) > 0) lines.push({ k: 'price.materials', amount: round2(materialsCost * (1 + num(Pr.materialsMarkupPct) / 100)) });
    if (travelCharge > 0) lines.push({ k: 'price.travel', amount: travelCharge, p: { km } });
  } else if (quoted) {
    // Priced by size and condition: the owner's price replaces labour; costs are still added on top.
    lines.push({ k: 'price.quoted', amount: quotedPrice > 0 ? quotedPrice : 0 });
    if (materialsCost > 0 && num(c.materials) > 0) lines.push({ k: 'price.materials', amount: round2(materialsCost * (1 + num(Pr.materialsMarkupPct) / 100)) });
    if (equipmentCost > 0) lines.push({ k: 'price.equipment', amount: round2(equipmentCost * (1 + num(Pr.equipmentMarkupPct) / 100)) });
    if (subcontract > 0) lines.push({ k: 'price.subcontract', amount: round2(subcontract * (1 + num(Pr.subcontractMarkupPct) / 100)) });
    if (otherCost > 0) lines.push({ k: 'price.other', amount: otherCost });
    if (travelCharge > 0) lines.push({ k: 'price.travel', amount: travelCharge, p: { km } });
  } else if (Pr.mode === 'cost') {
    const m = Math.min(Math.max(num(Pr.targetMarginPct), 0), 95) / 100;
    const costBased = round2(directCost / (1 - m));
    lines.push({ k: 'price.costBased', amount: costBased, p: { margin: num(Pr.targetMarginPct) } });
    if (callOut > 0) lines.push({ k: 'price.callOut', amount: callOut });
  } else {
    billableHours = workerHours > EPS ? ceilTo(Math.max(workerHours, num(Pr.minBillableHours)), num(Pr.billableHoursStep)) : 0;
    const labourCharge = round2(billableHours * sellRate * (1 + num(shift.sellPct) / 100));
    lines.push({ k: 'price.labour', amount: labourCharge, p: { hours: billableHours, rate: sellRate, pct: num(shift.sellPct) } });
    if (materialsCost > 0) lines.push({ k: 'price.materials', amount: round2(materialsCost * (1 + num(Pr.materialsMarkupPct) / 100)) });
    if (equipmentCost > 0) lines.push({ k: 'price.equipment', amount: round2(equipmentCost * (1 + num(Pr.equipmentMarkupPct) / 100)) });
    if (subcontract > 0) lines.push({ k: 'price.subcontract', amount: round2(subcontract * (1 + num(Pr.subcontractMarkupPct) / 100)) });
    if (otherCost > 0) lines.push({ k: 'price.other', amount: otherCost });
    if (travelCharge > 0) lines.push({ k: 'price.travel', amount: travelCharge, p: { km } });
  }
  // Construction / renovation: the cleaning itself is priced from the owner's table (size × how heavy the work is).
  let band = null;
  if (service.priceTable && !perM2 && !quoted && workerHours > EPS) {
    band = priceBand(settings, service.priceTable, num((job.m || {}).areaM2), (job.cond || {}).dirt);
    if (band) {
      const CORE = ['price.labour', 'price.costBased', 'price.materials', 'price.equipment'];
      const at = lines.findIndex((l) => CORE.includes(l.k));
      band.hoursPrice = round2(lines.filter((l) => CORE.includes(l.k)).reduce((s, l) => s + l.amount, 0));
      let v = Math.max(band.hoursPrice, band.min);
      if (band.max != null && Pr.priceTableMode !== 'min') v = Math.min(v, band.max);
      band.price = round2(v);
      const rest = lines.filter((l) => !CORE.includes(l.k));
      rest.splice(at < 0 ? 0 : at, 0, { k: 'price.table.' + band.level, amount: band.price, p: { qty: round2(band.area) } });
      lines.splice(0, lines.length, ...rest);
    }
  }
  for (const a of additional) if (a.amount) lines.push({ k: 'price.additional', label: a.label, amount: a.amount });

  let subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const discountPct = num(c.discountPct);
  if (discountPct > 0) {
    const d = -round2((subtotal * discountPct) / 100);
    lines.push({ k: 'price.discount', amount: d, p: { pct: discountPct } });
    subtotal = round2(subtotal + d);
  }
  let minApplied = false;
  // Reference minimum for the service: never below its price per m² (before tax).
  const refArea = num((job.m || {}).areaM2);
  const refMin = num(service.minPricePerM2) > 0 && refArea > 0 && !quoted && !band ? round2(refArea * num(service.minPricePerM2)) : 0;
  let refApplied = false;
  if (workerHours > EPS && refMin > 0 && subtotal < refMin) {
    lines.push({ k: 'price.refMin', amount: round2(refMin - subtotal), p: { rate: num(service.minPricePerM2), qty: round2(refArea) } });
    subtotal = refMin;
    refApplied = true;
  }
  if (workerHours > EPS && subtotal < num(Pr.minJobCharge)) {
    lines.push({ k: 'price.minCharge', amount: round2(num(Pr.minJobCharge) - subtotal) });
    subtotal = round2(num(Pr.minJobCharge));
    minApplied = true;
  }
  const rounded = round2(roundTo(subtotal, num(Pr.priceRoundingStep) || 0.01));
  if (Math.abs(rounded - subtotal) > 0.004) {
    lines.push({ k: 'price.rounding', amount: round2(rounded - subtotal) });
    subtotal = rounded;
  }
  const tax = taxRateFor(job, settings);
  const taxRate = tax ? num(tax.rate) : 0;
  const taxAmount = round2((subtotal * taxRate) / 100);
  const total = round2(subtotal + taxAmount);
  const profit = round2(subtotal - directCost);
  return {
    profile, shift, sellRate, costRate, billableHours, ownRate, quoted, quotedPrice,
    labourCost, materialsCost, materialsAuto, equipmentCost, travelCost, subcontract, otherCost, directCost,
    travelCharge, additional, lines, subtotal, tax, taxRate, taxAmount, total, profit,
    marginPct: subtotal > 0 ? (profit / subtotal) * 100 : 0,
    markupPct: directCost > 0 ? (profit / directCost) * 100 : 0,
    minApplied, refApplied, refMin, perM2, band,
  };
}

// Price range of the central price list (Configuración de tarifas) for this size and, for construction,
// the level of work. Between rows the price is interpolated; above the last row it is scaled by m².
export function priceBand(settings, tableId, area, dirt) {
  const rows = (settings.pricing.priceTables || {})[tableId];
  if (!rows?.length || !(area > 0)) return null;
  const isCols = !!rows[0].cols;
  const level = !isCols ? 'all' : dirt === 'light' ? 'light' : dirt === 'heavy' || dirt === 'extreme' ? 'heavy' : 'medium';
  const col = level === 'medium' ? 'standard' : level;
  const r = rangeAt(rows, area, isCols ? (row) => row.cols[col] || [0, 0] : undefined);
  if (!r || !(r.min > 0)) return null;
  // Extreme dirt starts at the heavy price with no upper limit: it needs an inspection anyway.
  const max = dirt === 'extreme' || !(r.max > 0) ? null : round2(r.max);
  return { table: tableId, level, area, exact: r.exact, min: round2(r.min), max };
}

// ---------- Main entry ----------
export function calculate(job, settings, services) {
  const checks = [];
  const assumptions = [];
  const service = findService(services, job.serviceId);
  if (!service) {
    checks.push({ level: 'error', k: 'chk.noService' });
    return { ok: false, checks, assumptions, tasks: [], workerHours: 0 };
  }
  validateInputs(job, service, checks);
  const tasks = buildTasks(job, settings, service, checks, assumptions);
  addMinimum(tasks, settings, service, assumptions);
  addInspection(tasks, settings, service);
  const live = tasks.filter((t) => !t.removed);
  const workerHours = live.reduce((s, t) => s + t.hours, 0);
  const P = settings.productivity;

  const upTo = Math.max(1, Math.min(P.maxTeam, Math.max(1, Math.ceil(workerHours))));
  const options = workerHours > EPS ? teamOptions(tasks, settings, upTo) : [];
  const recommended = recommendWorkers(options);
  let workers = job.workers === 'auto' || job.workers === undefined ? recommended : Math.max(1, Math.floor(num(job.workers)) || 1);
  const sched = schedule(tasks, workers, settings);
  const pricing = price(job, settings, service, workerHours);

  // ---- Quality checks ----
  if (workerHours <= EPS && !checks.some((c) => c.level === 'error')) checks.push({ level: 'error', k: 'chk.noWork' });
  const tax = taxRateFor(job, settings);
  if (!tax) checks.push({ level: 'error', k: 'chk.taxMissing' });
  const area = num((job.m || {}).areaM2);
  const Pr = settings.pricing;
  if (workerHours > EPS) {
    if (pricing.profit < 0) checks.push({ level: 'warn', k: 'chk.loss', p: { profit: pricing.profit } });
    else if (pricing.marginPct < num(Pr.lowMarginWarnPct)) checks.push({ level: 'warn', k: 'chk.lowMargin', p: { margin: round2(pricing.marginPct), min: Pr.lowMarginWarnPct } });
    if (Pr.mode === 'hourly' && !pricing.quoted && !pricing.perM2 && pricing.sellRate < pricing.costRate) checks.push({ level: 'warn', k: 'chk.sellBelowCost' });
    if (pricing.quoted && !(pricing.quotedPrice > 0)) checks.push({ level: 'error', k: 'chk.quotedPriceMissing' });
    if (area > 0) {
      const ppm = pricing.subtotal / area;
      if (ppm < Pr.pricePerM2Warn.min || ppm > Pr.pricePerM2Warn.max) checks.push({ level: 'warn', k: 'chk.pricePerM2', p: { value: round2(ppm), min: Pr.pricePerM2Warn.min, max: Pr.pricePerM2Warn.max } });
      const hpm = workerHours / area;
      if (hpm > 1.5 || hpm < 0.004) checks.push({ level: 'warn', k: 'chk.hoursPerM2', p: { value: round2(hpm * 100) } });
    }
    if (pricing.minApplied) checks.push({ level: 'info', k: 'chk.minApplied' });
    if (pricing.band) {
      const b = pricing.band;
      checks.push({ level: 'info', k: b.max != null ? 'chk.band' : 'chk.bandOpen', p: { min: Math.round(b.min), max: Math.round(b.max ?? 0), hours: Math.round(b.hoursPrice) } });
      if (b.price > b.hoursPrice + 0.004) checks.push({ level: 'info', k: 'chk.bandRaised' });
      else if (b.price < b.hoursPrice - 0.004) checks.push({ level: 'warn', k: 'chk.bandCapped' });
      assumptions.push({ k: b.exact ? 'asm.bandExact' : 'asm.bandInterp', p: { area: round2(b.area) } });
    }
    if (pricing.refApplied) checks.push({ level: 'info', k: 'chk.refMinApplied', p: { value: pricing.refMin } });
    if (pricing.perM2 && Array.isArray(service.pricePerM2Range) && (service.pricePerM2 < service.pricePerM2Range[0] || service.pricePerM2 > service.pricePerM2Range[1])) checks.push({ level: 'warn', k: 'chk.perM2Range', p: { min: service.pricePerM2Range[0], max: service.pricePerM2Range[1] } });
    if (workers > recommended && sched.idleHours > workers * 0.5) checks.push({ level: 'info', k: 'chk.idleWorkers', p: { idle: round2(sched.idleHours) } });
  }
  const names = (job.customTasks || []).map((t) => (t.name || '').trim().toLowerCase()).filter(Boolean);
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) checks.push({ level: 'warn', k: 'chk.duplicateTasks', p: { names: [...new Set(dup)].join(', ') } });
  const unapproved = tasks.filter((t) => t.source === 'ai' && !t.approved && !t.removed);
  if (unapproved.length) checks.push({ level: 'warn', k: 'chk.aiUnapproved', p: { n: unapproved.length } });
  if (tasks.some((t) => t.edited)) checks.push({ level: 'info', k: 'chk.edited' });

  // Physical inspection flags
  const cond = job.cond || {};
  const inspectReasons = [];
  if (area >= P.largeJobInspectionM2) inspectReasons.push('large');
  if (cond.dirt === 'extreme') inspectReasons.push('extreme');
  if (service.level === 'construction' || cond.constructionDust) inspectReasons.push('construction');
  if (cond.access === 'veryDifficult' || num((job.m || {}).highLevelTasks) > 0) inspectReasons.push('access');
  if (tasks.some((t) => t.source === 'ai')) inspectReasons.push('ai');
  if (inspectReasons.length) checks.push({ level: 'warn', k: 'chk.inspection', p: { reasons: inspectReasons } });

  // Arithmetic self-checks
  const lineSum = round2(pricing.lines.reduce((s, l) => s + l.amount, 0));
  if (Math.abs(lineSum - pricing.subtotal) > 0.011 || Math.abs(round2(pricing.subtotal + pricing.taxAmount) - pricing.total) > 0.001 || Math.abs(sched.scheduledHours - workerHours) > 1e-4) {
    checks.push({ level: 'error', k: 'chk.arithmetic' });
  }

  if (pricing.perM2) assumptions.push({ k: 'asm.perM2', p: { rate: service.pricePerM2, cost: pricing.costRate } });
  else if (pricing.quoted) assumptions.push({ k: 'asm.quoted', p: { cost: pricing.costRate } });
  else if (pricing.ownRate) assumptions.push({ k: 'asm.serviceRate', p: { sell: pricing.sellRate, cost: pricing.costRate } });
  else assumptions.push({ k: 'asm.profile', p: { name: pricing.profile.id, sell: pricing.sellRate, cost: pricing.costRate } });
  if (!pricing.quoted && !pricing.perM2) assumptions.push({ k: Pr.mode === 'cost' ? 'asm.modeCost' : 'asm.modeHourly', p: { margin: Pr.targetMarginPct } });
  if (num(service.minPricePerM2) > 0) assumptions.push({ k: 'asm.refMin', p: { rate: service.minPricePerM2 } });
  if (tax) assumptions.push({ k: 'asm.tax', p: { name: tax.name, rate: tax.rate } });
  assumptions.push({ k: 'asm.inspectionTask', p: { pct: P.inspectionPct } });
  assumptions.push({ k: 'asm.shift', p: { shift: P.shiftHours, brk: P.breakHours } });

  return {
    ok: !checks.some((c) => c.level === 'error'),
    service, tasks, workerHours, workers, recommendedWorkers: recommended, autoWorkers: job.workers === 'auto' || job.workers === undefined,
    schedule: sched, teamOptions: options, pricing, checks, assumptions,
    needsInspection: inspectReasons.length > 0, inspectReasons,
  };
}

// Simple standalone tools for the Working Hours Calculator page.
export function quickHours({ areaM2, rate, workerHours, workers, shiftHours = 8, breakHours = 0.5 }) {
  const wh = workerHours > 0 ? workerHours : areaM2 > 0 && rate > 0 ? areaM2 / rate : 0;
  const w = Math.max(1, Math.floor(workers || 1));
  const elapsed = wh / w;
  const perShift = Math.max(0.5, shiftHours - breakHours);
  return { workerHours: wh, workers: w, elapsed, days: wh > 0 ? Math.ceil(elapsed / perShift - 1e-9) : 0 };
}

// Productivity learned from completed jobs: actual m² per worker-hour for area-based services.
// Only ever a SUGGESTION; the owner must approve before any rate changes.
export function learnedRates(jobs, services) {
  const by = {};
  for (const j of jobs) {
    if (j.status !== 'completed' || !(num(j.actual?.hours) > 0) || !(num(j.m?.areaM2) > 0) || !j.estimate) continue;
    const s = findService(services, j.serviceId);
    if (!s || !s.areaRate) continue;
    const ratio = num(j.actual.hours) / j.estimate.workerHours; // >1 means took longer than estimated
    (by[s.id] ||= { serviceId: s.id, current: s.areaRate, ratios: [] }).ratios.push(ratio);
  }
  return Object.values(by).map((x) => {
    const avg = x.ratios.reduce((a, b) => a + b, 0) / x.ratios.length;
    return { ...x, jobs: x.ratios.length, avgRatio: avg, suggested: round2(x.current / avg) };
  });
}

export const M2_PER_FT2 = 0.09290304;
export const toDisplayArea = (m2, units) => (units === 'ft2' ? m2 / M2_PER_FT2 : m2);
export const fromDisplayArea = (v, units) => (units === 'ft2' ? v * M2_PER_FT2 : v);
