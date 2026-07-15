import { Sidebar } from "@/components/shell/Sidebar";
import { MobileNav } from "@/components/shell/MobileNav";
import { repNav, managerNav } from "@/components/shell/navConfig";
import { requireProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupRequired } from "@/components/ui/SetupRequired";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <SetupRequired />;

  const { profile, org } = await requireProfile();
  const isRep = profile.role === "rep";

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} fullName={profile.full_name} orgName={org.name} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          items={isRep ? repNav : managerNav}
          workspaceLabel={isRep ? "Rep Workspace" : "Manager Cockpit"}
          fullName={profile.full_name}
          roleLabel={`${isRep ? "Rep" : "Manager"} · ${org.name}`}
        />
        <main className="max-w-[1220px] flex-1 px-4 py-6 md:px-8 md:py-6.5">{children}</main>
      </div>
    </div>
  );
}
