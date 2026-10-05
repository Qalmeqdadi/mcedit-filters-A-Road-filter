"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { saveBlob } from "@/lib/hosted";
import { useDelivery } from "@/delivery/store";
import { usePlans, useLab } from "./shared";

/** Download the governorate (or national) profile as a Word document. */
export function ProfileButton() {
  const engine = useEngine();
  const { L, ar } = useI18n();
  const govId = useApp((s) => s.govId);
  const { plans, snap } = usePlans();
  const { scenarioName } = useLab();
  const { data } = useDelivery();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!plans || !snap) return;
    setBusy(true);
    try {
      const { buildProfileDocx } = await import("@/lib/profileDocx");
      const blob = await buildProfileDocx(engine.world, plans, snap, govId, ar, data, scenarioName);
      await saveBlob(`ufuq-profile-${govId ?? "jordan"}-${snap.year}${ar ? "-ar" : ""}.docx`, blob);
    } finally {
      setBusy(false);
    }
  };
  return <Button onClick={go} disabled={!plans || busy} data-testid="profile-docx"><FileText size={14} />{busy ? L("Preparing…", "جارٍ الإعداد…") : L("Profile (Word)", "الملف (Word)")}</Button>;
}
