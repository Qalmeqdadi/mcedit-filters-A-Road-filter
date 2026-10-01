import type { GeoCollection } from "@/simulation/geo";
import type { GovId, Region } from "@/types/census";
import countryJson from "./country.json";
import governoratesJson from "./governorates.json";
import districtsJson from "./districts.json";
import qaJson from "./boundary-qa.json";

export interface GovernorateProps {
  id: GovId;
  iso: string;
  nameEn: string;
  nameAr: string;
  capitalEn: string;
  capitalAr: string;
  region: Region;
  areaKm2: number;
  labelLng: number;
  labelLat: number;
  capitalLng: number;
  capitalLat: number;
  sourceId: string;
}

export interface DistrictProps {
  id: string;
  govId: GovId;
  nameEn: string;
  nameAr: string;
  sourceLabel: string;
  labelMethod: string;
  areaKm2: number;
  labelLng: number;
  labelLat: number;
  anchors: [number, number, number][];
  capital: boolean;
}

export interface BoundaryQA {
  generatedBy: string;
  source: string;
  sourceAdm2Units: number;
  outputDistricts: number;
  labelMethods: Record<string, number>;
  units: { id: string; govId: GovId; nameEn: string; nameAr: string; sourceLabel: string; method: string; seats: string[]; majorityShare: number; areaKm2: number }[];
  merges: { govId: GovId; kind: string; from: string; into: string; areaKm2: number }[];
  seatsTested: number;
}

export const COUNTRY = countryJson as unknown as GeoCollection<Record<string, unknown>>;
export const GOVERNORATE_GEO = governoratesJson as unknown as GeoCollection<GovernorateProps>;
export const DISTRICT_GEO = districtsJson as unknown as GeoCollection<DistrictProps>;
export const BOUNDARY_QA = qaJson as unknown as BoundaryQA;
