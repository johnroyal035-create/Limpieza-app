// Default price list for the "Calculadora de Limpieza y Presupuestos" (RAYAL's spec, 21 Oct 2026).
// These are planning estimates for Vitoria-Gasteiz and Álava, not official tariffs: the owner edits them all
// in Configuración de tarifas. Amounts are euros before IVA; the engine works in whole cents.
//
// Item kinds:
//   table    price for the whole area, read from rows of m² (interpolated between rows)
//   cols     like table, with one column per level of work (e.g. light / standard / heavy)
//   contract monthly price from rows of m², one column per visits per week (interpolated)
//   m2 / lm  price per m² or per linear metre × quantity
//   unit     price per unit × quantity
//   fixed    one price for the job (quantity usually 1)
//   month    price per month (recurring contracts)
//   pct      surcharge in % of the other lines of the same module
//   inspect  no price: always needs an inspection and a specialist quotation
// Flags: inspection (always needs a visit), open (the top of the range can be exceeded: "o más"),
// minCharge (lowest price for that line), includes (package: {itemId: quantity} already included),
// perWindow (quantity follows the number of windows), tag 'window' (counts as a window).

const n = (es, en) => ({ es, en });
const R = (...rows) => rows.map(([m2, min, max]) => ({ m2, min, max }));

const ROWS_RENTAL = R([20, 50, 90], [30, 70, 110], [40, 90, 140], [50, 110, 170], [60, 130, 200], [70, 150, 230], [80, 170, 260], [90, 190, 290], [100, 210, 330], [120, 250, 390], [150, 320, 480], [200, 420, 650], [250, 520, 800], [300, 620, 950]);

export const TARIFF_MODULES = [
  { id: 'm2', icon: '📐', name: n('Calculadora por metros cuadrados', 'Square-metre calculator'), tool: 'm2' },
  { id: 'hours', icon: '⏱', name: n('Calculadora por horas y trabajadores', 'Hours and workers calculator'), tool: 'hours' },
  { id: 'deep', icon: '✨', name: n('Limpieza profunda', 'Deep cleaning') },
  { id: 'construction', icon: '🏗', name: n('Limpieza de fin de obra', 'Post-construction cleaning') },
  { id: 'home', icon: '🏠', name: n('Limpieza general de viviendas', 'Regular home cleaning') },
  { id: 'rental', icon: '🔑', name: n('Limpieza de entrada y salida de alquileres', 'Move-in and move-out cleaning') },
  { id: 'kitbath', icon: '🚿', name: n('Limpieza de cocinas y baños', 'Kitchens and bathrooms') },
  { id: 'windows', icon: '🪟', name: n('Limpieza de cristales y ventanas', 'Windows and glass') },
  { id: 'upholstery', icon: '🛋', name: n('Alfombras, sofás, colchones y tapicerías', 'Carpets, sofas, mattresses and upholstery') },
  { id: 'offices', icon: '🏢', name: n('Oficinas y locales comerciales', 'Offices and commercial premises') },
  { id: 'communities', icon: '🏘', name: n('Comunidades de vecinos y garajes', 'Residential communities and garages') },
  { id: 'industrial', icon: '🏭', name: n('Limpieza industrial y naves', 'Industrial cleaning and warehouses') },
  { id: 'special', icon: '🧪', name: n('Limpiezas especiales y desinfección', 'Special cleaning and disinfection') },
  { id: 'hotels', icon: '🏨', name: n('Limpieza de hoteles y centros sanitarios', 'Hotels and healthcare centres') },
  { id: 'floors', icon: '🧽', name: n('Suelos, terrazas, patios y persianas', 'Floors, terraces, patios and blinds') },
  { id: 'custom', icon: '✍', name: n('Presupuestos personalizados', 'Custom quotations'), tool: 'custom' },
  { id: 'history', icon: '🗂', name: n('Historial de presupuestos', 'Quotation history'), tool: 'history' },
  { id: 'config', icon: '⚙', name: n('Configuración de tarifas', 'Rate settings'), tool: 'config' },
];

