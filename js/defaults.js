// Default catalogue and settings for LIMPIEZA VITORIA ALAVA.
// Every number here is a STARTING VALUE for the owner to review and edit in the app.
// They are not market data. The app never changes saved rates without the owner's approval.

import { defaultTariffs } from './tariffs-data.js';
import { engineTables } from './tariffs.js';

export const SCHEMA_VERSION = 1;

// Service levels drive which column of the task-rate table is used.
export const LEVELS = ['regular', 'deep', 'construction', 'specialised'];

// Every measurement field the app knows about. Services choose which ones to ask for.
// unit: 'area' values are stored in m² and converted for display when the owner uses ft².
export const FIELDS = [
  { id: 'areaM2', unit: 'area', group: 'property' },
  { id: 'bedrooms', unit: 'count', group: 'property' },
  { id: 'livingRooms', unit: 'count', group: 'property' },
  { id: 'hallways', unit: 'count', group: 'property' },
  { id: 'rooms', unit: 'count', group: 'property' },
  { id: 'kitchens', unit: 'count', group: 'property' },
  { id: 'bathrooms', unit: 'count', group: 'property' },
  { id: 'toilets', unit: 'count', group: 'property' },
  { id: 'windows', unit: 'count', group: 'glass' },
  { id: 'glassM2', unit: 'area', group: 'glass' },
  { id: 'doors', unit: 'count', group: 'property' },
  { id: 'balconies', unit: 'count', group: 'property' },
  { id: 'stairFloors', unit: 'count', group: 'building' },
  { id: 'lifts', unit: 'count', group: 'building' },
  { id: 'garageM2', unit: 'area', group: 'building' },
  { id: 'offices', unit: 'count', group: 'building' },
  { id: 'appliances', unit: 'count', group: 'extras' },
  { id: 'sofas', unit: 'count', group: 'extras' },
  { id: 'mattresses', unit: 'count', group: 'extras' },
  { id: 'chairs', unit: 'count', group: 'extras' },
  { id: 'carpetM2', unit: 'area', group: 'extras' },
  { id: 'floorTreatmentM2', unit: 'area', group: 'extras' },
  { id: 'stainSpots', unit: 'count', group: 'extras' },
  { id: 'highLevelTasks', unit: 'count', group: 'extras' },
];

// Task rates for work not represented by the base area rate.
// mode 'each': hours per item, per level. mode 'area': m² per worker-hour, per level.
// maxParallel: how many workers can usefully work on ONE item at the same time.
// phase: 1 = high level / glass / heavy, 2 = rooms, kitchens, bathrooms, 3 = floors, 4 = final inspection.
export const DEFAULT_TASK_RATES = [
  { id: 'bedroom', field: 'bedrooms', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.5, deep: 2.0, construction: 3.0, specialised: 2.0 } },
  { id: 'livingRoom', field: 'livingRooms', mode: 'each', phase: 2, maxParallel: 2, hours: { regular: 0.75, deep: 3.0, construction: 4.0, specialised: 3.0 } },
  { id: 'hallway', field: 'hallways', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.25, deep: 1.0, construction: 1.5, specialised: 1.0 } },
  { id: 'kitchen', field: 'kitchens', mode: 'each', phase: 2, maxParallel: 2, hours: { regular: 1.0, deep: 4.5, construction: 5.5, specialised: 4.5 }, condition: 'grease' },
  { id: 'bathroom', field: 'bathrooms', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.6, deep: 2.5, construction: 3.5, specialised: 2.5 }, condition: 'limescale' },
  { id: 'toilet', field: 'toilets', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.3, deep: 1.0, construction: 1.5, specialised: 1.0 }, condition: 'limescale' },
  { id: 'window', field: 'windows', mode: 'each', phase: 1, maxParallel: 1, hours: { regular: 0.2, deep: 0.5, construction: 0.75, specialised: 0.5 } },
  { id: 'glass', field: 'glassM2', mode: 'area', phase: 1, maxParallel: 99, rate: { regular: 12, deep: 8, construction: 5, specialised: 8 } },
  { id: 'door', field: 'doors', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.1, deep: 0.3, construction: 0.4, specialised: 0.3 } },
  { id: 'balcony', field: 'balconies', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.4, deep: 1.25, construction: 1.75, specialised: 1.25 } },
  { id: 'stairs', field: 'stairFloors', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.4, deep: 0.8, construction: 1.2, specialised: 0.8 } },
  { id: 'lift', field: 'lifts', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.25, deep: 0.6, construction: 0.8, specialised: 0.6 } },
  { id: 'garage', field: 'garageM2', mode: 'area', phase: 3, maxParallel: 99, rate: { regular: 150, deep: 60, construction: 40, specialised: 60 } },
  { id: 'office', field: 'offices', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.25, deep: 0.6, construction: 0.8, specialised: 0.6 } },
  { id: 'appliance', field: 'appliances', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.5, deep: 0.75, construction: 0.75, specialised: 0.75 }, condition: 'grease' },
  { id: 'sofa', field: 'sofas', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 1.0, deep: 1.5, construction: 1.5, specialised: 1.5 } },
  { id: 'mattress', field: 'mattresses', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.75, deep: 0.75, construction: 0.75, specialised: 0.75 } },
  { id: 'chair', field: 'chairs', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.25, deep: 0.25, construction: 0.25, specialised: 0.25 } },
  { id: 'carpet', field: 'carpetM2', mode: 'area', phase: 3, maxParallel: 99, rate: { regular: 15, deep: 15, construction: 12, specialised: 15 } },
  { id: 'floorTreatment', field: 'floorTreatmentM2', mode: 'area', phase: 3, maxParallel: 99, rate: { regular: 10, deep: 10, construction: 8, specialised: 10 } },
  { id: 'stain', field: 'stainSpots', mode: 'each', phase: 2, maxParallel: 1, hours: { regular: 0.25, deep: 0.25, construction: 0.25, specialised: 0.25 } },
  { id: 'highLevel', field: 'highLevelTasks', mode: 'each', phase: 1, maxParallel: 2, hours: { regular: 1.0, deep: 1.0, construction: 1.5, specialised: 1.0 } },
];

