import { z } from "zod";
import type { TextBlock } from "@anthropic-ai/sdk/resources/messages";
import { anthropicClient, CLAUDE_MODEL } from "@/lib/anthropic";
import type {
  Account,
  ActionType,
  Contact,
  Playbook,
  Sequence,
  SequenceStep,
  SequenceTemplate,
  Signal,
} from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Candidate = {
  contact: Contact | null;
  account: Account | null;
  sequence: Sequence | null;
  type: ActionType;
  instruction: string;
  stepNumber: number | null;
  stepTotal: number | null;
  signals: Signal[];
};

const DEFAULT_CADENCE = {
  daily_actions_target: 5,
  min_days_between_touches: 2,
  max_touches_per_contact_per_week: 3,
};

function daysSince(iso: string | null): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

export async function buildCandidates(
  supabase: SupabaseClient<Database>,
  repId: string,
  orgId: string
): Promise<{ candidates: Candidate[]; playbook: Playbook }> {
  const [{ data: playbookRow }, { data: accounts }] = await Promise.all([
    supabase.from("playbooks").select("*").eq("org_id", orgId).maybeSingle(),
    supabase.from("accounts").select("*").eq("org_id", orgId).eq("owner_rep_id", repId),
  ]);

  const playbook: Playbook =
    playbookRow ?? {
      id: "",
      org_id: orgId,
      icp: { industries: [], company_size: "", personas: [] },
      pillars: [],
      cadence_rules: DEFAULT_CADENCE,
      tone_rules: "",
      updated_at: new Date().toISOString(),
    };
  const cadence = { ...DEFAULT_CADENCE, ...playbook.cadence_rules };

  if (!accounts || accounts.length === 0) {
    return { candidates: [], playbook };
  }

  const accountIds = accounts.map((a) => a.id);
  const accountById = Object.fromEntries(accounts.map((a) => [a.id, a]));

  const [{ data: contacts }, { data: signals }] = await Promise.all([
    supabase.from("contacts").select("*").in("account_id", accountIds),
    supabase
      .from("signals")
      .select("*")
      .in("account_id", accountIds)
      .gte("created_at", new Date(Date.now() - 21 * 86400000).toISOString())
      .order("created_at", { ascending: false }),
  ]);

  if (!contacts || contacts.length === 0) {
    return { candidates: [], playbook };
  }

  const contactIds = contacts.map((c) => c.id);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: sequences }, { data: recentCards }] = await Promise.all([
    supabase.from("sequences").select("*").in("contact_id", contactIds).eq("status", "active"),
    supabase
      .from("action_cards")
      .select("contact_id")
      .eq("rep_id", repId)
      .eq("status", "done")
      .gte("completed_at", sevenDaysAgo),
  ]);

  const templateIds = Array.from(new Set((sequences ?? []).map((s) => s.template_id).filter(Boolean))) as string[];
  const { data: templates } =
    templateIds.length > 0
      ? await supabase.from("sequence_templates").select("*").in("id", templateIds)
      : { data: [] as SequenceTemplate[] };
  const templateById = Object.fromEntries((templates ?? []).map((t) => [t.id, t]));

  const sequenceByContact = Object.fromEntries((sequences ?? []).map((s) => [s.contact_id, s]));
  const touchesLast7dByContact: Record<string, number> = {};
  for (const c of recentCards ?? []) {
    if (!c.contact_id) continue;
    touchesLast7dByContact[c.contact_id] = (touchesLast7dByContact[c.contact_id] ?? 0) + 1;
  }
  const signalsByAccount: Record<string, Signal[]> = {};
  for (const s of signals ?? []) {
    (signalsByAccount[s.account_id] ??= []).push(s);
  }

  const candidates: Candidate[] = [];

  for (const contact of contacts) {
    const eligible =
      daysSince(contact.last_touch_at) >= cadence.min_days_between_touches &&
      (touchesLast7dByContact[contact.id] ?? 0) < cadence.max_touches_per_contact_per_week;
    if (!eligible) continue;

    const account = accountById[contact.account_id] ?? null;
    const sequence = sequenceByContact[contact.id];
    const contactSignals = account ? signalsByAccount[account.id] ?? [] : [];

    if (sequence) {
      const template = templateById[sequence.template_id ?? ""];
      if (!template || sequence.current_step >= template.steps.length) continue;
      const step: SequenceStep = template.steps[sequence.current_step];
      candidates.push({
        contact,
        account,
        sequence,
        type: step.type,
        instruction: step.instruction,
        stepNumber: sequence.current_step + 1,
        stepTotal: template.steps.length,
        signals: contactSignals,
      });
    } else {
      candidates.push({
        contact,
        account,
        sequence: null,
        type: "engagement",
        instruction: "No sequence assigned yet — engage with a recent post or comment. Don't pitch.",
        stepNumber: null,
        stepTotal: null,
        signals: contactSignals,
      });
    }
  }

  // Prioritize contacts with a live signal, then whoever's gone longest without a touch.
  candidates.sort((a, b) => {
    const aSignal = a.signals.length > 0 ? 0 : 1;
    const bSignal = b.signals.length > 0 ? 0 : 1;
    if (aSignal !== bSignal) return aSignal - bSignal;
    return daysSince(b.contact?.last_touch_at ?? null) - daysSince(a.contact?.last_touch_at ?? null);
  });

  const target = cadence.daily_actions_target || DEFAULT_CADENCE.daily_actions_target;
  let selected = candidates.slice(0, target);

  // Roughly-weekly content/post slot, swapped in for the lowest-priority pick.
  const today = new Date().toISOString().slice(0, 10);
  const sixDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString();
  const { data: recentContentCards } = await supabase
    .from("action_cards")
    .select("id")
    .eq("rep_id", repId)
    .eq("type", "content")
    .gte("scheduled_date", sixDaysAgo.slice(0, 10))
    .lte("scheduled_date", today);

  if ((!recentContentCards || recentContentCards.length === 0) && selected.length > 0) {
    const allAccountSignals = (signals ?? []).slice(0, 5);
    const contentSlot: Candidate = {
      contact: null,
      account: null,
      sequence: null,
      type: "content",
      instruction:
        "Weekly LinkedIn post. Reference a theme showing up across multiple target accounts' recent activity or signals (not a specific contact) — put the rep in front of prospects' feeds without a direct pitch.",
      stepNumber: null,
      stepTotal: null,
      signals: allAccountSignals,
    };
    if (selected.length >= target) {
      selected = [...selected.slice(0, target - 1), contentSlot];
    } else {
      selected = [...selected, contentSlot];
    }
  }

  return { candidates: selected, playbook };
}

