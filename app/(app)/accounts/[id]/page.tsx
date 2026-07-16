import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusDot } from "@/components/ui/StatusDot";
import { StatusSelect } from "@/components/accounts/StatusSelect";
import { AssignOwnerSelect } from "@/components/accounts/AssignOwnerSelect";
import { SignalsPanel } from "@/components/accounts/SignalsPanel";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: account } = await supabase.from("accounts").select("*").eq("id", id).single();
  if (!account || account.org_id !== profile.org_id) notFound();

  const isManager = profile.role === "manager";
  const canEditStatus = isManager || account.owner_rep_id === profile.id;

  const [{ data: contacts }, { data: signals }, { data: reps }, { data: orgProfiles }] = await Promise.all([
    supabase.from("contacts").select("*").eq("account_id", id).order("full_name"),
    supabase.from("signals").select("*").eq("account_id", id).order("created_at", { ascending: false }),
    isManager
      ? supabase.from("profiles").select("id, full_name").eq("org_id", profile.org_id).eq("role", "rep").order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    supabase.from("profiles").select("id, full_name").eq("org_id", profile.org_id),
  ]);

  const loggedByName = Object.fromEntries((orgProfiles ?? []).map((p) => [p.id, p.full_name]));
  const ownerName = account.owner_rep_id ? loggedByName[account.owner_rep_id] : undefined;

  return (
    <>
      <PageHeader
        title={account.name}
        subtitle={[account.industry, [account.city, account.state].filter(Boolean).join(", "), account.employee_count ? `${account.employee_count} employees` : null]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <Link href="/accounts" className="btn ghost">
            ← Back to accounts
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="mono mb-2 text-[10px] uppercase tracking-[0.13em] text-dim">Status</div>
          {canEditStatus ? (
            <StatusSelect table="accounts" column="status" id={account.id} status={account.status} />
          ) : (
            <StatusDot status={account.status} />
          )}
        </div>
        <div className="card p-4">
          <div className="mono mb-2 text-[10px] uppercase tracking-[0.13em] text-dim">Owner</div>
          {isManager ? (
            <AssignOwnerSelect accountId={account.id} ownerRepId={account.owner_rep_id} reps={reps ?? []} />
          ) : (
            <span className="text-[13px]">{ownerName ?? "Unassigned"}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="card p-4">
          <div className="display mb-3 text-[13px]">Contacts</div>
          {!contacts || contacts.length === 0 ? (
            <EmptyState title="No contacts yet" body="Import contacts via CSV from the Accounts page, or add them there." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {contacts.map((c) => (
                <Link
                  key={c.id}
                  href={`/contacts/${c.id}`}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-blue"
                >
                  <div>
                    <div className="font-bold">
                      {c.full_name}
                      {c.title && <span className="font-normal text-dim"> · {c.title}</span>}
                    </div>
                    {c.persona && <div className="text-[12px] text-muted">{c.persona}</div>}
                  </div>
                  <StatusDot status={c.stage} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <SignalsPanel accountId={account.id} signals={signals ?? []} loggedByName={loggedByName} />
      </div>
    </>
  );
}
