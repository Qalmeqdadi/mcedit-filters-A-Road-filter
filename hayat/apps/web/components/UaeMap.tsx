import { formatCompact } from "@/lib/format";
import {
  APPROACH_LANES,
  IRAN_COAST,
  MAP_HEIGHT,
  MAP_WIDTH,
  REGION_LAND,
  SEA_LABELS,
  UAE_OUTLINE,
  kmToUnits,
  project,
  toCurve,
  toPath,
} from "@/lib/geo";
import { statusColor } from "@/lib/risk";
import type { Network, NetworkStatus } from "@/lib/types";

interface Lane {
  portId: string;
  path: string;
  volume: number;
  disruptedVolume: number;
  disruptedRoutes: number;
  delayDays: number;
}

function buildLanes(network: Network, status: NetworkStatus): Lane[] {
  const volumeByRoute = new Map<string, number>();
  for (const s of network.suppliers) {
    volumeByRoute.set(s.route_id, (volumeByRoute.get(s.route_id) ?? 0) + s.volume_tpd);
  }
  return Object.entries(APPROACH_LANES).map(([portId, points]) => {
    const routes = network.routes.filter((r) => r.destination_port_id === portId);
    const disrupted = routes.filter((r) => status.routes[r.id]);
    const sum = (rs: typeof routes) => rs.reduce((t, r) => t + (volumeByRoute.get(r.id) ?? 0), 0);
    return {
      portId,
      path: toCurve(points),
      volume: sum(routes),
      disruptedVolume: sum(disrupted),
      disruptedRoutes: disrupted.length,
      delayDays: Math.max(0, ...disrupted.map((r) => status.routes[r.id].delay_days)),
    };
  });
}

const laneWidth = (tpd: number) => 1.5 + Math.sqrt(tpd) / 12;

export function UaeMap({ network, status }: { network: Network; status: NetworkStatus }) {
  const lanes = buildLanes(network, status);
  const ports = new Map(network.ports.map((p) => [p.id, p]));

  return (
    <svg
      className="map"
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="img"
      aria-label="Map of UAE ports, inbound lanes, warehouses, hospitals and population zones"
    >
      <defs>
        <radialGradient id="sea" cx="55%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#0a1a2a" />
          <stop offset="100%" stopColor="#050b13" />
        </radialGradient>
        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M50 0H0V50" fill="none" stroke="rgba(80,140,190,0.06)" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#sea)" />
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#grid)" />

      <path d={toPath(REGION_LAND)} className="land-region" />
      <path d={toPath(IRAN_COAST)} className="land-region" />
      <path d={toPath(UAE_OUTLINE)} className="land-uae" />

      {SEA_LABELS.map((l) => {
        const [x, y] = project(l.at);
        return (
          <text key={l.text} x={x} y={y} className="sea-label" fontSize={l.size ?? 12}>
            {l.text}
          </text>
        );
      })}

      {network.zones.map((z) => {
        const [x, y] = project([z.lon, z.lat]);
        const exposed = status.zones[z.id] === "EXPOSED";
        return (
          <circle
            key={z.id}
            cx={x}
            cy={y}
            r={kmToUnits(z.radius_km)}
            className={exposed ? "zone zone-exposed" : "zone"}
          >
            <title>
              {`${z.name}: population ${formatCompact(z.population)}` +
                (exposed ? " (exposed to a material threat)" : "")}
            </title>
          </circle>
        );
      })}

      {lanes.map((lane) => (
        <g key={lane.portId}>
          <path d={lane.path} className="lane" strokeWidth={laneWidth(lane.volume)}>
            <title>{`Inbound to ${ports.get(lane.portId)?.name}: ${formatCompact(lane.volume)} t/day`}</title>
          </path>
          {lane.disruptedVolume > 0 && (
            <path
              d={lane.path}
              className="lane-disrupted"
              strokeWidth={laneWidth(lane.disruptedVolume)}
            >
              <title>
                {`${lane.disruptedRoutes} routes delayed ${lane.delayDays.toFixed(0)} days: ` +
                  `${formatCompact(lane.disruptedVolume)} t/day`}
              </title>
            </path>
          )}
        </g>
      ))}

      {network.warehouses.map((w) => {
        const [x, y] = project([w.lon, w.lat]);
        const s = status.warehouses[w.id];
        return (
          <rect
            key={w.id}
            x={x - 5}
            y={y - 5}
            width={10}
            height={10}
            transform={`rotate(45 ${x} ${y})`}
            className="warehouse"
            fill={statusColor(s)}
          >
            <title>{`${w.name} (${w.emirate})${s ? `: holds ${s} commodities` : ""}`}</title>
          </rect>
        );
      })}

      {network.hospitals.map((h) => {
        const [x, y] = project([h.lon, h.lat]);
        const exposed = status.hospitals[h.id] === "EXPOSED";
        return (
          <g key={h.id} className={exposed ? "hospital hospital-exposed" : "hospital"}>
            {h.has_nicu && <circle cx={x} cy={y} r={7} className="hospital-ring" />}
            <path d={`M${x - 4},${y}H${x + 4}M${x},${y - 4}V${y + 4}`} />
            <title>
              {`${h.name}: ${h.beds} beds${h.has_nicu ? ", neonatal ICU" : ""}` +
                (exposed ? " (infant formula exposure)" : "")}
            </title>
          </g>
        );
      })}

      {network.ports.map((p) => {
        const [x, y] = project([p.lon, p.lat]);
        const disrupted = status.ports[p.id] === "DISRUPTED";
        const lane = lanes.find((l) => l.portId === p.id);
        return (
          <g key={p.id} className={disrupted ? "port port-disrupted" : "port"}>
            {disrupted && <circle cx={x} cy={y} r={10} className="port-pulse" />}
            <circle cx={x} cy={y} r={6} className="port-dot" />
            <text x={x + 10} y={y - 8} className="port-label">
              {p.name}
            </text>
            {disrupted && lane && (
              <text x={x + 10} y={y + 8} className="port-alert">
                {`+${lane.delayDays.toFixed(0)}d · ${lane.disruptedRoutes} ${lane.disruptedRoutes === 1 ? "route" : "routes"}`}
              </text>
            )}
            <title>{`${p.name} (${p.kind} port, ${p.emirate})`}</title>
          </g>
        );
      })}

      <g className="legend" transform={`translate(18, ${MAP_HEIGHT - 120})`}>
        <rect width="230" height="104" rx="6" />
        <g transform="translate(14, 22)">
          <circle r="5" className="port-dot" />
          <text x="14" y="4">Port of entry</text>
          <rect x="-4" y="16" width="8" height="8" transform="rotate(45 0 20)" fill="var(--c-normal)" />
          <text x="14" y="24">Warehouse (colour = risk held)</text>
          <path d="M-4,40H4M0,36V44" className="legend-hospital" />
          <text x="14" y="44">Hospital (ring = neonatal ICU)</text>
          <line x1="-6" y1="62" x2="6" y2="62" className="lane" strokeWidth="3" />
          <line x1="-6" y1="62" x2="6" y2="62" className="lane-disrupted legend-dash" strokeWidth="3" />
          <text x="14" y="66">Inbound lane / delayed share</text>
        </g>
      </g>
    </svg>
  );
}
