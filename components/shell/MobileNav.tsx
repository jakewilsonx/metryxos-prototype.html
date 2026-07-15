"use client";

import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { NavList, type NavEntry } from "@/components/shell/NavList";
import { SignOutButton } from "@/components/shell/SignOutButton";

export function MobileNav({
  items,
  workspaceLabel,
  fullName,
  roleLabel,
}: {
  items: NavEntry[];
  workspaceLabel: string;
  fullName: string;
  roleLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
      <div className="flex items-center gap-2">
        <span className="vmark">
          <i />
          <i />
          <i />
        </span>
        <span className="display text-[15px] leading-none">
          METRYX<span className="text-blue">OS</span>
        </span>
      </div>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="btn ghost !p-2"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-[240px] flex-col gap-1 border-r border-border bg-surface p-3.5 flex">
            <div className="flex items-center justify-between pb-4">
              <Logo />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="btn ghost !p-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mono px-2.5 pb-1.5 text-[10px] uppercase tracking-[0.14em] text-dim">
              {workspaceLabel}
            </div>
            <div onClick={() => setOpen(false)}>
              <NavList items={items} />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2.5 border-t border-border p-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold leading-tight">{fullName}</div>
                <div className="truncate text-[11px] text-dim">{roleLabel}</div>
              </div>
              <SignOutButton />
            </div>
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
