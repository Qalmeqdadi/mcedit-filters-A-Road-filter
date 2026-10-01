/**
 * Jordan Smart Census — domain model.
 *
 * Every quantitative entity carries (directly or through its DataSource) a
 * `DataNature` so the UI can always say whether a number is official,
 * reference, simulated or synthetic operational data.
 */

/** Bilingual text. Generated narrative (alerts, anomalies, statements) is produced in both languages. */
export interface L {
  en: string;
  ar: string;
}

export type Locale = "en" | "ar";

export type DataNature = "OFFICIAL" | "REFERENCE" | "SIMULATED" | "SYNTHETIC_OPERATIONAL";

export type GovId =
  | "AMM" | "IRB" | "ZAR" | "MAF" | "BAL" | "JER"
  | "AJL" | "MAD" | "KAR" | "TAF" | "MAN" | "AQB";

export type Region = "North" | "Central" | "South";

// ------------------------------------------------------------------ geography

export interface Governorate {
  id: GovId;
  iso: string;
  name: L;
  capital: L;
  region: Region;
  areaKm2: number;
  label: [number, number];
  capitalPoint: [number, number];
  /** Reference population used as the census frame baseline. */
  refPopulation: number;
  refYear: number;
  refSourceId: string;
  /** Synthetic planning profile (labelled SIMULATED). */
  profile: GovernorateProfile;
}

export interface GovernorateProfile {
  urbanShare: number;
  meanHouseholdSize: number;
  vacancyRate: number;
  nonJordanianShare: number;
  syrianShareOfNonJordanian: number;
  accessibility: number;
  growthDifferential: number;
}

export interface District {
  id: string;
  govId: GovId;
  name: L;
  sourceLabel: string;
  labelMethod: string;
  areaKm2: number;
  label: [number, number];
  anchors: [number, number, number][];
  isCapitalDistrict: boolean;
  /** Simulated */
  population: number;
  households: number;
  urbanShare: number;
}

export type EAStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "COVERAGE_RISK" | "REVISIT_REQUIRED";

/** Static attributes of an Enumeration Area (synthetic, placed inside official polygons). */
export interface EnumerationArea {
  id: string;
  index: number;
  govId: GovId;
  districtId: string;
  lng: number;
  lat: number;
  urban: boolean;
  popEstimate: number;
  hhEstimate: number;
  dwellings: number;
  /** Hidden ground truth of the simulated world (what a perfect census would find). */
  hhTrue: number;
  dwellingsTrue: number;
  vacantTrue: number;
  /** Planted scenario used to exercise the detection engine (never shown as a label in the UI). */
  planted?: "OCCUPANCY_SHORTFALL" | "FRAME_UNDERCOUNT";
  blocks: number;
  enumeratorId: string;
  supervisorId: string;
  /** 0..1 — 1 = easy access */
  accessibility: number;
  /** Day (0-based) on which work begins in this EA. */
  startDay: number;
  expectedDays: number;
}

/** Dynamic state of an EA during fieldwork (SYNTHETIC_OPERATIONAL). */
export interface EAState {
  visited: number;
  completed: number;
  persons: number;
  refusals: number;
  vacantFound: number;
  noContactPending: number;
  noContactFinal: number;
  revisitsScheduled: number;
  revisitsDone: number;
  supervisorRevisit: number;
  status: EAStatus;
  coverageScore: number;
  riskScore: number;
  completedDay: number | null;
}

export interface StatisticalBlock {
  id: string;
  eaId: string;
  dwellings: number;
  buildings: number;
  lng: number;
  lat: number;
}

export interface Building {
  id: string;
  blockId: string;
  floors: number;
  dwellingIds: string[];
}

export interface Dwelling {
  id: string;
  type: DwellingType;
  occupancy: "OCCUPIED" | "VACANT" | "UNDER_CONSTRUCTION" | "NON_RESIDENTIAL";
  tenure: Tenure;
  rooms: number;
  water: WaterSource;
  electricity: boolean;
  sanitation: Sanitation;
  internet: boolean;
  heating: Heating;
  cooling: Cooling;
  vehicles: number;
}

// ------------------------------------------------------------------ microdata

