"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2, FileDown, FileUp, Plus, Save, Send, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useApp } from "@/store/app";
import { useEngine } from "@/store/engine";
import { useI18n } from "@/hooks/useI18n";
import { PageHeader, Panel, Callout } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/dialog";
import { NatureBadge, SeverityBadge } from "@/components/ui/badges";
import { LABELS } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";
import { downloadText } from "@/lib/csv";
import { applies, emptyForm, newPerson, personAge, validateForm, WG_KEYS, type QForm, type QPerson } from "./schema";
import { navIndex } from "@/lib/nav";

const DRAFT_KEY = "jsc-questionnaire-draft";
type Section = "ID" | "A" | "B" | "C" | "R";

export function Questionnaire() {
  const engine = useEngine();
  const bump = useApp((s) => s.bump);
  const { t, tx, L, lb, ar } = useI18n();
  const world = engine.world;
  const ref = world.config.referenceDate;
  const [f, setF] = useState<QForm>(() => emptyForm());
  const [section, setSection] = useState<Section>("ID");
  const [personIdx, setPersonIdx] = useState(0);
  const [touched, setTouched] = useState(false);
  const [confirmSoft, setConfirmSoft] = useState(false);
  const [notice, setNotice] = useState<ReactNode>(null);
  const v = useMemo(() => validateForm(f, ref), [f, ref]);
  const progress = v.required ? v.filled / v.required : 0;
  const occupied = f.occupancy === "OCCUPIED";
  const set = <K extends keyof QForm>(k: K, val: QForm[K]) => setF((s) => ({ ...s, [k]: val }));
  const setP = (i: number, patch: Partial<QPerson>) => setF((s) => ({ ...s, persons: s.persons.map((p, k) => (k === i ? { ...p, ...patch } : p)) }));
  const err = (k: string) => (touched || f.persons.length > 0) && v.errors[k];
  const hardErrors = Object.keys(v.errors).length + v.critical.length;

  const opts = (group: string) => Object.entries(LABELS[group]).map(([k, val]) => <option key={k} value={k}>{ar ? val[1] : val[0]}</option>);
  const yesNo = <><option value="yes">{L("Yes", "نعم")}</option><option value="no">{L("No", "لا")}</option></>;

  const districts = world.districts.filter((d) => d.govId === f.govId);
  const eas = world.eas.filter((e) => e.districtId === f.districtId).slice(0, 400);

  const saveDraft = () => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(f)); setNotice(L("Draft saved on this device.", "حُفظت المسودة على هذا الجهاز.")); } catch { setNotice(L("Could not save draft (storage unavailable).", "تعذر حفظ المسودة (التخزين غير متاح).")); }
  };
  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) { setNotice(L("No saved draft found.", "لا توجد مسودة محفوظة.")); return; }
      setF(JSON.parse(raw));
      setNotice(L("Draft restored.", "استُعيدت المسودة."));
    } catch { setNotice(L("Draft could not be read.", "تعذرت قراءة المسودة.")); }
  };
  const doSubmit = () => {
    if (!v.household && occupied) return;
    const ea = world.eas[world.eaIdx.get(f.eaId)!];
    if (occupied && v.household) {
      engine.submitQuestionnaire({ ...v.household, enumeratorId: ea.enumeratorId, urban: ea.urban, enumeratedDay: engine.day });
    } else {
      engine.submitQuestionnaire({ ...(v.household ?? { id: `Q-${f.eaId}-${f.dwellingNo.padStart(3, "0")}`, members: [], eaId: f.eaId, govId: ea.govId, districtId: ea.districtId, urban: ea.urban, type: "SINGLE", weight: 0, interviewMinutes: 1, order: 0, enumeratedDay: engine.day, source: "QUESTIONNAIRE", dwelling: { id: "", type: "OTHER", occupancy: f.occupancy as "VACANT", tenure: "OTHER", rooms: 0, water: "OTHER", electricity: false, sanitation: "NONE", internet: false, heating: "NONE", cooling: "NONE", vehicles: 0 } }), enumeratorId: ea.enumeratorId });
    }
    bump();
    setConfirmSoft(false);
    const id = `Q-${f.eaId}-${f.dwellingNo.padStart(3, "0")}`;
    const raised = engine.issues.filter((q) => q.householdId === id).length;
    setNotice(<span><CheckCircle2 size={14} className="me-1 inline text-ok" />{L(`Questionnaire ${id} submitted. ${raised} quality issue(s) routed to Data Quality.`, `أُرسلت الاستمارة ${id}. وُجّهت ${raised} مسألة جودة إلى وحدة جودة البيانات.`)}</span>);
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setF(emptyForm());
    setSection("ID");
    setTouched(false);
  };
  const submit = () => {
    setTouched(true);
    if (hardErrors > 0) { setSection("R"); return; }
    if (v.warnings.length) { setConfirmSoft(true); return; }
    doSubmit();
  };

  const sections: { id: Section; label: string; show: boolean }[] = [
    { id: "ID", label: L("Identification", "التعريف"), show: true },
    { id: "A", label: L("A — Dwelling", "أ — المسكن"), show: true },
    { id: "B", label: L("B — Household & roster", "ب — الأسرة وقائمة الأفراد"), show: occupied },
    { id: "C", label: L("C — Persons", "ج — الأفراد"), show: occupied },
    { id: "R", label: L("Review & submit", "المراجعة والإرسال"), show: true },
  ];

  const errLabel = (code: string) => ({ required: L("Required", "مطلوب"), mismatch: L("Must equal the number of persons in the roster", "يجب أن يساوي عدد الأفراد في القائمة"), roster: L("Add at least one person", "أضف فرداً واحداً على الأقل"), noHead: L("Exactly one household head is required", "يجب وجود رب أسرة واحد بالضبط"), manyHeads: L("Only one household head allowed", "يُسمح برب أسرة واحد فقط"), manySpouses: L("Only one spouse of the head allowed", "يُسمح بزوج/زوجة واحد لرب الأسرة"), line: L("Invalid line number", "رقم سطر غير صالح") } as Record<string, string>)[code] ?? code;

  const fe = (k: string) => (err(k) ? errLabel(String(v.errors[k])) : undefined);

  const p = f.persons[personIdx];
  const pAge = p ? personAge(p, ref) : null;
  const ap = p ? applies(p, pAge) : null;
  const pe = (k: string) => `p${personIdx}.${k}`;

  return (
    <div>
      <PageHeader index={navIndex("/questionnaire")} title={t("nav06")} subtitle={L("A working household census form with skip logic, age and relationship validation, and the same edit rules used in fieldwork. Submissions enter the Data Quality pipeline.", "استمارة تعداد أسرية عاملة مع منطق التخطي والتحقق من العمر والعلاقات، وقواعد التدقيق نفسها المستخدمة ميدانياً. تدخل الاستمارات المرسلة مسار جودة البيانات.")}>
        <NatureBadge nature="SYNTHETIC_OPERATIONAL" />
      </PageHeader>
      {notice ? <Callout className="mb-3">{notice}</Callout> : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {sections.filter((s) => s.show).map((s, i) => (
              <button key={s.id} type="button" onClick={() => setSection(s.id)} className={cn("flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12.5px] font-medium", section === s.id ? "border-navy-700 bg-navy-800 text-white" : "border-line bg-card text-ink-700 hover:bg-sand-50")}>
                <span className="font-mono text-[11px] opacity-70">{i + 1}</span>{s.label}
              </button>
            ))}
          </div>

          {section === "ID" ? (
            <Panel title={L("Identification", "التعريف")} subtitle={L("Select the EA from the census frame. Occupancy status controls which sections apply.", "اختر منطقة العدّ من إطار التعداد. تحدد حالة الإشغال الأقسام المطبقة.")}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <QField label={t("governorate")} error={fe("govId")}><Select value={f.govId} onChange={(e) => setF((s) => ({ ...s, govId: e.target.value as QForm["govId"], districtId: "", eaId: "" }))}><option value="">—</option>{world.governorates.map((g) => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}</Select></QField>
                <QField label={t("district")} error={fe("districtId")}><Select value={f.districtId} onChange={(e) => setF((s) => ({ ...s, districtId: e.target.value, eaId: "" }))} disabled={!f.govId}><option value="">—</option>{districts.map((d) => <option key={d.id} value={d.id}>{tx(d.name)}</option>)}</Select></QField>
                <QField label={t("ea")} error={fe("eaId")}><Select value={f.eaId} onChange={(e) => set("eaId", e.target.value)} disabled={!f.districtId}><option value="">—</option>{eas.map((e) => <option key={e.id} value={e.id}>{e.id}</option>)}</Select></QField>
                <QField label={L("Dwelling number in EA", "رقم المسكن في المنطقة")} error={fe("dwellingNo")} hint={L("1–4 digits", "من 1 إلى 4 أرقام")}><Input value={f.dwellingNo} onChange={(e) => set("dwellingNo", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" /></QField>
                <QField label={L("Occupancy status", "حالة الإشغال")} error={fe("occupancy")}><Select value={f.occupancy} onChange={(e) => set("occupancy", e.target.value as QForm["occupancy"])}><option value="">—</option>{opts("occupancy")}</Select></QField>
              </div>
              {f.occupancy && !occupied ? <Callout className="mt-3" tone="info">{L("Skip logic: sections B and C do not apply to a dwelling that is not occupied. Submit records the dwelling status only.", "منطق التخطي: لا ينطبق القسمان ب و ج على مسكن غير مشغول. يسجل الإرسال حالة المسكن فقط.")}</Callout> : null}
              <div className="mt-3 flex justify-end"><Button variant="primary" onClick={() => setSection("A")}>{t("next")}</Button></div>
            </Panel>
          ) : null}

          {section === "A" ? (
            <Panel title={L("Section A — Dwelling", "القسم أ — المسكن")}>
              {f.occupancy === "OCCUPIED" || f.occupancy === "" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <QField label={L("Housing type", "نوع المسكن")} error={fe("type")}><Select value={f.type} onChange={(e) => set("type", e.target.value as QForm["type"])}><option value="">—</option>{opts("dwellingType")}</Select></QField>
                  <QField label={L("Tenure", "حيازة المسكن")} error={fe("tenure")}><Select value={f.tenure} onChange={(e) => set("tenure", e.target.value as QForm["tenure"])}><option value="">—</option>{opts("tenure")}</Select></QField>
                  <QField label={L("Number of rooms", "عدد الغرف")} error={fe("rooms")}><Input type="number" min={1} value={f.rooms} onChange={(e) => set("rooms", e.target.value)} /></QField>
                  <QField label={L("Water connection", "مصدر المياه")} error={fe("water")}><Select value={f.water} onChange={(e) => set("water", e.target.value as QForm["water"])}><option value="">—</option>{opts("water")}</Select></QField>
                  <QField label={L("Electricity (public grid)", "الكهرباء (الشبكة العامة)")} error={fe("electricity")}><Select value={f.electricity} onChange={(e) => set("electricity", e.target.value as QForm["electricity"])}><option value="">—</option>{yesNo}</Select></QField>
                  <QField label={L("Sanitation", "الصرف الصحي")} error={fe("sanitation")}><Select value={f.sanitation} onChange={(e) => set("sanitation", e.target.value as QForm["sanitation"])}><option value="">—</option>{opts("sanitation")}</Select></QField>
                  <QField label={L("Internet at home", "الإنترنت في المنزل")} error={fe("internet")}><Select value={f.internet} onChange={(e) => set("internet", e.target.value as QForm["internet"])}><option value="">—</option>{yesNo}</Select></QField>
                  <QField label={L("Main heating", "التدفئة الرئيسية")} error={fe("heating")}><Select value={f.heating} onChange={(e) => set("heating", e.target.value as QForm["heating"])}><option value="">—</option>{opts("heating")}</Select></QField>
                  <QField label={L("Main cooling", "التبريد الرئيسي")} error={fe("cooling")}><Select value={f.cooling} onChange={(e) => set("cooling", e.target.value as QForm["cooling"])}><option value="">—</option>{opts("cooling")}</Select></QField>
                  <QField label={L("Vehicles owned", "عدد المركبات")} error={fe("vehicles")}><Input type="number" min={0} value={f.vehicles} onChange={(e) => set("vehicles", e.target.value)} /></QField>
                  <QField label={L("Usual residents", "عدد الأفراد المقيمين عادة")} error={fe("usualResidents")} hint={L("Must match the roster in section B", "يجب أن يطابق القائمة في القسم ب")}><Input type="number" min={1} value={f.usualResidents} onChange={(e) => set("usualResidents", e.target.value)} /></QField>
                </div>
              ) : <Callout>{L("Dwelling is not occupied — only identification and occupancy are recorded.", "المسكن غير مشغول — تُسجل بيانات التعريف والإشغال فقط.")}</Callout>}
              <div className="mt-3 flex justify-end"><Button variant="primary" onClick={() => setSection(occupied ? "B" : "R")}>{t("next")}</Button></div>
            </Panel>
          ) : null}

          {section === "B" && occupied ? (
            <Panel title={L("Section B — Household roster", "القسم ب — قائمة أفراد الأسرة")} subtitle={L("List every usual resident on census night. Line 1 should be the household reference person (head).", "اذكر كل فرد مقيم عادة ليلة التعداد. يجب أن يكون السطر 1 رب الأسرة.")} actions={<Button size="xs" variant="primary" onClick={() => { setF((s) => ({ ...s, persons: [...s.persons, newPerson()] })); }}><UserPlus size={12} />{L("Add person", "إضافة فرد")}</Button>}>
              {err("persons") ? <Callout tone="warn" className="mb-2">{errLabel("roster")}</Callout> : null}
              {v.errors.head && f.persons.length ? <Callout tone="warn" className="mb-2">{errLabel(v.errors.head)}</Callout> : null}
              {v.errors.usualResidents === "mismatch" ? <Callout tone="warn" className="mb-2">{L(`Usual residents (${f.usualResidents}) ≠ persons in roster (${f.persons.length}).`, `عدد المقيمين عادة (${f.usualResidents}) ≠ عدد الأفراد في القائمة (${f.persons.length}).`)}</Callout> : null}
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full min-w-[760px] text-[12.5px]">
                  <thead><tr className="text-[11px] uppercase tracking-wide text-ink-500"><th className="py-1 text-start">#</th><th className="text-start">{L("Name / synthetic identifier", "الاسم / معرّف اصطناعي")}</th><th className="text-start">{L("Relationship to head", "العلاقة برب الأسرة")}</th><th className="text-start">{L("Sex", "الجنس")}</th><th className="text-start">{L("Date of birth", "تاريخ الميلاد")}</th><th className="text-start">{L("Age", "العمر")}</th><th className="text-start">{L("Mother / father line", "سطر الأم / الأب")}</th><th /></tr></thead>
                  <tbody>
                    {f.persons.map((x, i) => {
                      const a = personAge(x, ref);
                      return (
                        <tr key={x.key} className="border-t border-line/60 align-top">
                          <td className="py-1.5 font-mono text-[11px] text-ink-500">{i + 1}</td>
                          <td className="py-1 pe-1.5"><Input value={x.name} onChange={(e) => setP(i, { name: e.target.value })} className={cn("w-full", err(`p${i}.name`) && "border-crit")} placeholder={`P-${i + 1}`} /></td>
                          <td className="py-1 pe-1.5"><Select value={x.relation} onChange={(e) => setP(i, { relation: e.target.value as QPerson["relation"] })} className={cn("w-full", err(`p${i}.relation`) && "border-crit")}><option value="">—</option>{opts("relation")}</Select></td>
                          <td className="py-1 pe-1.5"><Select value={x.sex} onChange={(e) => setP(i, { sex: e.target.value as QPerson["sex"] })} className={cn(err(`p${i}.sex`) && "border-crit")}><option value="">—</option>{opts("sex")}</Select></td>
                          <td className="py-1 pe-1.5"><Input type="date" value={x.dob} onChange={(e) => setP(i, { dob: e.target.value })} /></td>
                          <td className="py-1 pe-1.5"><Input type="number" value={x.dob ? String(a ?? "") : x.age} disabled={!!x.dob} onChange={(e) => setP(i, { age: e.target.value })} className={cn("w-16", err(`p${i}.age`) && "border-crit")} /></td>
                          <td className="py-1 pe-1.5"><div className="flex gap-1"><Input value={x.motherLine} onChange={(e) => setP(i, { motherLine: e.target.value.replace(/\D/g, "") })} className={cn("w-11", v.errors[`p${i}.motherLine`] && "border-crit")} placeholder="M" /><Input value={x.fatherLine} onChange={(e) => setP(i, { fatherLine: e.target.value.replace(/\D/g, "") })} className={cn("w-11", v.errors[`p${i}.fatherLine`] && "border-crit")} placeholder="F" /></div></td>
                          <td className="py-1 text-end"><Button size="icon" variant="ghost" aria-label={L("Remove person", "حذف الفرد")} onClick={() => { setF((s) => ({ ...s, persons: s.persons.filter((_, k) => k !== i) })); setPersonIdx(0); }}><Trash2 size={14} /></Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {f.persons.length === 0 ? <p className="py-6 text-center text-[12.5px] text-ink-500">{L("No persons yet — use “Add person”.", "لا يوجد أفراد بعد — استخدم «إضافة فرد».")}</p> : null}
              <div className="mt-3 flex justify-between"><Button onClick={() => setF((s) => ({ ...s, persons: [...s.persons, newPerson()] }))}><Plus size={13} />{L("Add person", "إضافة فرد")}</Button><Button variant="primary" onClick={() => setSection("C")} disabled={!f.persons.length}>{t("next")}</Button></div>
            </Panel>
          ) : null}

          {section === "C" && occupied ? (
            <Panel title={L("Section C — Person questionnaire", "القسم ج — استمارة الفرد")} subtitle={L("Questions appear according to age (skip logic): marital status 12+, education 5+, employment 15+, functional difficulty 5+.", "تظهر الأسئلة حسب العمر (منطق التخطي): الحالة الزواجية 12+، التعليم 5+، العمل 15+، صعوبات الأداء 5+.")}>
              <div className="mb-3 flex flex-wrap gap-1">
                {f.persons.map((x, i) => {
                  const bad = Object.keys(v.errors).some((k) => k.startsWith(`p${i}.`));
                  return <button key={x.key} type="button" onClick={() => setPersonIdx(i)} className={cn("rounded-md border px-2.5 py-1 text-[12px]", personIdx === i ? "border-navy-700 bg-navy-100/60 font-semibold" : "border-line bg-card", bad && "text-crit")}>{i + 1}. {x.name || `P-${i + 1}`}</button>;
                })}
              </div>
              {p && ap ? (
                <div className="space-y-4">
                  <div className="text-[12.5px] text-ink-500">{p.relation ? lb("relation", p.relation) : "—"} · {p.sex ? lb("sex", p.sex) : "—"} · {L("age", "العمر")} {pAge ?? "—"}</div>
                  <Group title={L("Demographics & residence", "البيانات الديموغرافية والإقامة")}>
                    {ap.marital ? <QField label={L("Marital status", "الحالة الزواجية")} error={fe(pe("marital"))}><Select value={p.marital} onChange={(e) => setP(personIdx, { marital: e.target.value as QPerson["marital"] })}><option value="">—</option>{opts("marital")}</Select></QField> : null}
                    <QField label={L("Nationality category", "فئة الجنسية")} error={fe(pe("nationality"))}><Select value={p.nationality} onChange={(e) => setP(personIdx, { nationality: e.target.value as QPerson["nationality"] })}><option value="">—</option>{opts("nationality")}</Select></QField>
                    <QField label={L("Usual residence", "مكان الإقامة المعتاد")}><Input value={f.govId ? `${tx(world.gov[f.govId].name)} — ${f.eaId}` : "—"} disabled /></QField>
                    <QField label={L("Ever lived in another governorate or country?", "هل أقام سابقاً في محافظة أو دولة أخرى؟")} error={fe(pe("moved"))}><Select value={p.moved} onChange={(e) => setP(personIdx, { moved: e.target.value as QPerson["moved"] })}><option value="">—</option>{yesNo}</Select></QField>
                    {ap.prevDetails ? <>
                      <QField label={L("Previous residence", "مكان الإقامة السابق")} error={fe(pe("prevType"))}><Select value={p.prevType} onChange={(e) => setP(personIdx, { prevType: e.target.value as QPerson["prevType"] })}><option value="">—</option><option value="GOV">{L("Another governorate", "محافظة أخرى")}</option><option value="ABROAD">{L("Abroad", "خارج الأردن")}</option></Select></QField>
                      {ap.prevGov ? <QField label={L("Previous governorate", "المحافظة السابقة")} error={fe(pe("prevGov"))}><Select value={p.prevGov} onChange={(e) => setP(personIdx, { prevGov: e.target.value as QPerson["prevGov"] })}><option value="">—</option>{world.governorates.filter((g) => g.id !== f.govId).map((g) => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}</Select></QField> : null}
                      {ap.prevCountry ? <QField label={L("Previous country", "الدولة السابقة")} error={fe(pe("prevCountry"))}><Select value={p.prevCountry} onChange={(e) => setP(personIdx, { prevCountry: e.target.value as QPerson["prevCountry"] })}><option value="">—</option>{opts("prevCountry")}</Select></QField> : null}
                      <QField label={L("Years since move", "السنوات منذ الانتقال")} error={fe(pe("yearsSince"))} hint={L("Cannot exceed age", "لا يمكن أن يتجاوز العمر")}><Input type="number" min={0} value={p.yearsSince} onChange={(e) => setP(personIdx, { yearsSince: e.target.value })} /></QField>
                      <QField label={L("Reason for move", "سبب الانتقال")} error={fe(pe("reason"))}><Select value={p.reason} onChange={(e) => setP(personIdx, { reason: e.target.value as QPerson["reason"] })}><option value="">—</option>{opts("moveReason")}</Select></QField>
                    </> : null}
                  </Group>
                  {ap.education ? (
                    <Group title={L("Education", "التعليم")}>
                      <QField label={L("Education status", "الحالة التعليمية")} error={fe(pe("eduStatus"))}><Select value={p.eduStatus} onChange={(e) => setP(personIdx, { eduStatus: e.target.value as QPerson["eduStatus"] })}><option value="">—</option>{Object.entries(LABELS.eduStatus).filter(([k]) => k !== "NOT_APPLICABLE").map(([k, val]) => <option key={k} value={k}>{ar ? val[1] : val[0]}</option>)}</Select></QField>
                      {ap.attainment ? <QField label={L("Highest educational attainment", "أعلى مؤهل تعليمي")} error={fe(pe("attainment"))}><Select value={p.attainment} onChange={(e) => setP(personIdx, { attainment: e.target.value as QPerson["attainment"] })}><option value="">—</option>{opts("attainment")}</Select></QField> : null}
                    </Group>
                  ) : null}
                  {ap.employment ? (
                    <Group title={L("Employment (15+)", "العمل (15 سنة فأكثر)")}>
                      <QField label={L("Employment status (last 7 days)", "الحالة العملية (آخر 7 أيام)")} error={fe(pe("employment"))}><Select value={p.employment} onChange={(e) => setP(personIdx, { employment: e.target.value as QPerson["employment"] })}><option value="">—</option>{Object.entries(LABELS.employment).filter(([k]) => k !== "NOT_APPLICABLE").map(([k, val]) => <option key={k} value={k}>{ar ? val[1] : val[0]}</option>)}</Select></QField>
                      {ap.occupation ? <>
                        <QField label={L("Occupation (ISCO major group)", "المهنة (المجموعة الرئيسية ISCO)")} error={fe(pe("occupation"))}><Select value={p.occupation} onChange={(e) => setP(personIdx, { occupation: e.target.value as QPerson["occupation"] })}><option value="">—</option>{opts("occupation")}</Select></QField>
                        <QField label={L("Economic activity (ISIC section)", "النشاط الاقتصادي (قسم ISIC)")} error={fe(pe("sector"))}><Select value={p.sector} onChange={(e) => setP(personIdx, { sector: e.target.value as QPerson["sector"] })}><option value="">—</option>{opts("sector")}</Select></QField>
                      </> : null}
                    </Group>
                  ) : null}
                  <Group title={L("Health", "الصحة")}>
                    <QField label={L("Health insurance", "التأمين الصحي")} error={fe(pe("insurance"))}><Select value={p.insurance} onChange={(e) => setP(personIdx, { insurance: e.target.value as QPerson["insurance"] })}><option value="">—</option>{yesNo}</Select></QField>
                  </Group>
                  {ap.wg ? (
                    <div>
                      <div className="mb-1.5 text-[12px] font-semibold text-ink-900">{L("Functional difficulty (Washington Group short set style)", "صعوبات الأداء الوظيفي (على غرار مجموعة واشنطن المختصرة)")}</div>
                      <div className="thin-scroll overflow-x-auto">
                        <table className="w-full min-w-[620px] text-[12px]">
                          <thead><tr className="text-[10.5px] uppercase text-ink-500"><th className="py-1 text-start">{L("Domain", "المجال")}</th>{["1", "2", "3", "4"].map((l) => <th key={l} className="px-1 text-center">{lb("wgLevel", l)}</th>)}</tr></thead>
                          <tbody>
                            {WG_KEYS.map((d) => (
                              <tr key={d} className={cn("border-t border-line/60", err(pe(`wg.${d}`)) && "bg-crit-bg/40")}>
                                <td className="py-1.5">{lb("wgDomain", d)}</td>
                                {(["1", "2", "3", "4"] as const).map((l) => <td key={l} className="text-center"><input type="radio" name={`${p.key}-${d}`} checked={p.wg[d] === l} onChange={() => setP(personIdx, { wg: { ...p.wg, [d]: l } })} aria-label={`${d} ${l}`} /></td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <Button disabled={personIdx === 0} onClick={() => setPersonIdx((x) => x - 1)}>{t("previous")}</Button>
                    {personIdx < f.persons.length - 1 ? <Button variant="primary" onClick={() => setPersonIdx((x) => x + 1)}>{L("Next person", "الفرد التالي")}</Button> : <Button variant="primary" onClick={() => setSection("R")}>{L("Review", "المراجعة")}</Button>}
                  </div>
                </div>
              ) : <p className="text-[12.5px] text-ink-500">{L("Add persons in section B first.", "أضف الأفراد في القسم ب أولاً.")}</p>}
            </Panel>
          ) : null}

          {section === "R" ? (
            <Panel title={L("Review & submit", "المراجعة والإرسال")}>
              <ValidationList v={v} errLabel={errLabel} />
              <div className="mt-3 flex justify-end gap-2"><Button variant="primary" onClick={submit}><Send size={13} />{L("Submit questionnaire", "إرسال الاستمارة")}</Button></div>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-3">
          <Panel title={L("Completion", "الإكمال")}>
            <div className="mb-1 flex justify-between text-[12px]"><span className="text-ink-500">{v.filled} / {v.required} {L("required items", "بند مطلوب")}</span><b className="tabular">{Math.round(progress * 100)}%</b></div>
            <div className="h-2 rounded-full bg-sand-100"><div className="h-2 rounded-full bg-navy-600 transition-[width]" style={{ width: `${progress * 100}%` }} /></div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <Button size="sm" onClick={saveDraft}><Save size={13} />{L("Save draft", "حفظ مسودة")}</Button>
              <Button size="sm" onClick={loadDraft}><FileUp size={13} />{L("Load draft", "تحميل مسودة")}</Button>
              <Button size="sm" onClick={() => { setF(emptyForm()); setSection("ID"); setTouched(false); }}><Trash2 size={13} />{L("Clear form", "مسح الاستمارة")}</Button>
              <Button size="sm" variant="primary" onClick={submit}><Send size={13} />{L("Submit", "إرسال")}</Button>
            </div>
          </Panel>
          <Panel title={L("Live validation", "التحقق المباشر")} subtitle={L("Hard errors block submission; warnings require confirmation and are routed to Data Quality.", "الأخطاء الجسيمة تمنع الإرسال؛ والتحذيرات تتطلب تأكيداً وتُوجَّه إلى جودة البيانات.")}>
            <ValidationList v={v} errLabel={errLabel} compact />
          </Panel>
          <Panel title={L("Submitted this session", "المرسلة في هذه الجلسة")} nature="SYNTHETIC_OPERATIONAL" sources={["OPS_QUESTIONNAIRE"]}>
            {engine.questionnaire.length === 0 ? <p className="text-[12px] text-ink-500">{t("none")}</p> : (
              <ul className="space-y-1">
                {engine.questionnaire.slice().reverse().map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2 text-[12px]"><span className="font-mono">{h.id}</span><span className="text-ink-500">{h.members.length} {t("persons")} · {engine.issues.filter((q) => q.householdId === h.id).length} {L("issues", "مسائل")}</span></li>
                ))}
              </ul>
            )}
            <Button size="xs" className="mt-2" onClick={() => downloadText("questionnaires.json", JSON.stringify(engine.questionnaire, null, 2))} disabled={!engine.questionnaire.length}><FileDown size={12} />JSON</Button>
          </Panel>
        </div>
      </div>

      <Modal open={confirmSoft} onOpenChange={setConfirmSoft} title={L("Submit with warnings?", "إرسال مع وجود تحذيرات؟")} footer={<><Button onClick={() => setConfirmSoft(false)}>{L("Go back and edit", "العودة للتعديل")}</Button><Button variant="primary" onClick={doSubmit}>{L("Confirm & submit", "تأكيد وإرسال")}</Button></>}>
        <p className="mb-2 text-[13px] text-ink-700">{L("The following edit-rule warnings will be routed to the Data Quality unit for review:", "ستُوجَّه تحذيرات قواعد التدقيق التالية إلى وحدة جودة البيانات للمراجعة:")}</p>
        <ul className="space-y-1">{v.warnings.map((w, i) => <li key={i} className="flex gap-2 text-[12.5px]"><SeverityBadge s={w.severity} /><span>{tx(w.message)}</span></li>)}</ul>
      </Modal>
    </div>
  );
}

function QField({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[12px] font-medium text-ink-700">{label}</span>
      {children}
      {error ? <span className="text-[11px] font-medium text-crit">{error}</span> : hint ? <span className="text-[11px] text-ink-500">{hint}</span> : null}
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-semibold text-ink-900">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

const FIELD_LABELS: Record<string, { en: string; ar: string }> = {
  govId: { en: "Governorate", ar: "المحافظة" }, districtId: { en: "District", ar: "اللواء" }, eaId: { en: "Enumeration Area", ar: "منطقة العدّ" }, dwellingNo: { en: "Dwelling number", ar: "رقم المسكن" },
  occupancy: { en: "Occupancy status", ar: "حالة الإشغال" }, type: { en: "Housing type", ar: "نوع المسكن" }, tenure: { en: "Tenure", ar: "الحيازة" }, rooms: { en: "Rooms", ar: "عدد الغرف" },
  water: { en: "Water connection", ar: "مصدر المياه" }, electricity: { en: "Electricity", ar: "الكهرباء" }, sanitation: { en: "Sanitation", ar: "الصرف الصحي" }, internet: { en: "Internet", ar: "الإنترنت" },
  heating: { en: "Heating", ar: "التدفئة" }, cooling: { en: "Cooling", ar: "التبريد" }, vehicles: { en: "Vehicles", ar: "المركبات" }, usualResidents: { en: "Usual residents", ar: "المقيمون عادة" },
  persons: { en: "Household roster", ar: "قائمة الأفراد" }, head: { en: "Household head", ar: "رب الأسرة" }, spouse: { en: "Spouse", ar: "الزوج/الزوجة" },
  name: { en: "Name / identifier", ar: "الاسم / المعرّف" }, relation: { en: "Relationship", ar: "العلاقة" }, sex: { en: "Sex", ar: "الجنس" }, age: { en: "Age / date of birth", ar: "العمر / تاريخ الميلاد" },
  nationality: { en: "Nationality", ar: "الجنسية" }, insurance: { en: "Health insurance", ar: "التأمين الصحي" }, marital: { en: "Marital status", ar: "الحالة الزواجية" }, moved: { en: "Lived elsewhere", ar: "الإقامة السابقة" },
  prevType: { en: "Previous residence", ar: "مكان الإقامة السابق" }, prevGov: { en: "Previous governorate", ar: "المحافظة السابقة" }, prevCountry: { en: "Previous country", ar: "الدولة السابقة" },
  yearsSince: { en: "Years since move", ar: "السنوات منذ الانتقال" }, reason: { en: "Reason for move", ar: "سبب الانتقال" }, eduStatus: { en: "Education status", ar: "الحالة التعليمية" },
  attainment: { en: "Educational attainment", ar: "المؤهل التعليمي" }, employment: { en: "Employment status", ar: "الحالة العملية" }, occupation: { en: "Occupation", ar: "المهنة" }, sector: { en: "Economic activity", ar: "النشاط الاقتصادي" },
  motherLine: { en: "Mother line", ar: "سطر الأم" }, fatherLine: { en: "Father line", ar: "سطر الأب" },
};

function ValidationList({ v, errLabel, compact }: { v: ReturnType<typeof validateForm>; errLabel: (c: string) => string; compact?: boolean }) {
  const { L, tx, lb } = useI18n();
  const errs = Object.entries(v.errors);
  if (!errs.length && !v.critical.length && !v.warnings.length) return <p className="flex items-center gap-1.5 text-[12.5px] text-ok"><CheckCircle2 size={14} />{L("No validation problems.", "لا توجد مشكلات تحقق.")}</p>;
  const labelFor = (k: string) => {
    const m = k.match(/^p(\d+)\.(.+)$/);
    const name = (key: string) => {
      if (key.startsWith("wg.")) return `${L("Difficulty", "الصعوبة")}: ${lb("wgDomain", key.slice(3))}`;
      const v = FIELD_LABELS[key];
      return v ? tx(v) : key;
    };
    return m ? `${L("Person", "الفرد")} ${Number(m[1]) + 1} · ${name(m[2])}` : name(k);
  };
  return (
    <div className="space-y-2">
      {v.critical.map((c, i) => <div key={`c${i}`} className="flex gap-2 text-[12px] text-crit"><AlertOctagon size={14} className="shrink-0" /><span><b>{c.ruleId}</b> {tx(c.message)}</span></div>)}
      {errs.slice(0, compact ? 8 : 60).map(([k, c]) => <div key={k} className="flex gap-2 text-[12px] text-crit"><AlertOctagon size={14} className="shrink-0" /><span><span className="font-medium">{labelFor(k)}</span> — {errLabel(c)}</span></div>)}
      {compact && errs.length > 8 ? <div className="text-[11.5px] text-ink-500">+{errs.length - 8} {L("more", "أخرى")}</div> : null}
      {v.warnings.map((w, i) => <div key={`w${i}`} className="flex gap-2 text-[12px] text-warn"><AlertTriangle size={14} className="shrink-0" /><span><b>{w.ruleId}</b> {tx(w.message)}</span></div>)}
    </div>
  );
}
