import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusSelect } from "@/components/accounts/StatusSelect";
import { AssignOwnerSelect } from "@/components/accounts/AssignOwnerSelect";
import { ImportCsvButton } from "@/components/accounts/ImportCsvButton";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AccountsPage() {
  const { profile } = await requireProfile();
  const isManager = profile.role === "manager";
  const supabase = await createClient();

  let query = supabase
    .from("accounts")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("name");

  if (!isManager) {
    query = query.eq("owner_rep_id", profile.id);
  }

  const { data: accounts } = await query;

  const [{ data: reps }, { data: owners }, { data: contactCounts }] = await Promise.all([
    isManager
      ? supabase.from("profiles").select("id, full_name").eq("org_id", profile.org_id).eq("role", "rep").order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    supabase.from("profiles").select("id, full_name").eq("org_id", profile.org_id),
    accounts && accounts.length > 0
      ? supabase.from("contacts").select("account_id").in("account_id", accounts.map((a) => a.id))
      : Promise.resolve({ data: [] as { account_id: string }[] }),
  ]);

  const ownerNameById = Object.fromEntries((owners ?? []).map((o) => [o.id, o.full_name]));
  const contactCountByAccount: Record<string, number> = {};
  for (const c of contactCounts ?? []) {
    contactCountByAccount[c.account_id] = (contactCountByAccount[c.account_id] ?? 0) + 1;
  }

  return (
    <>
      <PageHeader
        title={isManager ? "Accounts" : "My Accounts"}
        subtitle={isManager ? "Every account in the org, assignable to reps" : "Accounts assigned to you"}
        actions={isManager ? <ImportCsvButton /> : undefined}
      />

      {!accounts || accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          body={
            isManager
              ? "Import accounts and contacts from a CSV to get started."
              : "Your manager hasn't assigned you any accounts yet."
          }
          action={isManager ? <ImportCsvButton /> : undefined}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-dim">
                <th className="mono px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.1em]">Account</th>
                <th className="mono px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.1em]">Location</th>
                <th className="mono px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.1em]">Contacts</th>
                <th className="mono px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.1em]">Status</th>
                <th className="mono px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.1em]">Owner</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link href={`/accounts/${a.id}`} className="font-bold hover:text-blue">
                      {a.name}
                    </Link>
                    {a.industry && <div className="text-[12px] text-muted">{a.industry}</div>}
                  </td>
                  <td className="px-3 py-3 text-muted">{[a.city, a.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="mono px-3 py-3 text-muted">{contactCountByAccount[a.id] ?? 0}</td>
                  <td className="px-3 py-3">
                    <StatusSelect table="accounts" column="status" id={a.id} status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    {isManager ? (
                      <AssignOwnerSelect accountId={a.id} ownerRepId={a.owner_rep_id} reps={reps ?? []} />
                    ) : (
                      <span className="text-muted">{a.owner_rep_id ? ownerNameById[a.owner_rep_id] ?? "—" : "Unassigned"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