export type DwellingType = "APARTMENT" | "HOUSE" | "VILLA" | "TRADITIONAL" | "TENT_CARAVAN" | "OTHER";
export type Tenure = "OWNED" | "RENTED" | "EMPLOYER" | "FREE" | "OTHER";
export type WaterSource = "PUBLIC_NETWORK" | "TANKER" | "WELL_SPRING" | "OTHER";
export type Sanitation = "PUBLIC_SEWER" | "CESSPIT" | "NONE";
export type Heating = "GAS" | "KEROSENE" | "ELECTRIC" | "CENTRAL" | "WOOD" | "NONE";
export type Cooling = "AC" | "FANS" | "EVAPORATIVE" | "NONE";

export type Sex = "M" | "F";
export type Relationship = "HEAD" | "SPOUSE" | "CHILD" | "GRANDCHILD" | "PARENT" | "SIBLING" | "OTHER_RELATIVE" | "NON_RELATIVE";
export type MaritalStatus = "NEVER_MARRIED" | "MARRIED" | "DIVORCED" | "WIDOWED";
export type Nationality = "JORDANIAN" | "SYRIAN" | "EGYPTIAN" | "IRAQI" | "OTHER_ARAB" | "OTHER";
export type EducationStatus = "NEVER_ATTENDED" | "CURRENTLY_ENROLLED" | "LEFT_SCHOOL" | "NOT_APPLICABLE";
export type Attainment = "NONE" | "PRIMARY" | "BASIC" | "SECONDARY" | "DIPLOMA" | "BACHELOR" | "POSTGRAD";
export type EmploymentStatus = "EMPLOYED" | "UNEMPLOYED" | "STUDENT" | "HOMEMAKER" | "RETIRED" | "UNABLE" | "OTHER_INACTIVE" | "NOT_APPLICABLE";
export type Occupation = "MANAGERS" | "PROFESSIONALS" | "TECHNICIANS" | "CLERICAL" | "SERVICE_SALES" | "AGRICULTURE" | "CRAFT" | "OPERATORS" | "ELEMENTARY" | "ARMED_FORCES";
export type Sector = "AGRICULTURE" | "MANUFACTURING" | "CONSTRUCTION" | "TRADE" | "TRANSPORT" | "HOSPITALITY" | "ICT_FINANCE" | "PUBLIC_ADMIN" | "EDUCATION" | "HEALTH" | "OTHER_SERVICES";
export type WGLevel = 1 | 2 | 3 | 4; // 1 no difficulty, 2 some, 3 a lot, 4 cannot do at all
export type WGDomain = "seeing" | "hearing" | "walking" | "cognition" | "selfcare" | "communication";
export type MoveReason = "WORK" | "MARRIAGE" | "FAMILY" | "EDUCATION" | "HOUSING" | "SECURITY" | "OTHER";
export type PrevCountry = "SYRIA" | "IRAQ" | "GULF" | "EGYPT" | "OTHER_ARAB" | "OTHER";

export interface Person {
  id: string;
  hhId: string;
  line: number;
  relation: Relationship;
  sex: Sex;
  age: number;
  birthYear: number;
  marital: MaritalStatus;
  nationality: Nationality;
  eduStatus: EducationStatus;
  attainment: Attainment;
  employment: EmploymentStatus;
  occupation?: Occupation;
  sector?: Sector;
  healthInsurance: boolean;
  wg: Record<WGDomain, WGLevel>;
  /** Previous residence: null = always lived in current governorate */
  prevGov: GovId | null;
  prevCountry: PrevCountry | null;
  yearsSinceMove: number | null;
  moveReason: MoveReason | null;
  /** Index (line) of mother / father in the roster if present */
  motherLine?: number;
  fatherLine?: number;
}

export type HouseholdType = "SINGLE" | "COUPLE" | "NUCLEAR" | "SINGLE_PARENT" | "EXTENDED" | "COMPOSITE";

export interface Household {
  id: string;
  eaId: string;
  govId: GovId;
  districtId: string;
  urban: boolean;
  type: HouseholdType;
  dwelling: Dwelling;
  members: Person[];
  /** Survey weight (households represented) */
  weight: number;
  enumeratorId: string;
  interviewMinutes: number;
  /** 0..1 — position in the EA's work order; enumerated when EA progress passes it */
  order: number;
  enumeratedDay: number | null;
  source: "SIMULATION" | "QUESTIONNAIRE";
  planted?: string;
}

