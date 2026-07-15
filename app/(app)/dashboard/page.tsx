import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

export default async function DashboardPage() {
  const { profile, org } = await requireProfile();
  if (profile.role !== "manager") redirect("/today");

  return (
    <>
      <PageHeader title="Team Dashboard" subtitle={`${org.name} · Trailing 30 days`} />
      <EmptyState
        title="No activity yet"
        body="Once reps start completing action cards, team stats, rep consistency, and pipeline will show up here."
      />
    </>
  );
}
