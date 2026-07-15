import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireProfile } from "@/lib/auth";

export default async function AccountsPage() {
  const { profile } = await requireProfile();
  const isManager = profile.role === "manager";

  return (
    <>
      <PageHeader
        title={isManager ? "Accounts" : "My Accounts"}
        subtitle={isManager ? "Every account in the org, assignable to reps" : "Accounts assigned to you"}
      />
      <EmptyState
        title="No accounts yet"
        body={
          isManager
            ? "Import accounts and contacts from a CSV to get started, or add one manually."
            : "Your manager hasn't assigned you any accounts yet."
        }
        action={isManager ? <button className="btn primary">Import CSV</button> : undefined}
      />
    </>
  );
}