const CardsResponseSchema = z.object({
  cards: z.array(
    z.object({
      index: z.number().int(),
      angle: z.string().min(1),
      draft: z.string().min(1),
    })
  ),
});

function buildSystemPrompt(playbook: Playbook): string {
  const pillars = playbook.pillars
    .map((p) => `- ${p.title}: ${p.value_prop} (proof point: ${p.proof_point})`)
    .join("\n");

  return `You write daily LinkedIn action cards for industrial/manufacturing B2B sales reps using MetryxOS.

HARD RULES:
- Reps execute everything manually on LinkedIn. Never suggest automation, scraping, bulk actions, or anything that violates LinkedIn's terms of service.
- Ground every angle and draft in the specific contact/account context given — reference real signals when present, never invent facts not provided.
- Plant-floor credible, zero corporate fluff. Reference specific equipment, shifts, roles, or failure modes when relevant.
- Never pitch in early-stage engagement touches — earn the comment/reply before asking for anything.
- DMs and connection notes stay under 90 words; connection notes under 45 words.
- Ground objection-handling and proof points in the org's messaging pillars below.

ORG PLAYBOOK:
ICP industries: ${playbook.icp.industries.join(", ") || "not specified"}
ICP company size: ${playbook.icp.company_size || "not specified"}
Target personas: ${playbook.icp.personas.join(", ") || "not specified"}
Tone rules: ${playbook.tone_rules || "Direct, credible, no fluff."}
Messaging pillars:
${pillars || "(none defined yet)"}

You will receive a JSON array of candidate touches, each with an index. For each candidate, return ONE card with:
- "angle": 1-2 sentences explaining why this touch, right now, referencing the specific context given (signals, sequence step, history).
- "draft": the actual text to send — a comment for "engagement", a connection note or DM for "outreach"/"follow_up", or a post hook for "content".

Respond with ONLY valid JSON matching exactly this shape, no markdown fences, no commentary:
{"cards": [{"index": 0, "angle": "...", "draft": "..."}]}`;
}

function buildUserPrompt(candidates: Candidate[]): string {
  const payload = candidates.map((c, index) => ({
    index,
    type: c.type,
    instruction: c.instruction,
    step: c.stepNumber ? `${c.stepNumber} of ${c.stepTotal}` : null,
    contact: c.contact
      ? { name: c.contact.full_name, title: c.contact.title, persona: c.contact.persona }
      : null,
    account: c.account
      ? { name: c.account.name, industry: c.account.industry, city: c.account.city, state: c.account.state }
      : null,
    recent_signals: c.signals.map((s) => s.summary),
    last_touch_days_ago: c.contact?.last_touch_at ? Math.round(daysSince(c.contact.last_touch_at)) : null,
  }));

  return `Candidates:\n${JSON.stringify(payload, null, 2)}`;
}

function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

export async function generateCardContent(
  candidates: Candidate[],
  playbook: Playbook
): Promise<{ index: number; angle: string; draft: string }[]> {
  if (candidates.length === 0) return [];

  const client = anthropicClient();
  const system = buildSystemPrompt(playbook);
  const user = buildUserPrompt(candidates);

  async function attempt(extraNote?: string) {
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: extraNote ? `${user}\n\n${extraNote}` : user }],
    });
    const text = message.content
      .filter((block): block is TextBlock => block.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = extractJSON(text);
    return CardsResponseSchema.parse(parsed);
  }

  try {
    const result = await attempt();
    return result.cards;
  } catch {
    try {
      const result = await attempt("Your previous response was not valid JSON matching the required shape. Return ONLY the JSON object, nothing else.");
      return result.cards;
    } catch {
      throw new Error("Couldn't generate cards right now — the AI response wasn't valid. Try again.");
    }
  }
}

export type { Candidate };