export const DEFAULT_TARIFF_ITEMS = [
  // 6. Deep cleaning
  { id: 'deep-home', module: 'deep', kind: 'table', name: n('Limpieza profunda de vivienda', 'Deep home cleaning'),
    rows: R([20, 60, 100], [30, 80, 130], [40, 100, 160], [50, 130, 200], [60, 160, 240], [70, 180, 280], [80, 210, 320], [90, 250, 350], [100, 280, 400], [120, 340, 480], [150, 420, 600], [180, 500, 720], [200, 560, 800], [250, 700, 1000], [300, 840, 1200]),
    includes: null, desc: n('Desinfección a fondo de baños y cocina, interiores de armarios vacíos, azulejos, persianas y puertas.', 'Thorough disinfection of bathrooms and kitchen, inside empty cupboards, tiles, blinds and doors.') },

  // 7. Post-construction cleaning: the condition picks the column (light / standard / heavy)
  { id: 'construction', module: 'construction', kind: 'cols', name: n('Limpieza de fin de obra / tras reforma', 'Post-construction / renovation cleaning'),
    columns: ['light', 'standard', 'heavy'],
    rows: [[20, 60, 100, 100, 150, 150, 200], [30, 75, 120, 120, 180, 180, 250], [40, 100, 160, 160, 220, 220, 300], [50, 125, 200, 200, 275, 275, 350], [60, 150, 240, 240, 330, 330, 420], [70, 175, 280, 280, 385, 385, 490], [80, 200, 320, 320, 440, 440, 560], [90, 225, 360, 360, 495, 495, 630], [100, 250, 400, 400, 550, 550, 700], [120, 300, 480, 480, 660, 660, 840], [150, 375, 600, 600, 825, 825, 1050], [200, 500, 800, 800, 1100, 1100, 1400], [300, 750, 1200, 1200, 1650, 1650, 2100]]
      .map(([m2, a, b, c, d, e, f]) => ({ m2, cols: { light: [a, b], standard: [c, d], heavy: [e, f] } })),
    desc: n('Eliminación de polvo fino, restos de cemento y yeso, salpicaduras de pintura y adhesivos; marcos, puertas, rodapiés, baños y cocinas tras la reforma.', 'Removal of fine dust, cement and plaster residue, paint splashes and adhesive; frames, doors, skirting boards, bathrooms and kitchens after the works.') },
  { id: 'constr-waste', module: 'construction', kind: 'inspect', name: n('Retirada de residuos especiales', 'Specialist waste disposal') },
  { id: 'constr-hazard', module: 'construction', kind: 'inspect', name: n('Materiales peligrosos', 'Hazardous materials') },
  { id: 'constr-ext-windows', module: 'construction', kind: 'inspect', name: n('Cristales exteriores de difícil acceso', 'Difficult exterior windows') },
  { id: 'constr-restoration', module: 'construction', kind: 'inspect', name: n('Trabajos de restauración', 'Restoration work') },

  // 8. Regular home cleaning (price per visit)
  { id: 'home-regular', module: 'home', kind: 'table', perVisit: true, name: n('Limpieza general de vivienda (por visita)', 'Regular home cleaning (per visit)'),
    rows: R([20, 25, 40], [30, 30, 50], [40, 35, 60], [50, 40, 70], [60, 45, 80], [70, 50, 90], [80, 55, 100], [90, 60, 110], [100, 65, 120], [120, 75, 140], [150, 90, 170], [200, 120, 220], [250, 150, 280], [300, 180, 330]),
    desc: n('Mantenimiento habitual. No incluye limpieza profunda ni de fin de obra.', 'Regular maintenance. Not deep or post-construction cleaning.') },

  // 9. Empty properties and moving
  { id: 'rental', module: 'rental', kind: 'table', name: n('Vivienda vacía / entrada y salida', 'Empty property / moving in and out'), rows: ROWS_RENTAL,
    variants: [
      { id: 'empty', name: n('Vivienda de alquiler vacía', 'Empty rental property') },
      { id: 'move-in', name: n('Limpieza de entrada', 'Move-in cleaning') },
      { id: 'move-out', name: n('Limpieza de salida', 'Move-out cleaning') },
      { id: 'pre-sale', name: n('Antes de vender la vivienda', 'Before selling the property') },
      { id: 'between', name: n('Entre inquilinos', 'Between tenants') },
    ] },

  // 10. Kitchens and bathrooms
  ...[
    ['kitchen-small', 'Cocina pequeña', 'Small kitchen', 40, 70], ['kitchen-medium', 'Cocina mediana', 'Medium kitchen', 70, 120], ['kitchen-large', 'Cocina grande', 'Large kitchen', 120, 200],
    ['oven', 'Interior del horno', 'Oven interior', 20, 40], ['hood', 'Campana extractora', 'Extractor hood', 20, 50], ['fridge', 'Interior del frigorífico vacío', 'Empty refrigerator interior', 15, 35],
    ['cupboards', 'Interiores de armarios vacíos', 'Empty cupboard interiors', 20, 60],
    ['toilet-small', 'Aseo pequeño', 'Small toilet', 20, 35], ['bath-standard', 'Baño estándar', 'Standard bathroom', 35, 60], ['bath-large', 'Baño grande', 'Large bathroom', 60, 90],
    ['screen-limescale', 'Cal en mamparas', 'Limescale on shower screens', 15, 35], ['descaling', 'Desincrustación intensiva', 'Intensive descaling', 25, 60], ['grout', 'Azulejos y juntas', 'Tile and grout cleaning', 25, 70],
  ].map(([id, es, en, min, max]) => ({ id, module: 'kitbath', kind: 'unit', name: n(es, en), min, max })),
  { id: 'pkg-kitchen-toilet', module: 'kitbath', kind: 'fixed', package: true, name: n('Paquete cocina pequeña y aseo', 'Small kitchen and toilet package'), min: 60, max: 90, includes: { 'kitchen-small': 1, 'toilet-small': 1 } },
  { id: 'pkg-kitchen-bath', module: 'kitbath', kind: 'fixed', package: true, name: n('Paquete cocina y baño estándar', 'Standard kitchen and bathroom package'), min: 90, max: 150, includes: { 'kitchen-medium': 1, 'bath-standard': 1 } },
  { id: 'pkg-kitchen-2bath', module: 'kitbath', kind: 'fixed', package: true, name: n('Paquete cocina y dos baños', 'Kitchen and two bathrooms package'), min: 130, max: 230, includes: { 'kitchen-medium': 1, 'bath-standard': 2 } },
  { id: 'pkg-greasy-2bath', module: 'kitbath', kind: 'fixed', package: true, name: n('Paquete cocina muy grasienta y dos baños', 'Very greasy kitchen and two bathrooms package'), min: 180, max: 300, includes: { 'kitchen-medium': 1, 'kitchen-large': 1, 'bath-standard': 2, hood: 1 } },

  // 11. Windows, glass and blinds
  { id: 'win-small', module: 'windows', kind: 'unit', tag: 'window', name: n('Ventana pequeña (dos caras accesibles)', 'Small window (both sides accessible)'), min: 5, max: 10 },
  { id: 'win-medium', module: 'windows', kind: 'unit', tag: 'window', name: n('Ventana mediana', 'Medium window'), min: 8, max: 15 },
  { id: 'win-large', module: 'windows', kind: 'unit', tag: 'window', name: n('Ventana grande', 'Large window'), min: 15, max: 30 },
  { id: 'glass-door', module: 'windows', kind: 'unit', name: n('Puerta de cristal', 'Glass door'), min: 8, max: 20 },
  { id: 'balcony-enclosed', module: 'windows', kind: 'fixed', name: n('Balcón cerrado / acristalado', 'Enclosed balcony'), min: 30, max: 90 },
  { id: 'terrace-enclosed', module: 'windows', kind: 'fixed', name: n('Terraza cerrada / acristalada', 'Enclosed terrace'), min: 40, max: 120 },
  { id: 'home-windows', module: 'windows', kind: 'fixed', name: n('Todas las ventanas de la vivienda', 'Complete home windows'), min: 50, max: 180 },
  { id: 'office-glass', module: 'windows', kind: 'm2', name: n('Cristales de oficina (m² de cristal)', 'Office glass (m² of glass)'), min: 1.5, max: 4 },
  { id: 'frames', module: 'windows', kind: 'unit', perWindow: true, name: n('Marcos y carriles (por ventana)', 'Window frames and tracks (per window)'), min: 2, max: 6 },
  { id: 'facade-glass', module: 'windows', kind: 'm2', name: n('Fachadas de cristal (estimación inicial)', 'Glass facades (initial estimate)'), min: 3, max: 8 },
  { id: 'win-difficult', module: 'windows', kind: 'inspect', name: n('Acceso difícil, trabajos en altura o maquinaria', 'Difficult access, height work or machinery') },

  // 12. Carpets, upholstery and mattresses
  ...[
    ['carpet-small', 'Alfombra pequeña', 'Small carpet', 15, 30], ['carpet-medium', 'Alfombra mediana', 'Medium carpet', 30, 60], ['carpet-large', 'Alfombra grande', 'Large carpet', 60, 120],
    ['sofa-2', 'Sofá de dos plazas', 'Two-seat sofa', 45, 70], ['sofa-3', 'Sofá de tres plazas', 'Three-seat sofa', 60, 90], ['sofa-chaise', 'Sofá con chaise longue', 'Chaise longue sofa', 80, 140],
    ['armchair', 'Sillón', 'Armchair', 25, 45], ['chair', 'Silla tapizada', 'Upholstered chair', 8, 18],
    ['mattress-single', 'Colchón individual (una cara)', 'Single mattress (one side)', 25, 45], ['mattress-double', 'Colchón de matrimonio (una cara)', 'Double mattress (one side)', 40, 70],
    ['mattress-double-both', 'Colchón de matrimonio (dos caras)', 'Double mattress (both sides)', 60, 100], ['headboard', 'Cabecero tapizado', 'Upholstered headboard', 20, 50],
    ['vehicle', 'Interior de vehículo', 'Vehicle interior', 60, 150],
  ].map(([id, es, en, min, max]) => ({ id, module: 'upholstery', kind: 'unit', name: n(es, en), min, max })),
  { id: 'carpet-m2', module: 'upholstery', kind: 'm2', name: n('Alfombra por superficie', 'Carpet cleaning by area'), min: 8.5, max: 12 },
  { id: 'fitted-carpet', module: 'upholstery', kind: 'm2', name: n('Moqueta', 'Fitted carpet'), min: 3, max: 7 },
  // Surcharges: the spec asks for them without amounts; these percentages are starting estimates to edit.
  ...[
    ['ups-stains', 'Manchas difíciles', 'Stubborn stains', 10, 25], ['ups-pets', 'Pelo de mascotas', 'Pet hair', 10, 20], ['ups-odour', 'Olores persistentes', 'Persistent odours', 15, 30],
    ['ups-delicate', 'Tejidos delicados', 'Delicate fabrics', 15, 30], ['ups-extra', 'Tratamiento adicional', 'Extra treatment', 10, 25],
  ].map(([id, es, en, min, max]) => ({ id, module: 'upholstery', kind: 'pct', name: n(es, en), min, max, estimate: true })),

  // 13. Offices and commercial premises
  { id: 'office-oneoff', module: 'offices', kind: 'table', name: n('Limpieza puntual de oficina o local', 'One-off office or shop cleaning'),
    rows: R([20, 25, 50], [30, 35, 65], [50, 50, 100], [75, 75, 140], [100, 100, 180], [150, 150, 270], [200, 200, 360], [300, 300, 540], [500, 500, 900], [1000, 1000, 1800]) },
  { id: 'office-contract', module: 'offices', kind: 'contract', name: n('Contrato mensual de mantenimiento de oficina', 'Monthly office maintenance contract'),
    visits: [1, 2, 5],
    rows: [[50, 120, 220, 200, 350, 400, 650], [100, 180, 320, 300, 500, 600, 950], [200, 300, 500, 500, 800, 1000, 1600], [300, 400, 700, 700, 1100, 1400, 2200], [500, 600, 1000, 1000, 1600, 2000, 3200]]
      .map(([m2, a, b, c, d, e, f]) => ({ m2, cols: { 1: [a, b], 2: [c, d], 5: [e, f] } })) },

  // 14. Residential communities and garages
  ...[
    ['portal-small-1w', 'Portal pequeño, una vez por semana', 'Small entrance, weekly', 100, 180], ['portal-small-2w', 'Portal pequeño, dos veces por semana', 'Small entrance, twice weekly', 180, 300],
    ['community-medium', 'Comunidad mediana', 'Medium community', 200, 450], ['community-large', 'Comunidad grande', 'Large community', 350, 800],
    ['community-common', 'Comunidad con amplias zonas comunes', 'Community with extensive common areas', 300, 700],
  ].map(([id, es, en, min, max]) => ({ id, module: 'communities', kind: 'month', name: n(es, en), min, max })),
  { id: 'portal-oneoff', module: 'communities', kind: 'fixed', name: n('Limpieza puntual de portal', 'One-off entrance cleaning'), min: 40, max: 100 },
  { id: 'stairwell-deep', module: 'communities', kind: 'fixed', name: n('Limpieza profunda de escalera', 'Deep stairwell cleaning'), min: 100, max: 350 },
  { id: 'garage-small', module: 'communities', kind: 'fixed', name: n('Garaje comunitario pequeño', 'Small communal garage'), min: 150, max: 400 },
  { id: 'garage', module: 'communities', kind: 'table', name: n('Garaje comunitario por superficie', 'Communal garage by area'), rows: R([500, 250, 600], [1000, 500, 1200], [2000, 1000, 2400]) },

  // 15. Industrial cleaning
  { id: 'ind-maint', module: 'industrial', kind: 'table', name: n('Limpieza industrial de mantenimiento', 'Industrial maintenance cleaning'),
    rows: R([100, 100, 250], [200, 180, 400], [300, 250, 600], [500, 400, 900], [1000, 700, 1800], [2000, 1400, 3500], [5000, 3000, 8000]) },
  { id: 'ind-deep', module: 'industrial', kind: 'table', name: n('Limpieza industrial profunda', 'Industrial deep cleaning'),
    rows: R([100, 250, 500], [200, 400, 800], [300, 600, 1200], [500, 900, 1800], [1000, 1800, 3500], [2000, 3500, 7000], [5000, 7000, 15000]) },
  ...[
    ['ind-grease', 'Grasa industrial', 'Industrial grease', 15, 30], ['ind-dust', 'Mucho polvo', 'High dust', 10, 25], ['ind-access', 'Acceso difícil', 'Difficult access', 10, 30],
    ['ind-safety', 'Requisitos de seguridad', 'Safety requirements', 5, 15], ['ind-machinery', 'Maquinaria', 'Machinery', 10, 25],
  ].map(([id, es, en, min, max]) => ({ id, module: 'industrial', kind: 'pct', name: n(es, en), min, max, estimate: true })),

  // 16. Special cleaning and restoration
  { id: 'disinfection', module: 'special', kind: 'table', name: n('Desinfección básica', 'Basic disinfection'), rows: R([50, 100, 250], [100, 180, 400], [150, 250, 550]) },
  { id: 'fire', module: 'special', kind: 'table', inspection: true, open: true, name: n('Limpieza tras incendio', 'Fire damage cleaning'), rows: R([50, 250, 600], [100, 400, 1200], [150, 600, 1800]) },
  { id: 'flood', module: 'special', kind: 'table', inspection: true, open: true, name: n('Limpieza tras inundación', 'Flood cleaning'), rows: R([50, 200, 500], [100, 350, 900], [150, 500, 1300]) },
  { id: 'hoarding', module: 'special', kind: 'table', inspection: true, open: true, name: n('Vaciado por acumulación extrema', 'Extreme clutter clearance'), rows: R([50, 500, 1200], [100, 800, 2500]) },
  { id: 'odour', module: 'special', kind: 'fixed', name: n('Eliminación de olores', 'Odour removal'), min: 80, max: 300 },
  { id: 'biohazard', module: 'special', kind: 'inspect', name: n('Contaminación biológica', 'Biological contamination') },
  { id: 'unattended-death', module: 'special', kind: 'inspect', name: n('Limpieza tras fallecimiento', 'Unattended death cleaning') },
  { id: 'hazardous-waste', module: 'special', kind: 'inspect', name: n('Residuos peligrosos', 'Hazardous waste') },

  // Hotels and healthcare (spec 17): the spec gives no prices, so these are starting estimates and need a visit.
  { id: 'hotel-room', module: 'hotels', kind: 'unit', estimate: true, inspection: true, name: n('Habitación de hotel estándar (por limpieza)', 'Standard hotel room (per clean)'), min: 8, max: 14 },
  { id: 'hotel-suite', module: 'hotels', kind: 'unit', estimate: true, inspection: true, name: n('Habitación superior o suite (por limpieza)', 'Superior room or suite (per clean)'), min: 14, max: 22 },
  { id: 'hotel-common', module: 'hotels', kind: 'm2', estimate: true, inspection: true, name: n('Zonas comunes de hotel (m²)', 'Hotel common areas (m²)'), min: 1, max: 2 },
  { id: 'health-room', module: 'hotels', kind: 'unit', estimate: true, inspection: true, name: n('Consulta o box sanitario', 'Consulting room or clinic bay'), min: 10, max: 20 },
  { id: 'health-clinical', module: 'hotels', kind: 'm2', estimate: true, inspection: true, name: n('Zona clínica (m²)', 'Clinical area (m²)'), min: 2, max: 4 },
  { id: 'health-critical', module: 'hotels', kind: 'inspect', name: n('Quirófano o zona crítica', 'Operating theatre or critical area') },

  // 17. Other services
  { id: 'blinds', module: 'floors', kind: 'unit', name: n('Persianas', 'Blinds'), min: 8, max: 20, alsoIn: ['windows'] },
  ...[
    ['doors', 'Puertas', 'Doors', 'unit', 5, 15], ['radiators', 'Radiadores', 'Radiators', 'unit', 5, 15], ['skirting', 'Rodapiés (metro lineal)', 'Skirting boards (linear metre)', 'lm', 1, 3],
    ['walls', 'Paredes lavables (m²)', 'Washable walls (m²)', 'm2', 2, 5], ['machine-floor', 'Fregado de suelos a máquina (m²)', 'Machine floor cleaning (m²)', 'm2', 1.5, 4],
    ['polishing', 'Pulido de suelos (m²)', 'Floor polishing (m²)', 'm2', 3, 8], ['marble', 'Cristalizado de mármol (m²)', 'Marble crystallisation (m²)', 'm2', 5, 12],
    ['terraces', 'Terrazas (m²)', 'Terraces (m²)', 'm2', 3, 8], ['patios', 'Patios (m²)', 'Patios (m²)', 'm2', 2, 6],
    ['storage', 'Trasteros', 'Storage rooms', 'fixed', 40, 150], ['garage-private', 'Garaje particular', 'Private garage', 'fixed', 40, 150], ['balcony', 'Balcones', 'Balconies', 'fixed', 25, 70],
    ['post-event', 'Limpieza después de un evento', 'Post-event cleaning', 'fixed', 100, 500], ['solar', 'Placas solares (m², según acceso y método)', 'Solar panels (m², subject to access and method)', 'm2', 3, 8],
  ].map(([id, es, en, kind, min, max]) => ({ id, module: 'floors', kind, name: n(es, en), min, max })),
  { id: 'commercial-kitchen', module: 'floors', kind: 'fixed', open: true, name: n('Cocina industrial', 'Commercial kitchen'), min: 150, max: 500 },
  { id: 'commercial-hood', module: 'floors', kind: 'fixed', open: true, name: n('Campana extractora industrial', 'Commercial extractor hood'), min: 150, max: 600 },
];

