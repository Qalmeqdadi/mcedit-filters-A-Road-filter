"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Server, UserCheck } from "lucide-react";
import { AMBIENT_ACTIVITY, PORTFOLIO_ACTIVITY } from "@/data/activity";
import { useApp } from "@/lib/store";
import { cn, formatTime } from "@/lib/utils";

interface FeedItem {
  id: string;
  time: string;
  actor: string;
  type: "agent" | "human" | "system";
  action: string;
  detail?: string;
  ref: string;
}

/** Live-looking activity feed: case audit events + synthetic portfolio activity. */
export function ActivityFeed({ limit = 40, className }: { limit?: number; className?: string }) {
  const audit = useApp((s) => s.audit);
  const [ambient, setAmbient] = useState<FeedItem[]>([]);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      const a = AMBIENT_ACTIVITY[i % AMBIENT_ACTIVITY.length];
      i += 1;
      setAmbient((prev) => [{ id: `amb-${Date.now()}`, time: formatTime(new Date().toISOString()), actor: a.actor, type: "agent" as const, action: a.action, ref: a.ref }, ...prev].slice(0, 6));
    }, 18000);
    return () => clearInterval(t);
  }, []);

  const caseItems: FeedItem[] = audit.map((e) => ({
    id: e.id,
    time: formatTime(e.timestamp),
    actor: e.actor,
    type: e.actorType,
    action: e.action,
    detail: e.detail,
    ref: e.stage === "governance" ? "AI Control" : e.stage === "platform" ? "Demo" : "PRC-2026-0147",
  }));
  const seeded: FeedItem[] = [...PORTFOLIO_ACTIVITY].reverse().map((p, i) => ({ id: `seed-${i}`, time: p.time, actor: p.actor, type: p.type, action: p.action, ref: p.ref }));
  const items = [...ambient, ...caseItems, ...seeded].slice(0, limit);

  return (
    <div className={cn("space-y-0", className)}>
      <AnimatePresence initial={false}>
        {items.map((e) => (
          <motion.div
            key={e.id}
            layout
            initial={{ opacity: 0, y: -6, backgroundColor: "rgba(244,235,216,0.9)" }}
            animate={{ opacity: 1, y: 0, backgroundColor: "rgba(255,255,255,0)" }}
            transition={{ duration: 0.6 }}
            className="flex gap-3 border-b border-border/60 px-1 py-2.5 last:border-0"
          >
            <span className="tabular w-11 shrink-0 pt-0.5 text-[12px] font-medium text-navy-400">{e.time}</span>
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                e.type === "agent" ? "bg-sky-50 text-sky-600" : e.type === "human" ? "bg-magenta-50 text-magenta-600" : "bg-navy-50 text-navy-500",
              )}
            >
              {e.type === "agent" ? <Bot className="h-3.5 w-3.5" /> : e.type === "human" ? <UserCheck className="h-3.5 w-3.5" /> : <Server className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] leading-snug text-navy-700">
                <span className="font-semibold text-navy-900">{e.actor}</span> {e.action.charAt(0).toLowerCase() + e.action.slice(1)}
              </div>
              {e.detail && <div className="mt-0.5 line-clamp-2 text-[11.5px] text-navy-500">{e.detail}</div>}
              <div className="mt-0.5 text-[10.5px] font-medium uppercase tracking-wider text-navy-400">{e.ref}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
