"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { TASK_STEPS } from "@/agents/task-steps";
import { MOCK_STEP_MS } from "@/services/providers/mock";
import { cn } from "@/lib/utils";
import type { AgentTask } from "@/types";

/**
 * Visual "agent working" state. Shows the tool/system steps being executed —
 * not private reasoning.
 */
export function AgentThinking({ task, className, compact }: { task: AgentTask; className?: string; compact?: boolean }) {
  const steps = TASK_STEPS[task];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
    const t = setInterval(() => setIdx((i) => Math.min(i + 1, steps.length - 1)), MOCK_STEP_MS);
    return () => clearInterval(t);
  }, [task, steps.length]);

  return (
    <div className={cn("rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white p-4", className)} role="status" aria-live="polite">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-sky-200 opacity-60" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-sky-500" />
        </span>
        <span className="text-sm font-medium text-navy-800">Agent working</span>
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 w-1 rounded-full bg-sky-500 animate-pulse-dot" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </span>
      </div>
      <ul className={cn("space-y-1.5", compact && "space-y-1")}>
        {steps.map((s, i) => (
          <motion.li
            key={s}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: i <= idx ? 1 : 0.35, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03 }}
            className="flex items-center gap-2 text-[13px] text-navy-700"
          >
            {i < idx ? (
              <Check className="h-3.5 w-3.5 text-ok-500" />
            ) : i === idx ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" />
            ) : (
              <span className="mx-[3px] h-2 w-2 rounded-full border border-navy-200" />
            )}
            {s}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
