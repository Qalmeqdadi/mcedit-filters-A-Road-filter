// Mirrors the HAYAT API response shapes (apps/api/src/hayat_api/services.py).

export type RiskLevel = "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";
export type Status = RiskLevel | "NORMAL" | "DISRUPTED" | "EXPOSED";

export interface Kpis {
  resilience_index: number;
  baseline_resilience_index: number;
  resilience_delta: number;
  active_signals: number;
  material_threats: number;
  protected_value_aed: number;
  baseline_protected_value_aed: number;
  value_at_risk_aed: number;
  demand_value_aed: number;
}

export interface SignalInfo {
  id: string;
  kind: string;
  title: string;
  source: string;
  severity: string;
  chokepoint: string;
  delay_days: number;
  observed_at: string;
}

export interface CommodityState {
  commodity_id: string;
  name: string;
  name_ar: string;
  vulnerable_group: string;
  stock_t: number;
  daily_consumption_t: number;
  days_of_cover: number;
  safety_stock_days: number;
  disrupted_inflow_share: number;
  affected_route_ids: string[];
  delayed_volume_t: number;
  projected_cover_days: number[];
  min_cover_days: number;
  trough_day: number;
  safety_breach_day: number | null;
  stockout_day: number | null;
  shortage_risk: number;
  risk_level: RiskLevel;
  resilience_score: number;
  criticality: number;
  value_at_risk_aed: number;
  impacted: boolean;
}

export interface Threat {
  commodity_id: string;
  name: string;
  name_ar: string;
  risk_level: RiskLevel;
  shortage_risk: number;
  headline: string;
  days_of_cover: number;
  min_cover_days: number;
  trough_day: number;
  safety_breach_day: number | null;
  stockout_day: number | null;
  disrupted_inflow_share: number;
  value_at_risk_aed: number;
  affected_route_ids: string[];
  vulnerable_group: string;
  exposed_population: number;
  exposed_hospital_ids: string[];
  warehouse_ids: string[];
}

export interface RouteStatus {
  status: "DISRUPTED";
  gap_start_day: number;
  gap_end_day: number;
  delay_days: number;
  signal_ids: string[];
}

export interface NetworkStatus {
  routes: Record<string, RouteStatus>;
  ports: Record<string, Status>;
  warehouses: Record<string, Status>;
  hospitals: Record<string, Status>;
  zones: Record<string, Status>;
}

export interface ResilienceState {
  run_id: string;
  trigger: string;
  computed_at: string;
  horizon_days: number;
  kpis: Kpis;
  signals: SignalInfo[];
  commodities: CommodityState[];
  threats: Threat[];
  network_status: NetworkStatus;
}

export interface Port {
  id: string;
  name: string;
  emirate: string;
  kind: "sea" | "land";
  coast: string;
  lat: number;
  lon: number;
  handling_capacity_tpd: number;
}

export interface ShippingRoute {
  id: string;
  name: string;
  mode: "sea" | "land";
  origin: string;
  origin_country: string;
  destination_port_id: string | null;
  corridor: string;
  chokepoints: string[];
  transit_days: number;
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  commodity_id: string;
  route_id: string;
  volume_tpd: number;
}

export interface Warehouse {
  id: string;
  name: string;
  emirate: string;
  lat: number;
  lon: number;
  capacity_t: number;
  cold_chain: boolean;
}

export interface Hospital {
  id: string;
  name: string;
  emirate: string;
  lat: number;
  lon: number;
  beds: number;
  has_nicu: boolean;
  zone_id: string;
}

export interface Zone {
  id: string;
  name: string;
  emirate: string;
  lat: number;
  lon: number;
  radius_km: number;
  population: number;
  infant_share: number;
}

export interface Network {
  ports: Port[];
  routes: ShippingRoute[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  hospitals: Hospital[];
  zones: Zone[];
}

export interface Pulse {
  snapshot: { id: number; run_id: string; trigger: string; created_at: string };
  state: ResilienceState;
  network: Network;
}

export interface AuditEvent {
  id: number;
  run_id: string;
  event_type: string;
  actor: string;
  message: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}
