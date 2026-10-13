// "Ask Methanol AI" — answers are composed from the CURRENT simulated application state.
import type { ChatMessage, Investigation, PlantAlert, ScenarioId, TagLive } from "./types";
import { fmtTag } from "./sim/plant";
import { answerKnowledge } from "./knowledge";
import { scenarioById } from "./scenarios";
import equipmentJson from "@/data/equipment.json";
import { DEMO, fmtAedM, aedM } from "@/config/demo";

interface StateView {
  tags: Record<string, TagLive>;
  alerts: PlantAlert[];
  investigations: Investigation[];
  scenarioId: ScenarioId;
  qualitySim: "normal" | "running" | "deviation";
  runs: Record<string, { elapsed: number }>;
}

type Reply = Omit<ChatMessage, "id">;

const t = (s: StateView, id: string) => fmtTag(id, s.tags[id].value);

function heroStatus(s: StateView) {
  const hero = s.investigations.find((i) => i.scenarioId === "A")!;
  const run = s.runs[hero.id];
  const done = run && run.elapsed >= hero.totalMs;
  return { hero, done };
}

export function answerQuestion(q: string, s: StateView): Reply {
  const lower = q.toLowerCase();
  const prod = s.tags.PRODUCTION.value;
  const gap = DEMO.productionTarget - prod;
  const pct = (gap / DEMO.productionTarget) * 100;
  const { hero, done } = heroStatus(s);
  const scenario = scenarioById(s.scenarioId);
  const open = s.investigations.filter((i) => ["queued", "running", "awaiting-approval"].includes(i.status));

  if (/below.*target|production target|why are we below|production (gap|loss)/.test(lower)) {
    return {
      role: "assistant",
      text: `Production is ${Math.round(prod).toLocaleString()} t/day against a ${DEMO.productionTarget.toLocaleString()} t/day target (${pct.toFixed(1)}% below). ${
        done
          ? `The Agent Council has concluded "${hero.conclusion.likelyCause}" with ${hero.conclusion.confidence}% confidence.`
          : "Leading indicators point to the synthesis loop. The Agent Council has not yet been convened for INV-26-0412."
      }`,
      sections: [
        { title: "Evidence", items: [`Recycle flow ${t(s, "SYN-F-210")} (model 4,077 Nm³/h)`, `C-201 load ${t(s, "COMP-C-201")} (historically 97%)`, `C-201 suction ${t(s, "COMP-PI-201S")} (band 75.5–77.5)`, `Energy intensity ${t(s, "EN-INT")}`] },
        { title: "Impact (illustrative)", items: ["~102 t/day current loss", "80–90 t/day potentially recoverable", `≈ ${fmtAedM(aedM(102))}/day exposure`] },
        { title: "Next step", items: [done ? "Investigation plan is awaiting human approval" : "Run the live agent investigation in Council of Agents"] },
      ],
      sources: ["Historian (replica)", "MES production plan", "INV-26-0412"],
    };
  }

  if (/threat|risk to production|threatening/.test(lower)) {
    return {
      role: "assistant",
      text: `${s.alerts.length} active AI alerts and ${open.length} open investigations. The largest current threat is ${s.scenarioId === "A" ? "the synthesis-loop compressor C-201 throughput loss" : scenario.headline.toLowerCase()}.`,
      sections: [
        { title: "Active alerts", items: s.alerts.slice(0, 5).map((a) => `${a.time} · ${a.title}`) },
        { title: "Open investigations", items: open.map((i) => `${i.code} · ${i.title} (${i.status.replace("-", " ")})`) },
      ],
      sources: ["Alert register", "Investigation register"],
    };
  }

  if (/highest risk|which asset|riskiest|asset.*risk/.test(lower)) {
    const eq = equipmentJson.equipment.slice().sort((a, b) => a.health - b.health);
    const c201Health = s.scenarioId === "B" ? 62 : eq[0].health;
    return {
      role: "assistant",
      text: `C-201 (Synthesis Loop Compressor) carries the highest risk: health ${c201Health}/100, risk ${s.scenarioId === "B" ? "High" : "Elevated"}. ${eq[0].prediction}.`,
      sections: [
        { title: "Signals", items: [`Vibration ${t(s, "COMP-VIB-201")} (alert 7.1)`, `Bearing temperature ${t(s, "COMP-TI-201B")}`, `Polytropic efficiency ${t(s, "COMP-EFF-201")}`] },
        { title: "Next highest", items: eq.slice(1, 4).map((e) => `${e.id} ${e.name} — ${e.health}/100 (${e.risk})`) },
      ],
      sources: ["Condition monitoring", "EAM / CMMS"],
    };
  }

  if (/last six hours|what changed|six hours|last 6/.test(lower)) {
    return {
      role: "assistant",
      text: "Over the last six hours, the synthesis loop moved off its normal pattern and pulled production down about 4%.",
      sections: [{ title: "Timeline", items: hero.timeline.map((e) => `${e.time} · ${e.title}`).concat(done ? ["Agent Council identified likely compressor-related issue"] : []) }],
      sources: ["Historian (replica)", "Alarm journal", "INV-26-0412"],
    };
  }

  if (/energy intensity|energy.*increas|why.*energy/.test(lower)) {
    return {
      role: "assistant",
      text: `Energy intensity is ${t(s, "EN-INT")} against a 27.55 GJ/t model, an increase of +${((s.tags["EN-INT"].value / 27.55 - 1) * 100).toFixed(1)}%. Two drivers explain most of the gap.`,
      sections: [
        { title: "Drivers", items: [`C-201 efficiency ${t(s, "COMP-EFF-201")}: more compressor energy per tonne (INV-26-0412)`, `Reformer excess O₂ ${t(s, "REF-AI-205")} vs 1.8% target: higher stack losses (INV-26-0411)`] },
        { title: "Opportunity", items: ["Optimised potential ≈ 27.6 GJ/t (−2.8%)", "Burner air balance, steam let-down, compressor recovery, E-205 heat recovery"] },
      ],
      sources: ["Energy model", "Utilities historian"],
    };
  }

  if (/off-?spec|purity|quality/.test(lower)) {
    const dev = s.qualitySim === "deviation" || s.scenarioId === "C";
    return {
      role: "assistant",
      text: dev
        ? `Yes, the risk is elevated. Purity is ${t(s, "MEOH-PURITY")} and water is ${t(s, "MEOH-H2O")}. The Quality Agent estimates a 68% off-spec risk within ~90 minutes (demo spec limit ${DEMO.purityLimit} wt%).`
        : `Not currently. Purity is ${t(s, "MEOH-PURITY")}, the 60-minute prediction is 99.78 wt%, and the off-spec risk is 12% (demo spec limit ${DEMO.purityLimit} wt%).`,
      sections: [
        { title: "Indicators", items: [`Water ${t(s, "MEOH-H2O")}`, `Ethanol ${t(s, "MEOH-ETOH")}`, `Reflux ratio ${t(s, "DIS-RR-301")}`, `Reboiler duty ${t(s, "DIS-QR-301")}`] },
        { title: dev ? "Recommended checks" : "Monitoring", items: dev ? ["Urgent grab sample", "Operator review of reflux control", "Prepare rundown diversion option"] : ["Next LIMS sample 10:30", "Distillation stable"] },
      ],
      sources: ["LIMS", "Online analysers", "Quality model"],
    };
  }

  if (/brief|summary|status/.test(lower)) {
    return {
      role: "assistant",
      text: `Plant brief (${scenario.id === "A" ? "core scenario" : `scenario ${scenario.id}: ${scenario.name}`}): production ${Math.round(prod).toLocaleString()} t/day (${pct.toFixed(1)}% below target), purity ${t(s, "MEOH-PURITY")}, energy intensity ${t(s, "EN-INT")}.`,
      sections: [
        { title: "Primary contributor", items: [s.scenarioId === "A" ? "Synthesis loop compressor throughput deterioration" : scenario.headline] },
        { title: "Secondary", items: ["Higher-than-normal reformer energy consumption"] },
        { title: "Governance", items: [`${open.length} investigations open`, "All AI outputs are advisory. Human approval is required."] },
      ],
      sources: ["Plant state (simulated)", "Investigation register"],
    };
  }

  if (/c-?201/.test(lower)) {
    return {
      role: "assistant",
      text: "C-201 needs attention on two counts. It is losing throughput (load and efficiency are down) and its vibration and bearing temperature are trending up, still below alert limits in the core scenario.",
      sections: [
        { title: "Condition", items: [`Load ${t(s, "COMP-C-201")}`, `Efficiency ${t(s, "COMP-EFF-201")}`, `Vibration ${t(s, "COMP-VIB-201")}`, `Bearing ${t(s, "COMP-TI-201B")}`] },
        { title: "Suggested", items: ["Validate suction conditions and strainer ΔP", "Compare with OEM performance curve", "Engineering review within 7 days (maintenance strategy §4.1)"] },
      ],
      sources: ["Condition monitoring", "C-201 OEM manual", "Maintenance strategy"],
    };
  }

  const k = answerKnowledge(q);
  return {
    role: "assistant",
    text: k.answer,
    sections: k.nextChecks.length ? [{ title: "Suggested next checks", items: k.nextChecks }] : undefined,
    sources: k.citations.map((c) => c.label),
  };
}