// ------------------------------------------------------------------ field operations

export type EnumeratorStatus = "ACTIVE" | "IDLE" | "OFFLINE" | "UNDER_REVIEW" | "COMPLETED" | "NOT_STARTED";
export type EnumeratorProfileKind = "STANDARD" | "FAST" | "SLOW" | "FABRICATION_RISK" | "HIGH_REFUSAL" | "DEVICE_ISSUES" | "GPS_DRIFT";

export interface Enumerator {
  id: string;
  index: number;
  name: L;
  govId: GovId;
  districtId: string;
  eaIds: string[];
  supervisorId: string;
  startDay: number;
  householdsAssigned: number;
  profile: {
    kind: EnumeratorProfileKind;
    speed: number;
    errorRate: number;
    refusalFactor: number;
    durationFactor: number;
    deviceReliability: number;
  };
}

export interface EnumeratorState {
  assigned: number;
  completed: number;
  refusals: number;
  pending: number;
  visited: number;
  vacant: number;
  validated: number;
  failedValidation: number;
  durSum: number;
  durCount: number;
  /** histogram of interview durations: buckets of 5 min (0-5, 5-10, …, 60+) */
  durHist: number[];
  /** household size histogram 1..12+ (index 0 => size 1) */
  sizeHist: number[];
  gpsOutside: number;
  daily: number[];
  stepLog: number[];
  status: EnumeratorStatus;
  offlineUntilStep: number;
  unsynced: number;
  validationScore: number;
  coverageScore: number;
  riskScore: number;
  interventions: Intervention[];
}

export interface Supervisor {
  id: string;
  name: L;
  govId: GovId;
  districtId: string;
  enumeratorIds: string[];
}

export interface SupervisorTask {
  id: string;
  supervisorId: string;
  kind: "REVIEW_ISSUE" | "REVISIT" | "ANOMALY_FOLLOWUP" | "DEVICE_SYNC" | "COVERAGE_CHECK";
  refId: string;
  createdStep: number;
  status: "OPEN" | "DONE";
  text: L;
}

export interface Intervention {
  step: number;
  by: string;
  action: string;
  note: string;
}

export type VisitOutcome = "COMPLETED" | "REFUSAL" | "NO_CONTACT" | "VACANT" | "REVISIT";

export interface Visit {
  id: string;
  eaId: string;
  enumeratorId: string;
  step: number;
  outcome: VisitOutcome;
}

export interface Interview {
  id: string;
  householdId: string;
  enumeratorId: string;
  step: number;
  minutes: number;
  persons: number;
  lng: number;
  lat: number;
}

// ------------------------------------------------------------------ quality & anomalies

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type IssueStatus = "OPEN" | "ASSIGNED" | "INVESTIGATING" | "REVISIT_REQUESTED" | "RESOLVED" | "DISMISSED";

export interface WorkflowEvent {
  step: number;
  action: string;
  by: string;
  note?: string;
}

export interface QualityIssue {
  id: string;
  ruleId: string;
  severity: Severity;
  entityType: "PERSON" | "HOUSEHOLD" | "ENUMERATOR" | "EA";
  entityId: string;
  householdId?: string;
  eaId?: string;
  enumeratorId?: string;
  govId: GovId;
  step: number;
  message: L;
  evidence: L;
  status: IssueStatus;
  assignee?: string;
  dismissReason?: string;
  history: WorkflowEvent[];
}

export type AnomalyKind =
  | "PRODUCTIVITY_OUTLIER"
  | "SHORT_INTERVIEWS"
  | "HOUSEHOLD_SIZE_HEAPING"
  | "REFUSAL_CLUSTER"
  | "OCCUPANCY_SHORTFALL"
  | "GPS_MISMATCH"
  | "DUPLICATE_PATTERN"
  | "COVERAGE_LAG";

export type AnomalyDecision = "CONFIRMED_REVISIT" | "ASSIGNED_SUPERVISOR" | "DISMISSED" | "ESCALATED";

