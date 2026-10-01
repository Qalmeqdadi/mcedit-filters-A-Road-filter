/**
 * Synthetic household & person generator (SIMULATED).
 *
 * Plausibility rules built in:
 *  - Household type drives composition (single, couple, nuclear, single-parent, extended, composite).
 *  - Spouses close to the head's age; children born to mothers aged 17–45 with realistic spacing.
 *  - Older children leave the household with age-dependent probabilities.
 *  - Education is conditioned on age cohort, sex, urban/rural and nationality.
 *  - Employment is conditioned on age, sex, education and enrolment.
 *  - Functional difficulty (Washington Group short set) prevalence rises with age.
 *  - Urban and rural profiles differ for dwellings, services and household size.
 *
 * None of these distributions are Jordanian statistics; they are illustrative.
 */
import type {
  Attainment, Dwelling, EducationStatus, EmploymentStatus, GovId, GovernorateProfile, Household, HouseholdType,
  MaritalStatus, MoveReason, Nationality, Occupation, Person, PrevCountry, Relationship, Sector, Sex, WGDomain, WGLevel,
} from "@/types/census";
import { clamp, type Rng } from "./rng";

export interface HouseholdContext {
  rng: Rng;
  hhId: string;
  eaId: string;
  govId: GovId;
  districtId: string;
  urban: boolean;
  profile: GovernorateProfile;
  refYear: number;
  enumeratorId: string;
  /** relative weights of origin governorates for internal migrants into this governorate */
  originWeights: Record<GovId, number>;
  hot: boolean;
}

const WG_DOMAINS: WGDomain[] = ["seeing", "hearing", "walking", "cognition", "selfcare", "communication"];
const WG_SCALE: Record<WGDomain, number> = { seeing: 1, hearing: 0.65, walking: 1.1, cognition: 0.6, selfcare: 0.35, communication: 0.3 };

function drawNationality(rng: Rng, p: GovernorateProfile): Nationality {
  if (!rng.chance(p.nonJordanianShare)) return "JORDANIAN";
  if (rng.chance(p.syrianShareOfNonJordanian)) return "SYRIAN";
  return rng.table({ EGYPTIAN: 0.45, IRAQI: 0.12, OTHER_ARAB: 0.25, OTHER: 0.18 });
}

function drawType(rng: Rng, nat: Nationality, urban: boolean): HouseholdType {
  if (nat === "EGYPTIAN" || nat === "OTHER")
    return rng.table({ SINGLE: 0.33, COMPOSITE: 0.25, NUCLEAR: 0.3, COUPLE: 0.1, SINGLE_PARENT: 0.02 });
  if (nat === "SYRIAN") return rng.table({ NUCLEAR: 0.6, EXTENDED: 0.2, SINGLE_PARENT: 0.11, COUPLE: 0.05, SINGLE: 0.04 });
  return urban
    ? rng.table({ SINGLE: 0.035, COUPLE: 0.065, NUCLEAR: 0.64, SINGLE_PARENT: 0.07, EXTENDED: 0.17, COMPOSITE: 0.02 })
    : rng.table({ SINGLE: 0.025, COUPLE: 0.06, NUCLEAR: 0.62, SINGLE_PARENT: 0.065, EXTENDED: 0.22, COMPOSITE: 0.01 });
}

interface Draft {
  relation: Relationship;
  sex: Sex;
  age: number;
  marital: MaritalStatus;
  motherIdx?: number;
  fatherIdx?: number;
  movedWithHousehold: boolean;
}

function childrenOf(rng: Rng, motherAge: number, lambda: number, minKids: number): number[] {
  const want = Math.max(minKids, rng.poisson(lambda));
  const ages: number[] = [];
  let birthAge = clamp(rng.normal(22.8, 3.4), 17, 36);
  for (let k = 0; k < want; k++) {
    if (birthAge > 45) break;
    const childAge = Math.round(motherAge - birthAge);
    if (childAge < 0) break;
    ages.push(childAge);
    birthAge += rng.range(1.3, 3.6);
  }
  return ages;
}

