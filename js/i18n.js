// Translations. Spanish and English live here; other languages are in js/lang/<code>.js.
// To add a language, copy a file in js/lang, give it a new code, translate the values and keep the keys,
// then add it to DICT below and to the file list in sw.js. It appears in the language selectors automatically.
import fr from './lang/fr.js';
import eu from './lang/eu.js';
import pt from './lang/pt.js';
import it from './lang/it.js';
import de from './lang/de.js';
import nl from './lang/nl.js';
import ar from './lang/ar.js';
import * as budgetTexts from './i18n-budget.js';
import docTexts from './i18n-docs.js';
import bfr from './lang/b-fr.js';
import beu from './lang/b-eu.js';
import bpt from './lang/b-pt.js';
import bit from './lang/b-it.js';
import bde from './lang/b-de.js';
import bnl from './lang/b-nl.js';
import bar from './lang/b-ar.js';

const en = {
  _name: 'English',
  'svc.pricingM2': "Per m²", 'svc.pricePerM2': "Price per m²", 'svc.minPricePerM2': "Minimum price per m² (empty = none)", 'svc.minPricePerM2Help': "The price before tax is never below this × the m² entered. Reference prices for Vitoria-Gasteiz.", 'price.perM2': "Cleaning service: {qty} m² × {rate}", 'price.refMin': "Adjustment to the minimum price for this service ({rate}/m²)", 'chk.refMinApplied': "The price was raised to this service's minimum of {value} before tax.", 'chk.perM2Range': "The price per m² is outside the usual range ({min}–{max} €/m²).", 'asm.perM2': "Priced per m² at {rate}/m²; labour cost {cost}/h.", 'asm.refMin': "Minimum price for this service: {rate} per m² before tax.", 'costs.perM2Short': "per m²",
  "price.table.light": "Cleaning service, light work ({qty} m²)", "price.table.medium": "Cleaning service, standard work ({qty} m²)", "price.table.heavy": "Cleaning service, heavy work ({qty} m²)", "price.table.all": "Cleaning service ({qty} m²)", "chk.band": "Your price table for this size: {min}–{max} € before tax. By the hours it would be {hours} €.", "chk.bandOpen": "Your price table for this size: from {min} € before tax. By the hours it would be {hours} €.", "chk.bandRaised": "The price was raised to the bottom of your table.", "chk.bandCapped": "The price was kept at the top of your table, below what the hours would cost. Check the profit.", "asm.band": "Price from your table row for {rows} m²; other sizes are scaled by m².", "costs.tables": "Your prices by size", "costs.tablesHelp": "Prices before tax for the m² in each row. Other sizes use the row below them, scaled by m². Light dirt = light work, normal = standard, heavy or extreme = heavy.", "costs.tableMode": "How the table is used", "costs.tableRange": "Keep the price inside the range", "costs.tableMin": "Use the table only as a minimum", "costs.table.construction": "Construction / renovation cleaning", "costs.table.deep": "Deep house cleaning", "costs.m2From": "From m²", "costs.m2To": "To m²", "costs.min": "Min", "costs.max": "Max", "band.light": "Light work / touch-ups", "band.medium": "Standard work", "band.heavy": "Heavy work / very dirty", "band.all": "Price", "svc.priceTable": "Priced from your table: {table}",
  'f.bedrooms': "Bedrooms", 'f.livingRooms': "Living / dining rooms", 'f.hallways': "Hallways and passageways", 'task.bedroom': "Bedroom", 'task.livingRoom': "Living / dining room", 'task.hallway': "Hallway / passageway", 'task.minimum': "Minimum time for this type of cleaning", 'asm.roomsEstimated': "Rooms not entered, so typical rooms for {area} were used: {bedrooms} bedrooms, {livingRooms} living room(s), {hallways} hallway(s), {kitchens} kitchen(s), {bathrooms} bathroom(s). Enter the real numbers for a better estimate.", 'asm.minHours': "This type of cleaning is never estimated under {min} worker-hours.", 'chk.roomsEstimated': "Rooms were estimated from the m². Enter the bedrooms, living rooms, hallways, kitchens and bathrooms for an accurate estimate.", 'rates.minHours': "Minimum worker-hours per job", 'rates.minHoursHelp': "A job is never estimated below this, per cleaning level.",
  _speech: 'en-GB',
  'key.title': 'Property Access Authorization and Key Handover Form', 'key.customerInfo': 'Customer Information', 'key.name': 'Full name', 'key.phone': 'Telephone number', 'key.address': 'Property address',
  'key.authTitle': 'Key Handover and Cleaning Authorization', 'key.authText': 'I, the undersigned customer, hereby authorize {company} to enter the property specified above for the purpose of carrying out the agreed cleaning service.',
  'key.handedText': 'I confirm that I have voluntarily handed over the property key to the cleaning company for this purpose.',
  'key.handoverDate': 'Date of key handover', 'key.cleaningDate': 'Agreed cleaning date', 'key.keys': 'Number of keys handed over',
  'key.declTitle': 'Customer Declaration', 'key.declText': 'I confirm that I have authorized access to the property for the agreed cleaning service and have provided the key voluntarily.',
  'key.signName': "Customer's full name", 'key.custSig': "Customer's signature", 'key.date': 'Date', 'key.representative': "Cleaning company's representative", 'key.compSig': 'Signature',
  'key.returnTitle': 'Key return', 'key.returnAt': 'Key return date and time', 'key.returnSig': "Customer's confirmation of key return",
  'key.language': 'Language of the form', 'key.help': 'The form below is shown in this language so the customer can read it. Everything you type and every signature is saved with the job. Sign with a finger in the boxes.',
  'key.pdf': 'SAVE OR SHARE PDF', 'key.blank': 'Blank form to print (PDF)', 'key.clear': 'Clear signature', 'key.file': 'Key-handover',
  'btn.keyForm': 'KEY HANDOVER FORM', 'c.language': 'Customer language (quotations and forms)', 'c.languageApp': 'Same as the app', 'q.language': 'Quotation language',
  'nav.home': 'Home', 'nav.new': 'New', 'nav.jobs': 'Jobs', 'nav.customers': 'Customers', 'nav.settings': 'Settings',
  notFound: 'Page not found.', saved: 'Saved', duplicated: 'Copy created', search: 'Search…', all: 'All', none: 'Nothing yet.', open: 'Open', yes: 'Yes', no: 'No', never: 'never', month: 'Month', day: 'Day', days: 'days', worker: 'Worker', customer: 'Customer', noCustomer: 'No customer', fromService: 'From service', fromSettings: 'From settings',
  backupReminder: '🔒 It has been a while since your last backup. Tap here to back up your data.',

  'btn.newCalc': 'NEW CLEANING CALCULATION', 'btn.aiInspection': 'AI PHOTO AND VIDEO INSPECTION', 'btn.takePhoto': 'TAKE PHOTO', 'btn.uploadPhotos': 'UPLOAD PHOTOS', 'btn.recordVideo': 'RECORD VIDEO', 'btn.uploadVideo': 'UPLOAD VIDEO',
  'btn.analyse': 'ANALYSE PHOTOS AND VIDEOS', 'btn.addMeasurements': 'ADD MEASUREMENTS', 'btn.generate': 'GENERATE CLEANING ESTIMATE', 'btn.reviewTasks': 'REVIEW TASKS', 'btn.createQuote': 'CREATE CUSTOMER QUOTATION',
  'btn.saveJob': 'SAVE JOB', 'btn.exportPdf': 'EXPORT PDF', 'btn.duplicate': 'Duplicate', 'btn.delete': 'Delete',

  'sec.new': 'New Cleaning Calculation', 'sec.ai': 'AI Photo and Video Inspection', 'sec.services': 'Cleaning Services', 'sec.tasks': 'Measurements and Tasks', 'sec.hours': 'Working Hours Calculator',
  'sec.costs': 'Labour and Material Costs', 'sec.quotes': 'Customer Quotations', 'sec.customers': 'Customers and Job History', 'sec.saved': 'Saved Cleaning Calculations', 'sec.profit': 'Business Expenses and Profit',
  'sec.rates': 'Productivity Rates and Pricing Settings', 'sec.locale': 'Country, Currency and IVA Settings', 'sec.reports': 'Reports and PDF Export', 'sec.backup': 'Backup and Restore', 'sec.settings': 'App Settings',

  'setup.title': 'Quick set-up', 'setup.help': 'Your selling prices per service are already loaded from your price list. One number is still missing: what a worker-hour costs you (wages, social security, insurance). It starts at €15. Without it the profit shown is not real.', 'setup.save': 'Save', 'setup.later': 'Later',
  'dash.latest': 'Latest calculation', 'dash.empty': 'No calculations yet. Tap NEW CLEANING CALCULATION to start.', 'dash.sections': 'Sections', 'dash.recent': 'Recent jobs', 'dash.allJobs': 'All saved calculations',

  'r.workerHours': 'ESTIMATED WORKER-HOURS', 'r.workers': 'NUMBER OF WORKERS', 'r.onSite': 'ESTIMATED TIME ON SITE', 'r.labourCost': 'LABOUR COST', 'r.total': 'TOTAL CUSTOMER PRICE', 'r.profit': 'ESTIMATED PROFIT',

  'job.title': 'Cleaning calculation', 'job.customer': 'Customer and property', 'job.date': 'Job date', 'job.startTime': 'Start time', 'job.status': 'Status', 'job.shift': 'Shift type', 'job.service': 'Cleaning service',
  'job.rateProfile': 'Rate group', 'job.onlyRelevant': 'Only the fields used by this service are shown. Leave blank what does not apply.', 'job.conditions': 'Conditions', 'job.team': 'Team', 'job.autoWorkers': 'Recommended',
  'job.costs': 'Materials, travel and extra costs', 'job.charges': 'Additional charges to the customer', 'job.chargeLabel': 'Description', 'job.addCharge': 'Add charge', 'job.equipmentNeeded': 'Equipment and cleaning materials needed',
  'job.notes': 'Notes', 'job.results': 'Results', 'job.schedule': 'Work schedule', 'job.price': 'Price, IVA and profit', 'job.method': 'Calculation method and assumptions',
  'job.enterData': 'Choose a service and enter the measurements to see the estimate.', 'job.needsInspection': 'A physical inspection is recommended before giving a final quotation.',
  'job.formula': 'Worker-hours = area ÷ productivity (m² per worker-hour) × condition factors, plus separate task times for kitchens, bathrooms, windows and other items not included in the base rate, plus final inspection. Time on site = how long the team takes working in parallel; days = time on site ÷ productive hours per shift.',
  'job.actual': 'Actual result (after the job)', 'job.actualHelp': 'Enter what really happened. This is used for reports and to suggest better rates; your rates never change without your approval.',
  'actual.hours': 'Actual worker-hours', 'actual.labourCost': 'Actual labour cost', 'actual.expenses': 'Actual materials, travel and other expenses', 'actual.revenue': 'Amount invoiced (before tax)',

  'status.draft': 'Draft', 'status.quoted': 'Quoted', 'status.accepted': 'Accepted', 'status.rejected': 'Rejected', 'status.completed': 'Completed', 'status.cancelled': 'Cancelled',
  'shift.normal': 'Normal', 'shift.weekend': 'Weekend', 'shift.holiday': 'Public holiday', 'shift.overtime': 'Overtime / night',
  'level.regular': 'Regular', 'level.deep': 'Deep', 'level.construction': 'Post-construction', 'level.specialised': 'Specialised',
  'svc.rateShort': '{rate} m² per worker-hour', 'svc.taskOnly': 'Task-based (no base area rate)',

  'f.areaM2': 'Total area to clean', 'f.rooms': 'Rooms', 'f.kitchens': 'Kitchens', 'f.bathrooms': 'Bathrooms', 'f.toilets': 'Separate toilets', 'f.windows': 'Windows / glass panels', 'f.glassM2': 'Glass area',
  'f.doors': 'Doors', 'f.balconies': 'Balconies / terraces', 'f.stairFloors': 'Floors of staircase', 'f.lifts': 'Lifts', 'f.garageM2': 'Garage / warehouse area', 'f.offices': 'Offices / commercial rooms',
  'f.appliances': 'Appliances (oven, fridge…) inside', 'f.sofas': 'Sofas', 'f.mattresses': 'Mattresses', 'f.chairs': 'Upholstered chairs', 'f.carpetM2': 'Carpet area', 'f.floorTreatmentM2': 'Floor treatment area',
  'f.stainSpots': 'Stains to treat', 'f.highLevelTasks': 'High-level / difficult-access tasks', 'f.materials': 'Materials', 'f.equipment': 'Equipment', 'f.distanceKm': 'Distance', 'f.subcontract': 'Subcontracting', 'f.other': 'Other', 'f.discountPct': 'Discount',

  'cond.dirt': 'Level of dirtiness', 'cond.access': 'Access', 'cond.furnished': 'Furnished', 'cond.occupied': 'Occupied (people living / working there)', 'cond.constructionDust': 'Construction dust / renovation residue',
  'cond.grease': 'Heavy grease', 'cond.limescale': 'Heavy limescale', 'cond.stains': 'Stubborn stains',
  'dirt.light': 'Light', 'dirt.normal': 'Normal', 'dirt.heavy': 'Heavy', 'dirt.extreme': 'Extreme',
  'access.normal': 'Normal', 'access.difficult': 'Difficult', 'access.veryDifficult': 'Very difficult / high level',

  'cost.materials': 'Materials cost', 'cost.equipment': 'Equipment cost', 'cost.subcontract': 'Subcontracting', 'cost.other': 'Other direct costs', 'cost.distanceKm': 'Travel distance (km)', 'cost.discountPct': 'Discount (%)',

  'task.area': 'General areas: surfaces, doors, skirting', 'task.areaFloors': 'Floors', 'task.inspection': 'Final inspection and finishing', 'task.kitchen': 'Kitchen', 'task.bathroom': 'Bathroom', 'task.toilet': 'Toilet',
  'task.window': 'Windows', 'task.glass': 'Glass', 'task.door': 'Doors', 'task.balcony': 'Balconies / terraces', 'task.stairs': 'Staircase floors', 'task.lift': 'Lifts', 'task.garage': 'Garage / warehouse floor',
  'task.office': 'Offices / rooms', 'task.appliance': 'Appliances inside', 'task.sofa': 'Sofas', 'task.mattress': 'Mattresses', 'task.chair': 'Upholstered chairs', 'task.carpet': 'Carpet', 'task.floorTreatment': 'Floor treatment',
  'task.stain': 'Stain treatment', 'task.highLevel': 'High-level work', 'task.add': 'Add task', 'task.name': 'Task name', 'task.hours': 'Hours', 'task.anyWorker': 'Any', 'task.phase': 'Order', 'task.maxParallel': 'Max workers at once',
  'task.remove': 'Remove', 'task.restore': 'Include again', 'task.reset': 'Use calculated', 'task.approve': 'Approved', 'task.inspectionHow': '{pct}% of the work, minimum set in settings',
  'phase.1': 'Glass & high level', 'phase.2': 'Rooms, kitchens, bathrooms', 'phase.3': 'Floors', 'phase.4': 'Final inspection',
  'cl.surfaces': 'accessible surfaces', 'cl.doorsSkirting': 'doors and skirting boards', 'cl.mirrorsGlassInterior': 'mirrors and interior glass', 'cl.floors': 'sweep / vacuum and mop floors', 'cl.worktops': 'worktops and surfaces',
  'cl.cupboards': 'cupboards (where included)', 'cl.sinkTaps': 'sink and taps', 'cl.tilesGrease': 'tiles and grease', 'cl.appliancesScope': 'appliances according to scope', 'cl.toilet': 'toilet', 'cl.showerBath': 'shower / bathtub',
  'cl.tilesLimescale': 'tiles and visible limescale', 'cl.mirrorsFinish': 'mirrors and finishing', 'cl.checkWork': 'check completed work', 'cl.missedTasks': 'identify missed tasks', 'cl.finishing': 'finishing touches',

  'team.help': 'Tap a row to choose the team size. Worker-hours stay the same; time on site changes.', 'team.elapsed': 'Time on site', 'team.days': 'Working days', 'team.recommended': 'Recommended: the smallest team that finishes in one shift (or in the fewest days for large jobs).',
  'sched.summary': '{wh} of work for {w} workers: about {elapsed} of work on site ({onsite} including breaks), over {days} working day(s).',
  'sched.distinction': 'Worker-hours = total labour of all workers. Time on site = how long the team is there. Working days = shifts needed. Some tasks (one bathroom, a small kitchen) cannot be split between many workers, so adding workers does not always halve the time.',

  'p.subtotal': 'Subtotal before tax', 'p.costs': 'Your costs and profit (not shown to the customer)', 'p.materialsEquipment': 'Materials and equipment', 'p.travelOther': 'Travel, subcontracting and other', 'p.directCost': 'Total direct cost',
  'p.priceBeforeTax': 'Selling price before tax', 'p.margin': 'Profit margin (of selling price)', 'p.markup': 'Markup (on cost)', 'p.materialsAuto': 'Materials estimated as a percentage of labour (Labour and Material Costs settings).',
  'price.labour': 'Labour: {hours} h × {rate}', 'price.materials': 'Materials', 'price.equipment': 'Equipment', 'price.subcontract': 'Subcontracted work', 'price.other': 'Other costs', 'price.travel': 'Travel and call-out ({km} km)',
  'price.callOut': 'Call-out charge', 'price.additional': 'Additional charge', 'price.discount': 'Discount {pct}%', 'price.minCharge': 'Minimum job charge adjustment', 'price.rounding': 'Rounding', 'price.costBased': 'Cleaning service (cost + {margin}% margin)',

  'chk.allGood': 'All checks passed.', 'chk.noService': 'Choose a cleaning service.', 'chk.notNumber': '"{field}" is not a valid number.', 'chk.negative': '"{field}" cannot be negative.', 'chk.discountTooHigh': 'The discount must be below 100%.',
  'chk.workersInvalid': 'The number of workers must be a whole number of at least 1.', 'chk.areaRequired': 'This service is calculated by area: enter the total area to clean.', 'chk.rateMissing': 'No productivity rate saved for "{task}". Set it in Measurements and Tasks.',
  'chk.multiplierCapped': 'Condition factors for "{task}" add up to ×{value}; limited to ×{max}. Check the job or inspect it.', 'chk.stainsNoCount': 'Stubborn stains are ticked but no number of stains was entered.',
  'chk.taskHoursInvalid': 'Task "{task}" has invalid hours.', 'chk.noWork': 'No work calculated yet. Add measurements or tasks.', 'chk.taxMissing': 'No tax rate selected. Check Country, Currency and IVA Settings.',
  'chk.loss': 'This job makes a loss of {profit}. Check the price or costs.', 'chk.lowMargin': 'Low profit margin: {margin}% (your warning level is {min}%). If €15 is what a worker costs you, set a higher selling rate in Labour and Material Costs.',
  'chk.sellBelowCost': 'The selling rate per hour is lower than the labour cost per hour.', 'chk.pricePerM2': 'Unusual price: {value} per m² (normal range set to {min}–{max}). Please double-check.',
  'chk.hoursPerM2': 'Unusual time: {value} worker-hours per 100 m². Please double-check the measurements.', 'chk.minApplied': 'The minimum job charge was applied.', 'chk.idleWorkers': 'With this team, about {idle} worker-hours are spent waiting. Fewer workers may be enough.',
  'chk.duplicateTasks': 'Duplicate tasks: {names}.', 'chk.aiUnapproved': '{n} AI-suggested task(s) are not approved yet. Review them in REVIEW TASKS.', 'chk.edited': 'Some task hours were changed by hand.',
  'chk.inspection': 'Physical inspection recommended: {reasons}.', 'chk.arithmetic': 'Internal arithmetic check failed. Do not send this quotation; please report it.', 'chk.negativeShort': 'Enter a number of 0 or more.', 'chk.positiveShort': 'Enter a number above 0.',
  'insp.large': 'large property', 'insp.extreme': 'extreme dirt', 'insp.construction': 'construction residue', 'insp.access': 'difficult access or high-level work', 'insp.ai': 'part of the estimate comes from photos',

  'asm.baseRate': 'Base rate {rate} m² per worker-hour applied to {area}; {floorsPct}% of that time is scheduled as floors at the end.', 'asm.furnished': 'Furnished property: ×{x}.', 'asm.occupied': 'Occupied property: ×{x}.',
  'asm.dustInBase': 'Construction dust is already part of the post-construction rate, so it is not added again.', 'asm.glassInsteadOfWindows': 'Glass area is used instead of the number of windows, so windows are not counted twice.',
  'asm.included': '"{task}" is included in the base rate of this service and is not added again.', 'asm.multipliers': 'Dirt factor ×{dirt}, access factor ×{access}.', 'asm.constructionDust': 'Construction dust: ×{x}.',
  'asm.profile': 'Rate group "{name}": selling {sell}/h, labour cost {cost}/h.', 'asm.modeHourly': 'Pricing: billable hours × selling rate plus charges.', 'asm.modeCost': 'Pricing: direct cost ÷ (1 − {margin}%) so the margin is a share of the selling price.',
  'asm.tax': 'Tax: {name} ({rate}%).', 'asm.inspectionTask': 'Final inspection: {pct}% of the work time.', 'asm.shift': 'Shift {shift} h with a {brk} h break.',

  'issued.info': 'Quotation {ref} was approved on {date} for {total}. It stays as issued.', 'issued.diff': 'With your current rates and data the total would be {total}.', 'issued.reissue': 'Issue a new version at current rates',

  'media.title': 'Photos and video', 'media.roomForNew': 'Room or task for new photos/videos', 'media.note': 'Note', 'media.none': 'No photos or videos yet.', 'media.added': '{n} file(s) added',
  'media.inspectionNotes': 'Inspection notes (write or dictate)', 'media.dictate': 'Dictate', 'media.dictateError': 'Dictation error: {msg}', 'media.needMedia': 'Add photos, a video or inspection notes first.',
  'media.consentReminder': 'This customer has not given consent for photos/videos yet (see the customer record).',
  'media.privacyShort': 'Photos and sampled video frames (reduced in size) are sent to your AI service only when you press ANALYSE. Originals stay on this phone.',
  'media.manualFallback': 'You can still take photos and enter your own inspection findings as measurements, conditions and tasks.',
  'room.general': 'Whole property', 'room.kitchen': 'Kitchen', 'room.bathroom': 'Bathroom', 'room.livingRoom': 'Living room', 'room.bedroom': 'Bedroom', 'room.windows': 'Windows / glass', 'room.floors': 'Floors',
  'room.stairs': 'Stairs / common areas', 'room.balcony': 'Balcony / terrace', 'room.garage': 'Garage / warehouse', 'room.office': 'Office / premises', 'room.exterior': 'Exterior', 'room.other': 'Other',

  'conf.high': 'clear', 'conf.medium': 'fairly clear', 'conf.low': 'unclear',
  'ai.notConnected': 'The AI service is not connected yet, so photo analysis is switched off.', 'ai.connectedInfo': 'The AI service is connected.',
  'ai.howItWorks': 'Take or upload photos and videos of each room, tag them, then press ANALYSE PHOTOS AND VIDEOS. The AI describes visible conditions and proposes extra tasks and hours. It cannot see hidden dirt or measure exact sizes from ordinary photos; it will ask for what it is missing. You review and approve every suggestion.',
  'ai.newWithPhotos': 'Start a new job with photos', 'ai.addToJob': 'Or add photos to an existing job', 'ai.preparing': 'Preparing images…', 'ai.sending': 'Analysing {n} images…', 'ai.skipped': 'Could not read {name}; skipped.',
  'ai.failed': 'AI analysis failed: {msg}', 'ai.report': 'AI inspection report', 'ai.imagesUsed': '{n} images', 'ai.rooms': 'Identified rooms, areas and visible conditions', 'ai.tasks': 'Recommended extra tasks and methods',
  'ai.counts': 'Counts seen in the photos', 'ai.conditions': 'Suggested conditions', 'ai.materials': 'Materials and equipment', 'ai.missing': 'Missing information', 'ai.assumptions': 'Assumptions',
  'ai.addTasks': 'Add these tasks for review', 'ai.tasksAdded': 'Tasks added', 'ai.tasksAddedToast': '{n} task(s) added. Approve or edit them in REVIEW TASKS.', 'ai.applyConditions': 'Apply suggested conditions and counts',
  'ai.confirmApply': 'Apply these AI suggestions to the job?', 'ai.nothingToApply': 'Nothing new to apply.', 'ai.reviewNote': 'Labour cost, tax, price and profit for the job (including approved AI tasks) are shown in Results below. Check everything before quoting.',
  'ai.deleteMediaNow': 'Analysis finished. Delete the photos and videos of this job from the phone now?', 'ai.testOk': 'Connected. Model: {model}',

  'q.title': 'QUOTATION', 'q.ref': 'Reference', 'q.date': 'Date', 'q.validity': 'Valid for {n} days', 'q.pending': 'pending approval', 'q.work': 'Requested work', 'q.measurements': 'Property measurements',
  'q.tasks': 'Tasks included', 'q.task': 'Task', 'q.exclusions': 'Exclusions', 'q.exclusionsHint': 'For example: inside of cupboards, exterior windows…', 'q.estimate': 'Estimate',
  'q.estimateText': 'Estimated {wh} of work by {w} worker(s); estimated duration {dur}.', 'q.inspectionNote': 'This estimate is based on the information available; final confirmation may require a visit to the property.',
  'q.acceptance': 'Accepted by the customer', 'q.signName': 'Name', 'q.signDate': 'Date', 'q.signature': 'Signature', 'q.draftMark': 'DRAFT', 'q.description': 'Description of the work',
  'q.draftInfo': 'This is a draft. It is not an official offer until you approve it.', 'q.approve': 'APPROVE QUOTATION', 'q.approveAiFirst': 'Approve or remove the AI-suggested tasks first.', 'q.fixErrors': 'Fix the errors before approving.',
  'q.confirmApprove': 'Approve this quotation for {total} as an official offer?', 'q.approved': 'Quotation {ref} approved', 'q.print': 'Print', 'q.showTaskHours': 'Show hours per task on the quotation',
  'q.shared': 'Shared', 'q.downloaded': 'PDF saved to Downloads', 'q.accept': 'Accepted', 'q.reject': 'Rejected', 'q.complete': 'Mark completed', 'q.none': 'No approved quotations yet.', 'q.readyDrafts': 'Calculations ready to quote', 'q.enterActual': 'Enter the actual hours and costs at the bottom of the job.',

  'c.name': 'Customer name', 'c.phone': 'Phone', 'c.email': 'Email', 'c.address': 'Property address', 'c.notes': 'Customer notes', 'c.mediaConsent': 'Customer agrees to photos/videos of the property for the quotation',
  'c.consentDate': 'Consent recorded on {date}', 'c.call': 'Call', 'c.mail': 'Email', 'c.jobs': 'Jobs and quotations', 'c.jobsCount': '{n} job(s)', 'c.delete': 'Delete customer and all their jobs, photos and videos',
  'c.history': '{n} completed job(s): {est} estimated, {act} actual.',

  'svc.help': 'Tap a service to edit its name, productivity rate and which measurements it asks for. Add your own services and categories at any time.', 'svc.new': 'New service', 'svc.newCategory': 'New category',
  'svc.inactive': 'hidden', 'svc.name': 'Name', 'svc.category': 'Category', 'svc.level': 'Cleaning level (selects task times)', 'svc.areaRate': 'Productivity: m² per worker-hour (blank = task-based)', 'svc.active': 'Show in the service list',
  'svc.forceEmpty': 'Always empty property', 'svc.forceOccupied': 'Always occupied property', 'svc.forceConstruction': 'Always construction residue', 'svc.noInspection': 'No final inspection task',
  'svc.fields': 'Measurements asked for this service', 'svc.fieldsHelp': 'Only these fields appear when you calculate this service.', 'svc.included': 'Already included in the base area rate',
  'svc.includedHelp': 'Tick the tasks that the m² rate already covers, so they are never counted twice.',

  'tasks.help': 'Time for work that the area rate does not cover. One value per cleaning level. Changes are confirmed and logged.', 'tasks.perItem': 'Hours per item ({field}).', 'tasks.perArea': 'm² per worker-hour ({field}).',

  'rates.help': 'Your approved rates. The app never changes them without your confirmation; every change is recorded below.', 'rates.pricing': 'Pricing', 'rates.mode': 'Pricing method',
  'mode.hourly': 'Customer quotation: hours × my selling rate + charges', 'mode.cost': 'Cost-based: direct cost + target profit margin',
  'rates.margin': 'Target profit margin', 'rates.minCharge': 'Minimum job charge', 'rates.minHours': 'Minimum billable hours', 'rates.hoursStep': 'Round billable hours up to', 'rates.priceRounding': 'Round price to',
  'rates.lowMargin': 'Warn when margin is below', 'rates.ppmMin': 'Warn when price per m² is below', 'rates.ppmMax': 'Warn when price per m² is above',
  'rates.marginNote': 'The margin is a percentage of the selling price: with 30%, a job costing 70 is sold at 100 (not 91, which would be a 30% markup).',
  'rates.serviceRates': 'Area productivity by service', 'rates.serviceRatesHelp': 'm² cleaned per worker-hour at normal dirt level.',
  'rates.conditions': 'Condition factors', 'rates.conditionsHelp': 'Multipliers applied to time. 1 = no change, 1.3 = 30% more time.', 'rates.maxMult': 'Maximum combined factor',
  'rates.scheduling': 'Shifts and scheduling', 'rates.shiftHours': 'Shift length', 'rates.breakHours': 'Break per shift', 'rates.breakAfter': 'Break needed when work exceeds', 'rates.maxTeam': 'Largest team considered',
  'rates.minAreaPerWorker': 'Minimum area per worker in the same zone', 'rates.floorsShare': 'Share of area time for floors', 'rates.inspectionPct': 'Final inspection time', 'rates.inspectionMin': 'Minimum inspection time', 'rates.largeJob': 'Recommend inspection above',
  'rates.learned': 'Suggestions from completed jobs', 'rates.learnedHelp': 'Based on actual hours entered on completed jobs. Nothing changes until you press Apply.', 'rates.noLearned': 'Complete jobs and enter actual hours to get suggestions.',
  'rates.jobs': 'Jobs', 'rates.current': 'Current', 'rates.suggested': 'Suggested', 'rates.apply': 'Apply', 'rates.history': 'History of rate and price changes',

  'costs.serviceSell': 'Selling price per service', 'costs.serviceSellHelp': 'What you charge the customer per worker-hour for each service. Leave a box empty to use the service\'s rate group (shown in grey). Every change is confirmed and saved in the rate history.',
  'svc.pricing': 'How this service is priced', 'svc.pricingHourly': 'Per worker-hour', 'svc.pricingQuote': 'Quote by size and condition', 'svc.sellRate': 'Selling price per worker-hour', 'svc.sellRateFromGroup': 'Empty = rate group ({rate})',
  'job.quotedPrice': 'Your price for this job, before tax', 'job.quotedPriceHelp': 'This service is quoted by size and condition. The app still works out hours and labour cost so you can see the profit.',
  'price.quoted': 'Cleaning service (quoted by size and condition)', 'chk.quotedPriceMissing': 'Enter your price for this job: this service is quoted by size and condition.',
  'asm.serviceRate': 'This service\'s selling price: {sell}/h; labour cost {cost}/h.', 'asm.quoted': 'Price set by you (quoted by size and condition); labour cost {cost}/h.',
  'costs.help': 'Keep what you charge the customer separate from what a worker-hour costs you.', 'costs.sellRate': 'Selling rate to customer', 'costs.costRate': 'Labour cost to you', 'costs.usedBy': 'Used by: {list}', 'costs.addProfile': 'Add rate group',
  'costs.shifts': 'Weekend, holiday and overtime', 'costs.shiftsHelp': 'Percentage added to the selling rate and to the labour cost for each shift type.', 'costs.sellSurcharge': 'Extra on selling rate', 'costs.costSurcharge': 'Extra on labour cost',
  'costs.materialsTravel': 'Materials, equipment and travel', 'costs.materialsMarkup': 'Markup on materials', 'costs.equipmentMarkup': 'Markup on equipment', 'costs.subcontractMarkup': 'Markup on subcontracting',
  'costs.autoMaterials': 'If no materials are entered, estimate them as % of labour cost', 'costs.callOut': 'Call-out charge per job', 'costs.travelCharge': 'Travel charged to customer', 'costs.travelCost': 'Travel cost to you',

  'loc.country': 'Country', 'loc.other': 'Other', 'loc.presetNote': 'Choosing a country sets currency, number format, units and the tax name. Tax rates are never changed automatically: enter the rates that apply to you.',
  'loc.presetApplied': 'Country settings applied. Check your tax rates.', 'loc.region': 'Region', 'loc.currency': 'Currency code (EUR, GBP, USD…)', 'loc.language': 'Language', 'loc.units': 'Area units', 'loc.numberLocale': 'Number format (e.g. es-ES)',
  'loc.taxes': 'Tax rates', 'loc.taxHelp': 'Add every rate you use. Choose the default, and override it per service in Cleaning Services or per job.', 'loc.taxLabel': 'Tax name on quotations', 'loc.addTax': 'Add tax rate', 'loc.newTax': 'New rate', 'loc.defaultTax': 'Default tax rate',
  'loc.perServiceTax': 'Per-service tax: open a service in Cleaning Services.',

  'hours.help': 'Quick check: area ÷ productivity = worker-hours, then divided by the team. For a full estimate with tasks use NEW CLEANING CALCULATION.', 'hours.rate': 'Productivity (m² per worker-hour)',
  'hours.orWorkerHours': 'Or total worker-hours', 'hours.enter': 'Enter an area and rate, or worker-hours.', 'hours.note': 'This quick calculator assumes all work can be shared equally. The full calculation accounts for tasks that cannot be split.',

  'profit.help': 'Accepted and completed jobs by month. Actual figures use the actual hours and costs you entered.', 'profit.overheads': 'Monthly business expenses', 'profit.overheadsHelp': 'Fixed costs such as insurance, vehicle, phone, software.',
  'profit.overheadName': 'Expense', 'profit.addOverhead': 'Add expense', 'profit.monthlyTotal': 'Total per month', 'profit.byMonth': 'By month', 'profit.estRevenue': 'Est. revenue', 'profit.estProfit': 'Est. profit',
  'profit.actRevenue': 'Actual revenue', 'profit.actProfit': 'Actual job profit', 'profit.net': 'After expenses', 'profit.none': 'No accepted or completed jobs yet.',

  'rep.totalJobs': 'Jobs calculated', 'rep.quotes': 'Quotations issued', 'rep.accepted': 'Quotations accepted', 'rep.rejected': 'Quotations rejected', 'rep.estVsAct': 'Estimated / actual hours (completed)', 'rep.revenue': 'Revenue from completed jobs',
  'rep.labour': 'Labour expenses', 'rep.materialsTravel': 'Materials, travel and other expenses', 'rep.estProfit': 'Estimated profit (completed)', 'rep.actProfit': 'Actual profit (completed)', 'rep.completedOnly': 'Money figures use completed jobs only.',
  'rep.bySvc': 'Productivity by service (largest differences first)', 'rep.jobs': 'Jobs', 'rep.est': 'Est.', 'rep.act': 'Actual', 'rep.diff': 'Diff.', 'rep.noCompleted': 'No completed jobs with actual hours yet.', 'rep.bySize': 'Average worker-hours by property size',
  'rep.pdf': 'Export report PDF', 'rep.csv': 'Export spreadsheet (CSV)',

  'bk.export': 'Make a backup', 'bk.exportHelp': 'Saves everything (settings, rates, services, customers, jobs and optionally photos/videos) into one file. Keep it in Google Drive, email it to yourself or copy it to a computer.',
  'bk.includeMedia': 'Include photos and videos (bigger file)', 'bk.password': 'Password to encrypt the backup (recommended)', 'bk.exportBtn': 'Create backup file', 'bk.last': 'Last backup: {date}', 'bk.done': 'Backup created',
  'bk.restore': 'Restore from a backup', 'bk.restoreHelp': 'Use this on a new phone or after reinstalling.', 'bk.passwordIf': 'Password (if the backup is encrypted)', 'bk.mode': 'How to restore', 'bk.merge': 'Add to the data on this phone', 'bk.replace': 'Replace all data on this phone',
  'bk.restoreBtn': 'Restore', 'bk.chooseFile': 'Choose the backup file first.', 'bk.needPassword': 'This backup is encrypted: enter its password.', 'bk.wrongPassword': 'Wrong password.', 'bk.invalid': 'This is not a valid backup file.', 'bk.restoredLog': 'Data restored from backup',
  'bk.storage': 'Space used on this phone: {used}. Protected from automatic clean-up: {persisted}.', 'bk.storageHelp': 'Data is kept only on this phone. Uninstalling the app or clearing Chrome site data deletes it, so make regular backups.',

  'set.business': 'Business details', 'set.bizName': 'Business name', 'set.taxId': 'Tax ID (NIF/CIF)', 'set.web': 'Website', 'set.validity': 'Quotation valid for (days)', 'set.paymentTerms': 'Payment terms', 'set.conditions': 'Special conditions',
  'set.security': 'Access PIN', 'set.securityHelp': 'Ask for a PIN when the app opens or after 5 minutes in the background. The PIN is stored only as a secure hash.', 'set.setPin': 'Set a PIN', 'set.removePin': 'Remove PIN',
  'set.ai': 'AI photo and video service', 'set.aiHelp': 'Address of your own AI backend and its app token. The secret AI API key stays on that server, never in this app.', 'set.aiEndpoint': 'AI service address (https://…)', 'set.aiToken': 'App token',
  'set.retainMedia': 'Keep photos and videos on the phone after analysis', 'set.testAi': 'Test connection', 'set.privacy': 'Privacy: what happens to customer data',
  'set.privacyText': 'Customers, jobs, quotations, photos and videos are stored only on this phone (in the app\'s private storage). Nothing is uploaded unless you (1) export a backup, (2) share a PDF, or (3) press ANALYSE PHOTOS AND VIDEOS. In case 3, reduced-size copies of the photos and a few frames from each video are sent to your AI backend, which forwards them to the AI provider for that one analysis and does not store them. You can delete any photo, video, job or customer at any time.',
  'set.data': 'Data', 'set.resetCatalogue': 'Restore the original service catalogue and task times (your own services are kept)', 'set.wipe': 'Delete ALL data on this phone',

  'pin.enter': 'Enter your PIN', 'pin.unlock': 'Unlock', 'pin.wrong': 'Wrong PIN', 'pin.new': 'New PIN (at least 4 digits)', 'pin.repeat': 'Repeat the PIN', 'pin.tooShort': 'The PIN must have at least 4 digits.', 'pin.mismatch': 'The PINs do not match.',

  'confirm.rate': 'Change this approved rate from {from} to {to}?', 'confirm.delete': 'Delete this permanently?', 'confirm.deleteJob': 'Delete this job, its photos and videos permanently?',
  'confirm.deleteCustomer': 'Delete {name} and their {n} job(s), photos and videos permanently?', 'confirm.resetCatalogue': 'Restore the original services and task times? Your own services are kept; changed rates go back to the original values.',
  'confirm.wipe1': 'Delete ALL customers, jobs, photos, settings and rates from this phone? Make a backup first.', 'confirm.wipe2': 'Type DELETE to confirm.',
  'confirm.restoreReplace': 'Replace everything on this phone with the backup ({jobs} jobs, {customers} customers)?', 'confirm.restoreMerge': 'Add the backup ({jobs} jobs, {customers} customers) to this phone?',
};

