import { bidMachine } from "./bid";
import { bookingMachine } from "./booking";
import { capacityHoldMachine } from "./capacity-hold";
import { chargeMachine } from "./charge";
import { documentMachine } from "./document";
import { exceptionMachine } from "./exception";
import { quoteMachine } from "./quote";
import { requestMachine } from "./request";
import { shipmentMachine } from "./shipment";

export { bidMachine, bookingMachine, capacityHoldMachine, chargeMachine, documentMachine, exceptionMachine, quoteMachine, requestMachine, shipmentMachine };
export type { RequestContext } from "./request";
export type { QuoteContext } from "./quote";
export type { ChargeContext } from "./charge";
export type { ExceptionContext } from "./exception";
export type { DocumentContext } from "./document";
export type { CapacityHoldContext } from "./capacity-hold";

/** The six machines named in the process document. */
export const DOCUMENT_MACHINES = { request: requestMachine, quote: quoteMachine, booking: bookingMachine, shipment: shipmentMachine, charge: chargeMachine, exception: exceptionMachine } as const;

/** Machines added by this build (see src/processes/deviations.ts). */
export const ADDED_MACHINES = { bid: bidMachine, document: documentMachine, capacity_hold: capacityHoldMachine } as const;

export const MACHINES = { ...DOCUMENT_MACHINES, ...ADDED_MACHINES } as const;
export type MachineName = keyof typeof MACHINES;
