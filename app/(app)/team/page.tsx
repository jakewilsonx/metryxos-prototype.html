import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

export default async function TeamPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "manager") redirect("/today");

  return (
    <>
      <PageHeader title="Team" subtitle="Reps in your org" />
      <EmptyState
        title="Just you so far"
        body="Invite reps by email to get them working the playbook."
        action={<button className="btn primary">Invite a rep</button>}
      />
    </>
  );
}