// 18. Customer billing rates per worker-hour (not wages, not profit).
export const DEFAULT_HOURLY_RATES = [
  { id: 'domestic', name: n('Mantenimiento doméstico', 'Domestic maintenance'), min: 10, max: 15 },
  { id: 'general', name: n('Limpieza profesional general', 'General professional cleaning'), min: 12, max: 20 },
  { id: 'deep', name: n('Limpieza profunda', 'Deep cleaning'), min: 15, max: 25 },
  { id: 'construction', name: n('Limpieza de fin de obra', 'Post-construction cleaning'), min: 18, max: 30 },
  { id: 'windows', name: n('Cristales especializados', 'Specialised windows'), min: 18, max: 35 },
  { id: 'industrial', name: n('Limpieza industrial especializada', 'Specialised industrial cleaning'), min: 22, max: 40, open: true },
];

export function defaultTariffs() {
  return JSON.parse(JSON.stringify({
    version: 1,
    currency: 'EUR',
    region: 'Vitoria-Gasteiz y Álava, España',
    vatIncluded: false, // prices in the list are before IVA
    validityDays: 30,
    defaultHourlyRate: 15,
    minJobCharge: 0, // lowest total for the cleaning work of a quotation (0 = none)
    // Where the price sits inside a range, by condition: 0 = minimum, 0.5 = middle, 1 = maximum.
    // adjustPct is an optional, explicit % the owner adds to the main service for that condition (0 by default).
    conditions: {
      light: { position: 0, adjustPct: 0 },
      medium: { position: 0.5, adjustPct: 0 },
      heavy: { position: 1, adjustPct: 0 },
      extreme: { position: 1, adjustPct: 0, inspection: true },
    },
    // For services with one column per level of work (fin de obra), the condition picks the column and
    // the price sits at this point inside it.
    columnPosition: 0.5,
    columnByCondition: { light: 'light', medium: 'standard', heavy: 'heavy', extreme: 'heavy' },
    discounts: [
      { id: 'regular', name: n('Cliente habitual', 'Regular customer'), pct: 5 },
      { id: 'contract', name: n('Contrato anual', 'Annual contract'), pct: 10 },
    ],
    terms: n(
      'Presupuesto orientativo basado en la información facilitada. El precio definitivo puede variar tras la visita técnica. No incluye retirada de residuos, aparcamiento ni maquinaria especial salvo que se indique.',
      'Estimate based on the information provided. The final price may change after the inspection visit. Waste removal, parking and special machinery are not included unless stated.'),
    hourlyRates: DEFAULT_HOURLY_RATES,
    items: DEFAULT_TARIFF_ITEMS.map((it) => ({ active: true, minCharge: 0, ...it })),
  }));
}

// Older saved price lists get the items and settings added in newer versions; the owner's edits stay.
export function upgradeTariffs(stored) {
  const def = defaultTariffs();
  let changed = false;
  for (const [k, v] of Object.entries(def)) if (!(k in stored)) { stored[k] = v; changed = true; }
  for (const it of def.items) if (!stored.items.some((x) => x.id === it.id) && !(stored.deletedIds || []).includes(it.id)) { stored.items.push(it); changed = true; }
  for (const r of def.hourlyRates) if (!stored.hourlyRates.some((x) => x.id === r.id)) { stored.hourlyRates.push(r); changed = true; }
  return changed;
}