function staysHome(rng: Rng, age: number, sex: Sex): boolean {
  if (age < 18) return true;
  if (age < 25) return rng.chance(sex === "M" ? 0.96 : 0.88);
  if (age < 31) return rng.chance(sex === "M" ? 0.7 : 0.5);
  if (age < 40) return rng.chance(0.12);
  return false;
}

function composeHousehold(rng: Rng, type: HouseholdType, nat: Nationality, urban: boolean): Draft[] {
  const m: Draft[] = [];
  const kidLambda = (nat === "SYRIAN" ? 4.5 : urban ? 3.7 : 4.3) - (nat === "EGYPTIAN" || nat === "OTHER" ? 1.2 : 0);
  const addKids = (motherIdx: number | undefined, fatherIdx: number | undefined, motherAge: number, min: number) => {
    for (const age of childrenOf(rng, motherAge, kidLambda, min)) {
      const sex: Sex = rng.chance(0.512) ? "M" : "F";
      if (!staysHome(rng, age, sex)) continue;
      m.push({ relation: "CHILD", sex, age, marital: "NEVER_MARRIED", motherIdx, fatherIdx, movedWithHousehold: true });
    }
  };

  switch (type) {
    case "SINGLE": {
      const age = nat === "EGYPTIAN" || nat === "OTHER" ? Math.round(rng.range(21, 46)) : rng.chance(0.55) ? Math.round(rng.range(60, 88)) : Math.round(rng.range(22, 45));
      const sex: Sex = nat === "EGYPTIAN" ? "M" : age > 60 ? (rng.chance(0.7) ? "F" : "M") : rng.chance(0.7) ? "M" : "F";
      const marital: MaritalStatus = age > 60 ? (rng.chance(0.7) ? "WIDOWED" : "DIVORCED") : nat === "EGYPTIAN" && rng.chance(0.5) ? "MARRIED" : rng.chance(0.82) ? "NEVER_MARRIED" : "DIVORCED";
      m.push({ relation: "HEAD", sex, age, marital, movedWithHousehold: true });
      break;
    }
    case "COUPLE": {
      const young = rng.chance(0.45);
      const ha = young ? Math.round(rng.range(23, 33)) : Math.round(rng.range(55, 82));
      m.push({ relation: "HEAD", sex: "M", age: ha, marital: "MARRIED", movedWithHousehold: true });
      m.push({ relation: "SPOUSE", sex: "F", age: Math.max(18, Math.round(ha - Math.max(0, rng.normal(5, 3.5)))), marital: "MARRIED", movedWithHousehold: true });
      break;
    }
    case "NUCLEAR":
    case "EXTENDED": {
      const ha = Math.round(clamp(rng.normal(type === "EXTENDED" ? 50 : 43, 10), 24, 78));
      m.push({ relation: "HEAD", sex: "M", age: ha, marital: "MARRIED", movedWithHousehold: true });
      const wa = Math.max(18, Math.round(ha - Math.max(0, rng.normal(5.5, 4))));
      m.push({ relation: "SPOUSE", sex: "F", age: wa, marital: "MARRIED", movedWithHousehold: true });
      addKids(1, 0, wa, 1);
      if (type === "EXTENDED") {
        const opt = rng.table({ PARENT: ha < 60 ? 0.6 : 0.1, GRANDKIDS: ha > 47 ? 0.45 : 0.05, SIBLING: 0.2 });
        if (opt === "PARENT") {
          const pa = Math.round(ha + clamp(rng.normal(27, 4), 18, 40));
          m.push({ relation: "PARENT", sex: rng.chance(0.72) ? "F" : "M", age: Math.min(pa, 98), marital: rng.chance(0.75) ? "WIDOWED" : "MARRIED", movedWithHousehold: true });
        } else if (opt === "GRANDKIDS") {
          const sonAge = Math.round(clamp(wa - rng.normal(24, 3), 19, 40));
          if (sonAge >= 20) {
            const sonIdx = m.length;
            m.push({ relation: "CHILD", sex: "M", age: sonAge, marital: "MARRIED", motherIdx: 1, fatherIdx: 0, movedWithHousehold: true });
            const dilIdx = m.length;
            const dilAge = Math.max(18, Math.round(sonAge - Math.max(0, rng.normal(4, 2.5))));
            m.push({ relation: "OTHER_RELATIVE", sex: "F", age: dilAge, marital: "MARRIED", movedWithHousehold: true });
            for (const age of childrenOf(rng, dilAge, 2.2, 1)) {
              m.push({ relation: "GRANDCHILD", sex: rng.chance(0.512) ? "M" : "F", age, marital: "NEVER_MARRIED", motherIdx: dilIdx, fatherIdx: sonIdx, movedWithHousehold: true });
            }
          }
        } else {
          m.push({ relation: "SIBLING", sex: rng.chance(0.6) ? "F" : "M", age: Math.max(16, Math.round(ha + rng.normal(0, 7))), marital: rng.chance(0.7) ? "NEVER_MARRIED" : "DIVORCED", movedWithHousehold: true });
        }
      }
      break;
    }
    case "SINGLE_PARENT": {
      const female = rng.chance(0.82);
      const ha = Math.round(clamp(rng.normal(44, 10), 24, 75));
      m.push({ relation: "HEAD", sex: female ? "F" : "M", age: ha, marital: rng.chance(0.55) ? "WIDOWED" : "DIVORCED", movedWithHousehold: true });
      const motherAge = female ? ha : ha - 5;
      addKids(female ? 0 : undefined, female ? undefined : 0, motherAge, 1);
      break;
    }
    case "COMPOSITE": {
      const ha = Math.round(rng.range(24, 46));
      m.push({ relation: "HEAD", sex: "M", age: ha, marital: rng.chance(0.5) ? "MARRIED" : "NEVER_MARRIED", movedWithHousehold: true });
      const n = rng.int(1, 5);
      for (let i = 0; i < n; i++) m.push({ relation: "NON_RELATIVE", sex: "M", age: Math.round(rng.range(20, 45)), marital: rng.chance(0.45) ? "MARRIED" : "NEVER_MARRIED", movedWithHousehold: true });
      break;
    }
  }
  return m;
}

