"""Synthetic UAE food & logistics resilience dataset.

ALL DATA HERE IS SYNTHETIC. Names of suppliers, warehouses and hospitals are
fictional; magnitudes are plausible orders of magnitude for a country of
~9.6M people, not official statistics. Ports, chokepoints and coordinates are
real geography.

The dataset is authored as explicit input assumptions (the tables below).
Derived quantities, i.e. supplier volumes and warehouse stock levels, are
computed from those assumptions by ``build_dataset`` so that every number is
traceable:

    supplier volume_tpd  = commodity daily consumption x supplier share
    national stock (t)   = commodity daily consumption x starting days of cover
    warehouse stock (t)  = national stock split by warehouse weight
                           (largest-remainder rounding to whole tonnes)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# --- Commodities ------------------------------------------------------------------------
# id, name, name_ar, category, daily consumption (t/day), safety target (days),
# criticality weight, reference price (AED/t), vulnerable group, starting days of cover
COMMODITIES: list[tuple] = [
    ("WHEAT", "Wheat", "قمح", "grain", 4800, 30, 1.0, 1100, "general", 45.0),
    ("RICE", "Rice", "أرز", "grain", 1250, 30, 0.9, 3300, "general", 44.0),
    ("COOKING_OIL", "Cooking oil", "زيت الطبخ", "edible_oil", 820, 21, 0.7, 5500, "general", 30.0),
    ("INFANT_FORMULA", "Infant formula", "حليب الأطفال", "infant_nutrition", 42, 10, 1.0, 90000,
     "infants", 14.5),
    ("SUGAR", "Sugar", "سكر", "staple", 1600, 30, 0.5, 2200, "general", 50.0),
    ("POULTRY", "Frozen poultry", "دواجن مجمدة", "protein", 1350, 14, 0.7, 9000, "general", 22.0),
    ("LENTILS", "Lentils & pulses", "عدس وبقوليات", "staple", 550, 30, 0.5, 3500, "general", 48.0),
    ("DATES", "Dates", "تمور", "domestic_produce", 280, 30, 0.4, 6000, "general", 90.0),
]

# --- Ports of entry ----------------------------------------------------------------------
# id, name, emirate, kind, coast, lat, lon, food handling capacity (t/day)
PORTS: list[tuple] = [
    ("JEA", "Jebel Ali Port", "Dubai", "sea", "gulf", 25.011, 55.061, 60000),
    ("KHL", "Khalifa Port", "Abu Dhabi", "sea", "gulf", 24.810, 54.645, 40000),
    ("KFK", "Khor Fakkan Port", "Sharjah", "sea", "east", 25.345, 56.360, 18000),
    ("FJR", "Port of Fujairah", "Fujairah", "sea", "east", 25.170, 56.362, 15000),
    ("MSQ", "Saqr Port", "Ras Al Khaimah", "sea", "gulf", 25.985, 56.052, 8000),
    ("GHW", "Ghuwaifat Land Port", "Abu Dhabi", "land", "inland", 24.120, 51.620, 12000),
]

# --- Routes ------------------------------------------------------------------------------
# Offsets: transit days from each chokepoint to the UAE destination (~14 knots).
# id, name, mode, origin, origin country, destination port, corridor, transit days,
# {chokepoint: days to destination}
ROUTES: list[tuple] = [
    ("R-CST-JEA", "Constanta to Jebel Ali", "sea", "Constanta", "Romania", "JEA", "RED_SEA_SUEZ",
     18, {"BOSPHORUS": 12.0, "SUEZ": 9.5, "BAB_EL_MANDEB": 6.0, "HORMUZ": 1.0}),
    ("R-ROU-KHL", "Rouen to Khalifa Port", "sea", "Rouen", "France", "KHL", "RED_SEA_SUEZ",
     21, {"GIBRALTAR": 16.0, "SUEZ": 10.0, "BAB_EL_MANDEB": 6.5, "HORMUZ": 1.2}),
    ("R-HOU-JEA", "Houston to Jebel Ali", "sea", "Houston", "United States", "JEA",
     "RED_SEA_SUEZ", 30, {"GIBRALTAR": 15.5, "SUEZ": 9.5, "BAB_EL_MANDEB": 6.0, "HORMUZ": 1.0}),
    ("R-DAM-JEA", "Damietta to Jebel Ali", "sea", "Damietta", "Egypt", "JEA", "RED_SEA_SUEZ",
     11, {"SUEZ": 9.5, "BAB_EL_MANDEB": 6.0, "HORMUZ": 1.0}),
    ("R-MER-JEA", "Mersin to Jebel Ali", "sea", "Mersin", "Turkiye", "JEA", "RED_SEA_SUEZ",
     12, {"SUEZ": 9.5, "BAB_EL_MANDEB": 6.0, "HORMUZ": 1.0}),
    ("R-VLC-KHL", "Valencia to Khalifa Port", "sea", "Valencia", "Spain", "KHL", "RED_SEA_SUEZ",
     17, {"SUEZ": 10.0, "BAB_EL_MANDEB": 6.5, "HORMUZ": 1.2}),
    ("R-RTM-JEA", "Rotterdam to Jebel Ali", "sea", "Rotterdam", "Netherlands", "JEA",
     "RED_SEA_SUEZ", 22, {"GIBRALTAR": 15.5, "SUEZ": 9.5, "BAB_EL_MANDEB": 6.0, "HORMUZ": 1.0}),
    ("R-ORK-KHL", "Cork to Khalifa Port", "sea", "Cork", "Ireland", "KHL", "RED_SEA_SUEZ",
     22, {"GIBRALTAR": 16.0, "SUEZ": 10.0, "BAB_EL_MANDEB": 6.5, "HORMUZ": 1.2}),
    ("R-LEH-KFK", "Le Havre to Khor Fakkan", "sea", "Le Havre", "France", "KFK", "RED_SEA_SUEZ",
     20, {"GIBRALTAR": 14.5, "SUEZ": 8.5, "BAB_EL_MANDEB": 5.0}),
    ("R-FRE-KHL", "Fremantle to Khalifa Port", "sea", "Fremantle", "Australia", "KHL",
     "INDIAN_OCEAN", 15, {"HORMUZ": 1.2}),
    ("R-VAN-JEA", "Vancouver to Jebel Ali", "sea", "Vancouver", "Canada", "JEA",
     "TRANS_PACIFIC_MALACCA", 30, {"MALACCA": 10.0, "HORMUZ": 1.0}),
    ("R-MUN-JEA", "Mundra to Jebel Ali", "sea", "Mundra", "India", "JEA", "ARABIAN_SEA",
     4, {"HORMUZ": 1.0}),
    ("R-KHI-JEA", "Karachi to Jebel Ali", "sea", "Karachi", "Pakistan", "JEA", "ARABIAN_SEA",
     3, {"HORMUZ": 1.0}),
    ("R-LCB-JEA", "Laem Chabang to Jebel Ali", "sea", "Laem Chabang", "Thailand", "JEA",
     "MALACCA_INDIAN_OCEAN", 14, {"MALACCA": 10.0, "HORMUZ": 1.0}),
    ("R-PKG-JEA", "Port Klang to Jebel Ali", "sea", "Port Klang", "Malaysia", "JEA",
     "MALACCA_INDIAN_OCEAN", 12, {"MALACCA": 9.0, "HORMUZ": 1.0}),
    ("R-SSZ-KFK", "Santos to Khor Fakkan", "sea", "Santos", "Brazil", "KFK", "CAPE_ROUTE",
     27, {"CAPE_OF_GOOD_HOPE": 15.0}),
    ("R-PNG-JEA", "Paranagua to Jebel Ali", "sea", "Paranagua", "Brazil", "JEA", "CAPE_ROUTE",
     28, {"CAPE_OF_GOOD_HOPE": 15.5, "HORMUZ": 1.0}),
    ("R-KDL-KFK", "Kandla to Khor Fakkan", "sea", "Kandla", "India", "KFK", "ARABIAN_SEA",
     3, {}),
    ("R-GHW-LND", "Saudi Arabia overland via Ghuwaifat", "land", "Riyadh", "Saudi Arabia",
     "GHW", "GCC_OVERLAND", 2, {}),
    ("R-DOM-LND", "Domestic production (Al Ain, Liwa)", "land", "Al Ain", "United Arab Emirates",
     None, "DOMESTIC", 1, {}),
]

# --- Suppliers (fictional) ---------------------------------------------------------------
# id, name, country, commodity, route, share of national inflow for that commodity
SUPPLIERS: list[tuple] = [
    ("SUP-01", "Danube Grain Exporters", "Romania", "WHEAT", "R-CST-JEA", 0.40),
    ("SUP-02", "Normandy Cereal Cooperative", "France", "WHEAT", "R-ROU-KHL", 0.22),
    ("SUP-03", "Western Plains Grain Co.", "Australia", "WHEAT", "R-FRE-KHL", 0.28),
    ("SUP-04", "Prairie Harvest Commodities", "Canada", "WHEAT", "R-VAN-JEA", 0.10),
    ("SUP-05", "Gulf Coast Rice Mills", "United States", "RICE", "R-HOU-JEA", 0.22),
    ("SUP-06", "Nile Delta Rice Traders", "Egypt", "RICE", "R-DAM-JEA", 0.16),
    ("SUP-07", "Punjab Basmati Exports", "India", "RICE", "R-MUN-JEA", 0.32),
    ("SUP-08", "Indus Valley Rice Corp.", "Pakistan", "RICE", "R-KHI-JEA", 0.18),
    ("SUP-09", "Chao Phraya Jasmine Rice", "Thailand", "RICE", "R-LCB-JEA", 0.12),
    ("SUP-10", "Black Sea Sunflower Oils", "Romania", "COOKING_OIL", "R-CST-JEA", 0.52),
    ("SUP-11", "Anatolia Edible Oils", "Turkiye", "COOKING_OIL", "R-MER-JEA", 0.20),
    ("SUP-12", "Levante Seed Oils", "Spain", "COOKING_OIL", "R-VLC-KHL", 0.14),
    ("SUP-13", "Selangor Palm Refiners", "Malaysia", "COOKING_OIL", "R-PKG-JEA", 0.14),
    ("SUP-14", "Lowlands Infant Nutrition", "Netherlands", "INFANT_FORMULA", "R-RTM-JEA", 0.45),
    ("SUP-15", "Emerald Dairy Nutrition", "Ireland", "INFANT_FORMULA", "R-ORK-KHL", 0.25),
    ("SUP-16", "Seine Valley Paediatric Foods", "France", "INFANT_FORMULA", "R-LEH-KFK", 0.20),
    ("SUP-17", "Najd Nutrition Industries", "Saudi Arabia", "INFANT_FORMULA", "R-GHW-LND", 0.10),
    ("SUP-18", "Paulista Sugar Mills", "Brazil", "SUGAR", "R-SSZ-KFK", 0.55),
    ("SUP-19", "Gujarat Sugar Exports", "India", "SUGAR", "R-KDL-KFK", 0.45),
    ("SUP-20", "Parana Poultry Exports", "Brazil", "POULTRY", "R-PNG-JEA", 0.70),
    ("SUP-21", "Arabian Poultry Farms", "Saudi Arabia", "POULTRY", "R-GHW-LND", 0.30),
    ("SUP-22", "Western Plains Pulse Co.", "Australia", "LENTILS", "R-FRE-KHL", 0.50),
    ("SUP-23", "Saskatchewan Pulse Exporters", "Canada", "LENTILS", "R-VAN-JEA", 0.50),
    ("SUP-24", "Liwa & Al Ain Date Growers", "United Arab Emirates", "DATES", "R-DOM-LND", 1.00),
]

# --- Warehouses (fictional) --------------------------------------------------------------
# id, name, emirate, lat, lon, capacity (t), cold chain
WAREHOUSES: list[tuple] = [
    ("WH-DXB-SR", "Dubai South Strategic Food Reserve", "Dubai", 24.900, 55.160, 400000, True),
    ("WH-JEA-DC", "Jebel Ali Distribution Centre", "Dubai", 24.990, 55.100, 250000, True),
    ("WH-AUH-GT", "Khalifa Port Grain Terminal", "Abu Dhabi", 24.790, 54.690, 350000, False),
    ("WH-AUH-DC", "Mussafah Food Distribution Centre", "Abu Dhabi", 24.350, 54.500, 180000, True),
    ("WH-SHJ-CC", "Sharjah Cold Chain Hub", "Sharjah", 25.300, 55.480, 120000, True),
    ("WH-AAN-RD", "Al Ain Regional Depot", "Abu Dhabi", 24.200, 55.700, 90000, False),
    ("WH-FJR-EC", "Fujairah East Coast Depot", "Fujairah", 25.130, 56.320, 110000, False),
    ("WH-RAK-ND", "Ras Al Khaimah Northern Depot", "Ras Al Khaimah", 25.700, 55.850, 60000, False),
    ("WH-DHF-WR", "Al Dhafra Western Region Depot", "Abu Dhabi", 24.100, 52.730, 50000, False),
]

# Share of each commodity's national stock held at each warehouse.
STOCK_DISTRIBUTION: dict[str, dict[str, float]] = {
    "WHEAT": {"WH-AUH-GT": 0.45, "WH-DXB-SR": 0.35, "WH-FJR-EC": 0.10, "WH-AAN-RD": 0.10},
    "RICE": {"WH-DXB-SR": 0.35, "WH-JEA-DC": 0.25, "WH-AUH-DC": 0.20, "WH-SHJ-CC": 0.10,
             "WH-RAK-ND": 0.10},
    "COOKING_OIL": {"WH-JEA-DC": 0.40, "WH-AUH-DC": 0.25, "WH-SHJ-CC": 0.20, "WH-AAN-RD": 0.15},
    "INFANT_FORMULA": {"WH-DXB-SR": 0.45, "WH-AUH-DC": 0.30, "WH-SHJ-CC": 0.25},
    "SUGAR": {"WH-FJR-EC": 0.40, "WH-DXB-SR": 0.35, "WH-AUH-GT": 0.25},
    "POULTRY": {"WH-JEA-DC": 0.40, "WH-DXB-SR": 0.25, "WH-AUH-DC": 0.20, "WH-SHJ-CC": 0.15},
    "LENTILS": {"WH-AUH-GT": 0.40, "WH-DXB-SR": 0.35, "WH-RAK-ND": 0.25},
    "DATES": {"WH-AAN-RD": 0.50, "WH-DHF-WR": 0.30, "WH-DXB-SR": 0.20},
}

# --- Population zones (synthetic populations) --------------------------------------------
# id, name, emirate, lat, lon, radius km (map only), population, share aged 0-24 months
POPULATION_ZONES: list[tuple] = [
    ("Z-AUH", "Abu Dhabi City", "Abu Dhabi", 24.450, 54.420, 30, 1_650_000, 0.026),
    ("Z-AAN", "Al Ain", "Abu Dhabi", 24.200, 55.700, 25, 820_000, 0.028),
    ("Z-DHF", "Al Dhafra", "Abu Dhabi", 23.700, 53.400, 70, 290_000, 0.022),
    ("Z-DXB", "Dubai Urban", "Dubai", 25.200, 55.300, 25, 3_200_000, 0.022),
    ("Z-DXS", "Dubai South & Jebel Ali", "Dubai", 24.950, 55.120, 18, 520_000, 0.020),
    ("Z-SHJ", "Sharjah", "Sharjah", 25.330, 55.450, 20, 1_800_000, 0.025),
    ("Z-AJM", "Ajman", "Ajman", 25.410, 55.500, 10, 540_000, 0.026),
    ("Z-UAQ", "Umm Al Quwain", "Umm Al Quwain", 25.520, 55.650, 10, 85_000, 0.025),
    ("Z-RAK", "Ras Al Khaimah", "Ras Al Khaimah", 25.750, 55.950, 20, 400_000, 0.027),
    ("Z-ECO", "East Coast (Fujairah, Khor Fakkan)", "Fujairah", 25.250, 56.300, 20, 330_000,
     0.027),
]

# --- Hospitals (fictional) ---------------------------------------------------------------
# id, name, emirate, lat, lon, beds, neonatal intensive care unit, zone
HOSPITALS: list[tuple] = [
    ("HSP-01", "Capital General Hospital", "Abu Dhabi", 24.470, 54.370, 650, True, "Z-AUH"),
    ("HSP-02", "Abu Dhabi Women & Children's Centre", "Abu Dhabi", 24.420, 54.460, 320, True,
     "Z-AUH"),
    ("HSP-03", "Al Ain Regional Hospital", "Abu Dhabi", 24.220, 55.750, 450, True, "Z-AAN"),
    ("HSP-04", "Al Dhafra Western Hospital", "Abu Dhabi", 24.080, 52.700, 120, False, "Z-DHF"),
    ("HSP-05", "Dubai Central Hospital", "Dubai", 25.260, 55.320, 700, True, "Z-DXB"),
    ("HSP-06", "Dubai Maternity & Paediatric Hospital", "Dubai", 25.180, 55.260, 350, True,
     "Z-DXB"),
    ("HSP-07", "Dubai South Community Hospital", "Dubai", 24.930, 55.180, 180, False, "Z-DXS"),
    ("HSP-08", "Sharjah General Hospital", "Sharjah", 25.340, 55.420, 500, True, "Z-SHJ"),
    ("HSP-09", "Ajman Medical Centre", "Ajman", 25.400, 55.470, 220, False, "Z-AJM"),
    ("HSP-10", "Umm Al Quwain Hospital", "Umm Al Quwain", 25.550, 55.580, 120, False, "Z-UAQ"),
    ("HSP-11", "Ras Al Khaimah Regional Hospital", "Ras Al Khaimah", 25.780, 55.950, 300, True,
     "Z-RAK"),
    ("HSP-12", "Fujairah East Coast Hospital", "Fujairah", 25.120, 56.330, 280, True, "Z-ECO"),
    ("HSP-13", "Khor Fakkan Hospital", "Sharjah", 25.330, 56.340, 140, False, "Z-ECO"),
]


@dataclass(frozen=True)
class Dataset:
    commodities: list[dict[str, Any]]
    ports: list[dict[str, Any]]
    routes: list[dict[str, Any]]
    suppliers: list[dict[str, Any]]
    warehouses: list[dict[str, Any]]
    inventory: list[dict[str, Any]]
    zones: list[dict[str, Any]]
    hospitals: list[dict[str, Any]]


def split_whole_tonnes(total: float, weights: dict[str, float]) -> dict[str, int]:
    """Split ``total`` by ``weights`` into whole tonnes that sum exactly to round(total)."""
    target = round(total)
    weight_sum = sum(weights.values())
    raw = {k: target * w / weight_sum for k, w in weights.items()}
    floors = {k: int(v) for k, v in raw.items()}
    remainder = target - sum(floors.values())
    for k in sorted(raw, key=lambda k: (-(raw[k] - floors[k]), k))[:remainder]:
        floors[k] += 1
    return floors


def build_dataset() -> Dataset:
    commodities = [
        dict(id=c[0], name=c[1], name_ar=c[2], category=c[3], unit="t",
             daily_consumption_t=float(c[4]), safety_stock_days=float(c[5]),
             criticality=c[6], unit_price_aed=float(c[7]), vulnerable_group=c[8])
        for c in COMMODITIES
    ]
    consumption = {c[0]: float(c[4]) for c in COMMODITIES}
    starting_cover = {c[0]: c[9] for c in COMMODITIES}

    shares: dict[str, float] = {}
    for s in SUPPLIERS:
        shares[s[3]] = shares.get(s[3], 0.0) + s[5]
    for cid, total in shares.items():
        if abs(total - 1.0) > 1e-9:
            raise ValueError(f"supplier shares for {cid} sum to {total}, expected 1.0")

    suppliers = [
        dict(id=s[0], name=s[1], country=s[2], commodity_id=s[3], route_id=s[4],
             volume_tpd=round(consumption[s[3]] * s[5], 3))
        for s in SUPPLIERS
    ]

    inventory = []
    for cid, weights in STOCK_DISTRIBUTION.items():
        national = consumption[cid] * starting_cover[cid]
        for wid, qty in split_whole_tonnes(national, weights).items():
            inventory.append(dict(warehouse_id=wid, commodity_id=cid, quantity_t=float(qty)))

    return Dataset(
        commodities=commodities,
        ports=[dict(id=p[0], name=p[1], emirate=p[2], kind=p[3], coast=p[4], lat=p[5],
                    lon=p[6], handling_capacity_tpd=float(p[7])) for p in PORTS],
        routes=[dict(id=r[0], name=r[1], mode=r[2], origin=r[3], origin_country=r[4],
                     destination_port_id=r[5], corridor=r[6], transit_days=float(r[7]),
                     chokepoints=list(r[8]), chokepoint_offsets_days=dict(r[8]))
                for r in ROUTES],
        suppliers=suppliers,
        warehouses=[dict(id=w[0], name=w[1], emirate=w[2], lat=w[3], lon=w[4],
                         capacity_t=float(w[5]), cold_chain=w[6]) for w in WAREHOUSES],
        inventory=inventory,
        zones=[dict(id=z[0], name=z[1], emirate=z[2], lat=z[3], lon=z[4], radius_km=float(z[5]),
                    population=z[6], infant_share=z[7]) for z in POPULATION_ZONES],
        hospitals=[dict(id=h[0], name=h[1], emirate=h[2], lat=h[3], lon=h[4], beds=h[5],
                        has_nicu=h[6], zone_id=h[7]) for h in HOSPITALS],
    )
