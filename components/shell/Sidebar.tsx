import { Logo } from "@/components/ui/Logo";
import { NavList } from "@/components/shell/NavList";
import { repNav, managerNav } from "@/components/shell/navConfig";
import { SignOutButton } from "@/components/shell/SignOutButton";
import type { ProfileRole } from "@/lib/database.types";

export function Sidebar({
  role,
  fullName,
  orgName,
}: {
  role: ProfileRole;
  fullName: string;
  orgName: string;
}) {
  const isRep = role === "rep";
  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen w-[216px] shrink-0 flex-col gap-1 border-r border-border bg-surface p-3.5 md:flex">
      <Logo />

      <div className="mono px-2.5 pb-1.5 pt-3.5 text-[10px] uppercase tracking-[0.14em] text-dim">
        {isRep ? "Rep Workspace" : "Manager Cockpit"}
      </div>
      <NavList items={isRep ? repNav : managerNav} />

      <div className="flex-1" />

      <div className="flex items-center gap-2.5 border-t border-border p-2.5">
        <div className="avatar flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue to-[#0E3B85] text-[11px] font-bold">
          {initials || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold leading-tight">{fullName}</div>
          <div className="truncate text-[11px] text-dim">
            {isRep ? "Rep" : "Manager"} · {orgName}
          </div>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