function drawAttainment(rng: Rng, age: number, sex: Sex, urban: boolean, nat: Nationality): Attainment {
  let t: Record<Attainment, number>;
  if (age < 7) return "NONE";
  if (age <= 15) return "PRIMARY";
  if (age <= 17) return "BASIC";
  if (age <= 24) t = { NONE: 0.02, PRIMARY: 0.08, BASIC: 0.25, SECONDARY: 0.45, DIPLOMA: 0.08, BACHELOR: age >= 22 ? 0.14 : 0.0, POSTGRAD: 0 };
  else if (age <= 34) t = { NONE: 0.02, PRIMARY: 0.08, BASIC: 0.2, SECONDARY: 0.28, DIPLOMA: 0.12, BACHELOR: 0.26, POSTGRAD: 0.04 };
  else if (age <= 49) t = { NONE: 0.04, PRIMARY: 0.12, BASIC: 0.22, SECONDARY: 0.26, DIPLOMA: 0.12, BACHELOR: 0.2, POSTGRAD: 0.04 };
  else if (age <= 64) t = { NONE: 0.1, PRIMARY: 0.2, BASIC: 0.22, SECONDARY: 0.2, DIPLOMA: 0.1, BACHELOR: 0.14, POSTGRAD: 0.04 };
  else t = { NONE: sex === "F" ? 0.38 : 0.22, PRIMARY: 0.28, BASIC: 0.14, SECONDARY: 0.12, DIPLOMA: 0.06, BACHELOR: 0.08, POSTGRAD: 0.02 };
  const down = (!urban ? 0.25 : 0) + (nat === "SYRIAN" ? 0.45 : nat === "EGYPTIAN" ? 0.5 : 0);
  if (down > 0) {
    t = { ...t, NONE: t.NONE * (1 + down * 2), PRIMARY: t.PRIMARY * (1 + down * 1.5), BASIC: t.BASIC * (1 + down), BACHELOR: t.BACHELOR * (1 - down * 0.8), POSTGRAD: t.POSTGRAD * (1 - down * 0.8), DIPLOMA: t.DIPLOMA * (1 - down * 0.5) };
  }
  return rng.table(t);
}

