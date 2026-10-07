// Turns a stored row into the ResourceRef the policy reasons about: who owns it
// and which attributes permission conditions may test.
import type { ResourceRef } from "./policy";

type Row = Record<string, unknown> & { id: string };

/** Facts that live on other rows (e.g. whether the booking is confirmed). */
export interface ResourceExtras {
  carrierOrgId?: string | null;
  partnerOrgId?: string | null;
  bookingConfirmed?: boolean;
  attachedToPartnerJob?: boolean;
}

const str = (v: unknown) => (typeof v === "string" ? v : null);

const CONFIRMED_BOOKING = new Set(["confirmed", "amended"]);

export function describe(type: string, row: Row, extras: ResourceExtras = {}): ResourceRef {
  const base: ResourceRef = {
    type,
    id: row.id,
    deskOrgId: str(row.deskOrgId),
    shipperOrgId: str(row.shipperOrgId),
    carrierOrgId: str(row.carrierOrgId) ?? extras.carrierOrgId ?? null,
    partnerOrgId: str(row.partnerOrgId) ?? extras.partnerOrgId ?? null,
    attrs: {
      status: row.status,
      published: row.published,
      counterparty: row.counterparty,
      bookingConfirmed: extras.bookingConfirmed ?? false,
      attachedToPartnerJob: extras.attachedToPartnerJob ?? false,
    },
  };
  if (type === "booking") base.attrs!.bookingConfirmed = CONFIRMED_BOOKING.has(String(row.status));
  if (type === "invoice") {
    const party = str(row.partyOrgId);
    if (row.counterparty === "shipper") base.shipperOrgId = party;
    if (row.counterparty === "carrier") base.carrierOrgId = party;
    if (row.counterparty === "partner") base.partnerOrgId = party;
  }
  return base;
}