// Checklists shown under each task on the work sheet and quotation.
export const TASK_CHECKLISTS = {
  area: ['surfaces', 'doorsSkirting', 'mirrorsGlassInterior'],
  areaFloors: ['floors'],
  kitchen: ['worktops', 'cupboards', 'sinkTaps', 'tilesGrease', 'appliancesScope'],
  bathroom: ['toilet', 'sinkTaps', 'showerBath', 'tilesLimescale', 'mirrorsFinish'],
  toilet: ['toilet', 'sinkTaps', 'mirrorsFinish'],
  inspection: ['checkWork', 'missedTasks', 'finishing'],
};

const S = (id, category, names, cfg) => ({ id, category, name: names, active: true, ...cfg });

const RES_FIELDS = ['areaM2', 'bedrooms', 'livingRooms', 'hallways', 'kitchens', 'bathrooms', 'toilets', 'windows', 'glassM2', 'doors', 'balconies', 'appliances'];
const COM_FIELDS = ['areaM2', 'offices', 'kitchens', 'bathrooms', 'toilets', 'windows', 'glassM2', 'doors', 'stairFloors', 'lifts'];

// areaRate: m² per worker-hour for the base area. null = no base area (task-only service).
// included: task ids already covered by the base area rate (never added again, to avoid double counting).
// sellRate: selling price per worker-hour for this service (null = use its rate group's selling rate).
// pricing: 'quote' = priced by size and condition; the owner types the price for each job.
// pricing: 'm2' = priced per m² of the service's area field (pricePerM2).

