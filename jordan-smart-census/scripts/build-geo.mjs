/**
 * Geo preprocessing for Jordan Smart Census.
 *
 * Input  : data-raw/geoboundaries/JOR-ADM{0,1,2}.geojson (geoBoundaries gbOpen)
 * Output : src/data/geo/{country,governorates,districts,boundary-qa}.json
 *
 * Steps
 *  1. Simplify ADM0 / ADM1 for web rendering.
 *  2. Nest every ADM2 unit inside the governorate it overlaps most, and clip it to
 *     that governorate so that District ⊂ Governorate holds exactly.
 *     Slivers of an ADM2 unit lying in another governorate are merged into the
 *     largest district of the receiving governorate.
 *  3. Label QA: district-seat coordinates are tested point-in-polygon. A unit
 *     containing its governorate capital becomes "Qasabat <Gov>"; a unit with
 *     other seat evidence takes the seat's district name; units without
 *     evidence keep the published label and are flagged "unverified".
 *     Tiny unverified units (< 40 km²) are merged into the nearest district.
 *  4. Emit a QA report consumed by the app's GIS screen.
 */
import * as turf from '@turf/turf';
import fs from 'node:fs';

const RAW = 'data-raw/geoboundaries';
const OUT = 'src/data/geo';
const read = (f) => JSON.parse(fs.readFileSync(`${RAW}/${f}`, 'utf8'));
const adm0 = read('JOR-ADM0.geojson');
const adm1 = read('JOR-ADM1.geojson');
const adm2 = read('JOR-ADM2.geojson');

// ---------------------------------------------------------------- governorates
const GOVS = {
  Amman:   { id: 'AMM', iso: 'JO-AM', en: 'Amman',   ar: 'العاصمة', capEn: 'Amman',   capAr: 'عمّان',  region: 'Central' },
  Irbid:   { id: 'IRB', iso: 'JO-IR', en: 'Irbid',   ar: 'إربد',    capEn: 'Irbid',   capAr: 'إربد',   region: 'North' },
  Zarqa:   { id: 'ZAR', iso: 'JO-AZ', en: 'Zarqa',   ar: 'الزرقاء', capEn: 'Zarqa',   capAr: 'الزرقاء', region: 'Central' },
  Mafraq:  { id: 'MAF', iso: 'JO-MA', en: 'Mafraq',  ar: 'المفرق',  capEn: 'Mafraq',  capAr: 'المفرق', region: 'North' },
  Balqa:   { id: 'BAL', iso: 'JO-BA', en: 'Balqa',   ar: 'البلقاء', capEn: 'As-Salt', capAr: 'السلط',  region: 'Central' },
  Jerash:  { id: 'JER', iso: 'JO-JA', en: 'Jerash',  ar: 'جرش',     capEn: 'Jerash',  capAr: 'جرش',    region: 'North' },
  Ajloun:  { id: 'AJL', iso: 'JO-AJ', en: 'Ajloun',  ar: 'عجلون',   capEn: 'Ajloun',  capAr: 'عجلون',  region: 'North' },
  Madaba:  { id: 'MAD', iso: 'JO-MD', en: 'Madaba',  ar: 'مادبا',   capEn: 'Madaba',  capAr: 'مادبا',  region: 'Central' },
  Karak:   { id: 'KAR', iso: 'JO-KA', en: 'Karak',   ar: 'الكرك',   capEn: 'Al-Karak', capAr: 'الكرك', region: 'South' },
  Tafilah: { id: 'TAF', iso: 'JO-AT', en: 'Tafilah', ar: 'الطفيلة', capEn: 'At-Tafilah', capAr: 'الطفيلة', region: 'South' },
  "Ma'an": { id: 'MAN', iso: 'JO-MN', en: "Ma'an",   ar: 'معان',    capEn: "Ma'an",   capAr: 'معان',   region: 'South' },
  Aqaba:   { id: 'AQB', iso: 'JO-AQ', en: 'Aqaba',   ar: 'العقبة',  capEn: 'Aqaba',   capAr: 'العقبة', region: 'South' },
};