function drawEmployment(rng: Rng, age: number, sex: Sex, att: Attainment, enrolled: boolean, nat: Nationality, composite: boolean): EmploymentStatus {
  if (age < 15) return "NOT_APPLICABLE";
  if (enrolled) return "STUDENT";
  if (composite || nat === "EGYPTIAN") return rng.table({ EMPLOYED: 0.93, UNEMPLOYED: 0.05, OTHER_INACTIVE: 0.02 });
  const higher = att === "BACHELOR" || att === "POSTGRAD";
  if (sex === "M") {
    if (age < 25) return rng.table({ EMPLOYED: 0.44, UNEMPLOYED: 0.2, OTHER_INACTIVE: 0.33, UNABLE: 0.03 });
    if (age < 50) return rng.table({ EMPLOYED: higher ? 0.84 : 0.76, UNEMPLOYED: higher ? 0.09 : 0.12, OTHER_INACTIVE: 0.08, UNABLE: 0.03 });
    if (age < 60) return rng.table({ EMPLOYED: 0.6, UNEMPLOYED: 0.07, RETIRED: 0.25, UNABLE: 0.05, OTHER_INACTIVE: 0.03 });
    return rng.table({ EMPLOYED: 0.2, RETIRED: 0.62, UNABLE: 0.12, OTHER_INACTIVE: 0.06 });
  }
  const syr = nat === "SYRIAN" ? 0.5 : 1;
  if (age < 25) return rng.table({ EMPLOYED: 0.1 * syr, UNEMPLOYED: 0.09, HOMEMAKER: 0.72, OTHER_INACTIVE: 0.09 });
  if (age < 60) return rng.table({ EMPLOYED: (higher ? 0.44 : 0.12) * syr, UNEMPLOYED: higher ? 0.12 : 0.04, HOMEMAKER: higher ? 0.4 : 0.8, UNABLE: 0.02, RETIRED: age > 50 ? 0.06 : 0.01 });
  return rng.table({ EMPLOYED: 0.03, HOMEMAKER: 0.72, RETIRED: 0.17, UNABLE: 0.08 });
}

function drawOccupation(rng: Rng, att: Attainment, sex: Sex, urban: boolean, nat: Nationality): Occupation {
  if (nat === "EGYPTIAN" || nat === "OTHER") return rng.table({ ELEMENTARY: 0.4, CRAFT: 0.22, AGRICULTURE: 0.18, SERVICE_SALES: 0.15, OPERATORS: 0.05 });
  if (att === "BACHELOR" || att === "POSTGRAD")
    return rng.table({ PROFESSIONALS: 0.48, MANAGERS: 0.1, TECHNICIANS: 0.16, CLERICAL: 0.12, SERVICE_SALES: 0.08, ARMED_FORCES: sex === "M" ? 0.06 : 0.0 });
  if (att === "DIPLOMA" || att === "SECONDARY")
    return rng.table({ TECHNICIANS: 0.16, CLERICAL: 0.14, SERVICE_SALES: 0.26, CRAFT: 0.12, OPERATORS: 0.1, ARMED_FORCES: sex === "M" ? 0.14 : 0.01, MANAGERS: 0.04, ELEMENTARY: 0.04 });
  return rng.table({ SERVICE_SALES: 0.24, CRAFT: 0.2, OPERATORS: 0.16, ELEMENTARY: 0.22, AGRICULTURE: urban ? 0.04 : 0.14, ARMED_FORCES: sex === "M" ? 0.08 : 0.0 });
}