// minPricePerM2: the price before tax is never below this × the m² (reference prices for Vitoria-Gasteiz, 17 Oct 2026).
// Selling rates below are RAYAL's own price list (13 Oct 2026).
const OTHER_FIELDS = [...new Set(RES_FIELDS.concat(COM_FIELDS))];
export const DEFAULT_SERVICES = [
  // Residential
  S('house-regular', 'residential', { en: 'Normal house cleaning', es: 'Limpieza normal de vivienda' }, { level: 'regular', areaRate: 45, rateProfile: 'standard', sellRate: 15.46, fields: RES_FIELDS, included: ['door'] }),
  S('house-deep', 'residential', { en: 'Deep house cleaning', es: 'Limpieza a fondo de vivienda' }, { level: 'deep', areaRate: 22, rateProfile: 'deep', sellRate: 18.36, priceTable: 'deep', fields: RES_FIELDS, included: [] }),
  S('maintenance', 'residential', { en: 'Regular maintenance cleaning', es: 'Limpieza de mantenimiento periódica' }, { level: 'regular', areaRate: 45, rateProfile: 'standard', sellRate: 15.46, fields: OTHER_FIELDS, included: ['door', 'office'] }),
  S('one-off', 'residential', { en: 'One-off cleaning', es: 'Limpieza puntual' }, { level: 'deep', areaRate: 26, rateProfile: 'deep', sellRate: 18.36, priceTable: 'deep', fields: RES_FIELDS, included: [] }),
  S('apartment', 'residential', { en: 'Apartment cleaning', es: 'Limpieza de apartamento' }, { level: 'regular', areaRate: 45, rateProfile: 'standard', sellRate: null, fields: RES_FIELDS, included: ['door'] }),
  S('empty-property', 'residential', { en: 'Empty property cleaning', es: 'Limpieza de vivienda vacía' }, { level: 'deep', areaRate: 26, rateProfile: 'deep', sellRate: 18.46, priceTable: 'empty', fields: RES_FIELDS, included: [], forceEmpty: true }),
  S('occupied-property', 'residential', { en: 'Occupied-property cleaning', es: 'Limpieza de vivienda habitada' }, { level: 'regular', areaRate: 40, rateProfile: 'standard', sellRate: null, fields: RES_FIELDS, included: ['door'], forceOccupied: true }),
  S('end-of-tenancy', 'residential', { en: 'End-of-tenancy cleaning', es: 'Limpieza de fin de alquiler' }, { level: 'deep', areaRate: 22, rateProfile: 'deep', sellRate: 17.12, priceTable: 'empty', fields: RES_FIELDS, included: [], forceEmpty: true }),
  S('move-in-out', 'residential', { en: 'Moving-in cleaning', es: 'Limpieza de entrada a vivienda' }, { level: 'deep', areaRate: 24, rateProfile: 'deep', sellRate: 18.26, priceTable: 'empty', fields: RES_FIELDS, included: [], forceEmpty: true }),
  S('move-out', 'residential', { en: 'Moving-out cleaning', es: 'Limpieza de salida de vivienda' }, { level: 'deep', areaRate: 24, rateProfile: 'deep', sellRate: 18.29, priceTable: 'empty', fields: RES_FIELDS, included: [], forceEmpty: true }),
  S('kitchen-only', 'residential', { en: 'Kitchen deep cleaning', es: 'Limpieza a fondo de cocina' }, { level: 'deep', areaRate: null, rateProfile: 'deep', sellRate: 18.36, minPricePerM2: 5, fields: ['areaM2', 'kitchens', 'appliances'], included: [] }),
  S('bathroom-only', 'residential', { en: 'Bathroom deep cleaning', es: 'Limpieza a fondo de baños' }, { level: 'deep', areaRate: null, rateProfile: 'deep', sellRate: 18.36, minPricePerM2: 5, fields: ['areaM2', 'bathrooms', 'toilets'], included: [] }),
  S('rooms-only', 'residential', { en: 'Bedroom and living-room cleaning', es: 'Limpieza de dormitorios y salón' }, { level: 'regular', areaRate: 45, rateProfile: 'standard', sellRate: null, fields: ['areaM2', 'bedrooms', 'livingRooms', 'hallways', 'doors', 'windows'], included: ['door'] }),
  S('balcony-terrace', 'residential', { en: 'Balcony and terrace cleaning', es: 'Limpieza de balcones y terrazas' }, { level: 'deep', areaRate: null, rateProfile: 'standard', sellRate: null, fields: ['balconies', 'glassM2'], included: [] }),
  S('windows-glass', 'residential', { en: 'Simple window cleaning', es: 'Limpieza sencilla de ventanas' }, { level: 'regular', areaRate: null, rateProfile: 'standard', sellRate: 16.16, fields: ['windows', 'glassM2', 'highLevelTasks'], included: [] }),
  S('windows-detailed', 'residential', { en: 'Detailed window and glass cleaning', es: 'Limpieza detallada de ventanas y cristales' }, { level: 'deep', areaRate: null, rateProfile: 'deep', sellRate: 18.46, fields: ['windows', 'glassM2', 'highLevelTasks'], included: [] }),
  S('floors-doors-walls', 'residential', { en: 'Floor deep cleaning', es: 'Limpieza a fondo de suelos' }, { level: 'deep', areaRate: 18, rateProfile: 'deep', sellRate: 18.36, fields: ['areaM2', 'doors'], included: [] }),
  // Commercial
  S('office', 'commercial', { en: 'Office cleaning', es: 'Limpieza de oficinas' }, { level: 'regular', areaRate: 40, rateProfile: 'standard', sellRate: 16.99, fields: COM_FIELDS, included: ['office', 'door'] }),
  S('shop', 'commercial', { en: 'Commercial premises cleaning', es: 'Limpieza de locales comerciales' }, { level: 'regular', areaRate: 35, rateProfile: 'standard', sellRate: 16.99, fields: COM_FIELDS, included: ['office', 'door'] }),
  S('retail-shop', 'commercial', { en: 'Shop cleaning', es: 'Limpieza de tiendas' }, { level: 'regular', areaRate: 35, rateProfile: 'standard', sellRate: 17.66, fields: COM_FIELDS, included: ['office', 'door'] }),
  S('restaurant', 'commercial', { en: 'Restaurants and food-service premises', es: 'Restaurantes y hostelería' }, { level: 'deep', areaRate: 15, rateProfile: 'deep', sellRate: null, fields: COM_FIELDS.concat(['appliances']), included: ['office', 'door'] }),
  S('hotel', 'commercial', { en: 'Hotel cleaning', es: 'Limpieza de hoteles' }, { level: 'regular', areaRate: 25, rateProfile: 'standard', sellRate: 18.66, fields: ['areaM2', 'rooms', 'bathrooms', 'toilets', 'windows', 'stairFloors', 'lifts', 'mattresses'], included: ['door'] }),
  S('school', 'commercial', { en: 'Schools and educational buildings', es: 'Colegios y centros educativos' }, { level: 'regular', areaRate: 35, rateProfile: 'standard', sellRate: null, fields: COM_FIELDS, included: ['office', 'door'] }),
  S('healthcare', 'commercial', { en: 'Clinic and health-centre cleaning', es: 'Limpieza de clínicas y centros de salud' }, { level: 'deep', areaRate: 20, rateProfile: 'specialised', sellRate: 20.16, fields: COM_FIELDS, included: ['office', 'door'] }),
  S('public-building', 'commercial', { en: 'Public and institutional buildings', es: 'Edificios públicos e institucionales' }, { level: 'regular', areaRate: 35, rateProfile: 'standard', sellRate: null, fields: COM_FIELDS, included: ['office', 'door'] }),
  S('community', 'commercial', { en: 'Community and entrance cleaning', es: 'Limpieza de comunidades y portales' }, { level: 'regular', areaRate: 40, rateProfile: 'standard', sellRate: 15.46, fields: ['areaM2', 'stairFloors', 'lifts', 'doors', 'glassM2'], included: [] }),
  S('staircase', 'commercial', { en: 'Staircase cleaning', es: 'Limpieza de escaleras' }, { level: 'regular', areaRate: null, rateProfile: 'standard', sellRate: 15.49, fields: ['stairFloors', 'doors', 'glassM2'], included: [] }),
  S('lift-cleaning', 'commercial', { en: 'Lift cleaning', es: 'Limpieza de ascensores' }, { level: 'regular', areaRate: null, rateProfile: 'standard', sellRate: 15.77, fields: ['lifts'], included: [] }),
  S('garage-warehouse', 'commercial', { en: 'Garage and warehouse cleaning', es: 'Limpieza de garajes y naves' }, { level: 'regular', areaRate: 120, rateProfile: 'standard', sellRate: 17.45, fields: ['areaM2', 'garageM2', 'offices', 'bathrooms', 'toilets', 'glassM2', 'highLevelTasks'], included: [] }),
  // Specialised
  S('post-construction', 'specialised', { en: 'Post-construction cleaning', es: 'Limpieza fin de obra' }, { level: 'construction', areaRate: 15, rateProfile: 'construction', sellRate: 19.12, priceTable: 'construction', fields: RES_FIELDS.concat(['stairFloors', 'lifts', 'garageM2', 'highLevelTasks']), included: [], forceConstruction: true }),
  S('post-renovation', 'specialised', { en: 'Renovation cleaning', es: 'Limpieza tras reforma' }, { level: 'construction', areaRate: 16, rateProfile: 'construction', sellRate: 20.21, priceTable: 'construction', fields: RES_FIELDS.concat(['highLevelTasks']), included: [], forceConstruction: true }),
  S('heavy-duty', 'specialised', { en: 'Heavy-duty cleaning', es: 'Limpieza de choque' }, { level: 'construction', areaRate: 12, rateProfile: 'specialised', sellRate: null, priceTable: 'deep', fields: RES_FIELDS.concat(['stainSpots', 'highLevelTasks']), included: [] }),
  S('disinfection', 'specialised', { en: 'House cleaning and disinfection', es: 'Limpieza y desinfección de vivienda' }, { level: 'deep', areaRate: 30, rateProfile: 'deep', sellRate: null, priceTable: 'disinfection', fields: RES_FIELDS, included: [] }),
  S('after-fire', 'specialised', { en: 'Cleaning after a fire', es: 'Limpieza de vivienda tras incendio' }, { level: 'construction', areaRate: 10, rateProfile: 'specialised', sellRate: null, minPricePerM2: 4, fields: RES_FIELDS.concat(['stainSpots', 'highLevelTasks']), included: [] }),
  S('grease-limescale', 'specialised', { en: 'Grease and limescale removal', es: 'Desengrase y eliminación de cal' }, { level: 'specialised', areaRate: null, rateProfile: 'specialised', sellRate: null, fields: ['kitchens', 'bathrooms', 'toilets', 'appliances'], included: [] }),
  S('stain-treatment', 'specialised', { en: 'Stain treatment', es: 'Tratamiento de manchas' }, { level: 'specialised', areaRate: null, rateProfile: 'specialised', sellRate: null, fields: ['stainSpots'], included: [] }),
  S('mattress-sofa', 'specialised', { en: 'Mattress cleaning', es: 'Limpieza de colchones' }, { level: 'specialised', areaRate: null, rateProfile: 'specialised', sellRate: null, pricing: 'quote', fields: ['mattresses'], included: [] }),
  S('upholstery', 'specialised', { en: 'Sofa and upholstery cleaning', es: 'Limpieza de sofás y tapicerías' }, { level: 'specialised', areaRate: null, rateProfile: 'specialised', sellRate: null, pricing: 'quote', fields: ['sofas', 'chairs'], included: [] }),
  S('carpet', 'specialised', { en: 'Carpet cleaning', es: 'Limpieza de alfombras y moquetas' }, { level: 'specialised', areaRate: null, rateProfile: 'specialised', sellRate: null, pricing: 'm2', pricePerM2: 10, pricePerM2Range: [8.5, 12], fields: ['carpetM2'], included: [] }),
  S('floor-treatment', 'specialised', { en: 'Specialist floor treatment', es: 'Tratamiento especial de suelos' }, { level: 'specialised', areaRate: null, rateProfile: 'specialised', sellRate: null, fields: ['floorTreatmentM2'], included: [] }),
  S('high-level', 'specialised', { en: 'High-level or difficult-access cleaning', es: 'Limpieza en altura o de difícil acceso' }, { level: 'specialised', areaRate: null, rateProfile: 'specialised', sellRate: null, fields: ['highLevelTasks', 'glassM2', 'windows'], included: [] }),
];