// District seats / towns: [lat, lng, govId, canonical district EN, AR, isCapital, placementWeight]
// Approximate WGS84 coordinates of well-known towns (geographic reference, not statistics).
const SEATS = [
  [31.9539, 35.9106, 'AMM', 'Qasabat Amman', 'قصبة عمّان', true, 10],
  [31.975, 35.995, 'AMM', 'Marka', 'ماركا', false, 5],
  [31.912, 35.948, 'AMM', 'Al-Quwaysimah', 'القويسمة', false, 4],
  [31.954, 35.82, 'AMM', 'Wadi as-Sir', 'وادي السير', false, 4],
  [32.022, 35.866, 'AMM', "Al-Jami'a", 'الجامعة', false, 4],
  [31.871, 36.005, 'AMM', 'Sahab', 'سحاب', false, 3],
  [31.875, 35.827, 'AMM', "Na'ur", 'ناعور', false, 2],
  [31.70, 35.95, 'AMM', 'Al-Jiza', 'الجيزة', false, 1],
  [31.81, 36.11, 'AMM', 'Al-Muwaqqar', 'الموقر', false, 1],
  [32.0728, 36.088, 'ZAR', 'Qasabat Az-Zarqa', 'قصبة الزرقاء', true, 8],
  [32.0178, 36.0464, 'ZAR', 'Ar-Rusayfa', 'الرصيفة', false, 5],
  [32.14, 36.10, 'ZAR', 'Al-Hashimiyya', 'الهاشمية', false, 2],
  [31.83, 36.82, 'ZAR', 'Al-Azraq', 'الأزرق', false, 1],
  [32.5556, 35.85, 'IRB', 'Qasabat Irbid', 'قصبة إربد', true, 8],
  [32.5592, 36.0069, 'IRB', 'Ar-Ramtha', 'الرمثا', false, 4],
  [32.69, 35.78, 'IRB', 'Bani Kinana', 'بني كنانة', false, 2],
  [32.50, 35.686, 'IRB', 'Al-Koura', 'الكورة', false, 2],
  [32.47, 35.79, 'IRB', 'Northern Mazar', 'المزار الشمالي', false, 2],
  [32.61, 35.61, 'IRB', 'Northern Ghor', 'الأغوار الشمالية', false, 2],
  [32.54, 35.72, 'IRB', 'At-Taybeh', 'الطيبة', false, 1],
  [32.60, 35.71, 'IRB', 'Al-Wasatiyya', 'الوسطية', false, 1],
  [32.49, 35.88, 'IRB', 'Bani Obeid', 'بني عبيد', false, 3],
  [32.3429, 36.208, 'MAF', 'Qasabat Al-Mafraq', 'قصبة المفرق', true, 5],
  [32.5, 38.2, 'MAF', 'Ar-Ruwayshid', 'الرويشد', false, 1],
  [32.0392, 35.7272, 'BAL', 'Qasabat As-Salt', 'قصبة السلط', true, 5],
  [32.06, 35.85, 'BAL', 'Ain al-Basha', 'عين الباشا', false, 4],
  [32.196, 35.623, 'BAL', 'Deir Alla', 'دير علا', false, 2],
  [31.90, 35.62, 'BAL', 'Southern Shuna', 'الشونة الجنوبية', false, 2],
  [32.2747, 35.8961, 'JER', 'Qasabat Jerash', 'قصبة جرش', true, 5],
  [32.3326, 35.7517, 'AJL', 'Qasabat Ajloun', 'قصبة عجلون', true, 4],
  [32.30, 35.70, 'AJL', 'Kufranjah', 'كفرنجة', false, 3],
  [31.716, 35.794, 'MAD', 'Qasabat Madaba', 'قصبة مادبا', true, 5],
  [31.50, 35.78, 'MAD', 'Dhiban', 'ذيبان', false, 2],
  [31.1853, 35.7048, 'KAR', 'Qasabat Al-Karak', 'قصبة الكرك', true, 4],
  [31.31, 35.74, 'KAR', 'Al-Qasr', 'القصر', false, 2],
  [31.04, 35.47, 'KAR', 'Southern Ghor', 'الأغوار الجنوبية', false, 2],
  [31.07, 35.70, 'KAR', 'Southern Mazar', 'المزار الجنوبي', false, 2],
  [31.25, 36.05, 'KAR', 'Al-Qatrana', 'القطرانة', false, 1],
  [31.13, 35.62, 'KAR', 'Ayy', 'عيّ', false, 1],
  [31.37, 35.66, 'KAR', 'Faqqu', 'فقوع', false, 1],
  [30.8375, 35.6042, 'TAF', 'Qasabat At-Tafilah', 'قصبة الطفيلة', true, 4],
  [30.73, 35.61, 'TAF', 'Busayra', 'بصيرا', false, 2],
  [30.1962, 35.7341, 'MAN', "Qasabat Ma'an", 'قصبة معان', true, 4],
  [30.3216, 35.4792, 'MAN', 'Petra (Wadi Musa)', 'البترا (وادي موسى)', false, 3],
  [30.52, 35.56, 'MAN', 'Ash-Shobak', 'الشوبك', false, 2],
  [29.5321, 35.0063, 'AQB', 'Qasabat Al-Aqaba', 'قصبة العقبة', true, 6],
  [29.80, 35.31, 'AQB', 'Al-Quwayra', 'القويرة', false, 1],
  [30.06, 35.17, 'AQB', 'Wadi Araba', 'وادي عربة', false, 1],
];

