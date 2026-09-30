"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Check, ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, PartyPopper, PlayCircle, Presentation, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { GUIDED_STEPS } from "@/lib/guided";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export function StartGuidedButton({ label = "Start Guided Demo", size = "sm", compact = true }: { label?: string; size?: "sm" | "lg" | "default"; compact?: boolean }) {
  const active = useApp((s) => s.guided.active);
  const setGuided = useApp((s) => s.setGuided);
  const resetDemo = useApp((s) => s.resetDemo);
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const start = (fresh: boolean) => {
    if (fresh) resetDemo();
    useApp.getState().setGuided({ active: true, step: 0, minimized: false });
    useApp.getState().log({ actor: "Presenter", actorType: "human", action: "Started guided demo", detail: fresh ? "From a fresh case" : "Continuing current state", stage: "platform" });
    router.push(GUIDED_STEPS[0].route);
  };

  if (active)
    return (
      <Button variant="secondary" size={size} onClick={() => setGuided({ minimized: false })}>
        <Presentation className="text-magenta-500" />
        <span className={compact ? "hidden sm:inline" : ""}>Guided demo running</span>
      </Button>
    );

  return (
    <>
      <Button variant="magenta" size={size} onClick={() => setOpen(true)} data-testid="start-guided">
        <PlayCircle />
        <span className={compact ? "hidden sm:inline" : ""}>{label}</span>
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start the guided demo</AlertDialogTitle>
            <AlertDialogDescription>
              Nine steps walk through the full lifecycle in 5–7 minutes: demand, RFx, suppliers, evaluation, the human award decision, approvals, contract and monitoring. Use{" "}
              <kbd className="rounded border px-1 text-[11px]">→</kbd> or a presentation clicker to advance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => start(false)}>Continue current state</AlertDialogCancel>
            <AlertDialogAction variant="magenta" onClick={() => start(true)}>
              Start from a fresh case
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function GuidedPanel() {
  const guided = useApp((s) => s.guided);
  const setGuided = useApp((s) => s.setGuided);
  const state = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  const step = GUIDED_STEPS[guided.step];
  const isLast = guided.step === GUIDED_STEPS.length - 1;
  const nextAction = step?.actions.find((a) => !a.done(state));
  const stepDone = !nextAction;
  const allDone = isLast && stepDone;
  const running = state.running.length > 0;

  // Keep the presenter on the right page for the current step.
  useEffect(() => {
    if (guided.active && step && pathname !== step.route) router.push(step.route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guided.active, guided.step]);

  const goto = useCallback(
    (n: number) => {
      const bounded = Math.max(0, Math.min(GUIDED_STEPS.length - 1, n));
      setGuided({ step: bounded, minimized: false });
      router.push(GUIDED_STEPS[bounded].route);
    },
    [router, setGuided],
  );

  const primary = useCallback(async () => {
    if (busy || running) return;
    if (nextAction) {
      if (nextAction.label.startsWith("Await")) return;
      setBusy(true);
      try {
        await nextAction.run();
      } finally {
        setBusy(false);
      }
    } else if (!isLast) {
      goto(guided.step + 1);
    }
  }, [busy, running, nextAction, isLast, goto, guided.step]);

  // Presenter clicker / keyboard support.
  useEffect(() => {
    if (!guided.active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (document.querySelector("[role='dialog'],[role='alertdialog']")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        primary();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goto(guided.step - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guided.active, guided.step, primary, goto]);

  if (!guided.active || !step) return null;

  const awaiting = nextAction?.label.startsWith("Await");

  return (
    <div
      data-guided-panel
      className={cn(
        "fixed bottom-4 left-1/2 z-40 w-[calc(100vw-1.5rem)] -translate-x-1/2 lg:left-[calc(50%+128px)]",
        guided.minimized ? "max-w-sm" : "max-w-[640px]",
      )}
    >
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25 }}
      >
        <div className="overflow-hidden rounded-2xl border border-navy-700 bg-navy-900 text-white shadow-[0_20px_60px_-12px_rgba(10,26,51,0.55)]">
          {/* progress */}
          <div className="flex h-1 w-full gap-0.5 bg-navy-800">
            {GUIDED_STEPS.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to step ${i + 1}`}
                onClick={() => goto(i)}
                className={cn("h-full flex-1 transition", i < guided.step ? "bg-gold-400" : i === guided.step ? "bg-magenta-400" : "bg-navy-700 hover:bg-navy-600")}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-300">
              <Presentation className="h-3.5 w-3.5" /> Guided demo · Step {guided.step + 1} of {GUIDED_STEPS.length}
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setGuided({ minimized: !guided.minimized })} className="rounded-md p-1.5 text-navy-200 hover:bg-navy-800 hover:text-white" aria-label={guided.minimized ? "Expand" : "Minimise"}>
                {guided.minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => {
                  setGuided({ active: false });
                  useApp.getState().log({ actor: "Presenter", actorType: "human", action: "Exited guided demo", stage: "platform" });
                }}
                className="rounded-md p-1.5 text-navy-200 hover:bg-navy-800 hover:text-white"
                aria-label="Exit guided demo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="text-lg font-semibold tracking-tight">{allDone ? "Lifecycle complete" : step.title}</div>

            {!guided.minimized && (
              <>
                {allDone ? (
                  <div className="mt-1 space-y-3">
                    <p className="text-[13px] leading-relaxed text-navy-100">
                      From demand to active monitoring: seven specialist agents did the preparation, analysis and orchestration. Every material decision — route, RFx release, shortlist, award, approvals and escalation — was made by an accountable human and recorded in the audit trail.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="gold" asChild>
                        <Link href="/value">
                          <PartyPopper /> View value hypothesis
                        </Link>
                      </Button>
                      <Button size="sm" variant="secondary" asChild>
                        <Link href="/agents">AI Control & agent activity</Link>
                      </Button>
                      <Button size="sm" variant="secondary" asChild>
                        <Link href="/audit">Audit trail</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-[13px] leading-relaxed text-navy-100">{step.narration}</p>
                    <p className="mt-2 border-l-2 border-gold-400 pl-2.5 text-[12.5px] italic text-gold-200">“{step.talkingPoint}”</p>
                    {step.actions.length > 0 && (
                      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                        {step.actions.map((a) => {
                          const done = a.done(state);
                          const current = a === nextAction;
                          return (
                            <li
                              key={a.label}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px]",
                                done ? "bg-navy-800/60 text-navy-200" : current ? "bg-navy-800 text-white ring-1 ring-magenta-400/60" : "text-navy-300",
                              )}
                            >
                              {done ? (
                                <Check className="h-3.5 w-3.5 text-gold-300" />
                              ) : a.actor === "agent" ? (
                                <Bot className="h-3.5 w-3.5 text-sky-200" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5 text-magenta-200" />
                              )}
                              <span className="truncate">{a.label}</span>
                              <span className={cn("ml-auto shrink-0 rounded px-1 text-[9.5px] font-semibold uppercase tracking-wider", a.actor === "agent" ? "bg-sky-500/20 text-sky-100" : "bg-magenta-500/25 text-magenta-100")}>
                                {a.actor}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
              </>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <Button size="sm" variant="ghost" className="text-navy-100 hover:bg-navy-800 hover:text-white" onClick={() => goto(guided.step - 1)} disabled={guided.step === 0}>
                <ChevronLeft /> Back
              </Button>
              {!allDone && (
                <Button
                  size="sm"
                  variant={nextAction ? (nextAction.actor === "human" ? "magenta" : "gold") : "gold"}
                  onClick={primary}
                  disabled={busy || running || awaiting}
                  className="min-w-[180px]"
                  data-testid="guided-primary"
                >
                  {busy || running || awaiting ? (
                    <>
                      <Loader2 className="animate-spin" /> {awaiting ? "Awaiting reviewer…" : "Agent working…"}
                    </>
                  ) : nextAction ? (
                    <>
                      {nextAction.actor === "human" ? <UserCheck /> : <Bot />} {nextAction.label}
                    </>
                  ) : (
                    <>
                      Next: {GUIDED_STEPS[guided.step + 1]?.title} <ChevronRight />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
    </div>
  );
}
