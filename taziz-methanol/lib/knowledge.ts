// Engineering Knowledge Agent — deterministic retrieval over the SYNTHETIC document library.
// Replace searchDocs() with a vector / hybrid search over the real document management system.
import docsJson from "@/data/documents.json";

export interface DocSection {
  id: string;
  heading: string;
  text: string;
}
export interface EngDoc {
  id: string;
  number: string;
  title: string;
  type: string;
  rev: string;
  date: string;
  equipment: string[];
  tags: string[];
  sections: DocSection[];
}
export const DOCS = docsJson.documents as EngDoc[];
export const DOC = Object.fromEntries(DOCS.map((d) => [d.id, d])) as Record<string, EngDoc>;

export interface Citation {
  docId: string;
  sectionId: string;
  label: string;
}

export interface KnowledgeAnswer {
  answer: string;
  citations: Citation[];
  equipment: string[];
  nextChecks: string[];
}

const STOP = new Set("the a an and or of to in on for is are be what why when how should i we do does with before after which there that this it at as by from my our relate related".split(" "));
const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));

export function searchDocs(q: string, limit = 4) {
  const qt = tokens(q);
  const hits: { doc: EngDoc; section: DocSection; score: number }[] = [];
  for (const doc of DOCS) {
    const docText = `${doc.title} ${doc.tags.join(" ")} ${doc.equipment.join(" ")}`.toLowerCase();
    for (const section of doc.sections) {
      const text = `${section.heading} ${section.text}`.toLowerCase();
      let score = 0;
      for (const t of qt) {
        if (text.includes(t)) score += 2;
        if (docText.includes(t)) score += 1;
      }
      if (score > 0) hits.push({ doc, section, score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

const cite = (docId: string, sectionId: string): Citation => {
  const d = DOC[docId];
  const s = d.sections.find((x) => x.id === sectionId)!;
  return { docId, sectionId, label: `${d.title} §${s.id} – ${s.heading}` };
};

const CURATED: { match: RegExp; build: () => KnowledgeAnswer }[] = [
  {
    match: /synthesis.*pressure.*(drop|fall|low)|why.*loop pressure/i,
    build: () => ({
      answer:
        "Synthesis loop pressure falls when the loop loses gas faster than make-up arrives, or when the recycle compressor can no longer circulate the design flow. The reactor manual lists four mechanisms: reduced make-up gas, increased purge, reduced recycle compressor capacity, and increased conversion. When loop pressure and recycle flow fall together while make-up gas stays stable, the documentation points to recycle compressor (C-201) capacity loss or increased loop restriction. That is the pattern seen in the current simulated data.",
      citations: [cite("RX-MAN", "4.3"), cite("PID-210", "3"), cite("SOP-210", "3.4")],
      equipment: ["C-201", "R-201", "E-205", "V-210", "S-201"],
      nextChecks: ["Compare make-up gas flow (COMP-FI-101) with the trend before the drop", "Check purge controller PIC-212 output", "Field-read strainer ΔP PDI-201", "Check V-210 level and demister ΔP"],
    }),
  },
  {
    match: /vibration.*(increase|rise|high|check)|recycle compressor vibration/i,
    build: () => ({
      answer:
        "Confirm the reading on adjacent probes first, then check lube oil supply temperature and pressure. Request a spectrum review from the machinery engineer. Per the OEM manual, a 1× running-speed component suggests imbalance or fouling, and sub-synchronous components suggest seal or bearing instability. The alert limit is 7.1 mm/s. The trip at 11.0 mm/s is handled by the machinery protection system and must never be bypassed. The maintenance strategy requires an engineering review within 7 days when vibration rises more than 15%.",
      citations: [cite("C201-OEM", "7.2"), cite("ARM", "C201-07"), cite("MSTRAT", "4.1")],
      equipment: ["C-201"],
      nextChecks: ["Verify on redundant probes", "Lube oil temperature, pressure and filter ΔP", "Spectrum analysis (1× vs sub-synchronous)", "Urgent oil sample if bearing temperature also rising"],
    }),
  },
  {
    match: /prerequisite|before inspect|inspect(ing)? c-?201|isolation/i,
    build: () => ({
      answer:
        "Before any intrusive inspection of C-201, the OEM manual and shutdown procedure require all of the following: the machine shut down and isolated under a permit to work; positive isolation of suction and discharge (spades per the isolation register); depressurisation and a nitrogen purge to below 1% combustibles (H₂/CO); a gas test certificate; lock-out/tag-out on the driver; and an MOC if any operating limit is temporarily changed. The AI can prepare the checklist, but it cannot issue permits or isolate equipment.",
      citations: [cite("C201-OEM", "9.1"), cite("SHUTDOWN", "5"), cite("SOP-210", "5.1")],
      equipment: ["C-201", "S-201"],
      nextChecks: ["Confirm spares on site (bearing set, DGS cartridge)", "Draft isolation plan for planner review", "Check MOC requirement for temporary rate reduction"],
    }),
  },
  {
    match: /documents?.*synthesis|synthesis loop.*documents?|relate to the synthesis/i,
    build: () => ({
      answer:
        "Seven documents in the library relate to the synthesis loop: the loop P&ID (DEMO-MEOH-PID-0210), the Synthesis Loop SOP, the Methanol Reactor Operating Manual, the C-201 OEM manual, the Alarm Response Manual (C-201 sections), the MOC register (anti-surge retune MOC-26-031, purge range change MOC-26-044), and incident IR-2024-017 (suction strainer blockage).",
      citations: [cite("PID-210", "1"), cite("SOP-210", "3.2"), cite("RX-MAN", "2.1"), cite("C201-OEM", "6.4"), cite("MOC", "MOC-26-031"), cite("IR", "IR-2024-017")],
      equipment: ["C-201", "R-201", "E-205", "V-210"],
      nextChecks: ["Open the P&ID to confirm the restriction points", "Review MOC-26-031 for anti-surge settings"],
    }),
  },
];

export function answerKnowledge(q: string): KnowledgeAnswer {
  const curated = CURATED.find((c) => c.match.test(q));
  if (curated) return curated.build();
  const hits = searchDocs(q, 3);
  if (!hits.length)
    return {
      answer: "I could not find a confident answer in the approved document library. Try naming the equipment (e.g. C-201, T-301), the system, or the document type.",
      citations: [],
      equipment: [],
      nextChecks: ["Rephrase with equipment tag", "Ask an engineer to add missing documents to the approved library"],
    };
  const top = hits[0];
  return {
    answer: `Most relevant guidance: ${top.section.text}${hits[1] ? ` See also ${hits[1].doc.title}: ${hits[1].section.heading.toLowerCase()}.` : ""}`,
    citations: hits.map((h) => ({ docId: h.doc.id, sectionId: h.section.id, label: `${h.doc.title} §${h.section.id} – ${h.section.heading}` })),
    equipment: [...new Set(hits.flatMap((h) => h.doc.equipment))].slice(0, 5),
    nextChecks: ["Verify against the latest controlled revision", "Confirm applicability with the area engineer"],
  };
}
