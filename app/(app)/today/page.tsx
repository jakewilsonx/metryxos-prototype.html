import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function TodayPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "rep") redirect("/dashboard");

  return (
    <>
      <PageHeader title="Today" subtitle="Your action cards land here" />
      <EmptyState
        title="No day generated yet"
        body="Generate your day to get playbook-consistent engagement, outreach, and follow-up cards for your accounts."
        action={<button className="btn primary">Generate my day</button>}
      />
    </>
  );
}
