// 11.1 Master data: ports, airports, rail terminals and truck hubs.
// Codes are UN/LOCODE for ports and inland points, IATA for airports. Coordinates are approximate
// terminal locations (decimal degrees), good for maps and distance estimates, not for navigation.
import type { ModeFamily } from "./modes";

export type HubKind = "port" | "airport" | "rail" | "truck";
export type Region = "gcc" | "south_asia" | "east_asia" | "southeast_asia" | "europe" | "africa" | "americas" | "middle_east";

export interface Hub {
  code: string;
  name: string;
  city: string;
  country: string;
  kind: HubKind;
  lat: number;
  lon: number;
  region: Region;
  /** Text a request or reply might use for this place (1.1.3). */
  aliases?: string[];
}

const h = (code: string, name: string, city: string, country: string, kind: HubKind, lat: number, lon: number, region: Region, aliases: string[] = []): Hub =>
  ({ code, name, city, country, kind, lat, lon, region, aliases });

export const HUBS: readonly Hub[] = [
  // GCC ports
  h("AEJEA", "Jebel Ali", "Dubai", "AE", "port", 25.011, 55.061, "gcc", ["jebel ali", "jea", "dubai port"]),
  h("AEKHL", "Khalifa Port", "Abu Dhabi", "AE", "port", 24.812, 54.645, "gcc", ["khalifa port", "abu dhabi port"]),
  h("SADMM", "King Abdulaziz Port", "Dammam", "SA", "port", 26.502, 50.205, "gcc", ["dammam"]),
  h("SAJED", "Jeddah Islamic Port", "Jeddah", "SA", "port", 21.471, 39.169, "gcc", ["jeddah"]),
  h("OMSOH", "Sohar Port", "Sohar", "OM", "port", 24.503, 56.622, "gcc", ["sohar"]),
  h("QAHMD", "Hamad Port", "Doha", "QA", "port", 25.003, 51.618, "gcc", ["hamad port", "doha port"]),
  h("KWSWK", "Shuwaikh Port", "Kuwait City", "KW", "port", 29.351, 47.929, "gcc", ["shuwaikh", "kuwait port"]),
  // South Asia
  h("INNSA", "Nhava Sheva (JNPT)", "Mumbai", "IN", "port", 18.949, 72.951, "south_asia", ["nhava sheva", "jnpt", "mumbai port"]),
  h("INMAA", "Chennai Port", "Chennai", "IN", "port", 13.096, 80.297, "south_asia", ["chennai", "madras"]),
  h("LKCMB", "Colombo", "Colombo", "LK", "port", 6.952, 79.843, "south_asia", ["colombo"]),
  h("PKKHI", "Karachi Port", "Karachi", "PK", "port", 24.838, 66.981, "south_asia", ["karachi"]),
  // East and Southeast Asia
  h("CNSHA", "Shanghai (Yangshan)", "Shanghai", "CN", "port", 30.626, 122.065, "east_asia", ["shanghai", "yangshan", "sha"]),
  h("CNNGB", "Ningbo-Zhoushan", "Ningbo", "CN", "port", 29.934, 121.853, "east_asia", ["ningbo"]),
  h("CNYTN", "Yantian", "Shenzhen", "CN", "port", 22.574, 114.274, "east_asia", ["yantian", "shenzhen"]),
  h("KRPUS", "Busan New Port", "Busan", "KR", "port", 35.078, 128.828, "east_asia", ["busan", "pusan"]),
  h("JPTYO", "Tokyo Port", "Tokyo", "JP", "port", 35.617, 139.783, "east_asia", ["tokyo"]),
  h("SGSIN", "Singapore (Pasir Panjang)", "Singapore", "SG", "port", 1.267, 103.763, "southeast_asia", ["singapore"]),
  h("MYPKG", "Port Klang (Westports)", "Port Klang", "MY", "port", 2.999, 101.307, "southeast_asia", ["port klang", "klang"]),
  // Europe and the Mediterranean
  h("NLRTM", "Rotterdam (Maasvlakte)", "Rotterdam", "NL", "port", 51.953, 4.042, "europe", ["rotterdam"]),
  h("BEANR", "Antwerp-Bruges", "Antwerp", "BE", "port", 51.283, 4.317, "europe", ["antwerp"]),
  h("DEHAM", "Hamburg", "Hamburg", "DE", "port", 53.537, 9.932, "europe", ["hamburg"]),
  h("GBFXT", "Felixstowe", "Felixstowe", "GB", "port", 51.957, 1.329, "europe", ["felixstowe"]),
  h("GRPIR", "Piraeus", "Piraeus", "GR", "port", 37.942, 23.623, "europe", ["piraeus"]),
  h("ESVLC", "Valencia", "Valencia", "ES", "port", 39.443, -0.318, "europe", ["valencia"]),
  h("EGPSD", "Port Said", "Port Said", "EG", "port", 31.257, 32.302, "africa", ["port said", "suez"]),
  // Africa
  h("DJJIB", "Djibouti", "Djibouti", "DJ", "port", 11.602, 43.128, "africa", ["djibouti"]),
  h("KEMBA", "Mombasa", "Mombasa", "KE", "port", -4.063, 39.656, "africa", ["mombasa"]),
  h("ZADUR", "Durban", "Durban", "ZA", "port", -29.872, 31.028, "africa", ["durban"]),
  // Americas
  h("USNYC", "New York and New Jersey", "Newark", "US", "port", 40.668, -74.146, "americas", ["new york", "newark"]),
  h("USLAX", "Los Angeles", "Los Angeles", "US", "port", 33.739, -118.265, "americas", ["los angeles", "la port"]),
  h("BRSSZ", "Santos", "Santos", "BR", "port", -23.961, -46.301, "americas", ["santos"]),

  // Airports
  h("DXB", "Dubai International", "Dubai", "AE", "airport", 25.253, 55.365, "gcc", ["dxb", "dubai airport"]),
  h("DWC", "Al Maktoum International", "Dubai", "AE", "airport", 24.896, 55.161, "gcc", ["dwc", "al maktoum"]),
  h("DOH", "Hamad International", "Doha", "QA", "airport", 25.273, 51.608, "gcc", ["doh"]),
  h("RUH", "King Khalid International", "Riyadh", "SA", "airport", 24.958, 46.699, "gcc", ["ruh", "riyadh airport"]),
  h("JED", "King Abdulaziz International", "Jeddah", "SA", "airport", 21.680, 39.157, "gcc", ["jed"]),
  h("PVG", "Shanghai Pudong", "Shanghai", "CN", "airport", 31.144, 121.808, "east_asia", ["pvg", "pudong"]),
  h("HKG", "Hong Kong International", "Hong Kong", "HK", "airport", 22.308, 113.918, "east_asia", ["hkg", "hong kong"]),
  h("ICN", "Incheon", "Seoul", "KR", "airport", 37.460, 126.441, "east_asia", ["icn", "incheon"]),
  h("SIN", "Changi", "Singapore", "SG", "airport", 1.364, 103.991, "southeast_asia", ["changi"]),
  h("BOM", "Chhatrapati Shivaji Maharaj", "Mumbai", "IN", "airport", 19.090, 72.866, "south_asia", ["bom", "mumbai airport"]),
  h("FRA", "Frankfurt", "Frankfurt", "DE", "airport", 50.037, 8.562, "europe", ["fra", "frankfurt"]),
  h("AMS", "Amsterdam Schiphol", "Amsterdam", "NL", "airport", 52.310, 4.768, "europe", ["ams", "schiphol"]),
  h("LHR", "London Heathrow", "London", "GB", "airport", 51.470, -0.454, "europe", ["lhr", "heathrow"]),
  h("LGG", "Liège", "Liège", "BE", "airport", 50.637, 5.443, "europe", ["lgg", "liege"]),
  h("NBO", "Jomo Kenyatta International", "Nairobi", "KE", "airport", -1.319, 36.928, "africa", ["nbo", "nairobi"]),
  h("JNB", "O. R. Tambo International", "Johannesburg", "ZA", "airport", -26.139, 28.246, "africa", ["jnb", "johannesburg"]),
  h("JFK", "John F. Kennedy International", "New York", "US", "airport", 40.641, -73.778, "americas", ["jfk"]),
  h("ORD", "Chicago O'Hare", "Chicago", "US", "airport", 41.978, -87.904, "americas", ["ord", "chicago"]),

  // Rail terminals
  h("SADMR", "Dammam Rail Terminal", "Dammam", "SA", "rail", 26.405, 50.085, "gcc", ["dammam rail"]),
  h("SARDP", "Riyadh Dry Port", "Riyadh", "SA", "rail", 24.668, 46.821, "gcc", ["riyadh dry port"]),
  h("AEKHR", "Khalifa Port Rail Terminal", "Abu Dhabi", "AE", "rail", 24.788, 54.668, "gcc", ["etihad rail khalifa"]),
  h("AERUW", "Ruwais Rail Terminal", "Ruwais", "AE", "rail", 24.110, 52.730, "gcc", ["ruwais"]),
  h("CNXIA", "Xi'an International Port", "Xi'an", "CN", "rail", 34.397, 109.072, "east_asia", ["xian", "xi'an"]),
  h("CNCKG", "Chongqing Tuanjiecun", "Chongqing", "CN", "rail", 29.624, 106.404, "east_asia", ["chongqing"]),
  h("KZKHG", "Khorgos Gateway", "Khorgos", "KZ", "rail", 44.208, 80.408, "east_asia", ["khorgos"]),
  h("PLMAL", "Małaszewicze", "Małaszewicze", "PL", "rail", 52.036, 23.530, "europe", ["malaszewicze"]),
  h("DEDUI", "Duisburg Gateway", "Duisburg", "DE", "rail", 51.432, 6.746, "europe", ["duisburg"]),

  // Truck hubs and border crossings
  h("AEJAF", "Jebel Ali Free Zone", "Dubai", "AE", "truck", 24.985, 55.088, "gcc", ["jafza"]),
  h("AEGHW", "Al Ghuwaifat border", "Ghuwaifat", "AE", "truck", 24.118, 51.592, "gcc", ["ghuwaifat", "batha"]),
  h("OMHTA", "Hatta border", "Hatta", "OM", "truck", 24.800, 56.120, "gcc", ["hatta"]),
  h("SARUH", "Riyadh logistics park", "Riyadh", "SA", "truck", 24.700, 46.850, "gcc", ["riyadh"]),
  h("OMMCT", "Muscat (Rusayl)", "Muscat", "OM", "truck", 23.556, 58.193, "gcc", ["muscat"]),
  h("QADOH", "Doha (Birkat Al Awamer)", "Doha", "QA", "truck", 25.130, 51.480, "gcc", ["doha"]),
  h("KWKWI", "Kuwait City (Shuwaikh industrial)", "Kuwait City", "KW", "truck", 29.330, 47.930, "gcc", ["kuwait"]),
  h("JOAMM", "Amman (Sahab)", "Amman", "JO", "truck", 31.870, 36.000, "middle_east", ["amman"]),
  h("NLVEN", "Venlo", "Venlo", "NL", "truck", 51.370, 6.172, "europe", ["venlo"]),
];

