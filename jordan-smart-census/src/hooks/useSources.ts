"use client";

import { useMemo } from "react";
import { SOURCE_INDEX } from "@/data/sources";
import { useApp } from "@/store/app";
import type { DataSource } from "@/types/census";

/** Provenance registry, with the governorate baseline swapped to OFFICIAL when an official file was imported. */
export function useSources(): Record<string, DataSource> {
  const label = useApp((s) => s.config.officialImportLabel);
  return useMemo(() => {
    if (!label) return SOURCE_INDEX;
    const base = SOURCE_INDEX.REF_GOV_POP;
    return {
      ...SOURCE_INDEX,
      REF_GOV_POP: {
        ...base,
        name: { en: "Governorate population baseline (official import)", ar: "خط الأساس لسكان المحافظات (استيراد رسمي)" },
        source: label,
        nature: "OFFICIAL",
        methodology: { en: "Imported via the official-data adapter; schema-validated with Zod (12 governorates, positive integers).", ar: "استُورد عبر محوّل البيانات الرسمية وجرى التحقق من بنيته بـ Zod (12 محافظة، أعداد صحيحة موجبة)." },
        notes: { en: "Supplied by the operator in this session. Verify that the file is the authoritative DoS release.", ar: "زوده المشغل في هذه الجلسة. تحقق من أن الملف هو الإصدار المعتمد من الدائرة." },
        lastUpdated: new Date().toISOString().slice(0, 10),
      },
    };
  }, [label]);
}
