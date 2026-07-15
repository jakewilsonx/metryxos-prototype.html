"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavEntry = {
  href: string;
  label: string;
  icon: ReactNode;
};

export function NavList({ items }: { items: NavEntry[] }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`navitem flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm font-medium ${
              active ? "bg-blue-soft text-blue" : "text-muted hover:bg-surface2 hover:text-text"
            }`}
          >
            <span className="block h-[17px] w-[17px] shrink-0">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
