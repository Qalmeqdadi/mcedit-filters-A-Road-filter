/**
 * AI-assisted anomaly simulation — explainable, rule-based + statistical.
 *
 * Methods: z-score vs district peers, IQR fences, concentration (heaping) tests,
 * rule thresholds and roster-pattern matching. NO LLM or external AI service is
 * used. Detection only produces findings; it never modifies census responses.
 */
import type { Anomaly, EAState, EnumeratorState, Household, Severity } from "@/types/census";
import type { World } from "./generate";

const n0 = (x: number) => Math.round(x).toLocaleString("en-US");
const n1 = (x: number) => x.toFixed(1);
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

export function medianFromHist(hist: number[], width = 5): number {
  const total = hist.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  let acc = 0;
  for (let i = 0; i < hist.length; i++) {
    if (acc + hist[i] >= total / 2) {
      const within = (total / 2 - acc) / Math.max(1, hist[i]);
      return i * width + within * width;
    }
    acc += hist[i];
  }
  return hist.length * width;
}

function meanSd(xs: number[]): { mean: number; sd: number } {
  if (!xs.length) return { mean: 0, sd: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, xs.length - 1);
  return { mean, sd: Math.sqrt(v) };
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export interface DetectionInput {
  world: World;
  ea: EAState[];
  en: EnumeratorState[];
  day: number;
  step: number;
  activeDays: Int16Array;
  /** roster signature index maintained by the engine: "enumeratorId#signature" → households */
  signatures: Map<string, Household[]>;
  districtEas: Map<string, number[]>;
  districtEnums: Map<string, number[]>;
}

type Draft = Omit<Anomaly, "id" | "status" | "step">;

export function detectAnomalies(input: DetectionInput): Draft[] {
  const { world, ea, en, day } = input;
  const out: Draft[] = [];
  if (day < 1) return out;
  const planned = world.config.interviewsPerDay;

  // ---------------------------------------------------------------- enumerator-level, grouped by district
  for (const [districtId, idxs] of input.districtEnums) {
    const district = world.district[districtId];
    const rates = idxs.map((i) => ({ i, r: input.activeDays[i] > 0 ? en[i].completed / input.activeDays[i] : 0 })).filter((x) => input.activeDays[x.i] >= 1 && en[x.i].completed >= 10);
    if (rates.length < 4) continue;
    const { mean, sd } = meanSd(rates.map((x) => x.r));
    const sorted = rates.map((x) => x.r).sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const upperFence = q3 + 3 * (q3 - q1);
    for (const { i, r } of rates) {
      const e = world.enumerators[i];
      const s = en[i];
      const z = sd > 0 ? (r - mean) / sd : 0;
      const medDur = medianFromHist(s.durHist);
      if ((z > 3 || r > upperFence) && r > 1.6 * planned) {
        const sev: Severity = medDur < 8 ? "CRITICAL" : "HIGH";
        out.push({
          kind: "PRODUCTIVITY_OUTLIER", severity: sev, subjectType: "ENUMERATOR", subjectId: e.id, govId: e.govId,
          what: {
            en: `Enumerator ${e.id} completed ${n0(s.completed)} interviews (${n1(r)}/day) with median interview duration of ${n1(medDur)} minutes.`,
            ar: `أنجز العدّاد ${e.id} عدد ${n0(s.completed)} مقابلة (${n1(r)} يومياً) بمتوسط وسيط لمدة المقابلة ${n1(medDur)} دقيقة.`,
          },
          evidence: [
            { label: { en: "Interviews per active day", ar: "المقابلات لكل يوم عمل" }, value: n1(r) },
            { label: { en: "District peer mean ± SD", ar: "متوسط الأقران في اللواء ± الانحراف" }, value: `${n1(mean)} ± ${n1(sd)}` },
            { label: { en: "Z-score", ar: "الدرجة المعيارية" }, value: n1(z) },
            { label: { en: "IQR upper fence (Q3 + 3·IQR)", ar: "الحد الأعلى (Q3 + 3·IQR)" }, value: n1(upperFence) },
            { label: { en: "Median interview duration", ar: "الوسيط لمدة المقابلة" }, value: `${n1(medDur)} min` },
            { label: { en: "Planned rate", ar: "المعدل المخطط" }, value: `${planned}/day` },
          ],
          why: {
            en: `Productivity is ${n1(z)} standard deviations above peers in ${district.name.en}${r > upperFence ? " and beyond the IQR outer fence" : ""}, exceeding 1.6× the planned rate.${medDur < 8 ? " Combined with very short interviews this pattern is consistent with possible curbstoning (fabrication)." : ""}`,
            ar: `الإنتاجية أعلى بـ${n1(z)} انحرافات معيارية من أقرانه في ${district.name.ar}${r > upperFence ? " وتتجاوز الحد الخارجي للمدى الربيعي" : ""}، وتزيد على 1.6 ضعف المعدل المخطط.${medDur < 8 ? " ومع قِصر المقابلات الشديد يتسق هذا النمط مع احتمال تلفيق البيانات." : ""}`,
          },
          method: "Z_SCORE", score: z,
          affectedRecords: e.eaIds,
          recommendation: {
            en: "Supervisor to re-interview a random 10% sample of this enumerator's households and review paradata before records are accepted.",
            ar: "على المشرف إعادة مقابلة عينة عشوائية بنسبة 10% من أسر هذا العدّاد ومراجعة بيانات المقابلة قبل قبول السجلات.",
          },
        });
      } else if (medDur > 0 && medDur < 8 && s.completed >= 15) {
        out.push({
          kind: "SHORT_INTERVIEWS", severity: "HIGH", subjectType: "ENUMERATOR", subjectId: e.id, govId: e.govId,
          what: { en: `Median interview duration for ${e.id} is ${n1(medDur)} minutes across ${n0(s.completed)} interviews.`, ar: `الوسيط لمدة المقابلة للعدّاد ${e.id} هو ${n1(medDur)} دقيقة عبر ${n0(s.completed)} مقابلة.` },
          evidence: [
            { label: { en: "Median duration", ar: "الوسيط للمدة" }, value: `${n1(medDur)} min` },
            { label: { en: "Mean duration", ar: "متوسط المدة" }, value: `${n1(s.durSum / Math.max(1, s.durCount))} min` },
            { label: { en: "Threshold", ar: "العتبة" }, value: "8 min" },
          ],
          why: { en: "A full household questionnaire cannot plausibly be administered in under 8 minutes for a typical household.", ar: "لا يمكن عملياً استيفاء استمارة أسرة كاملة في أقل من 8 دقائق لأسرة نموذجية." },
          method: "RULE", score: 8 - medDur, affectedRecords: e.eaIds,
          recommendation: { en: "Review audio/paradata for a sample of interviews; retrain on probing.", ar: "مراجعة بيانات المقابلة لعينة من المقابلات؛ وإعادة التدريب على أسلوب الاستيضاح." },
        });
      }

      // household-size heaping
      const total = s.sizeHist.reduce((a, b) => a + b, 0);
      if (total >= 25) {
        let maxI = 0;
        for (let k = 1; k < s.sizeHist.length; k++) if (s.sizeHist[k] > s.sizeHist[maxI]) maxI = k;
        const share = s.sizeHist[maxI] / total;
        if (share >= 0.6) {
          out.push({
            kind: "HOUSEHOLD_SIZE_HEAPING", severity: "HIGH", subjectType: "ENUMERATOR", subjectId: e.id, govId: e.govId,
            what: { en: `${pct(share)} of households entered by ${e.id} contain exactly ${maxI + 1} people.`, ar: `${pct(share)} من الأسر التي أدخلها ${e.id} تضم ${maxI + 1} أفراد بالضبط.` },
            evidence: [
              { label: { en: "Households entered", ar: "الأسر المدخلة" }, value: n0(total) },
              { label: { en: "Modal size share", ar: "حصة الحجم الأكثر تكراراً" }, value: pct(share) },
              { label: { en: "Typical modal share (district)", ar: "الحصة المعتادة (اللواء)" }, value: "≈ 20–25%" },
            ],
            why: { en: "Real household-size distributions are dispersed; extreme concentration on one value indicates templated or invented rosters.", ar: "توزيعات أحجام الأسر الحقيقية متفرقة؛ والتركز الشديد على قيمة واحدة يشير إلى قوائم منسوخة أو مختلقة." },
            method: "PATTERN", score: share * 10, affectedRecords: e.eaIds,
            recommendation: { en: "Re-enumerate a sample of affected households with an independent enumerator.", ar: "إعادة عدّ عينة من الأسر المتأثرة بواسطة عدّاد مستقل." },
          });
        }
      }

      // GPS mismatch
      if (s.completed >= 20 && s.gpsOutside / s.completed > 0.15) {
        const share = s.gpsOutside / s.completed;
        out.push({
          kind: "GPS_MISMATCH", severity: "HIGH", subjectType: "ENUMERATOR", subjectId: e.id, govId: e.govId,
          what: { en: `${pct(share)} of interview GPS points recorded by ${e.id} fall outside the assigned EA boundary.`, ar: `${pct(share)} من نقاط GPS للمقابلات التي سجلها ${e.id} تقع خارج حدود منطقة العدّ المخصصة.` },
          evidence: [
            { label: { en: "Points outside EA", ar: "نقاط خارج المنطقة" }, value: `${n0(s.gpsOutside)} / ${n0(s.completed)}` },
            { label: { en: "Threshold", ar: "العتبة" }, value: "15%" },
          ],
          why: { en: "Interviews must be conducted at the dwelling; systematic out-of-area coordinates suggest interviews done remotely or in the wrong EA.", ar: "يجب إجراء المقابلات في المسكن؛ والإحداثيات خارج المنطقة بشكل منهجي تشير إلى مقابلات عن بُعد أو في منطقة خاطئة." },
          method: "RULE", score: share * 10, affectedRecords: e.eaIds,
          recommendation: { en: "Verify device location settings, then spot-check 5 households on site.", ar: "التحقق من إعدادات الموقع في الجهاز ثم التحقق الميداني من 5 أسر." },
        });
      }
    }

    // EA refusal z-scores within district
    const dEas = input.districtEas.get(districtId) ?? [];
    const rr = dEas.map((i) => ({ i, c: ea[i].completed + ea[i].refusals, r: ea[i].refusals })).filter((x) => x.c >= 30);
    if (rr.length >= 5) {
      const rates = rr.map((x) => x.r / x.c);
      const { mean: m2, sd: s2 } = meanSd(rates);
      for (const x of rr) {
        const rate = x.r / x.c;
        const z = s2 > 0 ? (rate - m2) / s2 : 0;
        if (z > 3.5 && rate > 0.08 && x.r >= 8) {
          const a = world.eas[x.i];
          out.push({
            kind: "REFUSAL_CLUSTER", severity: rate > 0.12 ? "HIGH" : "MEDIUM", subjectType: "EA", subjectId: a.id, govId: a.govId,
            what: { en: `Refusal rate in ${a.id} is ${n1(z)} standard deviations above the ${district.name.en} average (${pct(rate)} vs ${pct(m2)}).`, ar: `نسبة الرفض في ${a.id} أعلى بـ${n1(z)} انحرافات معيارية من متوسط ${district.name.ar} (${pct(rate)} مقابل ${pct(m2)}).` },
            evidence: [
              { label: { en: "Refusals / contacted", ar: "الرفض / المتواصل معهم" }, value: `${x.r} / ${x.c}` },
              { label: { en: "District mean ± SD", ar: "متوسط اللواء ± الانحراف" }, value: `${pct(m2)} ± ${pct(s2)}` },
              { label: { en: "Z-score", ar: "الدرجة المعيارية" }, value: n1(z) },
              { label: { en: "Enumerator", ar: "العدّاد" }, value: a.enumeratorId },
            ],
            why: { en: "Refusals concentrated in one EA may reflect enumerator approach, community concerns or a mis-delineated area.", ar: "تركّز الرفض في منطقة واحدة قد يعكس أسلوب العدّاد أو مخاوف مجتمعية أو خطأ في رسم حدود المنطقة." },
            method: "Z_SCORE", score: z, affectedRecords: [a.id],
            recommendation: { en: "Deploy supervisor with a community liaison for refusal conversion visits.", ar: "إرسال المشرف مع منسق مجتمعي لزيارات تحويل حالات الرفض." },
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------- EA occupancy shortfall
  world.eas.forEach((a, i) => {
    const s = ea[i];
    const done = s.visited >= a.dwellingsTrue;
    const progress = s.visited / Math.max(1, a.dwellings);
    if (!done && progress < 0.85) return;
    const occFound = s.completed + s.refusals + s.noContactPending + s.noContactFinal;
    const expectedOcc = a.hhEstimate * (done ? 1 : Math.min(1, progress));
    const ratio = occFound / Math.max(1, expectedOcc);
    if (ratio < 0.84) {
      out.push({
        kind: "OCCUPANCY_SHORTFALL", severity: ratio < 0.78 ? "HIGH" : "MEDIUM", subjectType: "EA", subjectId: a.id, govId: a.govId,
        what: { en: `Enumeration Area ${a.id} has ${pct(1 - ratio)} fewer occupied dwellings than expected.`, ar: `منطقة العدّ ${a.id} فيها مساكن مشغولة أقل من المتوقع بنسبة ${pct(1 - ratio)}.` },
        evidence: [
          { label: { en: "Occupied dwellings found", ar: "المساكن المشغولة المكتشفة" }, value: n0(occFound) },
          { label: { en: "Expected at this progress", ar: "المتوقع عند هذا الإنجاز" }, value: n0(expectedOcc) },
          { label: { en: "Vacant dwellings found", ar: "المساكن الشاغرة المكتشفة" }, value: n0(s.vacantFound) },
          { label: { en: "Frame listing (dwellings)", ar: "حصر الإطار (مساكن)" }, value: n0(a.dwellings) },
        ],
        why: { en: "Large shortfalls against the pre-census listing indicate missed dwellings (coverage error) or genuine depopulation that must be confirmed.", ar: "النقص الكبير مقارنة بالحصر المسبق يشير إلى مساكن مفقودة (خطأ تغطية) أو نقص سكاني حقيقي يجب تأكيده." },
        method: "RULE", score: (1 - ratio) * 10, affectedRecords: [a.id],
        recommendation: { en: "Supervisor to walk the EA boundary block-by-block against the listing and confirm vacant units.", ar: "على المشرف التجول في حدود المنطقة بلوكاً بلوكاً مقابل الحصر وتأكيد المساكن الشاغرة." },
      });
    }
  });

  // ---------------------------------------------------------------- duplicate roster patterns (sampled microdata)
  for (const [k, list] of input.signatures) {
    if (list.length < 3) continue;
    const enumId = k.split("#")[0];
    const e = world.enumerators[world.enumIdx.get(enumId)!];
    out.push({
      kind: "DUPLICATE_PATTERN", severity: "CRITICAL", subjectType: "ENUMERATOR", subjectId: enumId, govId: e.govId,
      what: { en: `${list.length} households entered by ${enumId} share an identical roster (same relations, sexes and ages).`, ar: `${list.length} أسر أدخلها ${enumId} لها قائمة أفراد متطابقة (العلاقات والجنس والأعمار نفسها).` },
      evidence: [
        { label: { en: "Identical rosters", ar: "قوائم متطابقة" }, value: String(list.length) },
        { label: { en: "Signature", ar: "البصمة" }, value: k.split("#")[1].slice(0, 40) },
        { label: { en: "Median interview (these HH)", ar: "الوسيط للمقابلة (هذه الأسر)" }, value: `${n1(list.map((h) => h.interviewMinutes).sort((a, b) => a - b)[Math.floor(list.length / 2)])} min` },
      ],
      why: { en: "The probability of independent households matching on every member's relation, sex and exact age is negligible.", ar: "احتمال تطابق أسر مستقلة في العلاقة والجنس والعمر الدقيق لكل فرد ضئيل جداً." },
      method: "PATTERN", score: list.length, affectedRecords: list.map((h) => h.id),
      recommendation: { en: "Quarantine affected records pending independent re-interview; do not accept into the final dataset until verified.", ar: "عزل السجلات المتأثرة لحين إعادة المقابلة المستقلة؛ وعدم قبولها في البيانات النهائية قبل التحقق." },
    });
  }

  // ---------------------------------------------------------------- district coverage lag
  if (day >= 4) {
    for (const d of world.districts) {
      let visited = 0;
      let dwellings = 0;
      let expected = 0;
      (input.districtEas.get(d.id) ?? []).forEach((i) => {
        const a = world.eas[i];
        visited += ea[i].visited;
        dwellings += a.dwellingsTrue;
        expected += a.dwellingsTrue * Math.min(1, Math.max(0, (day + 1 - a.startDay) / a.expectedDays));
      });
      const prog = visited / Math.max(1, dwellings);
      const exp = expected / Math.max(1, dwellings);
      if (exp - prog > 0.15) {
        out.push({
          kind: "COVERAGE_LAG", severity: exp - prog > 0.25 ? "HIGH" : "MEDIUM", subjectType: "DISTRICT", subjectId: d.id, govId: d.govId,
          what: { en: `${d.name.en} is ${((exp - prog) * 100).toFixed(0)} points behind its fieldwork schedule (${pct(prog)} vs ${pct(exp)} planned).`, ar: `${d.name.ar} متأخر عن جدول العمل الميداني بـ${((exp - prog) * 100).toFixed(0)} نقطة (${pct(prog)} مقابل ${pct(exp)} مخطط).` },
          evidence: [
            { label: { en: "Dwellings visited", ar: "المساكن المزارة" }, value: `${n0(visited)} / ${n0(dwellings)}` },
            { label: { en: "Planned progress (day " + (day + 1) + ")", ar: "الإنجاز المخطط (اليوم " + (day + 1) + ")" }, value: pct(exp) },
          ],
          why: { en: "Cumulative progress below plan by more than 15 points risks incomplete coverage at close of fieldwork.", ar: "الإنجاز التراكمي أقل من الخطة بأكثر من 15 نقطة يهدد اكتمال التغطية عند إغلاق العمل الميداني." },
          method: "RULE", score: (exp - prog) * 10, affectedRecords: [d.id],
          recommendation: { en: "Deploy reserve enumerators to the slowest EAs in this district.", ar: "نشر العدّادين الاحتياطيين في أبطأ مناطق العدّ في هذا اللواء." },
        });
      }
    }
  }
  return out;
}