// Brings a catalogue saved by an older version up to date: adds new services and applies the
// per-service price list to services that never had one. Owner edits made since are kept.
export function upgradeServices(stored) {
  let changed = false;
  for (const d of DEFAULT_SERVICES) {
    const s = stored.find((x) => x.id === d.id);
    if (!s) { stored.push(JSON.parse(JSON.stringify(d))); changed = true; continue; }
    if (!('sellRate' in s)) { Object.assign(s, { sellRate: d.sellRate, name: { ...d.name }, fields: [...d.fields] }); if (d.pricing) s.pricing = d.pricing; changed = true; }
    // RAYAL's price tables (17 Oct 2026) replace the earlier €3 and €3.50/m² minimums.
    // 21 Oct 2026: moving and empty-property services use their own price table; disinfection too.
    if (d.priceTable && s.priceTable === 'deep' && d.priceTable !== 'deep') { s.priceTable = d.priceTable; changed = true; }
    if (d.priceTable && !('priceTable' in s)) { s.priceTable = d.priceTable; if (s.minPricePerM2 === 3.5 || s.minPricePerM2 === 3) delete s.minPricePerM2; changed = true; }
    for (const k of ['minPricePerM2', 'pricePerM2', 'pricePerM2Range']) {
      if (k === 'minPricePerM2' && s.priceTable) continue;
      if (k in d && !(k in s)) {
        s[k] = d[k];
        if (k === 'pricePerM2' && !s.pricing) s.pricing = d.pricing;
        if (k === 'minPricePerM2' && d.fields.includes('areaM2') && !s.fields.includes('areaM2')) s.fields.unshift('areaM2');
        changed = true;
      }
    }
  }
  return changed;
}

