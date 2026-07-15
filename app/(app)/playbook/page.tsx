import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

export default async function PlaybookPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "manager") redirect("/today");

  return (
    <>
      <PageHeader title="Playbook" subtitle="Define it once — the coach applies it everywhere" />
      <EmptyState
        title="No playbook set up"
        body="Define your ICP, messaging pillars, cadence rules, and sequence templates. Reps' cards and coaching will follow this exactly."
        action={<button className="btn primary">Set up playbook</button>}
      />
    </>
  );
}