function sectorFor(rng: Rng, occ: Occupation, urban: boolean): Sector {
  switch (occ) {
    case "PROFESSIONALS": return rng.table({ EDUCATION: 0.38, HEALTH: 0.22, ICT_FINANCE: 0.18, PUBLIC_ADMIN: 0.12, OTHER_SERVICES: 0.1 });
    case "MANAGERS": return rng.table({ TRADE: 0.3, ICT_FINANCE: 0.2, PUBLIC_ADMIN: 0.2, MANUFACTURING: 0.15, HOSPITALITY: 0.15 });
    case "TECHNICIANS": return rng.table({ HEALTH: 0.2, ICT_FINANCE: 0.2, MANUFACTURING: 0.2, PUBLIC_ADMIN: 0.2, TRANSPORT: 0.2 });
    case "CLERICAL": return rng.table({ PUBLIC_ADMIN: 0.4, ICT_FINANCE: 0.25, TRADE: 0.2, TRANSPORT: 0.15 });
    case "SERVICE_SALES": return rng.table({ TRADE: 0.55, HOSPITALITY: 0.25, OTHER_SERVICES: 0.2 });
    case "AGRICULTURE": return "AGRICULTURE";
    case "CRAFT": return rng.table({ CONSTRUCTION: 0.5, MANUFACTURING: 0.4, OTHER_SERVICES: 0.1 });
    case "OPERATORS": return rng.table({ TRANSPORT: 0.55, MANUFACTURING: 0.35, CONSTRUCTION: 0.1 });
    case "ELEMENTARY": return rng.table({ CONSTRUCTION: 0.35, AGRICULTURE: urban ? 0.1 : 0.35, TRADE: 0.2, OTHER_SERVICES: 0.15 });
    case "ARMED_FORCES": return "PUBLIC_ADMIN";
  }
}

function drawWG(rng: Rng, age: number): Record<WGDomain, WGLevel> {
  const out = {} as Record<WGDomain, WGLevel>;
  let some: number, alot: number, cannot: number;
  if (age < 5) { some = 0; alot = 0; cannot = 0; }
  else if (age < 40) { some = 0.035; alot = 0.006; cannot = 0.0015; }
  else if (age < 60) { some = 0.12; alot = 0.018; cannot = 0.003; }
  else if (age < 75) { some = 0.24; alot = 0.055; cannot = 0.01; }
  else { some = 0.34; alot = 0.13; cannot = 0.035; }
  for (const d of WG_DOMAINS) {
    const s = WG_SCALE[d];
    const r = rng.next();
    out[d] = r < cannot * s ? 4 : r < (cannot + alot) * s ? 3 : r < (cannot + alot + some) * s ? 2 : 1;
  }
  return out;
}