export const hub = (code: string): Hub => {
  const x = HUBS.find((h) => h.code === code);
  if (!x) throw new Error(`unknown hub ${code}`);
  return x;
};

/** Which hub kinds a mode may start or end at. Road may also serve ports, airports and rail terminals (pickup and delivery). */
export const KINDS_FOR: Record<ModeFamily, HubKind[]> = {
  sea: ["port"],
  air: ["airport"],
  rail: ["rail"],
  road: ["truck", "port", "airport", "rail"],
};

/** Great-circle distance in km. */
export function distanceKm(a: Pick<Hub, "lat" | "lon">, b: Pick<Hub, "lat" | "lon">): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Finds the hub a piece of free text refers to, preferring the given kinds (1.1.3, 4.3.1). */
export function findHub(text: string, kinds?: HubKind[]): Hub | undefined {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9' ]+/g, " ")} `;
  const pool = kinds ? HUBS.filter((h) => kinds.includes(h.kind)) : HUBS;
  let best: { h: Hub; len: number } | undefined;
  for (const x of pool) {
    for (const name of [x.code.toLowerCase(), ...(x.aliases ?? []), x.city.toLowerCase()]) {
      if (t.includes(` ${name} `) && (!best || name.length > best.len)) best = { h: x, len: name.length };
    }
  }
  return best?.h;
}
