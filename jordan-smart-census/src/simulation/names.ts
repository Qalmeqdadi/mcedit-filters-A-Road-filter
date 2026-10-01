import type { L } from "@/types/census";
import type { Rng } from "./rng";

/**
 * Synthetic pseudonyms for enumerators / supervisors: a common given name plus a
 * single family initial. These are NOT real people and cannot identify anyone.
 */
const GIVEN: [string, string][] = [
  ["Rana", "رنا"], ["Omar", "عمر"], ["Lina", "لينا"], ["Khaled", "خالد"], ["Dana", "دانا"], ["Yazan", "يزن"],
  ["Hala", "هالة"], ["Ahmad", "أحمد"], ["Noor", "نور"], ["Sami", "سامي"], ["Reem", "ريم"], ["Fadi", "فادي"],
  ["Maysa", "ميساء"], ["Tareq", "طارق"], ["Shatha", "شذى"], ["Mohannad", "مهند"], ["Areej", "أريج"], ["Bashar", "بشار"],
  ["Ruba", "ربى"], ["Zaid", "زيد"], ["Hiba", "هبة"], ["Laith", "ليث"], ["Sawsan", "سوسن"], ["Hamza", "حمزة"],
  ["Raghad", "رغد"], ["Anas", "أنس"], ["Dima", "ديما"], ["Mazen", "مازن"], ["Sara", "سارة"], ["Qais", "قيس"],
  ["Nada", "ندى"], ["Basel", "باسل"], ["Jumana", "جمانة"], ["Hussein", "حسين"], ["Aseel", "أسيل"], ["Majd", "مجد"],
];
const INITIALS: [string, string][] = [
  ["A", "أ"], ["B", "ب"], ["D", "د"], ["F", "ف"], ["H", "ح"], ["J", "ج"], ["K", "ك"], ["M", "م"], ["N", "ن"],
  ["Q", "ق"], ["R", "ر"], ["S", "س"], ["T", "ط"], ["Y", "ي"], ["Z", "ز"], ["Sh", "ش"], ["Kh", "خ"], ["Gh", "غ"],
];

export function pseudonym(rng: Rng): L {
  const g = rng.pick(GIVEN);
  const i = rng.pick(INITIALS);
  return { en: `${g[0]} ${i[0]}.`, ar: `${g[1]} ${i[1]}.` };
}