function drawDwelling(rng: Rng, urban: boolean, nat: Nationality, size: number, hot: boolean, edu: number): Dwelling {
  const type = urban
    ? rng.table({ APARTMENT: 0.72, HOUSE: 0.2, VILLA: 0.05, TRADITIONAL: 0.01, TENT_CARAVAN: 0.005, OTHER: 0.015 })
    : rng.table({ APARTMENT: 0.2, HOUSE: 0.66, VILLA: 0.03, TRADITIONAL: 0.06, TENT_CARAVAN: nat === "SYRIAN" ? 0.07 : 0.025, OTHER: 0.02 });
  const tenure = nat === "JORDANIAN"
    ? rng.table({ OWNED: 0.71, RENTED: 0.24, FREE: 0.03, EMPLOYER: 0.01, OTHER: 0.01 })
    : rng.table({ OWNED: 0.1, RENTED: 0.79, EMPLOYER: 0.06, FREE: 0.04, OTHER: 0.01 });
  const baseRooms = type === "VILLA" ? 6 : type === "HOUSE" ? 3.8 : type === "APARTMENT" ? 3.2 : 1.8;
  const rooms = Math.round(clamp(rng.normal(baseRooms + (size - 4.5) * 0.18 + edu * 0.3, 0.9), 1, 10));
  return {
    id: "",
    type,
    occupancy: "OCCUPIED",
    tenure,
    rooms,
    water: urban ? rng.table({ PUBLIC_NETWORK: 0.97, TANKER: 0.02, WELL_SPRING: 0.005, OTHER: 0.005 }) : rng.table({ PUBLIC_NETWORK: 0.88, TANKER: 0.08, WELL_SPRING: 0.03, OTHER: 0.01 }),
    electricity: rng.chance(urban ? 0.998 : 0.99),
    sanitation: urban ? rng.table({ PUBLIC_SEWER: 0.82, CESSPIT: 0.18, NONE: 0.0 }) : rng.table({ PUBLIC_SEWER: 0.25, CESSPIT: 0.73, NONE: 0.02 }),
    internet: rng.chance(clamp((urban ? 0.88 : 0.76) + edu * 0.06 - (type === "TENT_CARAVAN" ? 0.4 : 0), 0.05, 0.99)),
    heating: type === "VILLA" ? rng.table({ CENTRAL: 0.55, GAS: 0.25, ELECTRIC: 0.2 }) : urban
      ? rng.table({ GAS: 0.52, KEROSENE: 0.16, ELECTRIC: 0.2, CENTRAL: 0.06, WOOD: 0.01, NONE: 0.05 })
      : rng.table({ GAS: 0.42, KEROSENE: 0.32, ELECTRIC: 0.1, CENTRAL: 0.02, WOOD: 0.1, NONE: 0.04 }),
    cooling: hot ? rng.table({ AC: 0.72, FANS: 0.22, EVAPORATIVE: 0.04, NONE: 0.02 }) : rng.table({ AC: 0.32 + edu * 0.08, FANS: 0.52, EVAPORATIVE: 0.03, NONE: 0.13 }),
    vehicles: Math.min(4, rng.poisson(nat === "JORDANIAN" ? (urban ? 1.0 : 0.9) + edu * 0.25 : 0.3)),
  };
}

const PREV_COUNTRY_FOR: Partial<Record<Nationality, PrevCountry>> = { SYRIAN: "SYRIA", IRAQI: "IRAQ", EGYPTIAN: "EGYPT", OTHER_ARAB: "OTHER_ARAB", OTHER: "OTHER" };