export const DEFAULT_CATEGORIES = [
  { id: 'residential', name: { en: 'Residential', es: 'Residencial' } },
  { id: 'commercial', name: { en: 'Commercial', es: 'Comercial' } },
  { id: 'specialised', name: { en: 'Specialised', es: 'Especializada' } },
];

export function defaultSettings() {
  return {
    schema: SCHEMA_VERSION,
    business: {
      name: 'LIMPIEZA VITORIA ALAVA',
      address: 'Vitoria-Gasteiz, Álava, España',
      taxId: '', ownerName: '', ssNumber: '', iban: '', phone: '', email: '', web: '',
      paymentTerms: '',
      conditions: '',
      validityDays: 30,
    },
    locale: { country: 'ES', region: 'Álava', currency: 'EUR', language: 'es', units: 'm2', numberLocale: 'es-ES' },
    pricing: {
      mode: 'hourly', // 'hourly' = selling rate per worker-hour; 'cost' = direct cost + target margin
      rateProfiles: [
        { id: 'standard', name: { en: 'Regular cleaning', es: 'Limpieza regular' }, sellRate: 15, costRate: 15 },
        { id: 'deep', name: { en: 'Deep cleaning', es: 'Limpieza a fondo' }, sellRate: 15, costRate: 15 },
        { id: 'construction', name: { en: 'Post-construction', es: 'Fin de obra' }, sellRate: 15, costRate: 15 },
        { id: 'specialised', name: { en: 'Specialised work', es: 'Trabajos especiales' }, sellRate: 15, costRate: 15 },
      ],
      shiftTypes: [
        { id: 'normal', sellPct: 0, costPct: 0 },
        { id: 'weekend', sellPct: 0, costPct: 0 },
        { id: 'holiday', sellPct: 0, costPct: 0 },
        { id: 'overtime', sellPct: 0, costPct: 0 },
      ],
      targetMarginPct: 30,
      minJobCharge: 0,
      minBillableHours: 0,
      billableHoursStep: 0.25,
      callOutCharge: 0,
      travelChargePerKm: 0,
      travelCostPerKm: 0,
      materialsMarkupPct: 0,
      equipmentMarkupPct: 0,
      subcontractMarkupPct: 0,
      autoMaterialsPctOfLabour: 0,
      priceRoundingStep: 0.01,
      // Room-by-room calculator prices by size come from the central price list (Configuración de tarifas).
      priceTableMode: 'min', // 'range' = price kept inside the table range; 'min' = table is only a minimum
      priceTables: engineTables(defaultTariffs()),
      lowMarginWarnPct: 10,
      pricePerM2Warn: { min: 0.3, max: 40 },
    },
    tax: {
      rates: [
        { id: 'iva21', name: 'IVA general 21%', rate: 21 },
        { id: 'iva10', name: 'IVA reducido 10%', rate: 10 },
        { id: 'exempt', name: { en: 'Exempt / no tax', es: 'Exento' }, rate: 0 },
      ],
      defaultRateId: 'iva21',
      serviceRates: {}, // serviceId -> taxRateId
      label: 'IVA',
    },
    productivity: {
      dirt: { light: 0.85, normal: 1.0, heavy: 1.35, extreme: 1.75 },
      // Smallest whole-property job, in worker-hours, per cleaning level (owner: a deep clean takes at least 18 h).
      minWorkerHours: { regular: 0, deep: 18, construction: 18, specialised: 0 },
      // When a home's rooms are left blank they are estimated from its m² (the owner is asked to check).
      estimateRooms: true,
      furnished: 1.15,
      occupied: 1.1,
      constructionDust: 1.3,
      grease: 1.4,
      limescale: 1.4,
      access: { normal: 1.0, difficult: 1.2, veryDifficult: 1.4 },
      maxCombinedMultiplier: 3.0,
      inspectionPct: 3,
      inspectionMinHours: 0.25,
      minAreaPerWorkerM2: 15,
      floorsShare: 0.35,
      shiftHours: 8,
      breakHours: 0.5,
      breakAfterHours: 6,
      maxTeam: 12,
      largeJobInspectionM2: 1000,
    },
    taskRates: JSON.parse(JSON.stringify(DEFAULT_TASK_RATES)),
    ai: { endpoint: '', appToken: '', retainMediaAfterAnalysis: true },
    security: { pinHash: '', pinSalt: '' },
  };
}