// Arabic forms of the published gbOpen ADM2 labels (used when a label is retained).
const GB_AR = {
  'Al-Azraq': 'الأزرق', 'Al-Jizah': 'الجيزة', Dhiban: 'ذيبان', Madaba: 'مادبا', 'Al-Muwaqqar': 'الموقر',
  'Um al-Basatin': 'أم البساتين', "Na'ur": 'ناعور', Amman: 'عمّان', 'Wadi al-Sayr': 'وادي السير', Sahab: 'سحاب',
  'Az-Zarqa': 'الزرقاء', Birin: 'بيرين', 'Ar Ramtha': 'الرمثا', 'As-Salt': 'السلط', Ardhah: 'العارضة',
  'Al-Balqa': 'البلقاء', 'Shuna al-Jabiniyya': 'الشونة الجنوبية', 'Dair Alla': 'دير علا', Kofranjah: 'كفرنجة',
  Aljun: 'عجلون', Wastiyyeh: 'الوسطية', Tayybeh: 'الطيبة', 'Mazar Shamaliyyeh': 'المزار الشمالي',
  'Bani Knana': 'بني كنانة', 'Al-Aghwar Shamaliyyeh': 'الأغوار الشمالية', Jerash: 'جرش',
  'Ar-Ruwayshid': 'الرويشد', Sabha: 'صبحا', 'Sama as-Sarhan': 'سما السرحان', "Bal'ama": 'بلعما',
  'Al-Mafraq': 'المفرق', 'Wadi Araba': 'وادي عربة', 'Al-Quwayra': 'القويرة', 'Al-Qasr': 'القصر',
  'Al-Safi': 'الصافي', Faqqu: 'فقوع', "Al-Mazra'a": 'المزرعة', Ayy: 'عيّ', 'Al-Karak': 'الكرك',
  'Al-Mazar al-Janubiyya': 'المزار الجنوبي', "Ma'an": 'معان', Ayi: 'آيي', 'Wadi Musa': 'وادي موسى',
  'Al-Husanyniyya': 'الحسينية', 'Ash-Shibek': 'الشوبك', 'Al-Aqaba': 'العقبة', 'Al-Tafila': 'الطفيلة',
  Birsayra: 'بصيرا', 'Al-Hasa': 'الحسا', Hariema: 'حريمة', Kora: 'الكورة', Irbid: 'إربد',
};

const round = (fc, p = 4) => turf.truncate(fc, { precision: p, coordinates: 2, mutate: true });
const km2 = (f) => turf.area(f) / 1e6;
const polysOnly = (f) => {
  if (!f) return null;
  const g = f.geometry;
  if (g.type === 'Polygon' || g.type === 'MultiPolygon') return f;
  if (g.type === 'GeometryCollection') {
    const polys = g.geometries.filter((x) => x.type === 'Polygon').map((x) => x.coordinates);
    const mps = g.geometries.filter((x) => x.type === 'MultiPolygon').flatMap((x) => x.coordinates);
    const all = [...polys, ...mps];
    return all.length ? turf.multiPolygon(all) : null;
  }
  return null;
};
const union = (a, b) => (a && b ? turf.union(turf.featureCollection([a, b])) : a ?? b);

