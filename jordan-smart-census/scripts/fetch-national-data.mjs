// National indicator connector (build time): Jordan series for a curated set of World Bank
// World Development Indicators, from the open mirror github.com/datasets/world-development-indicators
// (ODC-PDDL). Writes src/data/national.generated.ts with each indicator's title, source note,
// series (2000 onward), latest value and a content checksum.
//
//   node scripts/fetch-national-data.mjs
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const BASE = "https://raw.githubusercontent.com/datasets/world-development-indicators/main/indicators";

// code → [pillar, owner entity id (who should supply the national figure in Jordan)]
export const CODES = {
  // economy
  "ny.gdp.mktp.cd": ["ECONOMY", "DOS"], "ny.gdp.mktp.kd.zg": ["ECONOMY", "DOS"], "ny.gdp.pcap.cd": ["ECONOMY", "DOS"], "ny.gdp.pcap.kd.zg": ["ECONOMY", "DOS"],
  "ny.gdp.pcap.pp.cd": ["ECONOMY", "DOS"], "ny.gnp.pcap.cd": ["ECONOMY", "DOS"], "fp.cpi.totl.zg": ["ECONOMY", "DOS"], "ne.gdi.totl.zs": ["ECONOMY", "DOS"],
  "nv.agr.totl.zs": ["ECONOMY", "DOS"], "nv.ind.totl.zs": ["ECONOMY", "DOS"], "ne.exp.gnfs.zs": ["ECONOMY", "CBJ"], "ne.imp.gnfs.zs": ["ECONOMY", "CBJ"],
  "bn.cab.xoka.cd": ["ECONOMY", "CBJ"], "bx.klt.dinv.cd.wd": ["ECONOMY", "CBJ"], "bx.trf.pwkr.cd.dt": ["ECONOMY", "CBJ"], "fi.res.totl.cd": ["ECONOMY", "CBJ"],
  "fr.inr.lend": ["ECONOMY", "CBJ"], "st.int.rcpt.xp.zs": ["ECONOMY", "MOTA"], "dt.oda.odat.cd": ["ECONOMY", "MOPIC"],
  // public finance
  "gc.dod.totl.gd.zs": ["FISCAL", "MOF"], "gc.rev.xgrt.gd.zs": ["FISCAL", "MOF"], "gc.tax.totl.gd.zs": ["FISCAL", "MOF"], "gc.xpn.totl.gd.zs": ["FISCAL", "MOF"],
  "gc.nld.totl.gd.zs": ["FISCAL", "MOF"], "dt.dod.dect.cd": ["FISCAL", "MOF"], "dt.dod.dect.gn.zs": ["FISCAL", "MOF"],
  // labour
  "sl.uem.totl.zs": ["LABOUR", "DOS"], "sl.uem.totl.fe.zs": ["LABOUR", "DOS"], "sl.uem.totl.ma.zs": ["LABOUR", "DOS"], "sl.uem.1524.fe.zs": ["LABOUR", "DOS"],
  "sl.uem.1524.ma.zs": ["LABOUR", "DOS"], "sl.tlf.cact.fe.zs": ["LABOUR", "DOS"], "sl.tlf.cact.ma.zs": ["LABOUR", "DOS"], "sl.tlf.totl.in": ["LABOUR", "DOS"],
  "sl.emp.totl.sp.zs": ["LABOUR", "DOS"],
  // population
  "sp.pop.totl": ["POPULATION", "DOS"], "sp.pop.grow": ["POPULATION", "DOS"], "sp.urb.totl.in.zs": ["POPULATION", "DOS"], "sp.dyn.tfrt.in": ["POPULATION", "DOS"],
  "sp.dyn.le00.in": ["POPULATION", "DOS"], "sp.dyn.cbrt.in": ["POPULATION", "CSPD"], "sp.dyn.cdrt.in": ["POPULATION", "CSPD"], "sp.pop.0014.to.zs": ["POPULATION", "DOS"],
  "sp.pop.1564.to.zs": ["POPULATION", "DOS"], "sp.pop.65up.to.zs": ["POPULATION", "DOS"], "sp.pop.dpnd": ["POPULATION", "HPC"], "sm.pop.refg": ["POPULATION", "MOI"],
  "sm.pop.netm": ["POPULATION", "MOI"], "en.pop.dnst": ["POPULATION", "DOS"],
  // social
  "si.pov.gini": ["SOCIAL", "DOS"], "si.pov.nahc": ["SOCIAL", "DOS"], "se.pre.enrr": ["SOCIAL", "MOE"], "se.prm.enrr": ["SOCIAL", "MOE"], "se.sec.enrr": ["SOCIAL", "MOE"],
  "se.ter.enrr": ["SOCIAL", "MOHE"], "se.xpd.totl.gd.zs": ["SOCIAL", "MOE"], "se.adt.litr.zs": ["SOCIAL", "DOS"], "sh.med.beds.zs": ["SOCIAL", "MOH"],
  "sh.dyn.mort": ["SOCIAL", "MOH"], "sh.sta.mmrt": ["SOCIAL", "MOH"], "sh.sta.stnt.zs": ["SOCIAL", "MOH"], "sh.sta.diab.zs": ["SOCIAL", "MOH"], "sp.dyn.imrt.in": ["SOCIAL", "MOH"],
  "sg.gen.parl.zs": ["SOCIAL", "IEC"],
  // infrastructure & environment
  "eg.use.elec.kh.pc": ["INFRA", "MEMR"], "eg.elc.accs.zs": ["INFRA", "MEMR"], "eg.elc.rnew.zs": ["INFRA", "MEMR"], "eg.fec.rnew.zs": ["INFRA", "MEMR"],
  "eg.imp.cons.zs": ["INFRA", "MEMR"], "er.h2o.intr.pc": ["INFRA", "MWI"], "er.h2o.fwtl.zs": ["INFRA", "MWI"], "en.atm.pm25.mc.m3": ["INFRA", "MOENV"],
  "en.atm.co2e.pc": ["INFRA", "MOENV"], "en.atm.ghgt.kt.ce": ["INFRA", "MOENV"], "it.net.bbnd.p2": ["INFRA", "TRC"], "it.cel.sets.p2": ["INFRA", "TRC"], "lp.lpi.ovrl.xq": ["INFRA", "MOT"],
};

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const split = (l) => { const out = []; let cur = "", q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; } out.push(cur); return out; };
  const head = split(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v])));
}

