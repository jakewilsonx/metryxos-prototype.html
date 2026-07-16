import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SlashMeter } from "@/components/ui/SlashMeter";
import { StatusDot } from "@/components/ui/StatusDot";
import { StatusSelect } from "@/components/accounts/StatusSelect";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionCard, Outcome, SequenceStep } from "@/lib/database.types";

const ACTION_BADGE: Record<string, string> = {
  engagement: "badge eng",
  outreach: "badge out",
  follow_up: "badge fup",
  content: "badge con",
};
const ACTION_LABEL: Record<string, string> = {
  engagement: "Engagement",
  outreach: "Outreach",
  follow_up: "Follow-up",
  content: "Content",
};
const OUTCOME_LABEL: Record<string, string> = {
  replied: "Replied",
  meeting_booked: "Meeting booked",
  opportunity_created: "Opportunity created",
  not_interested: "Not interested",
};

type TimelineEntry =
  | { kind: "action_card"; at: string; data: ActionCard }
  | { kind: "outcome"; at: string; data: Outcome };

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: contact } = await supabase.from("contacts").select("*").eq("id", id).single();
  if (!contact) notFound();

  const { data: account } = await supabase.from("accounts").select("*").eq("id", contact.account_id).single();
  if (!account || account.org_id !== profile.org_id) notFound();

  const canEditStage = profile.role === "manager" || account.owner_rep_id === profile.id;

  const [{ data: sequence }, { data: actionCards }, { data: outcomes }] = await Promise.all([
    supabase.from("sequences").select("*").eq("contact_id", id).eq("status", "active").maybeSingle(),
    supabase.from("action_cards").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
    supabase.from("outcomes").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
  ]);

  const { data: template } = sequence?.template_id
    ? await supabase.from("sequence_templates").select("name, steps").eq("id", sequence.template_id).maybeSingle<{
        name: string;
        steps: SequenceStep[];
      }>()
    : { data: null };

  const timeline: TimelineEntry[] = [
    ...(actionCards ?? []).map((a): TimelineEntry => ({ kind: "action_card", at: a.completed_at ?? a.created_at, data: a })),
    ...(outcomes ?? []).map((o): TimelineEntry => ({ kind: "outcome", at: o.created_at, data: o })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <>
      <PageHeader
        title={contact.full_name}
        subtitle={[contact.title, account.name].filter(Boolean).join(" · ")}
        actions={
          <Link href={`/accounts/${account.id}`} className="btn ghost">
            ← Back to {account.name}
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="mono mb-2 text-[10px] uppercase tracking-[0.13em] text-dim">Stage</div>
          {canEditStage ? (
            <StatusSelect table="contacts" column="stage" id={contact.id} status={contact.stage} />
          ) : (
            <StatusDot status={contact.stage} />
          )}
        </div>
        <div className="card p-4">
          <div className="mono mb-2 text-[10px] uppercase tracking-[0.13em] text-dim">Persona</div>
          <span className="text-[13px]">{contact.persona ?? "—"}</span>
        </div>
        <div className="card p-4">
          <div className="mono mb-2 text-[10px] uppercase tracking-[0.13em] text-dim">
            {sequence ? `Sequence: ${template?.name ?? "—"}` : "Sequence"}
          </div>
          {sequence && template ? (
            <div className="flex items-center gap-3">
              <SlashMeter size="sm" color="blue" filled={sequence.current_step} total={template.steps.length} />
              <span className="mono text-[11px] text-dim">
                Step {sequence.current_step} of {template.steps.length}
              </span>
            </div>
          ) : (
            <span className="text-[13px] text-muted">No active sequence</span>
          )}
        </div>
      </div>

      {contact.linkedin_url && (
        <div className="mb-5">
          <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="text-[12.5px] text-blue underline">
            View on LinkedIn ↗
          </a>
        </div>
      )}

      <div className="card p-4">
        <div className="display mb-3 text-[13px]">Touch timeline</div>
        {timeline.length === 0 ? (
          <EmptyState title="No touches yet" body="Action cards and outcomes for this contact will show up here newest-first." />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {timeline.map((entry) => (
              <div key={`${entry.kind}-${entry.data.id}`} className="py-3 first:pt-0 last:pb-0">
                <div className="mb-1 flex items-center gap-2">
                  {entry.kind === "action_card" ? (
                    <>
                      <span className={ACTION_BADGE[entry.data.type]}>{ACTION_LABEL[entry.data.type]}</span>
                      <span className="mono text-[11px] text-dim">
                        {entry.data.status === "done" ? "Done" : entry.data.status === "skipped" ? `Skipped${entry.data.skip_reason ? ` · ${entry.data.skip_reason}` : ""}` : "Pending"}
                      </span>
                    </>
                  ) : (
                    <span className="badge out">{OUTCOME_LABEL[entry.data.type]}</span>
                  )}
                  <span className="mono ml-auto text-[11px] text-dim">
                    {new Date(entry.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                {entry.kind === "action_card" ? (
                  <>
                    {entry.data.angle && <p className="text-[13px] text-muted">{entry.data.angle}</p>}
                    {entry.data.draft && (
                      <blockquote className="mt-1.5 rounded-md border border-border border-l-[3px] border-l-blue bg-surface2 px-3 py-2 text-[12.5px]">
                        {entry.data.draft}
                      </blockquote>
                    )}
                  </>
                ) : (
                  <>
                    {entry.data.note && <p className="text-[13px] text-muted">{entry.data.note}</p>}
                    {entry.data.meeting_date && (
                      <p className="mono text-[11.5px] text-dim">Meeting: {entry.data.meeting_date}</p>
                    )}
                    {entry.data.est_value_usd != null && (
                      <p className="mono text-[11.5px] text-green">Est. value: ${entry.data.est_value_usd.toLocaleString()}</p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