// 1. Governorates
const govFeatures = adm1.features.map((f) => {
  const meta = GOVS[f.properties.shapeName];
  if (!meta) throw new Error(`Unknown governorate ${f.properties.shapeName}`);
  const simp = turf.simplify(f, { tolerance: 0.001, highQuality: true });
  return { meta, raw: f, simp };
});

// 2. Districts: majority assignment + clip
const pieces = new Map(); // govId -> [{ label, geom }]
const report = { units: [], merges: [], seatsTested: SEATS.length };
for (const d of adm2.features) {
  const label = d.properties.shapeName;
  let best = null; let bestArea = 0; const inters = [];
  for (const g of govFeatures) {
    const i = polysOnly(turf.intersect(turf.featureCollection([d, g.simp])));
    if (!i) continue;
    const a = km2(i);
    inters.push({ g, i, a });
    if (a > bestArea) { bestArea = a; best = g; }
  }
  const total = km2(d);
  for (const { g, i, a } of inters) {
    const list = pieces.get(g.meta.id) ?? [];
    if (g === best) list.push({ label, geom: i, sourceArea: total, majorityShare: bestArea / total });
    else if (a > 0.05) list.push({ label: null, from: label, geom: i, sourceArea: a });
    pieces.set(g.meta.id, list);
  }
}

const districts = [];
for (const g of govFeatures) {
  const list = pieces.get(g.meta.id) ?? [];
  const own = list.filter((p) => p.label);
  const orphans = list.filter((p) => !p.label);
  // merge orphan slivers into the own district they touch with largest area (fallback: nearest centroid)
  for (const o of orphans) {
    const oc = turf.centroid(o.geom);
    let target = own[0]; let bestD = Infinity;
    for (const p of own) {
      const dist = turf.distance(oc, turf.centroid(p.geom));
      if (dist < bestD) { bestD = dist; target = p; }
    }
    target.geom = union(target.geom, o.geom);
    report.merges.push({ govId: g.meta.id, kind: 'cross-governorate sliver', from: o.from, target, areaKm2: +o.sourceArea.toFixed(1) });
  }
  for (const p of own) {
    const d = { govId: g.meta.id, gbLabel: p.label, geom: p.geom, majorityShare: p.majorityShare };
    for (const m of report.merges) if (m.target === p) m.target = d;
    districts.push(d);
  }
}

// 3. Label QA by seat evidence
for (const d of districts) {
  const inside = SEATS.filter((s) => s[2] === d.govId && turf.booleanPointInPolygon(turf.point([s[1], s[0]]), d.geom));
  d.seats = inside;
  const cap = inside.find((s) => s[5]);
  if (cap) { d.en = cap[3]; d.ar = cap[4]; d.method = 'seat-capital'; }
  else if (inside.length === 1) { d.en = inside[0][3]; d.ar = inside[0][4]; d.method = 'seat'; }
  else if (inside.length > 1) { d.en = inside.map((s) => s[3]).join(' & '); d.ar = inside.map((s) => s[4]).join(' و'); d.method = 'seat-multiple'; }
  else { d.en = d.gbLabel.replace('Ar Ramtha', 'Ar-Ramtha'); d.ar = GB_AR[d.gbLabel] ?? d.gbLabel; d.method = 'published-label'; }
}
// resolve duplicate names: an unverified label colliding with a verified one gets a suffix
const seen = new Map();
for (const d of districts.filter((x) => x.method !== 'published-label')) seen.set(d.en, d);
for (const d of districts.filter((x) => x.method === 'published-label')) {
  if (seen.has(d.en) || [...seen.keys()].some((k) => k.includes(d.en))) {
    d.en = `${d.en} (west)`; d.ar = `${d.ar} (غرب)`; d.method = 'published-label-disambiguated';
  }
  seen.set(d.en, d);
}
// merge tiny unverified units
for (let i = districts.length - 1; i >= 0; i--) {
  const d = districts[i];
  if (d.method.startsWith('published') && km2(d.geom) < 40) {
    const c = turf.centroid(d.geom);
    let target = null; let bestD = Infinity;
    for (const o of districts) {
      if (o === d || o.govId !== d.govId) continue;
      const dist = turf.distance(c, turf.centroid(o.geom));
      if (dist < bestD) { bestD = dist; target = o; }
    }
    target.geom = union(target.geom, d.geom);
    report.merges.push({ govId: d.govId, kind: 'tiny unverified unit', from: d.gbLabel, target, areaKm2: +km2(d.geom).toFixed(1) });
    districts.splice(i, 1);
  }
}