const out = { fetchedAt: new Date().toISOString(), source: "World Bank World Development Indicators — mirror github.com/datasets/world-development-indicators (ODC-PDDL-1.0)", indicators: [] };
let failed = 0;
for (const [code, [pillar, owner]] of Object.entries(CODES)) {
  try {
    const [csv, meta] = await Promise.all([fetch(`${BASE}/${code}/data.csv`).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); }), fetch(`${BASE}/${code}/datapackage.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}))]);
    const rows = parseCsv(csv).filter((r) => r["Country Code"] === "JOR" && +r.Year >= 2000 && r.Value !== "").map((r) => [+r.Year, +(+r.Value).toPrecision(6)]).sort((a, b) => a[0] - b[0]);
    if (!rows.length) { console.log(`skip ${code}: no Jordan data`); continue; }
    out.indicators.push({ code, pillar, owner, title: meta.title ?? code, description: (meta.description ?? "").slice(0, 400), series: rows, sha: createHash("sha256").update(csv).digest("hex").slice(0, 12) });
    console.log(`${code.padEnd(20)} ${rows.length} yrs, latest ${rows.at(-1)[0]}: ${rows.at(-1)[1]}  ${meta.title ?? ""}`);
  } catch (e) { failed++; console.log(`FAIL ${code}: ${e.message}`); }
}
writeFileSync(new URL("../src/data/national.generated.ts", import.meta.url), `// Generated by scripts/fetch-national-data.mjs — do not edit by hand.\nimport type { NationalData } from "./national";\n\nexport const NATIONAL_DATA: NationalData = ${JSON.stringify(out)};\n`);
console.log(`\n${out.indicators.length} indicators written, ${failed} failed`);
