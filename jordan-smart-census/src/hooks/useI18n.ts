"use client";

import { useCallback } from "react";
import { useApp } from "@/store/app";
import { DICT, type DictKey } from "@/lib/i18n/dict";
import { label } from "@/lib/i18n/labels";
import type { L as LText } from "@/types/census";

export function useI18n() {
  const locale = useApp((s) => s.locale);
  const ar = locale === "ar";
  const t = useCallback((k: DictKey) => DICT[k][ar ? 1 : 0], [ar]);
  /** inline bilingual text */
  const L = useCallback((en: string, arText: string) => (ar ? arText : en), [ar]);
  /** pick from a bilingual object */
  const tx = useCallback((v: LText | undefined | null) => (v ? (ar ? v.ar : v.en) : ""), [ar]);
  const lb = useCallback((group: string, key: string | number) => label(group, key, locale), [locale]);
  return { locale, ar, dir: ar ? ("rtl" as const) : ("ltr" as const), t, L, tx, lb };
}