export interface Anomaly {
  id: string;
  kind: AnomalyKind;
  severity: Severity;
  subjectType: "ENUMERATOR" | "EA" | "DISTRICT";
  subjectId: string;
  govId: GovId;
  step: number;
  what: L;
  evidence: { label: L; value: string }[];
  why: L;
  method: "RULE" | "Z_SCORE" | "IQR" | "PATTERN";
  score: number;
  affectedRecords: string[];
  recommendation: L;
  status: "OPEN" | "DECIDED";
  decision?: { action: AnomalyDecision; by: string; step: number; note: string };
}

export type AlertType =
  | "COVERAGE_GAP" | "UNUSUAL_PERFORMANCE" | "HIGH_REFUSAL" | "POTENTIAL_DUPLICATE"
  | "DURATION_ANOMALY" | "DISTRICT_BEHIND" | "DEVICE_OFFLINE" | "SUPERVISOR_REVIEW" | "PES_COVERAGE";

export interface Alert {
  id: string;
  type: AlertType;
  severity: Severity;
  owner: L;
  step: number;
  govId: GovId;
  refId: string;
  text: L;
  status: "OPEN" | "ACKNOWLEDGED" | "ESCALATED" | "RESOLVED";
  history: WorkflowEvent[];
}

// ------------------------------------------------------------------ PES

export interface PESSample {
  eaIds: string[];
  drawnAtStep: number;
  method: "STRATIFIED_RANDOM" | "MANUAL";
}

export interface PESAreaResult {
  eaId: string;
  govId: GovId;
  censusCount: number;
  pesCount: number;
  matched: number;
  omissions: number;
  erroneous: number;
  duplicates: number;
}

export interface PESResult {
  areas: PESAreaResult[];
  byGov: Record<string, PESSummary>;
  national: PESSummary;
  ranAtStep: number;
}

export interface PESSummary {
  areas: number;
  census: number;
  pes: number;
  matched: number;
  omissions: number;
  erroneous: number;
  duplicates: number;
  correctEnumerations: number;
  dualSystemEstimate: number;
  matchRate: number;
  netCoverageError: number;
  grossCoverageError: number;
  omissionRate: number;
  erroneousRate: number;
}

// ------------------------------------------------------------------ projections & scenarios

export interface ProjectionAssumptions {
  tfr: number;
  e0: number;
  netMigration: number;
  householdSize2050: number;
  urban2050: number;
  employmentRatio: number;
}

export interface ScenarioParams {
  fertilityMultiplier: number;
  netMigration: number;
  lifeExpectancyGain: number;
  householdSize: number;
  employmentGrowth: number;
  schoolAgeGrowth: number;
  elderlyGrowth: number;
  urbanization: number;
  waterLpcd: number;
  electricityKwh: number;
  classroomCapacity: number;
  schoolCapacity: number;
  healthUtilization: number;
  housingFormationRatio: number;
}

export interface ProjectionScenario {
  id: string;
  name: string;
  preset: ScenarioPreset;
  params: ScenarioParams;
  createdAt: string;
}

export type ScenarioPreset = "BASELINE" | "HIGH_GROWTH" | "LOW_GROWTH" | "MIGRATION_SHOCK" | "YOUTH_PRESSURE" | "AGEING" | "CUSTOM";

export interface ProjectionPoint {
  year: number;
  population: number;
  male: number;
  female: number;
  households: number;
  ages: { m: number[]; f: number[] };
  age0_5: number;
  age6_17: number;
  age18_23: number;
  age15_64: number;
  age65plus: number;
  births: number;
  deaths: number;
  urbanShare: number;
}

export interface InfrastructureImpact {
  year: number;
  population: number;
  households: number;
  housingUnitsNeeded: number;
  schoolSeats: number;
  classroomsRequired: number;
  schoolsRequired: number;
  healthcareVisits: number;
  waterMcm: number;
  electricityGwh: number;
  jobsRequired: number;
  elderlyCareDemand: number;
  /** deltas vs base year */
  delta: Omit<InfrastructureImpact, "year" | "delta" | "byGov">;
  byGov: Record<string, { population: number; age6_17: number; age65plus: number; households: number; pressure: number }>;
}

// ------------------------------------------------------------------ provenance

export interface DataSource {
  id: string;
  name: L;
  source: string;
  year: string;
  geography: L;
  nature: DataNature;
  methodology: L;
  lastUpdated: string;
  notes: L;
  license?: string;
  url?: string;
}
