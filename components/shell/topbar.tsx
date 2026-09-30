"use client";

import Link from "next/link";
import { useState } from "react";
import { FileClock, Info, Menu, RotateCcw, ShieldCheck } from "lucide-react";
import { DEMO_USER } from "@/data/case";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tip } from "@/components/ui/tooltip";
import { SidebarNav } from "@/components/shell/sidebar";
import { ClientAttribution } from "@/components/shell/brand";
import { NotificationsBell } from "@/components/shell/notifications";
import { StartGuidedButton } from "@/components/shell/guided-panel";
import { SyntheticBadge } from "@/components/common/status";
import { resetDemo } from "@/lib/actions";
import { useApp } from "@/lib/store";
import { getAgentProvider } from "@/services/agent-service";

export function Topbar() {
  const [navOpen, setNavOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const setAiControlOpen = useApp((s) => s.setAiControlOpen);
  const paused = useApp((s) => Object.values(s.agents).some((a) => a.status === "paused"));

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
          <ClientAttribution />
          <SyntheticBadge />
        </div>
        <div className="flex-1 md:hidden" />

        <div className="flex items-center gap-1.5 sm:gap-2">
          <StartGuidedButton />
          <Tip content="Persistent AI Control layer: identity, permissions, thresholds, kill-switch">
            <Button variant="outline" size="sm" onClick={() => setAiControlOpen(true)} className={paused ? "border-risk-100 text-risk-600" : ""}>
              <ShieldCheck className={paused ? "text-risk-500" : "text-gold-500"} />
              <span className="hidden sm:inline">AI Control</span>
              {paused && <span className="h-1.5 w-1.5 rounded-full bg-risk-500" />}
            </Button>
          </Tip>
          <NotificationsBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="User menu">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-100 text-xs font-semibold text-gold-700">{DEMO_USER.initials}</span>
                <span className="hidden text-left leading-tight xl:block">
                  <span className="block text-[13px] font-medium text-navy-900">{DEMO_USER.name}</span>
                  <span className="block text-[11px] text-navy-500">{DEMO_USER.role}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>
                <div className="font-medium text-navy-900">{DEMO_USER.name}</div>
                <div>
                  {DEMO_USER.role} · {DEMO_USER.note}
                </div>
                <div className="mt-1">Role: procurement.lead (RBAC-ready, auth disabled in demo)</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/audit">
                  <FileClock /> View audit trail
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAboutOpen(true)}>
                <Info /> About this demo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setResetOpen(true)} className="text-risk-600 [&_svg]:text-risk-500">
                <RotateCcw /> Reset demo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[290px] sm:max-w-[290px]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset the demo?</AlertDialogTitle>
            <AlertDialogDescription>
              All stages, agent states, decisions, notifications and audit events will return to the starting state. Use this before a new presentation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={resetDemo}>
              Reset demo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>About this demonstration</DialogTitle>
            <DialogDescription>Illustrative Proof of Value — Agentic Supplier & Procurement Lifecycle Orchestrator.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed text-navy-700">
            <p>
              This prototype shows how specialist AI agents can orchestrate an end-to-end procurement lifecycle while humans retain accountability for every material decision.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>All suppliers, people, figures and documents are <strong>synthetic</strong> and created for demonstration only.</li>
              <li>No Etihad Credit Bureau systems or credit data are connected. External / credit-risk information is shown only as an illustration of use where legally permitted and authorised.</li>
              <li>Agent responses come from a deterministic provider ({getAgentProvider().label}); the architecture supports OpenAI, Azure OpenAI or other LLM providers.</li>
              <li>Value metrics are illustrative hypotheses to be validated during the PoV.</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
