/**
 * Questionnaire model, skip logic and validation (Zod + census edit rules).
 */
import { z } from "zod";
import type {
  Attainment, Cooling, DwellingType, EducationStatus, EmploymentStatus, GovId, Heating, Household, MaritalStatus, MoveReason, Nationality,
  Occupation, Person, PrevCountry, Relationship, Sanitation, Sector, Sex, Tenure, WaterSource, WGDomain, WGLevel,
} from "@/types/census";
import { validateHousehold, type RuleHit } from "@/simulation/quality";

export const WG_KEYS: WGDomain[] = ["seeing", "hearing", "walking", "cognition", "selfcare", "communication"];

export interface QPerson {
  key: string;
  name: string;
  relation: Relationship | "";
  sex: Sex | "";
  dob: string;
  age: string;
  marital: MaritalStatus | "";
  nationality: Nationality | "";
  moved: "yes" | "no" | "";
  prevType: "GOV" | "ABROAD" | "";
  prevGov: GovId | "";
  prevCountry: PrevCountry | "";
  yearsSince: string;
  reason: MoveReason | "";
  eduStatus: EducationStatus | "";
  attainment: Attainment | "";
  employment: EmploymentStatus | "";
  occupation: Occupation | "";
  sector: Sector | "";
  insurance: "yes" | "no" | "";
  wg: Record<WGDomain, "" | "1" | "2" | "3" | "4">;
  motherLine: string;
  fatherLine: string;
}

export interface QForm {
  govId: GovId | "";
  districtId: string;
  eaId: string;
  dwellingNo: string;
  occupancy: "OCCUPIED" | "VACANT" | "UNDER_CONSTRUCTION" | "NON_RESIDENTIAL" | "";
  type: DwellingType | "";
  tenure: Tenure | "";
  rooms: string;
  water: WaterSource | "";
  electricity: "yes" | "no" | "";
  sanitation: Sanitation | "";
  internet: "yes" | "no" | "";
  heating: Heating | "";
  cooling: Cooling | "";
  vehicles: string;
  usualResidents: string;
  persons: QPerson[];
  startedAt: number;
}

let keySeq = 0;
export function newPerson(): QPerson {
  keySeq += 1;
  return {
    key: `p${Date.now().toString(36)}${keySeq}`, name: "", relation: "", sex: "", dob: "", age: "", marital: "", nationality: "", moved: "", prevType: "", prevGov: "", prevCountry: "", yearsSince: "", reason: "",
    eduStatus: "", attainment: "", employment: "", occupation: "", sector: "", insurance: "", wg: { seeing: "", hearing: "", walking: "", cognition: "", selfcare: "", communication: "" }, motherLine: "", fatherLine: "",
  };
}

export function emptyForm(): QForm {
  return { govId: "", districtId: "", eaId: "", dwellingNo: "", occupancy: "", type: "", tenure: "", rooms: "", water: "", electricity: "", sanitation: "", internet: "", heating: "", cooling: "", vehicles: "", usualResidents: "", persons: [], startedAt: Date.now() };
}

