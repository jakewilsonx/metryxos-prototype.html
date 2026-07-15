import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

export default async function ReportsPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "manager") redirect("/today");

  return (
    <>
      <PageHeader title="Reports" subtitle="Monthly summary and exports" />
      <EmptyState
        title="Nothing to report yet"
        body="Once your team has a month of activity, a monthly summary and CSV exports will show up here."
      />
    </>
  );
}