export function generateHousehold(ctx: HouseholdContext): Household {
  const { rng } = ctx;
  const nat = drawNationality(rng, ctx.profile);
  const type = drawType(rng, nat, ctx.urban);
  const drafts = composeHousehold(rng, type, nat, ctx.urban);

  // household-level migration event
  let prevGov: GovId | null = null;
  let prevCountry: PrevCountry | null = null;
  let years: number | null = null;
  let reason: MoveReason | null = null;
  if (nat !== "JORDANIAN") {
    prevCountry = PREV_COUNTRY_FOR[nat] ?? "OTHER";
    years = nat === "SYRIAN" ? rng.int(8, 14) : nat === "IRAQI" ? rng.int(4, 20) : rng.int(1, 12);
    reason = nat === "SYRIAN" ? (rng.chance(0.86) ? "SECURITY" : "FAMILY") : nat === "IRAQI" ? rng.table({ SECURITY: 0.5, FAMILY: 0.3, WORK: 0.2 }) : rng.table({ WORK: 0.8, FAMILY: 0.15, EDUCATION: 0.05 });
  } else if (rng.chance(0.15)) {
    const govs = Object.keys(ctx.originWeights) as GovId[];
    prevGov = rng.weighted(govs, govs.map((g) => ctx.originWeights[g]));
    years = rng.int(1, 25);
    reason = rng.table({ WORK: 0.34, MARRIAGE: 0.2, FAMILY: 0.18, HOUSING: 0.17, EDUCATION: 0.08, OTHER: 0.03 });
  } else if (rng.chance(0.03)) {
    prevCountry = "GULF";
    years = rng.int(1, 20);
    reason = rng.table({ WORK: 0.6, FAMILY: 0.3, OTHER: 0.1 });
  }

  const eduIndexOf = (a: Attainment) => ["NONE", "PRIMARY", "BASIC", "SECONDARY", "DIPLOMA", "BACHELOR", "POSTGRAD"].indexOf(a);
  const members: Person[] = drafts.map((d, i) => {
    const age = d.age;
    const school = age >= 6 && age <= 17;
    const uniAge = age >= 18 && age <= 24;
    const enrolled = school
      ? rng.chance(nat === "SYRIAN" ? 0.83 : ctx.urban ? 0.965 : 0.945)
      : uniAge && d.marital === "NEVER_MARRIED"
        ? rng.chance(nat === "JORDANIAN" ? (d.sex === "F" ? 0.42 : 0.34) : 0.12)
        : false;
    const attainment = drawAttainment(rng, age, d.sex, ctx.urban, nat);
    const eduStatus: EducationStatus = age < 6 ? "NOT_APPLICABLE" : enrolled ? "CURRENTLY_ENROLLED" : attainment === "NONE" ? "NEVER_ATTENDED" : "LEFT_SCHOOL";
    const employment = drawEmployment(rng, age, d.sex, attainment, enrolled && age >= 15, nat, type === "COMPOSITE");
    const occupation = employment === "EMPLOYED" ? drawOccupation(rng, attainment, d.sex, ctx.urban, nat) : undefined;
    const sector = occupation ? sectorFor(rng, occupation, ctx.urban) : undefined;
    const bornBeforeMove = years !== null && age >= years;
    const p: Person = {
      id: `${ctx.hhId}-P${String(i + 1).padStart(2, "0")}`,
      hhId: ctx.hhId,
      line: i + 1,
      relation: d.relation,
      sex: d.sex,
      age,
      birthYear: ctx.refYear - age,
      marital: d.marital,
      nationality: nat,
      eduStatus,
      attainment,
      employment,
      occupation,
      sector,
      healthInsurance: rng.chance(nat === "JORDANIAN" ? (age >= 60 ? 0.86 : age < 18 ? 0.66 : 0.68) : 0.28),
      wg: drawWG(rng, age),
      prevGov: bornBeforeMove ? prevGov : null,
      prevCountry: bornBeforeMove ? prevCountry : null,
      yearsSinceMove: bornBeforeMove ? years : null,
      moveReason: bornBeforeMove ? reason : null,
      motherLine: d.motherIdx !== undefined ? d.motherIdx + 1 : undefined,
      fatherLine: d.fatherIdx !== undefined ? d.fatherIdx + 1 : undefined,
    };
    return p;
  });

  const adults = members.filter((p) => p.age >= 25);
  const eduScore = adults.length ? adults.reduce((s, p) => s + eduIndexOf(p.attainment), 0) / adults.length / 6 : 0.4;
  const dwelling = drawDwelling(rng, ctx.urban, nat, members.length, ctx.hot, eduScore);
  dwelling.id = `${ctx.hhId}-D`;

  return {
    id: ctx.hhId,
    eaId: ctx.eaId,
    govId: ctx.govId,
    districtId: ctx.districtId,
    urban: ctx.urban,
    type,
    dwelling,
    members,
    weight: 1,
    enumeratorId: ctx.enumeratorId,
    interviewMinutes: Math.round(rng.lognormal(11 + 3.4 * members.length, 0.28) * 10) / 10,
    order: rng.next(),
    enumeratedDay: null,
    source: "SIMULATION",
  };
}

/**
 * Plant deliberate, realistic data errors so the quality engine has work to do.
 * Returns the label of the planted error.
 */