/** Age from date of birth at the census reference date, else the typed age. */
export function personAge(p: QPerson, referenceDate: string): number | null {
  if (p.dob) {
    const d = new Date(`${p.dob}T00:00:00`);
    const r = new Date(`${referenceDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    let a = r.getFullYear() - d.getFullYear();
    if (r.getMonth() < d.getMonth() || (r.getMonth() === d.getMonth() && r.getDate() < d.getDate())) a--;
    return a;
  }
  if (p.age === "") return null;
  const n = Number(p.age);
  return Number.isFinite(n) ? n : null;
}

/** Skip logic: which person questions apply. */
export function applies(p: QPerson, age: number | null) {
  const a = age ?? -1;
  return {
    marital: a >= 12,
    migration: a >= 0,
    prevDetails: p.moved === "yes",
    prevGov: p.moved === "yes" && p.prevType === "GOV",
    prevCountry: p.moved === "yes" && p.prevType === "ABROAD",
    education: a >= 5,
    attainment: a >= 6 && (p.eduStatus === "CURRENTLY_ENROLLED" || p.eduStatus === "LEFT_SCHOOL"),
    employment: a >= 15,
    occupation: a >= 15 && p.employment === "EMPLOYED",
    wg: a >= 5,
  };
}

const req = (msg: string) => z.string().min(1, msg);

const identSchema = z.object({
  govId: req("governorate"),
  districtId: req("district"),
  eaId: req("ea"),
  dwellingNo: z.string().regex(/^\d{1,4}$/, "dwellingNo"),
  occupancy: req("occupancy"),
});

const dwellingSchema = z.object({
  type: req("type"),
  tenure: req("tenure"),
  rooms: z.coerce.number().int().min(1, "rooms").max(30, "rooms"),
  water: req("water"),
  electricity: req("electricity"),
  sanitation: req("sanitation"),
  internet: req("internet"),
  heating: req("heating"),
  cooling: req("cooling"),
  vehicles: z.coerce.number().int().min(0, "vehicles").max(20, "vehicles"),
  usualResidents: z.coerce.number().int().min(1, "usualResidents").max(40, "usualResidents"),
});

export interface ValidationResult {
  errors: Record<string, string>;
  warnings: RuleHit[];
  critical: RuleHit[];
  required: number;
  filled: number;
  household: Household | null;
}

export function validateForm(f: QForm, referenceDate: string): ValidationResult {
  const errors: Record<string, string> = {};
  let required = 0;
  let filled = 0;
  const count = (ok: boolean) => {
    required++;
    if (ok) filled++;
  };
  const collect = (schema: z.ZodObject, data: unknown, prefix = "") => {
    const r = schema.safeParse(data);
    const keys = Object.keys(schema.shape);
    const bad = new Set<string>();
    if (!r.success) for (const i of r.error.issues) { const k = String(i.path[0]); bad.add(k); errors[prefix + k] = "required"; }
    for (const k of keys) count(!bad.has(k));
  };
  collect(identSchema, f);
  const occupied = f.occupancy === "OCCUPIED";
  if (f.occupancy && f.occupancy !== "VACANT" && f.occupancy !== "NON_RESIDENTIAL" && f.occupancy !== "UNDER_CONSTRUCTION") collect(dwellingSchema, f);

  if (occupied) {
    if (f.persons.length === 0) errors.persons = "roster";
    if (f.usualResidents !== "" && Number(f.usualResidents) !== f.persons.length) errors.usualResidents = "mismatch";
    const heads = f.persons.filter((p) => p.relation === "HEAD").length;
    if (f.persons.length && heads !== 1) errors.head = heads === 0 ? "noHead" : "manyHeads";
    if (f.persons.filter((p) => p.relation === "SPOUSE").length > 1) errors.spouse = "manySpouses";
    f.persons.forEach((p, idx) => {
      const pre = `p${idx}.`;
      const age = personAge(p, referenceDate);
      const ap = applies(p, age);
      const need = (k: string, ok: boolean) => { count(ok); if (!ok) errors[pre + k] = "required"; };
      need("name", p.name.trim().length > 0);
      need("relation", !!p.relation);
      need("sex", !!p.sex);
      const ageOk = age !== null && Number.isInteger(age) && age >= 0 && age <= 120;
      need("age", ageOk);
      need("nationality", !!p.nationality);
      need("insurance", !!p.insurance);
      if (ap.marital) need("marital", !!p.marital);
      need("moved", !!p.moved);
      if (ap.prevDetails) {
        need("prevType", !!p.prevType);
        if (ap.prevGov) need("prevGov", !!p.prevGov);
        if (ap.prevCountry) need("prevCountry", !!p.prevCountry);
        const y = Number(p.yearsSince);
        need("yearsSince", p.yearsSince !== "" && Number.isInteger(y) && y >= 0 && (age === null || y <= age));
        need("reason", !!p.reason);
      }
      if (ap.education) need("eduStatus", !!p.eduStatus);
      if (ap.attainment) need("attainment", !!p.attainment);
      if (ap.employment) need("employment", !!p.employment);
      if (ap.occupation) { need("occupation", !!p.occupation); need("sector", !!p.sector); }
      if (ap.wg) for (const d of WG_KEYS) need(`wg.${d}`, !!p.wg[d]);
      if (p.motherLine && (Number(p.motherLine) < 1 || Number(p.motherLine) > f.persons.length || Number(p.motherLine) === idx + 1)) errors[pre + "motherLine"] = "line";
      if (p.fatherLine && (Number(p.fatherLine) < 1 || Number(p.fatherLine) > f.persons.length || Number(p.fatherLine) === idx + 1)) errors[pre + "fatherLine"] = "line";
    });
  }

  // census edit rules on the assembled household
  let household: Household | null = null;
  let hits: RuleHit[] = [];
  if (occupied && f.persons.length && f.govId && f.eaId) {
    household = toHousehold(f, referenceDate);
    hits = validateHousehold(household).filter((h) => h.ruleId !== "R09");
  }
  return { errors, warnings: hits.filter((h) => h.severity !== "CRITICAL"), critical: hits.filter((h) => h.severity === "CRITICAL"), required, filled, household };
}

export function toHousehold(f: QForm, referenceDate: string): Household {
  const refYear = Number(referenceDate.slice(0, 4));
  const id = `Q-${f.eaId}-${f.dwellingNo.padStart(3, "0")}`;
  const members: Person[] = f.persons.map((p, i) => {
    const age = personAge(p, referenceDate) ?? 0;
    const ap = applies(p, age);
    return {
      id: `${id}-P${String(i + 1).padStart(2, "0")}`,
      hhId: id,
      line: i + 1,
      relation: (p.relation || "OTHER_RELATIVE") as Relationship,
      sex: (p.sex || "M") as Sex,
      age,
      birthYear: p.dob ? Number(p.dob.slice(0, 4)) : refYear - age,
      marital: ap.marital ? ((p.marital || "NEVER_MARRIED") as MaritalStatus) : "NEVER_MARRIED",
      nationality: (p.nationality || "JORDANIAN") as Nationality,
      eduStatus: ap.education ? ((p.eduStatus || "NEVER_ATTENDED") as EducationStatus) : "NOT_APPLICABLE",
      attainment: ap.attainment ? ((p.attainment || "NONE") as Attainment) : "NONE",
      employment: ap.employment ? ((p.employment || "OTHER_INACTIVE") as EmploymentStatus) : "NOT_APPLICABLE",
      occupation: ap.occupation && p.occupation ? (p.occupation as Occupation) : undefined,
      sector: ap.occupation && p.sector ? (p.sector as Sector) : undefined,
      healthInsurance: p.insurance === "yes",
      wg: Object.fromEntries(WG_KEYS.map((d) => [d, (ap.wg ? Number(p.wg[d] || 1) : 1) as WGLevel])) as Record<WGDomain, WGLevel>,
      prevGov: ap.prevGov && p.prevGov ? (p.prevGov as GovId) : null,
      prevCountry: ap.prevCountry && p.prevCountry ? (p.prevCountry as PrevCountry) : null,
      yearsSinceMove: ap.prevDetails && p.yearsSince !== "" ? Number(p.yearsSince) : null,
      moveReason: ap.prevDetails && p.reason ? (p.reason as MoveReason) : null,
      motherLine: p.motherLine ? Number(p.motherLine) : undefined,
      fatherLine: p.fatherLine ? Number(p.fatherLine) : undefined,
    };
  });
  return {
    id,
    eaId: f.eaId,
    govId: f.govId as GovId,
    districtId: f.districtId,
    urban: true,
    type: members.length === 1 ? "SINGLE" : "NUCLEAR",
    dwelling: {
      id: `${id}-D`,
      type: (f.type || "OTHER") as DwellingType,
      occupancy: (f.occupancy || "OCCUPIED") as Household["dwelling"]["occupancy"],
      tenure: (f.tenure || "OTHER") as Tenure,
      rooms: Number(f.rooms) || 1,
      water: (f.water || "OTHER") as WaterSource,
      electricity: f.electricity === "yes",
      sanitation: (f.sanitation || "NONE") as Sanitation,
      internet: f.internet === "yes",
      heating: (f.heating || "NONE") as Heating,
      cooling: (f.cooling || "NONE") as Cooling,
      vehicles: Number(f.vehicles) || 0,
    },
    members,
    weight: 0,
    enumeratorId: "",
    interviewMinutes: Math.max(1, Math.round((Date.now() - f.startedAt) / 6000) / 10),
    order: 0,
    enumeratedDay: null,
    source: "QUESTIONNAIRE",
  };
}