// 4. Assemble outputs
const govCounter = {};
const districtFeatures = districts
  .sort((a, b) => a.govId.localeCompare(b.govId) || (b.method === 'seat-capital') - (a.method === 'seat-capital') || a.en.localeCompare(b.en))
  .map((d) => {
    govCounter[d.govId] = (govCounter[d.govId] ?? 0) + 1;
    const id = `${d.govId}-D${String(govCounter[d.govId]).padStart(2, '0')}`;
    let geom = turf.simplify(d.geom, { tolerance: 0.0015, highQuality: true });
    const lp = turf.booleanPointInPolygon(turf.centroid(geom), geom) ? turf.centroid(geom) : turf.pointOnFeature(geom);
    const anchors = d.seats.map((s) => [s[1], s[0], s[6]]);
    if (!anchors.length) anchors.push([...lp.geometry.coordinates, 1]);
    report.units.push({ id, govId: d.govId, nameEn: d.en, nameAr: d.ar, sourceLabel: d.gbLabel, method: d.method, seats: d.seats.map((s) => s[3]), majorityShare: +(d.majorityShare * 100).toFixed(1), areaKm2: +km2(geom).toFixed(1) });
    return turf.feature(geom.geometry, {
      id, govId: d.govId, nameEn: d.en, nameAr: d.ar, sourceLabel: d.gbLabel, labelMethod: d.method,
      areaKm2: +km2(geom).toFixed(1), labelLng: +lp.geometry.coordinates[0].toFixed(4), labelLat: +lp.geometry.coordinates[1].toFixed(4),
      anchors, capital: d.method === 'seat-capital',
    });
  });

const govOut = turf.featureCollection(govFeatures.map(({ meta, simp, raw }) => {
  const lp = turf.centroid(simp);
  const cap = SEATS.find((s) => s[2] === meta.id && s[5]);
  return turf.feature(simp.geometry, {
    id: meta.id, iso: meta.iso, nameEn: meta.en, nameAr: meta.ar, capitalEn: meta.capEn, capitalAr: meta.capAr, region: meta.region,
    areaKm2: +km2(raw).toFixed(0), labelLng: +lp.geometry.coordinates[0].toFixed(4), labelLat: +lp.geometry.coordinates[1].toFixed(4),
    capitalLng: cap[1], capitalLat: cap[0], sourceId: raw.properties.shapeID,
  });
}));

const country = turf.simplify(adm0, { tolerance: 0.001, highQuality: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/country.json`, JSON.stringify(round(country)));
fs.writeFileSync(`${OUT}/governorates.json`, JSON.stringify(round(govOut)));
fs.writeFileSync(`${OUT}/districts.json`, JSON.stringify(round(turf.featureCollection(districtFeatures))));

report.merges = report.merges.map(({ target, ...m }) => ({ ...m, into: target.en }));
const methods = report.units.reduce((m, u) => ((m[u.method] = (m[u.method] ?? 0) + 1), m), {});
fs.writeFileSync(`${OUT}/boundary-qa.json`, JSON.stringify({
  generatedBy: 'scripts/build-geo.mjs',
  source: 'geoBoundaries gbOpen JOR (ADM0 2016, ADM1 2006, ADM2 2006); build Dec 12, 2023',
  sourceAdm2Units: adm2.features.length, outputDistricts: districtFeatures.length, labelMethods: methods, ...report,
}, null, 1));
console.log('governorates', govOut.features.length, 'districts', districtFeatures.length, methods, 'merges', report.merges.length);
for (const f of ['country', 'governorates', 'districts']) console.log(f, fs.statSync(`${OUT}/${f}.json`).size);