export function plantError(rng: Rng, hh: Household): string {
  const kind = rng.table({ AGE_OUTLIER: 1, CHILD_OLDER: 1.4, MARRIED_CHILD: 1, WORKING_CHILD: 1, LARGE_HH: 0.6, HEAD_MISSING: 0.6, SHORT_INTERVIEW: 1.2, EDU_AGE: 0.8 });
  const kids = hh.members.filter((p) => p.relation === "CHILD");
  switch (kind) {
    case "AGE_OUTLIER": {
      const p = rng.pick(hh.members);
      p.age = rng.chance(0.5) ? 131 : 117;
      p.birthYear -= p.age;
      break;
    }
    case "CHILD_OLDER": {
      if (!kids.length) return plantError(rng, hh);
      const head = hh.members[0];
      kids[0].age = head.age + rng.int(1, 6);
      break;
    }
    case "MARRIED_CHILD": {
      const p = kids.find((k) => k.age >= 9 && k.age <= 14) ?? kids[0];
      if (!p) return plantError(rng, hh);
      p.age = Math.min(p.age, 13);
      p.marital = "MARRIED";
      break;
    }
    case "WORKING_CHILD": {
      const p = kids.find((k) => k.age >= 7 && k.age <= 11);
      if (!p) return plantError(rng, hh);
      p.employment = "EMPLOYED";
      p.occupation = "ELEMENTARY";
      p.sector = "TRADE";
      break;
    }
    case "LARGE_HH": {
      const base = hh.members[hh.members.length - 1];
      while (hh.members.length < 19) {
        const i = hh.members.length;
        const age = rng.int(1, 30);
        hh.members.push({ ...base, id: `${hh.id}-P${String(i + 1).padStart(2, "0")}`, line: i + 1, age, birthYear: base.birthYear + base.age - age, relation: "OTHER_RELATIVE", marital: "NEVER_MARRIED", employment: age < 15 ? "NOT_APPLICABLE" : "OTHER_INACTIVE", occupation: undefined, sector: undefined, attainment: age < 16 ? "PRIMARY" : "BASIC", motherLine: undefined, fatherLine: undefined });
      }
      break;
    }
    case "HEAD_MISSING": {
      if (hh.members.length < 2) return plantError(rng, hh);
      hh.members[0].relation = "OTHER_RELATIVE";
      break;
    }
    case "SHORT_INTERVIEW": {
      hh.interviewMinutes = Math.round(rng.range(2.1, 4.8) * 10) / 10;
      break;
    }
    case "EDU_AGE": {
      const p = hh.members.find((m) => m.age >= 12 && m.age <= 17);
      if (!p) return plantError(rng, hh);
      p.attainment = "BACHELOR";
      break;
    }
  }
  hh.planted = kind;
  return kind;
}

/** Build a fabricated-looking household (identical roster pattern of 4, very short interview). */
export function fabricatedHousehold(template: Household, id: string, rng: Rng): Household {
  const members = [
    { relation: "HEAD", sex: "M", age: 40 },
    { relation: "SPOUSE", sex: "F", age: 35 },
    { relation: "CHILD", sex: "M", age: 10 },
    { relation: "CHILD", sex: "F", age: 8 },
  ] as const;
  return {
    ...template,
    id,
    members: members.map((m, i) => ({
      ...template.members[0],
      id: `${id}-P0${i + 1}`,
      hhId: id,
      line: i + 1,
      relation: m.relation as Relationship,
      sex: m.sex as Sex,
      age: m.age,
      birthYear: template.members[0].birthYear + (template.members[0].age - m.age),
      marital: (m.age >= 18 ? "MARRIED" : "NEVER_MARRIED") as MaritalStatus,
      employment: (m.age < 15 ? "NOT_APPLICABLE" : m.relation === "HEAD" ? "EMPLOYED" : "HOMEMAKER") as EmploymentStatus,
      eduStatus: (m.age < 15 ? "CURRENTLY_ENROLLED" : "LEFT_SCHOOL") as EducationStatus,
      attainment: (m.age < 15 ? "PRIMARY" : "SECONDARY") as Attainment,
      occupation: m.relation === "HEAD" ? ("SERVICE_SALES" as Occupation) : undefined,
      sector: m.relation === "HEAD" ? ("TRADE" as Sector) : undefined,
      motherLine: m.relation === "CHILD" ? 2 : undefined,
      fatherLine: m.relation === "CHILD" ? 1 : undefined,
      wg: { seeing: 1, hearing: 1, walking: 1, cognition: 1, selfcare: 1, communication: 1 },
    })),
    type: "NUCLEAR",
    interviewMinutes: Math.round(rng.range(2.8, 4.4) * 10) / 10,
    order: rng.next(),
    planted: "FABRICATION",
  };
}
