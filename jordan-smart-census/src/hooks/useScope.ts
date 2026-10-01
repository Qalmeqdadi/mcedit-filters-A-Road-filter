"use client";

import { useMemo } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import type { EnumerationArea } from "@/types/census";
import { EA_STATUS_COLOR } from "@/components/ui/badges";
import type { EAPoint } from "@/features/gis/JordanMap";

/** Global scope (governorate / district / EA) + a filter predicate for EAs. */
export function useScope() {
  const govId = useApp((s) => s.govId);
  const districtId = useApp((s) => s.districtId);
  const eaId = useApp((s) => s.eaId);
  const filter = useMemo(() => (a: EnumerationArea) => (!govId || a.govId === govId) && (!districtId || a.districtId === districtId), [govId, districtId]);
  return { govId, districtId, eaId, filter, scope: { govId: govId ?? undefined, districtId: districtId ?? undefined } };
}

/** EA points coloured by live status for the map (rebuilt on every tick). */
export function useEAPoints(limitToGov?: string | null): EAPoint[] {
  const engine = useEngine();
  const v = engine.version;
  return useMemo(() => {
    const out: EAPoint[] = [];
    engine.world.eas.forEach((a, k) => {
      if (limitToGov && a.govId !== limitToGov) return;
      out.push({ id: a.id, lng: a.lng, lat: a.lat, color: EA_STATUS_COLOR[engine.ea[k].status], govId: a.govId, districtId: a.districtId });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, v, limitToGov]);
}
