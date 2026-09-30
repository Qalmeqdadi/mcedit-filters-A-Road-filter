/* eslint-disable @next/next/no-img-element */
import { Workflow } from "lucide-react";
import { BRAND } from "@/config/brand";

/** Product mark (generic, not a client logo). */
export function ProductMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800 text-gold-300 shadow-sm">
        <Workflow className="h-[18px] w-[18px]" />
      </span>
      <div className="leading-tight">
        <div className="text-[13.5px] font-semibold tracking-tight text-navy-900">{BRAND.productName}</div>
        <div className="text-[11px] text-navy-500">{BRAND.productTagline}</div>
      </div>
    </div>
  );
}

/** Client / partner attribution. Uses official logo files only when supplied. */
export function ClientAttribution({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-navy-500">
      <span className="uppercase tracking-wider">Prepared for</span>
      {BRAND.clientLogo ? (
        <img src={BRAND.clientLogo} alt={BRAND.clientName} className="h-5 w-auto" />
      ) : (
        <span className="font-semibold text-navy-800">{BRAND.clientName}</span>
      )}
      {!compact && (
        <>
          <span className="h-3 w-px bg-navy-100" />
          <span className="uppercase tracking-wider">with</span>
          {BRAND.partnerLogo ? (
            <img src={BRAND.partnerLogo} alt={BRAND.partnerName} className="h-4 w-auto" />
          ) : (
            <span className="font-semibold text-magenta-600">{BRAND.partnerName}</span>
          )}
        </>
      )}
    </div>
  );
}
