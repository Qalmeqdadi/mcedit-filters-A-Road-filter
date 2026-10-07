// 1.1.1 Ingest: which desk an inbound message is for, and whether it is a shipper's request or a
// carrier's reply. Each desk has an inbound address; known parties are matched by sender domain
// (1.4.1). An unknown sender is still taken in, as a request with no customer matched yet.
import type { ParsedEmail } from "./email";

/** Inbound address → desk. In production these are verified forwarding addresses per desk. */
export const DESK_MAILBOXES: Record<string, string> = {
  "quotes@gulfway.example": "desk-gulfway",
  "rates@gulfway.example": "desk-gulfway",
  "quotes@northsea.example": "desk-northsea",
  "rates@northsea.example": "desk-northsea",
};

/** Sender domain → party, for the pilot network (master data in 1.4.1 and 2.1). */
export const PARTY_DOMAINS: Record<string, string> = {
  "alnoor-home.example": "shp-alnoor",
  "desertbloom.example": "shp-desertbloom",
  "kaizen-auto.example": "shp-kaizen",
  "mirage-textiles.example": "shp-mirage",
  "nordlicht-home.example": "shp-nordlicht",
  "oceanlink.example": "car-oceanlink",
  "meridian-container.example": "car-meridian",
  "pacificcrest.example": "car-pacific",
  "gulfstar.example": "car-gulfstar",
  "blueharbor.example": "car-blueharbor",
  "saffronsea.example": "car-saffron",
  "falconcargo.example": "car-falcon",
  "desertwing.example": "car-desertwing",
  "sahm-overland.example": "car-sahm",
  "gulfroad.example": "car-gulfroad",
  "northhaul.example": "car-northhaul",
  "eastrail.example": "car-eastrail",
  "silkrail.example": "car-silkrail",
};

export type Route =
  | { kind: "request"; deskOrgId: string; shipperOrgId: string | null }
  | { kind: "reply"; deskOrgId: string; carrierOrgId: string }
  | { kind: "unroutable"; reason: string };

const domainOf = (address: string) => address.toLowerCase().split("@")[1] ?? "";

export function route(e: ParsedEmail, mailboxes = DESK_MAILBOXES, parties = PARTY_DOMAINS): Route {
  const to = e.to.map((a) => a.toLowerCase());
  const deskOrgId = to.map((a) => mailboxes[a]).find(Boolean);
  if (!deskOrgId) return { kind: "unroutable", reason: `no desk mailbox among ${to.join(", ") || "(no recipients)"}` };
  const party = parties[domainOf(e.from)] ?? null;
  if (party?.startsWith("car-")) return { kind: "reply", deskOrgId, carrierOrgId: party };
  return { kind: "request", deskOrgId, shipperOrgId: party?.startsWith("shp-") ? party : null };
}
