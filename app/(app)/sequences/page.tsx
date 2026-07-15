import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

export default async function SequencesPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "rep") redirect("/dashboard");

  return (
    <>
      <PageHeader title="Sequences" subtitle="Active playbook sequences across your contacts" />
      <EmptyState
        title="No active sequences"
        body="Sequences start automatically when a contact enters a playbook cadence. Assign accounts to get moving."
      />
    </>
  );
}
