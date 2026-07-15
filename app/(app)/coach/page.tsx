import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

export default async function CoachPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "rep") redirect("/dashboard");

  return (
    <>
      <PageHeader title="Coach" subtitle="Playbook-aware, plant-floor fluent" />
      <EmptyState
        title="Coach chat ships in Phase 4"
        body="Ask objection-handling questions, get drafts, and get advice grounded in your org's playbook."
      />
    </>
  );
}
