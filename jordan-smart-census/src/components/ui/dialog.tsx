"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";
import { useApp } from "@/store/app";

export function Modal({ open, onOpenChange, title, description, children, className, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; children: ReactNode; className?: string; footer?: ReactNode }) {
  const { dir, t } = useI18n();
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-navy-950/45 backdrop-blur-[1px]" />
        <D.Content dir={dir} className={cn("fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(640px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-line bg-card shadow-2xl flex flex-col", className)}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
            <div>
              <D.Title className="text-[15px] font-semibold text-ink-900">{title}</D.Title>
              {description ? <D.Description className="mt-0.5 text-[12.5px] text-ink-500">{description}</D.Description> : <D.Description className="sr-only">{String(title)}</D.Description>}
            </div>
            <D.Close className="rounded p-1 text-ink-500 hover:bg-sand-100" aria-label={t("close")}><X size={16} /></D.Close>
          </div>
          <div className="thin-scroll overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-line bg-sand-50 px-5 py-3">{footer}</div> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function Sheet({ open, onOpenChange, title, description, children, width = 520, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; children: ReactNode; width?: number; footer?: ReactNode }) {
  const { dir, ar, t } = useI18n();
  // while the executive demo runs, sheets are non-modal so the presenter bar stays clickable
  const demo = useApp((s) => s.demoActive);
  return (
    <D.Root open={open} onOpenChange={onOpenChange} modal={!demo}>
      <D.Portal>
        {!demo ? <D.Overlay className="fixed inset-0 z-50 bg-navy-950/35" /> : null}
        <D.Content dir={dir} style={{ width: `min(${width}px, 96vw)` }} className={cn("fixed top-0 z-50 flex h-full flex-col border-line bg-card shadow-2xl", ar ? "left-0 border-r" : "right-0 border-l")}>
          <div className="flex items-start justify-between gap-4 border-b border-line bg-sand-50 px-5 py-3.5">
            <div className="min-w-0">
              <D.Title className="text-[15px] font-semibold text-ink-900">{title}</D.Title>
              {description ? <D.Description className="mt-0.5 text-[12.5px] text-ink-500">{description}</D.Description> : <D.Description className="sr-only">{String(title)}</D.Description>}
            </div>
            <D.Close className="rounded p-1 text-ink-500 hover:bg-sand-100" aria-label={t("close")}><X size={16} /></D.Close>
          </div>
          <div className="thin-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex justify-end gap-2 border-t border-line bg-sand-50 px-5 py-3">{footer}</div> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
