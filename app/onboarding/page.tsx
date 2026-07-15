import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupRequired } from "@/components/ui/SetupRequired";
import { CreateOrgForm } from "./CreateOrgForm";
import { AcceptInviteCard } from "./AcceptInviteCard";

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) return <SetupRequired />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) redirect("/");

  // The user has no profile yet — either they're bootstrapping a brand new
  // org, or a manager already invited them. Invite lookups need the admin
  // client: with no profile row, RLS has nothing to key an org_id off of.
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("invites")
    .select("id, org_id, role, orgs:org_id(name)")
    .eq("email", user.email!.toLowerCase())
    .is("accepted_at", null)
    .maybeSingle<{ id: string; org_id: string; role: "manager" | "rep"; orgs: { name: string } | null }>();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="vmark">
            <i />
            <i />
            <i />
          </span>
          <span className="display text-[20px] leading-none">
            METRYX<span className="text-blue">OS</span>
          </span>
        </div>

        {invite ? (
          <AcceptInviteCard orgName={invite.orgs?.name ?? "your team"} role={invite.role} />
        ) : (
          <CreateOrgForm />
        )}
      </div>
    </div>
  );
}
