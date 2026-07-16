import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlaybookEditor } from "@/components/playbook/PlaybookEditor";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function PlaybookPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "manager") redirect("/today");

  const supabase = await createClient();
  const [{ data: playbook }, { data: templates }] = await Promise.all([
    supabase.from("playbooks").select("*").eq("org_id", profile.org_id).maybeSingle(),
    supabase.from("sequence_templates").select("*").eq("org_id", profile.org_id).order("created_at"),
  ]);

  // Should always exist (created at org bootstrap) — fall back just in case
  // this org predates that, so the page never hard-fails.
  const resolvedPlaybook =
    playbook ?? {
      id: "",
      org_id: profile.org_id,
      icp: { industries: [], company_size: "", personas: [] },
      pillars: [],
      cadence_rules: { daily_actions_target: 5, min_days_between_touches: 2, max_touches_per_contact_per_week: 3 },
      tone_rules: "",
      updated_at: new Date().toISOString(),
    };

  return (
    <>
      <PageHeader title="Playbook" subtitle="Define it once — the coach and card generator apply it everywhere" />
      <PlaybookEditor orgId={profile.org_id} playbook={resolvedPlaybook} templates={templates ?? []} />
    </>
  );
}
