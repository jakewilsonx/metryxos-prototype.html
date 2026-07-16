import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SlashMeter } from "@/components/ui/SlashMeter";
import { GenerateDayButton } from "@/components/today/GenerateDayButton";
import { ActionCardItem } from "@/components/today/ActionCardItem";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function timeAgo(iso: string) {
  const days = Math.floor((new Date().getTime() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export default async function TodayPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "rep") redirect("/dashboard");

  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [{ data: playbook }, { data: cards }, { data: accounts }] = await Promise.all([
    supabase.from("playbooks").select("cadence_rules").eq("org_id", profile.org_id).maybeSingle(),
    supabase
      .from("action_cards")
      .select("*")
      .eq("rep_id", profile.id)
      .eq("scheduled_date", today)
      .order("created_at"),
    supabase.from("accounts").select("id, name, city, state").eq("owner_rep_id", profile.id),
  ]);

  const dailyTarget = playbook?.cadence_rules?.daily_actions_target ?? 5;
  const accountIds = (accounts ?? []).map((a) => a.id);
  const accountById = Object.fromEntries((accounts ?? []).map((a) => [a.id, a]));

  const contactIds = (cards ?? []).map((c) => c.contact_id).filter((id): id is string => !!id);
  const sequenceIds = (cards ?? []).map((c) => c.sequence_id).filter((id): id is string => !!id);

  const [{ data: contacts }, { data: sequences }, { data: weekCards }, { data: weekOutcomes }, { data: signals }] = await Promise.all([
    contactIds.length > 0
      ? supabase.from("contacts").select("*").in("id", contactIds)
      : Promise.resolve({ data: [] as { id: string; account_id: string; full_name: string; title: string | null }[] }),
    sequenceIds.length > 0
      ? supabase.from("sequences").select("id, current_step, template_id").in("id", sequenceIds)
      : Promise.resolve({ data: [] as { id: string; current_step: number; template_id: string | null }[] }),
    supabase.from("action_cards").select("status").eq("rep_id", profile.id).gte("scheduled_date", sevenDaysAgo.slice(0, 10)),
    supabase.from("outcomes").select("type").eq("rep_id", profile.id).gte("created_at", sevenDaysAgo),
    accountIds.length > 0
      ? supabase.from("signals").select("*").in("account_id", accountIds).order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [] as { id: string; account_id: string; summary: string; source: string; logged_by: string | null; created_at: string }[] }),
  ]);

  const contactById = Object.fromEntries((contacts ?? []).map((c) => [c.id, c]));
  const sequenceById = Object.fromEntries((sequences ?? []).map((s) => [s.id, s]));
  const templateIds = Array.from(new Set((sequences ?? []).map((s) => s.template_id).filter((id): id is string => !!id)));
  const { data: templates } =
    templateIds.length > 0
      ? await supabase.from("sequence_templates").select("id, name, steps").in("id", templateIds)
      : { data: [] as { id: string; name: string; steps: { day_offset: number }[] }[] };
  const templateById = Object.fromEntries((templates ?? []).map((t) => [t.id, t]));

  const doneToday = (cards ?? []).filter((c) => c.status === "done").length;

  const weekActionsDone = (weekCards ?? []).filter((c) => c.status === "done").length;
  const weekActionsTotal = (weekCards ?? []).length;
  const weekReplies = (weekOutcomes ?? []).filter((o) => o.type === "replied").length;
  const weekMeetings = (weekOutcomes ?? []).filter((o) => o.type === "meeting_booked").length;

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) + ` · ${accounts?.length ?? 0} accounts in rotation`}
        actions={
          <div className="card flex items-center gap-4 px-4.5 py-3">
            <div>
              <div className="mono text-[10px] uppercase tracking-[0.13em] text-dim">Daily target</div>
              <div className="mt-0.5 text-[15px] font-bold">
                {doneToday} of {dailyTarget} actions
              </div>
            </div>
            <SlashMeter filled={doneToday} total={dailyTarget} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          {!cards || cards.length === 0 ? (
            <EmptyState
              title="No day generated yet"
              body="Generate your day to get playbook-consistent engagement, outreach, and follow-up cards for your accounts."
              action={<GenerateDayButton />}
            />
          ) : (
            cards.map((card) => {
              const contact = card.contact_id ? contactById[card.contact_id] : null;
              const account = contact ? accountById[contact.account_id] : null;
              const sequence = card.sequence_id ? sequenceById[card.sequence_id] : null;
              const template = sequence?.template_id ? templateById[sequence.template_id] : null;
              const stepLabel =
                sequence && template
                  ? `Step ${card.status === "done" ? sequence.current_step : sequence.current_step + 1} of ${template.steps.length}`
                  : card.type === "content"
                    ? "Weekly post"
                    : undefined;

              return (
                <ActionCardItem
                  key={card.id}
                  card={card}
                  contactName={contact?.full_name}
                  contactTitle={contact?.title ?? undefined}
                  accountLine={account ? [account.name, [account.city, account.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") : undefined}
                  stepLabel={stepLabel}
                />
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="card p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="display text-[13px]">Coach</div>
              <span className="badge eng">Playbook-aware</span>
            </div>
            <p className="mb-3 text-[12.5px] text-muted">Ask objection-handling questions or get a draft — grounded in your org&apos;s playbook.</p>
            <Link href="/coach" className="btn w-full">
              Open Coach
            </Link>
          </div>

          <div className="card p-4">
            <div className="display mb-2.5 text-[13px]">Signals</div>
            <div className="flex flex-col gap-2.5 text-[12.5px]">
              {(!signals || signals.length === 0) && <div className="text-muted">No signals logged yet.</div>}
              {(signals ?? []).map((s) => (
                <div key={s.id} className="flex gap-2">
                  <span className={`dot mt-1.5 ${s.source === "news" ? "g" : "a"}`} />
                  <div>
                    <strong>{accountById[s.account_id]?.name ?? "Account"}</strong> {s.summary}
                    <div className="text-[11px] text-dim">{timeAgo(s.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/accounts" className="btn mt-3 w-full">
              + Log a signal
            </Link>
          </div>

          <div className="card p-4">
            <div className="display mb-2.5 text-[13px]">This week</div>
            <div className="flex justify-between py-1 text-[12.5px] text-muted">
              <span>Actions completed</span>
              <strong className="text-text">
                {weekActionsDone} / {weekActionsTotal}
              </strong>
            </div>
            <div className="flex justify-between py-1 text-[12.5px] text-muted">
              <span>Replies</span>
              <strong className="text-green">{weekReplies}</strong>
            </div>
            <div className="flex justify-between py-1 text-[12.5px] text-muted">
              <span>Meetings booked</span>
              <strong className="text-green">{weekMeetings}</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
