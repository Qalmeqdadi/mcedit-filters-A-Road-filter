"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck, CircleAlert, CircleCheck, Info, UserCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";
import { cn, relativeTime } from "@/lib/utils";

const ICON = { info: Info, success: CircleCheck, warning: CircleAlert, action: UserCheck };
const TONE = { info: "text-sky-500 bg-sky-50", success: "text-ok-500 bg-ok-50", warning: "text-warn-500 bg-warn-50", action: "text-magenta-500 bg-magenta-50" };

export function NotificationsBell() {
  const router = useRouter();
  const notifications = useApp((s) => s.notifications);
  const markAllRead = useApp((s) => s.markAllRead);
  const markRead = useApp((s) => s.markRead);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unread} unread)`}>
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-magenta-500 px-1 text-[10px] font-semibold text-white">{unread}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold text-navy-900">Notifications</div>
          <Button variant="ghost" size="xs" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <div className="scrollbar-thin max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-navy-500">You&apos;re all caught up.</div>
          ) : (
            notifications.map((n) => {
              const Icon = ICON[n.tone];
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    if (n.href) router.push(n.href);
                  }}
                  className={cn("flex w-full gap-3 border-b border-border/60 px-4 py-3 text-left transition hover:bg-navy-50/60", !n.read && "bg-gold-50/40")}
                >
                  <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", TONE[n.tone])}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-navy-900">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-magenta-500" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-navy-600">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-navy-400">{relativeTime(n.timestamp)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