const es = {
  _name: 'Español',
  "price.table.light": "Servicio de limpieza, obra ligera ({qty} m²)", "price.table.medium": "Servicio de limpieza, obra media ({qty} m²)", "price.table.heavy": "Servicio de limpieza, obra pesada ({qty} m²)", "price.table.all": "Servicio de limpieza ({qty} m²)", "chk.band": "Tu tabla de precios para este tamaño: {min}–{max} € sin IVA. Por horas saldría {hours} €.", "chk.bandOpen": "Tu tabla de precios para este tamaño: desde {min} € sin IVA. Por horas saldría {hours} €.", "chk.bandRaised": "El precio se ha subido al mínimo de tu tabla.", "chk.bandCapped": "El precio se ha dejado en el máximo de tu tabla, por debajo de lo que cuestan las horas. Revisa el beneficio.", "asm.band": "Precio según tu tabla, fila de {rows} m²; otros tamaños se calculan en proporción a los m².", "costs.tables": "Tus precios por tamaño", "costs.tablesHelp": "Precios sin IVA para los m² de cada fila. Otros tamaños usan la fila inferior, en proporción a los m². Suciedad ligera = obra ligera, normal = media, intensa o extrema = pesada.", "costs.tableMode": "Cómo se usa la tabla", "costs.tableRange": "Mantener el precio dentro del rango", "costs.tableMin": "Usar la tabla solo como mínimo", "costs.table.construction": "Limpieza de fin de obra / tras reforma", "costs.table.deep": "Limpieza profunda de vivienda", "costs.m2From": "Desde m²", "costs.m2To": "Hasta m²", "costs.min": "Mín.", "costs.max": "Máx.", "band.light": "Obra ligera / retoques", "band.medium": "Obra media / estándar", "band.heavy": "Obra pesada / suciedad intensa", "band.all": "Precio", "svc.priceTable": "Precio según tu tabla: {table}",
  'svc.pricingM2': "Por m²", 'svc.pricePerM2': "Precio por m²", 'svc.minPricePerM2': "Precio mínimo por m² (vacío = sin mínimo)", 'svc.minPricePerM2Help': "El precio sin IVA nunca baja de esta cifra × los m² indicados. Precios de referencia para Vitoria-Gasteiz.", 'price.perM2': "Servicio de limpieza: {qty} m² × {rate}", 'price.refMin': "Ajuste al precio mínimo de este servicio ({rate}/m²)", 'chk.refMinApplied': "El precio se ha subido al mínimo de este servicio: {value} sin IVA.", 'chk.perM2Range': "El precio por m² está fuera del rango habitual ({min}–{max} €/m²).", 'asm.perM2': "Precio por m²: {rate}/m²; coste de mano de obra {cost}/h.", 'asm.refMin': "Precio mínimo de este servicio: {rate} por m² sin IVA.", 'costs.perM2Short': "por m²",
  'f.bedrooms': "Dormitorios", 'f.livingRooms': "Salones / comedores", 'f.hallways': "Pasillos y distribuidores", 'task.bedroom': "Dormitorio", 'task.livingRoom': "Salón / comedor", 'task.hallway': "Pasillo / distribuidor", 'task.minimum': "Tiempo mínimo para este tipo de limpieza", 'asm.roomsEstimated': "No se indicaron las estancias, así que se usaron las habituales para {area}: {bedrooms} dormitorios, {livingRooms} salón(es), {hallways} pasillo(s), {kitchens} cocina(s), {bathrooms} baño(s). Indica las cifras reales para una estimación mejor.", 'asm.minHours': "Este tipo de limpieza nunca se estima por debajo de {min} horas-operario.", 'chk.roomsEstimated': "Las estancias se han estimado a partir de los m². Indica dormitorios, salones, pasillos, cocinas y baños para una estimación precisa.", 'rates.minHours': "Horas-operario mínimas por trabajo", 'rates.minHoursHelp': "Ningún trabajo se estima por debajo de esto, según el nivel de limpieza.",
  _speech: 'es-ES',
  'key.title': 'Autorización de acceso a la vivienda y entrega de llaves', 'key.customerInfo': 'Datos del cliente', 'key.name': 'Nombre y apellidos', 'key.phone': 'Teléfono', 'key.address': 'Dirección del inmueble',
  'key.authTitle': 'Autorización de acceso y entrega de llaves', 'key.authText': 'Yo, el/la cliente abajo firmante, autorizo a {company} a acceder al inmueble indicado anteriormente con el fin de realizar el servicio de limpieza acordado.',
  'key.handedText': 'Confirmo que he entregado voluntariamente las llaves del inmueble a la empresa de limpieza para dicho fin.',
  'key.handoverDate': 'Fecha de entrega de las llaves', 'key.cleaningDate': 'Fecha acordada para la limpieza', 'key.keys': 'Número de llaves entregadas',
  'key.declTitle': 'Declaración del cliente', 'key.declText': 'Confirmo que he autorizado el acceso al inmueble para realizar el servicio de limpieza acordado y que he entregado las llaves voluntariamente.',
  'key.signName': 'Nombre y apellidos del cliente', 'key.custSig': 'Firma del cliente', 'key.date': 'Fecha', 'key.representative': 'Representante de la empresa de limpieza', 'key.compSig': 'Firma',
  'key.returnTitle': 'Devolución de las llaves', 'key.returnAt': 'Fecha y hora de devolución de las llaves', 'key.returnSig': 'Confirmación del cliente de la recepción de las llaves',
  'key.language': 'Idioma del formulario', 'key.help': 'El formulario se muestra en este idioma para que el cliente pueda leerlo. Todo lo que escribas y cada firma se guarda con el trabajo. Firma con el dedo en los recuadros.',
  'key.pdf': 'GUARDAR O COMPARTIR PDF', 'key.blank': 'Formulario en blanco para imprimir (PDF)', 'key.clear': 'Borrar firma', 'key.file': 'Entrega-de-llaves',
  'btn.keyForm': 'FORMULARIO DE ENTREGA DE LLAVES', 'c.language': 'Idioma del cliente (presupuestos y formularios)', 'c.languageApp': 'El mismo que la app', 'q.language': 'Idioma del presupuesto',
  'nav.home': 'Inicio', 'nav.new': 'Nuevo', 'nav.jobs': 'Trabajos', 'nav.customers': 'Clientes', 'nav.settings': 'Ajustes',
  notFound: 'Página no encontrada.', saved: 'Guardado', duplicated: 'Copia creada', search: 'Buscar…', all: 'Todos', none: 'Nada todavía.', open: 'Abrir', yes: 'Sí', no: 'No', never: 'nunca', month: 'Mes', day: 'Día', days: 'días', worker: 'Operario', customer: 'Cliente', noCustomer: 'Sin cliente', fromService: 'Según servicio', fromSettings: 'Según ajustes',
  backupReminder: '🔒 Hace tiempo que no haces una copia de seguridad. Pulsa aquí para hacerla.',

  'btn.newCalc': 'NUEVO CÁLCULO DE LIMPIEZA', 'btn.aiInspection': 'INSPECCIÓN IA CON FOTOS Y VÍDEO', 'btn.takePhoto': 'HACER FOTO', 'btn.uploadPhotos': 'SUBIR FOTOS', 'btn.recordVideo': 'GRABAR VÍDEO', 'btn.uploadVideo': 'SUBIR VÍDEO',
  'btn.analyse': 'ANALIZAR FOTOS Y VÍDEOS', 'btn.addMeasurements': 'AÑADIR MEDIDAS', 'btn.generate': 'GENERAR ESTIMACIÓN DE LIMPIEZA', 'btn.reviewTasks': 'REVISAR TAREAS', 'btn.createQuote': 'CREAR PRESUPUESTO AL CLIENTE',
  'btn.saveJob': 'GUARDAR TRABAJO', 'btn.exportPdf': 'EXPORTAR PDF', 'btn.duplicate': 'Duplicar', 'btn.delete': 'Eliminar',

  'sec.new': 'Nuevo cálculo de limpieza', 'sec.ai': 'Inspección IA con fotos y vídeo', 'sec.services': 'Servicios de limpieza', 'sec.tasks': 'Medidas y tareas', 'sec.hours': 'Calculadora de horas',
  'sec.costs': 'Costes de mano de obra y materiales', 'sec.quotes': 'Presupuestos a clientes', 'sec.customers': 'Clientes e historial', 'sec.saved': 'Cálculos guardados', 'sec.profit': 'Gastos y beneficio',
  'sec.rates': 'Rendimientos y precios', 'sec.locale': 'País, moneda e IVA', 'sec.reports': 'Informes y PDF', 'sec.backup': 'Copia de seguridad', 'sec.settings': 'Ajustes de la app',

  'setup.title': 'Configuración rápida', 'setup.help': 'Tus precios de venta por servicio ya están cargados de tu lista de precios. Falta una cifra: lo que te cuesta una hora de operario (sueldo, seguridad social, seguros). Empieza en 15 €. Sin ella el beneficio que se muestra no es real.', 'setup.save': 'Guardar', 'setup.later': 'Más tarde',
  'dash.latest': 'Último cálculo', 'dash.empty': 'Aún no hay cálculos. Pulsa NUEVO CÁLCULO DE LIMPIEZA para empezar.', 'dash.sections': 'Secciones', 'dash.recent': 'Trabajos recientes', 'dash.allJobs': 'Todos los cálculos guardados',

  'r.workerHours': 'HORAS-OPERARIO ESTIMADAS', 'r.workers': 'NÚMERO DE OPERARIOS', 'r.onSite': 'TIEMPO ESTIMADO EN OBRA', 'r.labourCost': 'COSTE DE MANO DE OBRA', 'r.total': 'PRECIO TOTAL AL CLIENTE', 'r.profit': 'BENEFICIO ESTIMADO',

  'job.title': 'Cálculo de limpieza', 'job.customer': 'Cliente e inmueble', 'job.date': 'Fecha del trabajo', 'job.startTime': 'Hora de inicio', 'job.status': 'Estado', 'job.shift': 'Tipo de jornada', 'job.service': 'Servicio de limpieza',
  'job.rateProfile': 'Grupo de tarifa', 'job.onlyRelevant': 'Solo se muestran los campos que usa este servicio. Deja en blanco lo que no aplique.', 'job.conditions': 'Condiciones', 'job.team': 'Equipo', 'job.autoWorkers': 'Recomendado',
  'job.costs': 'Materiales, desplazamiento y otros costes', 'job.charges': 'Cargos adicionales al cliente', 'job.chargeLabel': 'Descripción', 'job.addCharge': 'Añadir cargo', 'job.equipmentNeeded': 'Equipos y productos necesarios',
  'job.notes': 'Notas', 'job.results': 'Resultados', 'job.schedule': 'Plan de trabajo', 'job.price': 'Precio, IVA y beneficio', 'job.method': 'Método de cálculo y supuestos',
  'job.enterData': 'Elige un servicio e introduce las medidas para ver la estimación.', 'job.needsInspection': 'Se recomienda una visita al inmueble antes de dar el presupuesto definitivo.',
  'job.formula': 'Horas-operario = superficie ÷ rendimiento (m² por hora-operario) × factores de condición, más tiempos de tareas aparte (cocinas, baños, ventanas y otros no incluidos en la tarifa base), más la revisión final. Tiempo en obra = lo que tarda el equipo trabajando a la vez; días = tiempo en obra ÷ horas productivas por jornada.',
  'job.actual': 'Resultado real (después del trabajo)', 'job.actualHelp': 'Introduce lo que pasó de verdad. Sirve para informes y para sugerir mejores rendimientos; tus tarifas nunca cambian sin tu aprobación.',
  'actual.hours': 'Horas-operario reales', 'actual.labourCost': 'Coste real de mano de obra', 'actual.expenses': 'Gastos reales de materiales, desplazamiento y otros', 'actual.revenue': 'Importe facturado (sin IVA)',

  'status.draft': 'Borrador', 'status.quoted': 'Presupuestado', 'status.accepted': 'Aceptado', 'status.rejected': 'Rechazado', 'status.completed': 'Terminado', 'status.cancelled': 'Cancelado',
  'shift.normal': 'Normal', 'shift.weekend': 'Fin de semana', 'shift.holiday': 'Festivo', 'shift.overtime': 'Horas extra / nocturno',
  'level.regular': 'Regular', 'level.deep': 'A fondo', 'level.construction': 'Fin de obra', 'level.specialised': 'Especializada',
  'svc.rateShort': '{rate} m² por hora-operario', 'svc.taskOnly': 'Por tareas (sin tarifa por superficie)',

  'f.areaM2': 'Superficie total a limpiar', 'f.rooms': 'Habitaciones', 'f.kitchens': 'Cocinas', 'f.bathrooms': 'Baños', 'f.toilets': 'Aseos', 'f.windows': 'Ventanas / cristaleras', 'f.glassM2': 'Superficie de cristal',
  'f.doors': 'Puertas', 'f.balconies': 'Balcones / terrazas', 'f.stairFloors': 'Plantas de escalera', 'f.lifts': 'Ascensores', 'f.garageM2': 'Superficie de garaje / nave', 'f.offices': 'Despachos / locales',
  'f.appliances': 'Electrodomésticos (horno, nevera…) por dentro', 'f.sofas': 'Sofás', 'f.mattresses': 'Colchones', 'f.chairs': 'Sillas tapizadas', 'f.carpetM2': 'Superficie de alfombra / moqueta', 'f.floorTreatmentM2': 'Superficie de tratamiento de suelo',
  'f.stainSpots': 'Manchas a tratar', 'f.highLevelTasks': 'Trabajos en altura / difícil acceso', 'f.materials': 'Materiales', 'f.equipment': 'Equipos', 'f.distanceKm': 'Distancia', 'f.subcontract': 'Subcontratación', 'f.other': 'Otros', 'f.discountPct': 'Descuento',

  'cond.dirt': 'Nivel de suciedad', 'cond.access': 'Acceso', 'cond.furnished': 'Amueblado', 'cond.occupied': 'Habitado / en uso', 'cond.constructionDust': 'Polvo de obra / restos de reforma',
  'cond.grease': 'Mucha grasa', 'cond.limescale': 'Mucha cal', 'cond.stains': 'Manchas difíciles',
  'dirt.light': 'Ligera', 'dirt.normal': 'Normal', 'dirt.heavy': 'Alta', 'dirt.extreme': 'Extrema',
  'access.normal': 'Normal', 'access.difficult': 'Difícil', 'access.veryDifficult': 'Muy difícil / en altura',

  'cost.materials': 'Coste de materiales', 'cost.equipment': 'Coste de equipos', 'cost.subcontract': 'Subcontratación', 'cost.other': 'Otros costes directos', 'cost.distanceKm': 'Distancia de desplazamiento (km)', 'cost.discountPct': 'Descuento (%)',

  'task.area': 'Zonas generales: superficies, puertas, rodapiés', 'task.areaFloors': 'Suelos', 'task.inspection': 'Revisión final y repasos', 'task.kitchen': 'Cocina', 'task.bathroom': 'Baño', 'task.toilet': 'Aseo',
  'task.window': 'Ventanas', 'task.glass': 'Cristales', 'task.door': 'Puertas', 'task.balcony': 'Balcones / terrazas', 'task.stairs': 'Plantas de escalera', 'task.lift': 'Ascensores', 'task.garage': 'Suelo de garaje / nave',
  'task.office': 'Despachos / estancias', 'task.appliance': 'Electrodomésticos por dentro', 'task.sofa': 'Sofás', 'task.mattress': 'Colchones', 'task.chair': 'Sillas tapizadas', 'task.carpet': 'Alfombras / moqueta', 'task.floorTreatment': 'Tratamiento de suelo',
  'task.stain': 'Tratamiento de manchas', 'task.highLevel': 'Trabajos en altura', 'task.add': 'Añadir tarea', 'task.name': 'Nombre de la tarea', 'task.hours': 'Horas', 'task.anyWorker': 'Cualquiera', 'task.phase': 'Orden', 'task.maxParallel': 'Máx. operarios a la vez',
  'task.remove': 'Quitar', 'task.restore': 'Volver a incluir', 'task.reset': 'Usar cálculo', 'task.approve': 'Aprobada', 'task.inspectionHow': '{pct}% del trabajo, con el mínimo de los ajustes',
  'phase.1': 'Cristales y altura', 'phase.2': 'Estancias, cocinas, baños', 'phase.3': 'Suelos', 'phase.4': 'Revisión final',
  'cl.surfaces': 'superficies accesibles', 'cl.doorsSkirting': 'puertas y rodapiés', 'cl.mirrorsGlassInterior': 'espejos y cristales interiores', 'cl.floors': 'barrer / aspirar y fregar suelos', 'cl.worktops': 'encimeras y superficies',
  'cl.cupboards': 'armarios (si se incluyen)', 'cl.sinkTaps': 'fregadero / lavabo y grifos', 'cl.tilesGrease': 'azulejos y grasa', 'cl.appliancesScope': 'electrodomésticos según alcance', 'cl.toilet': 'inodoro', 'cl.showerBath': 'ducha / bañera',
  'cl.tilesLimescale': 'azulejos y cal visible', 'cl.mirrorsFinish': 'espejos y acabado', 'cl.checkWork': 'comprobar el trabajo', 'cl.missedTasks': 'detectar lo que falte', 'cl.finishing': 'repasos finales',

  'team.help': 'Toca una fila para elegir el tamaño del equipo. Las horas-operario no cambian; el tiempo en obra sí.', 'team.elapsed': 'Tiempo en obra', 'team.days': 'Jornadas', 'team.recommended': 'Recomendado: el equipo más pequeño que termina en una jornada (o en el menor número de días en trabajos grandes).',
  'sched.summary': '{wh} de trabajo para {w} operarios: unas {elapsed} de trabajo en obra ({onsite} con descansos), en {days} jornada(s).',
  'sched.distinction': 'Horas-operario = trabajo total de todos los operarios. Tiempo en obra = cuánto tiempo está el equipo. Jornadas = turnos necesarios. Algunas tareas (un baño, una cocina pequeña) no se pueden repartir entre muchos operarios, así que más personal no siempre reduce el tiempo a la mitad.',

  'p.subtotal': 'Base imponible', 'p.costs': 'Tus costes y beneficio (no se muestran al cliente)', 'p.materialsEquipment': 'Materiales y equipos', 'p.travelOther': 'Desplazamiento, subcontratas y otros', 'p.directCost': 'Coste directo total',
  'p.priceBeforeTax': 'Precio de venta sin IVA', 'p.margin': 'Margen de beneficio (sobre precio)', 'p.markup': 'Recargo (sobre coste)', 'p.materialsAuto': 'Materiales estimados como porcentaje de la mano de obra (ajustes de costes).',
  'price.labour': 'Mano de obra: {hours} h × {rate}', 'price.materials': 'Materiales', 'price.equipment': 'Equipos', 'price.subcontract': 'Trabajos subcontratados', 'price.other': 'Otros costes', 'price.travel': 'Desplazamiento ({km} km)',
  'price.callOut': 'Salida / desplazamiento', 'price.additional': 'Cargo adicional', 'price.discount': 'Descuento {pct}%', 'price.minCharge': 'Ajuste a importe mínimo', 'price.rounding': 'Redondeo', 'price.costBased': 'Servicio de limpieza (coste + {margin}% margen)',

  'chk.allGood': 'Todas las comprobaciones correctas.', 'chk.noService': 'Elige un servicio de limpieza.', 'chk.notNumber': '"{field}" no es un número válido.', 'chk.negative': '"{field}" no puede ser negativo.', 'chk.discountTooHigh': 'El descuento debe ser menor del 100%.',
  'chk.workersInvalid': 'El número de operarios debe ser un número entero de al menos 1.', 'chk.areaRequired': 'Este servicio se calcula por superficie: introduce la superficie total a limpiar.', 'chk.rateMissing': 'No hay rendimiento guardado para "{task}". Ponlo en Medidas y tareas.',
  'chk.multiplierCapped': 'Los factores de condición de "{task}" suman ×{value}; se limita a ×{max}. Revisa el trabajo o visítalo.', 'chk.stainsNoCount': 'Has marcado manchas difíciles pero no has indicado cuántas.',
  'chk.taskHoursInvalid': 'La tarea "{task}" tiene horas no válidas.', 'chk.noWork': 'Aún no hay trabajo calculado. Añade medidas o tareas.', 'chk.taxMissing': 'No hay tipo de IVA seleccionado. Revisa País, moneda e IVA.',
  'chk.loss': 'Este trabajo da pérdidas de {profit}. Revisa el precio o los costes.', 'chk.lowMargin': 'Margen bajo: {margin}% (tu aviso está en {min}%). Si 15 € es lo que te cuesta un operario, pon una tarifa de venta mayor en Costes de mano de obra.',
  'chk.sellBelowCost': 'La tarifa de venta por hora es menor que el coste de mano de obra por hora.', 'chk.pricePerM2': 'Precio poco habitual: {value} por m² (rango normal {min}–{max}). Compruébalo.',
  'chk.hoursPerM2': 'Tiempo poco habitual: {value} horas-operario por 100 m². Comprueba las medidas.', 'chk.minApplied': 'Se ha aplicado el importe mínimo por trabajo.', 'chk.idleWorkers': 'Con este equipo se pierden unas {idle} horas-operario esperando. Puede bastar con menos personal.',
  'chk.duplicateTasks': 'Tareas duplicadas: {names}.', 'chk.aiUnapproved': '{n} tarea(s) sugerida(s) por la IA sin aprobar. Revísalas en REVISAR TAREAS.', 'chk.edited': 'Has cambiado a mano las horas de alguna tarea.',
  'chk.inspection': 'Se recomienda visita: {reasons}.', 'chk.arithmetic': 'Ha fallado la comprobación interna de cálculo. No envíes este presupuesto; avisa del problema.', 'chk.negativeShort': 'Introduce un número igual o mayor que 0.', 'chk.positiveShort': 'Introduce un número mayor que 0.',
  'insp.large': 'inmueble grande', 'insp.extreme': 'suciedad extrema', 'insp.construction': 'restos de obra', 'insp.access': 'acceso difícil o trabajos en altura', 'insp.ai': 'parte de la estimación viene de fotos',

  'asm.baseRate': 'Rendimiento base {rate} m² por hora-operario aplicado a {area}; el {floorsPct}% de ese tiempo se programa como suelos al final.', 'asm.furnished': 'Inmueble amueblado: ×{x}.', 'asm.occupied': 'Inmueble habitado: ×{x}.',
  'asm.dustInBase': 'El polvo de obra ya está incluido en el rendimiento de fin de obra, no se suma otra vez.', 'asm.glassInsteadOfWindows': 'Se usa la superficie de cristal en lugar del número de ventanas, para no contarlas dos veces.',
  'asm.included': '"{task}" ya está incluido en el rendimiento base de este servicio y no se suma otra vez.', 'asm.multipliers': 'Factor de suciedad ×{dirt}, factor de acceso ×{access}.', 'asm.constructionDust': 'Polvo de obra: ×{x}.',
  'asm.profile': 'Grupo de tarifa "{name}": venta {sell}/h, coste de mano de obra {cost}/h.', 'asm.modeHourly': 'Precio: horas facturables × tarifa de venta más cargos.', 'asm.modeCost': 'Precio: coste directo ÷ (1 − {margin}%), así el margen es un porcentaje del precio de venta.',
  'asm.tax': 'Impuesto: {name} ({rate}%).', 'asm.inspectionTask': 'Revisión final: {pct}% del tiempo de trabajo.', 'asm.shift': 'Jornada de {shift} h con {brk} h de descanso.',

  'issued.info': 'El presupuesto {ref} se aprobó el {date} por {total}. Se mantiene tal como se emitió.', 'issued.diff': 'Con tus tarifas y datos actuales el total sería {total}.', 'issued.reissue': 'Emitir nueva versión con tarifas actuales',

  'media.title': 'Fotos y vídeo', 'media.roomForNew': 'Estancia o tarea para las nuevas fotos/vídeos', 'media.note': 'Nota', 'media.none': 'Aún no hay fotos ni vídeos.', 'media.added': '{n} archivo(s) añadido(s)',
  'media.inspectionNotes': 'Notas de la visita (escribe o dicta)', 'media.dictate': 'Dictar', 'media.dictateError': 'Error de dictado: {msg}', 'media.needMedia': 'Primero añade fotos, un vídeo o notas de la visita.',
  'media.consentReminder': 'Este cliente aún no ha dado su consentimiento para fotos/vídeos (ver ficha del cliente).',
  'media.privacyShort': 'Las fotos y algunos fotogramas de los vídeos (reducidos) se envían a tu servicio de IA solo cuando pulsas ANALIZAR. Los originales se quedan en este móvil.',
  'media.manualFallback': 'Puedes seguir haciendo fotos e introducir tú mismo lo que veas como medidas, condiciones y tareas.',
  'room.general': 'Todo el inmueble', 'room.kitchen': 'Cocina', 'room.bathroom': 'Baño', 'room.livingRoom': 'Salón', 'room.bedroom': 'Dormitorio', 'room.windows': 'Ventanas / cristales', 'room.floors': 'Suelos',
  'room.stairs': 'Escaleras / zonas comunes', 'room.balcony': 'Balcón / terraza', 'room.garage': 'Garaje / nave', 'room.office': 'Oficina / local', 'room.exterior': 'Exterior', 'room.other': 'Otro',

  'conf.high': 'claro', 'conf.medium': 'bastante claro', 'conf.low': 'poco claro',
  'ai.notConnected': 'El servicio de IA aún no está conectado, así que el análisis de fotos está desactivado.', 'ai.connectedInfo': 'El servicio de IA está conectado.',
  'ai.howItWorks': 'Haz o sube fotos y vídeos de cada estancia, etiquétalos y pulsa ANALIZAR FOTOS Y VÍDEOS. La IA describe lo que se ve y propone tareas y horas extra. No puede ver suciedad oculta ni medir con exactitud con fotos normales; te pedirá lo que falte. Tú revisas y apruebas cada sugerencia.',
  'ai.newWithPhotos': 'Empezar un trabajo nuevo con fotos', 'ai.addToJob': 'O añadir fotos a un trabajo existente', 'ai.preparing': 'Preparando imágenes…', 'ai.sending': 'Analizando {n} imágenes…', 'ai.skipped': 'No se pudo leer {name}; se omite.',
  'ai.failed': 'Ha fallado el análisis IA: {msg}', 'ai.report': 'Informe de inspección IA', 'ai.imagesUsed': '{n} imágenes', 'ai.rooms': 'Estancias, zonas y condiciones visibles', 'ai.tasks': 'Tareas extra y métodos recomendados',
  'ai.counts': 'Cantidades vistas en las fotos', 'ai.conditions': 'Condiciones sugeridas', 'ai.materials': 'Materiales y equipos', 'ai.missing': 'Información que falta', 'ai.assumptions': 'Supuestos',
  'ai.addTasks': 'Añadir estas tareas para revisar', 'ai.tasksAdded': 'Tareas añadidas', 'ai.tasksAddedToast': '{n} tarea(s) añadida(s). Apruébalas o edítalas en REVISAR TAREAS.', 'ai.applyConditions': 'Aplicar condiciones y cantidades sugeridas',
  'ai.confirmApply': '¿Aplicar estas sugerencias de la IA al trabajo?', 'ai.nothingToApply': 'No hay nada nuevo que aplicar.', 'ai.reviewNote': 'El coste de mano de obra, IVA, precio y beneficio del trabajo (con las tareas IA aprobadas) aparecen en Resultados. Revisa todo antes de presupuestar.',
  'ai.deleteMediaNow': 'Análisis terminado. ¿Borrar ahora del móvil las fotos y vídeos de este trabajo?', 'ai.testOk': 'Conectado. Modelo: {model}',

  'q.title': 'PRESUPUESTO', 'q.ref': 'Referencia', 'q.date': 'Fecha', 'q.validity': 'Válido durante {n} días', 'q.pending': 'pendiente de aprobar', 'q.work': 'Trabajo solicitado', 'q.measurements': 'Medidas del inmueble',
  'q.tasks': 'Tareas incluidas', 'q.task': 'Tarea', 'q.exclusions': 'No incluido', 'q.exclusionsHint': 'Por ejemplo: interior de armarios, cristales exteriores…', 'q.estimate': 'Estimación',
  'q.estimateText': 'Trabajo estimado de {wh} con {w} operario(s); duración estimada {dur}.', 'q.inspectionNote': 'Esta estimación se basa en la información disponible; la confirmación final puede requerir una visita al inmueble.',
  'q.acceptance': 'Aceptado por el cliente', 'q.signName': 'Nombre', 'q.signDate': 'Fecha', 'q.signature': 'Firma', 'q.draftMark': 'BORRADOR', 'q.description': 'Descripción del trabajo',
  'q.draftInfo': 'Esto es un borrador. No es una oferta oficial hasta que lo apruebes.', 'q.approve': 'APROBAR PRESUPUESTO', 'q.approveAiFirst': 'Primero aprueba o quita las tareas sugeridas por la IA.', 'q.fixErrors': 'Corrige los errores antes de aprobar.',
  'q.confirmApprove': '¿Aprobar este presupuesto de {total} como oferta oficial?', 'q.approved': 'Presupuesto {ref} aprobado', 'q.print': 'Imprimir', 'q.showTaskHours': 'Mostrar horas por tarea en el presupuesto',
  'q.shared': 'Compartido', 'q.downloaded': 'PDF guardado en Descargas', 'q.accept': 'Aceptado', 'q.reject': 'Rechazado', 'q.complete': 'Marcar terminado', 'q.none': 'Aún no hay presupuestos aprobados.', 'q.readyDrafts': 'Cálculos listos para presupuestar', 'q.enterActual': 'Introduce las horas y costes reales al final del trabajo.',

  'c.name': 'Nombre del cliente', 'c.phone': 'Teléfono', 'c.email': 'Email', 'c.address': 'Dirección del inmueble', 'c.notes': 'Notas del cliente', 'c.mediaConsent': 'El cliente acepta fotos/vídeos del inmueble para el presupuesto',
  'c.consentDate': 'Consentimiento registrado el {date}', 'c.call': 'Llamar', 'c.mail': 'Email', 'c.jobs': 'Trabajos y presupuestos', 'c.jobsCount': '{n} trabajo(s)', 'c.delete': 'Eliminar cliente con todos sus trabajos, fotos y vídeos',
  'c.history': '{n} trabajo(s) terminado(s): {est} estimadas, {act} reales.',

  'svc.help': 'Toca un servicio para cambiar su nombre, rendimiento y qué medidas pide. Puedes añadir tus propios servicios y categorías cuando quieras.', 'svc.new': 'Nuevo servicio', 'svc.newCategory': 'Nueva categoría',
  'svc.inactive': 'oculto', 'svc.name': 'Nombre', 'svc.category': 'Categoría', 'svc.level': 'Nivel de limpieza (elige los tiempos de tareas)', 'svc.areaRate': 'Rendimiento: m² por hora-operario (vacío = por tareas)', 'svc.active': 'Mostrar en la lista de servicios',
  'svc.forceEmpty': 'Siempre inmueble vacío', 'svc.forceOccupied': 'Siempre inmueble habitado', 'svc.forceConstruction': 'Siempre con restos de obra', 'svc.noInspection': 'Sin tarea de revisión final',
  'svc.fields': 'Medidas que pide este servicio', 'svc.fieldsHelp': 'Solo aparecen estos campos al calcular este servicio.', 'svc.included': 'Ya incluido en el rendimiento por superficie',
  'svc.includedHelp': 'Marca las tareas que ya cubre la tarifa por m², para que nunca se cuenten dos veces.',

  'tasks.help': 'Tiempos de trabajos que no cubre el rendimiento por superficie. Un valor por nivel de limpieza. Los cambios se confirman y se registran.', 'tasks.perItem': 'Horas por unidad ({field}).', 'tasks.perArea': 'm² por hora-operario ({field}).',

  'rates.help': 'Tus tarifas aprobadas. La app nunca las cambia sin tu confirmación; cada cambio queda registrado abajo.', 'rates.pricing': 'Precios', 'rates.mode': 'Método de precio',
  'mode.hourly': 'Presupuesto: horas × mi tarifa de venta + cargos', 'mode.cost': 'Por coste: coste directo + margen objetivo',
  'rates.margin': 'Margen de beneficio objetivo', 'rates.minCharge': 'Importe mínimo por trabajo', 'rates.minHours': 'Horas mínimas facturables', 'rates.hoursStep': 'Redondear horas facturables hacia arriba a', 'rates.priceRounding': 'Redondear precio a',
  'rates.lowMargin': 'Avisar si el margen es menor de', 'rates.ppmMin': 'Avisar si el precio por m² es menor de', 'rates.ppmMax': 'Avisar si el precio por m² es mayor de',
  'rates.marginNote': 'El margen es un porcentaje del precio de venta: con un 30%, un trabajo que cuesta 70 se vende a 100 (no a 91, que sería un recargo del 30%).',
  'rates.serviceRates': 'Rendimiento por superficie de cada servicio', 'rates.serviceRatesHelp': 'm² limpiados por hora-operario con suciedad normal.',
  'rates.conditions': 'Factores de condición', 'rates.conditionsHelp': 'Multiplicadores del tiempo. 1 = sin cambio, 1,3 = un 30% más de tiempo.', 'rates.maxMult': 'Factor combinado máximo',
  'rates.scheduling': 'Jornadas y planificación', 'rates.shiftHours': 'Duración de la jornada', 'rates.breakHours': 'Descanso por jornada', 'rates.breakAfter': 'Descanso cuando el trabajo supera', 'rates.maxTeam': 'Equipo máximo considerado',
  'rates.minAreaPerWorker': 'Superficie mínima por operario en la misma zona', 'rates.floorsShare': 'Parte del tiempo de superficie para suelos', 'rates.inspectionPct': 'Tiempo de revisión final', 'rates.inspectionMin': 'Tiempo mínimo de revisión', 'rates.largeJob': 'Recomendar visita a partir de',
  'rates.learned': 'Sugerencias de trabajos terminados', 'rates.learnedHelp': 'Basado en las horas reales de trabajos terminados. No cambia nada hasta que pulses Aplicar.', 'rates.noLearned': 'Termina trabajos e introduce las horas reales para recibir sugerencias.',
  'rates.jobs': 'Trabajos', 'rates.current': 'Actual', 'rates.suggested': 'Sugerido', 'rates.apply': 'Aplicar', 'rates.history': 'Historial de cambios de tarifas y precios',

  'costs.serviceSell': 'Precio de venta por servicio', 'costs.serviceSellHelp': 'Lo que cobras al cliente por hora-operario en cada servicio. Deja la casilla vacía para usar el grupo de tarifa del servicio (en gris). Cada cambio se confirma y queda en el historial de tarifas.',
  'svc.pricing': 'Cómo se cobra este servicio', 'svc.pricingHourly': 'Por hora-operario', 'svc.pricingQuote': 'Presupuesto según tamaño y estado', 'svc.sellRate': 'Precio de venta por hora-operario', 'svc.sellRateFromGroup': 'Vacío = grupo de tarifa ({rate})',
  'job.quotedPrice': 'Tu precio para este trabajo, sin IVA', 'job.quotedPriceHelp': 'Este servicio se presupuesta según tamaño y estado. La app sigue calculando horas y coste de mano de obra para que veas el beneficio.',
  'price.quoted': 'Servicio de limpieza (presupuesto según tamaño y estado)', 'chk.quotedPriceMissing': 'Indica tu precio para este trabajo: este servicio se presupuesta según tamaño y estado.',
  'asm.serviceRate': 'Precio de venta de este servicio: {sell}/h; coste de mano de obra {cost}/h.', 'asm.quoted': 'Precio fijado por ti (según tamaño y estado); coste de mano de obra {cost}/h.',
  'costs.help': 'Separa lo que cobras al cliente de lo que te cuesta una hora de operario.', 'costs.sellRate': 'Tarifa de venta al cliente', 'costs.costRate': 'Coste de mano de obra para ti', 'costs.usedBy': 'Usado por: {list}', 'costs.addProfile': 'Añadir grupo de tarifa',
  'costs.shifts': 'Fines de semana, festivos y horas extra', 'costs.shiftsHelp': 'Porcentaje que se suma a la tarifa de venta y al coste de mano de obra en cada tipo de jornada.', 'costs.sellSurcharge': 'Recargo en tarifa de venta', 'costs.costSurcharge': 'Recargo en coste',
  'costs.materialsTravel': 'Materiales, equipos y desplazamiento', 'costs.materialsMarkup': 'Recargo sobre materiales', 'costs.equipmentMarkup': 'Recargo sobre equipos', 'costs.subcontractMarkup': 'Recargo sobre subcontratas',
  'costs.autoMaterials': 'Si no se indican materiales, estimarlos como % de la mano de obra', 'costs.callOut': 'Cargo de salida por trabajo', 'costs.travelCharge': 'Desplazamiento cobrado al cliente', 'costs.travelCost': 'Coste de desplazamiento para ti',

  'loc.country': 'País', 'loc.other': 'Otro', 'loc.presetNote': 'Al elegir un país se ajustan la moneda, el formato de números, las unidades y el nombre del impuesto. Los tipos de impuesto nunca se cambian solos: introduce los que te correspondan.',
  'loc.presetApplied': 'Ajustes del país aplicados. Revisa tus tipos de impuesto.', 'loc.region': 'Región / provincia', 'loc.currency': 'Código de moneda (EUR, GBP, USD…)', 'loc.language': 'Idioma', 'loc.units': 'Unidades de superficie', 'loc.numberLocale': 'Formato de números (p. ej. es-ES)',
  'loc.taxes': 'Tipos de impuesto', 'loc.taxHelp': 'Añade todos los tipos que uses. Elige el predeterminado y cámbialo por servicio en Servicios de limpieza o en cada trabajo.', 'loc.taxLabel': 'Nombre del impuesto en presupuestos', 'loc.addTax': 'Añadir tipo', 'loc.newTax': 'Nuevo tipo', 'loc.defaultTax': 'Tipo predeterminado',
  'loc.perServiceTax': 'Impuesto por servicio: abre el servicio en Servicios de limpieza.',

  'hours.help': 'Cálculo rápido: superficie ÷ rendimiento = horas-operario, dividido entre el equipo. Para una estimación completa con tareas usa NUEVO CÁLCULO DE LIMPIEZA.', 'hours.rate': 'Rendimiento (m² por hora-operario)',
  'hours.orWorkerHours': 'O total de horas-operario', 'hours.enter': 'Introduce superficie y rendimiento, u horas-operario.', 'hours.note': 'Este cálculo rápido supone que todo el trabajo se reparte por igual. El cálculo completo tiene en cuenta las tareas que no se pueden repartir.',

  'profit.help': 'Trabajos aceptados y terminados por mes. Las cifras reales usan las horas y costes reales que hayas introducido.', 'profit.overheads': 'Gastos mensuales del negocio', 'profit.overheadsHelp': 'Gastos fijos como seguro, vehículo, teléfono, programas.',
  'profit.overheadName': 'Gasto', 'profit.addOverhead': 'Añadir gasto', 'profit.monthlyTotal': 'Total al mes', 'profit.byMonth': 'Por mes', 'profit.estRevenue': 'Ingresos est.', 'profit.estProfit': 'Beneficio est.',
  'profit.actRevenue': 'Ingresos reales', 'profit.actProfit': 'Beneficio real de trabajos', 'profit.net': 'Tras gastos fijos', 'profit.none': 'Aún no hay trabajos aceptados o terminados.',

  'rep.totalJobs': 'Trabajos calculados', 'rep.quotes': 'Presupuestos emitidos', 'rep.accepted': 'Presupuestos aceptados', 'rep.rejected': 'Presupuestos rechazados', 'rep.estVsAct': 'Horas estimadas / reales (terminados)', 'rep.revenue': 'Ingresos de trabajos terminados',
  'rep.labour': 'Gasto de mano de obra', 'rep.materialsTravel': 'Materiales, desplazamientos y otros gastos', 'rep.estProfit': 'Beneficio estimado (terminados)', 'rep.actProfit': 'Beneficio real (terminados)', 'rep.completedOnly': 'Las cifras económicas usan solo trabajos terminados.',
  'rep.bySvc': 'Rendimiento por servicio (mayores diferencias primero)', 'rep.jobs': 'Trabajos', 'rep.est': 'Est.', 'rep.act': 'Real', 'rep.diff': 'Dif.', 'rep.noCompleted': 'Aún no hay trabajos terminados con horas reales.', 'rep.bySize': 'Horas-operario medias por tamaño',
  'rep.pdf': 'Exportar informe PDF', 'rep.csv': 'Exportar hoja de cálculo (CSV)',

  'bk.export': 'Hacer copia de seguridad', 'bk.exportHelp': 'Guarda todo (ajustes, tarifas, servicios, clientes, trabajos y, si quieres, fotos/vídeos) en un archivo. Guárdalo en Google Drive, envíatelo por email o cópialo a un ordenador.',
  'bk.includeMedia': 'Incluir fotos y vídeos (archivo más grande)', 'bk.password': 'Contraseña para cifrar la copia (recomendado)', 'bk.exportBtn': 'Crear archivo de copia', 'bk.last': 'Última copia: {date}', 'bk.done': 'Copia creada',
  'bk.restore': 'Restaurar una copia', 'bk.restoreHelp': 'Úsalo en un móvil nuevo o tras reinstalar.', 'bk.passwordIf': 'Contraseña (si la copia está cifrada)', 'bk.mode': 'Cómo restaurar', 'bk.merge': 'Añadir a los datos de este móvil', 'bk.replace': 'Sustituir todos los datos de este móvil',
  'bk.restoreBtn': 'Restaurar', 'bk.chooseFile': 'Elige primero el archivo de copia.', 'bk.needPassword': 'Esta copia está cifrada: introduce su contraseña.', 'bk.wrongPassword': 'Contraseña incorrecta.', 'bk.invalid': 'Este archivo no es una copia válida.', 'bk.restoredLog': 'Datos restaurados desde copia',
  'bk.storage': 'Espacio usado en este móvil: {used}. Protegido contra borrado automático: {persisted}.', 'bk.storageHelp': 'Los datos solo están en este móvil. Desinstalar la app o borrar los datos del sitio en Chrome los elimina, así que haz copias a menudo.',

  'set.business': 'Datos de la empresa', 'set.bizName': 'Nombre de la empresa', 'set.taxId': 'NIF/CIF', 'set.web': 'Web', 'set.validity': 'Validez del presupuesto (días)', 'set.paymentTerms': 'Forma de pago', 'set.conditions': 'Condiciones especiales',
  'set.security': 'PIN de acceso', 'set.securityHelp': 'Pide un PIN al abrir la app o tras 5 minutos en segundo plano. El PIN se guarda solo como huella cifrada.', 'set.setPin': 'Poner PIN', 'set.removePin': 'Quitar PIN',
  'set.ai': 'Servicio IA de fotos y vídeo', 'set.aiHelp': 'Dirección de tu propio servidor de IA y su clave de la app. La clave secreta de la IA está en ese servidor, nunca en esta app.', 'set.aiEndpoint': 'Dirección del servicio IA (https://…)', 'set.aiToken': 'Clave de la app',
  'set.retainMedia': 'Conservar fotos y vídeos en el móvil después del análisis', 'set.testAi': 'Probar conexión', 'set.privacy': 'Privacidad: qué pasa con los datos de clientes',
  'set.privacyText': 'Clientes, trabajos, presupuestos, fotos y vídeos se guardan solo en este móvil (en el almacenamiento privado de la app). No se sube nada salvo que (1) exportes una copia, (2) compartas un PDF o (3) pulses ANALIZAR FOTOS Y VÍDEOS. En el caso 3, copias reducidas de las fotos y unos fotogramas de cada vídeo se envían a tu servidor de IA, que los pasa al proveedor de IA solo para ese análisis y no los guarda. Puedes borrar cualquier foto, vídeo, trabajo o cliente en cualquier momento.',
  'set.data': 'Datos', 'set.resetCatalogue': 'Restaurar el catálogo original de servicios y tiempos (se conservan tus servicios propios)', 'set.wipe': 'Borrar TODOS los datos de este móvil',

  'pin.enter': 'Introduce tu PIN', 'pin.unlock': 'Desbloquear', 'pin.wrong': 'PIN incorrecto', 'pin.new': 'Nuevo PIN (mínimo 4 cifras)', 'pin.repeat': 'Repite el PIN', 'pin.tooShort': 'El PIN debe tener al menos 4 cifras.', 'pin.mismatch': 'Los PIN no coinciden.',

  'confirm.rate': '¿Cambiar esta tarifa aprobada de {from} a {to}?', 'confirm.delete': '¿Eliminar definitivamente?', 'confirm.deleteJob': '¿Eliminar definitivamente este trabajo con sus fotos y vídeos?',
  'confirm.deleteCustomer': '¿Eliminar definitivamente a {name} con sus {n} trabajo(s), fotos y vídeos?', 'confirm.resetCatalogue': '¿Restaurar los servicios y tiempos originales? Tus servicios propios se mantienen; las tarifas cambiadas vuelven a los valores originales.',
  'confirm.wipe1': '¿Borrar TODOS los clientes, trabajos, fotos, ajustes y tarifas de este móvil? Haz antes una copia de seguridad.', 'confirm.wipe2': 'Escribe DELETE para confirmar.',
  'confirm.restoreReplace': '¿Sustituir todo lo de este móvil por la copia ({jobs} trabajos, {customers} clientes)?', 'confirm.restoreMerge': '¿Añadir la copia ({jobs} trabajos, {customers} clientes) a este móvil?',
};

Object.assign(es, budgetTexts.es);
Object.assign(en, budgetTexts.en);
Object.assign(fr, bfr);
Object.assign(eu, beu);
Object.assign(pt, bpt);
Object.assign(it, bit);
Object.assign(de, bde);
Object.assign(nl, bnl);
Object.assign(ar, bar);
export const DICT = { es, en, fr, eu, pt, it, de, nl, ar };
for (const [code, texts] of Object.entries(docTexts)) Object.assign(DICT[code], texts);
