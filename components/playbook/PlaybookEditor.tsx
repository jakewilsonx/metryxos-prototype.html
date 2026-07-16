"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ActionType, CadenceRules, Playbook, PlaybookPillar, SequenceStep, SequenceTemplate } from "@/lib/database.types";

const ACTION_TYPES: ActionType[] = ["engagement", "outreach", "follow_up", "content"];

function emptyPillar(): PlaybookPillar {
  return { title: "", value_prop: "", proof_point: "" };
}

function emptyStep(): SequenceStep {
  return { day_offset: 0, type: "engagement", instruction: "" };
}

export function PlaybookEditor({
  orgId,
  playbook,
  templates: initialTemplates,
}: {
  orgId: string;
  playbook: Playbook;
  templates: SequenceTemplate[];
}) {
  const router = useRouter();

  const [industries, setIndustries] = useState(playbook.icp.industries.join(", "));
  const [companySize, setCompanySize] = useState(playbook.icp.company_size);
  const [personas, setPersonas] = useState(playbook.icp.personas.join(", "));
  const [pillars, setPillars] = useState<PlaybookPillar[]>(playbook.pillars.length ? playbook.pillars : []);
  const [cadence, setCadence] = useState<CadenceRules>(playbook.cadence_rules);
  const [toneRules, setToneRules] = useState(playbook.tone_rules ?? "");
  const [playbookStatus, setPlaybookStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [templates, setTemplates] = useState<SequenceTemplate[]>(initialTemplates);
  const [templateStatus, setTemplateStatus] = useState<Record<string, "idle" | "saving" | "saved">>({});

  async function savePlaybook() {
    setPlaybookStatus("saving");
    const supabase = createClient();
    await supabase
      .from("playbooks")
      .update({
        icp: {
          industries: industries.split(",").map((s) => s.trim()).filter(Boolean),
          company_size: companySize,
          personas: personas.split(",").map((s) => s.trim()).filter(Boolean),
        },
        pillars,
        cadence_rules: cadence,
        tone_rules: toneRules,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);
    setPlaybookStatus("saved");
    router.refresh();
    setTimeout(() => setPlaybookStatus("idle"), 1500);
  }

  function updatePillar(i: number, patch: Partial<PlaybookPillar>) {
    setPillars((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  async function saveTemplate(t: SequenceTemplate) {
    setTemplateStatus((s) => ({ ...s, [t.id]: "saving" }));
    const supabase = createClient();
    await supabase.from("sequence_templates").update({ name: t.name, steps: t.steps }).eq("id", t.id);
    setTemplateStatus((s) => ({ ...s, [t.id]: "saved" }));
    setTimeout(() => setTemplateStatus((s) => ({ ...s, [t.id]: "idle" })), 1500);
  }

  function updateTemplate(id: string, patch: Partial<SequenceTemplate>) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function updateStep(templateId: string, stepIdx: number, patch: Partial<SequenceStep>) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, steps: t.steps.map((s, i) => (i === stepIdx ? { ...s, ...patch } : s)) } : t))
    );
  }

  function addStep(templateId: string) {
    setTemplates((prev) => prev.map((t) => (t.id === templateId ? { ...t, steps: [...t.steps, emptyStep()] } : t)));
  }

  function removeStep(templateId: string, stepIdx: number) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, steps: t.steps.filter((_, i) => i !== stepIdx) } : t))
    );
  }

  async function addTemplate() {
    const supabase = createClient();
    const { data } = await supabase
      .from("sequence_templates")
      .insert({ org_id: orgId, name: "New sequence", steps: [] })
      .select()
      .single();
    if (data) setTemplates((prev) => [...prev, data]);
  }

  async function deleteTemplate(id: string) {
    const supabase = createClient();
    await supabase.from("sequence_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="card p-4">
        <div className="display mb-3 text-[13px]">Ideal customer profile</div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="mono text-[10px] uppercase tracking-[0.13em] text-dim">Industries (comma-separated)</span>
            <input
              value={industries}
              onChange={(e) => setIndustries(e.target.value)}
              className="rounded-md border border-border bg-surface2 px-3 py-2 text-[13px] text-text outline-none focus:border-blue"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="mono text-[10px] uppercase tracking-[0.13em] text-dim">Company size</span>
            <input
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              placeholder="e.g. 50-500 employees"
              className="rounded-md border border-border bg-surface2 px-3 py-2 text-[13px] text-text outline-none focus:border-blue"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="mono text-[10px] uppercase tracking-[0.13em] text-dim">Target personas (comma-separated)</span>
            <input
              value={personas}
              onChange={(e) => setPersonas(e.target.value)}
              className="rounded-md border border-border bg-surface2 px-3 py-2 text-[13px] text-text outline-none focus:border-blue"
            />
          </label>
        </div>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="display text-[13px]">Messaging pillars</div>
          <button className="btn" onClick={() => setPillars((p) => [...p, emptyPillar()])}>
            + Add pillar
          </button>
        </div>
        {pillars.length === 0 && <div className="text-[12.5px] text-muted">No pillars yet — add the proof points reps should lean on.</div>}
        <div className="flex flex-col gap-3">
          {pillars.map((p, i) => (
            <div key={i} className="rounded-md border border-border bg-surface2 p-3">
              <div className="mb-2 flex items-center justify-between">
                <input
                  value={p.title}
                  onChange={(e) => updatePillar(i, { title: e.target.value })}
                  placeholder="Pillar title"
                  className="flex-1 bg-transparent text-[13px] font-bold text-text outline-none"
                />
                <button className="btn ghost !p-1.5" onClick={() => setPillars((prev) => prev.filter((_, idx) => idx !== i))}>
                  Remove
                </button>
              </div>
              <textarea
                value={p.value_prop}
                onChange={(e) => updatePillar(i, { value_prop: e.target.value })}
                placeholder="Value prop"
                rows={2}
                className="mb-2 w-full rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] text-text outline-none focus:border-blue"
              />
              <textarea
                value={p.proof_point}
                onChange={(e) => updatePillar(i, { proof_point: e.target.value })}
                placeholder="Proof point"
                rows={2}
                className="w-full rounded-md border border-border bg-surface px-2.5 py-2 text-[12.5px] text-text outline-none focus:border-blue"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <div className="display mb-3 text-[13px]">Cadence rules</div>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="mono text-[10px] uppercase tracking-[0.1em] text-dim">Daily actions target</span>
            <input
              type="number"
              min={1}
              value={cadence.daily_actions_target}
              onChange={(e) => setCadence((c) => ({ ...c, daily_actions_target: Number(e.target.value) }))}
              className="rounded-md border border-border bg-surface2 px-3 py-2 text-[13px] text-text outline-none focus:border-blue"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="mono text-[10px] uppercase tracking-[0.1em] text-dim">Min days between touches</span>
            <input
              type="number"
              min={0}
              value={cadence.min_days_between_touches}
              onChange={(e) => setCadence((c) => ({ ...c, min_days_between_touches: Number(e.target.value) }))}
              className="rounded-md border border-border bg-surface2 px-3 py-2 text-[13px] text-text outline-none focus:border-blue"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="mono text-[10px] uppercase tracking-[0.1em] text-dim">Max touches/contact/week</span>
            <input
              type="number"
              min={1}
              value={cadence.max_touches_per_contact_per_week}
              onChange={(e) => setCadence((c) => ({ ...c, max_touches_per_contact_per_week: Number(e.target.value) }))}
              className="rounded-md border border-border bg-surface2 px-3 py-2 text-[13px] text-text outline-none focus:border-blue"
            />
          </label>
        </div>
      </div>

      <div className="card p-4">
        <div className="display mb-3 text-[13px]">Tone rules</div>
        <textarea
          value={toneRules}
          onChange={(e) => setToneRules(e.target.value)}
          rows={3}
          placeholder="e.g. Plant-floor credible, no corporate fluff..."
          className="w-full rounded-md border border-border bg-surface2 px-3 py-2 text-[13px] text-text outline-none focus:border-blue"
        />
      </div>

      <div>
        <button onClick={savePlaybook} disabled={playbookStatus === "saving"} className="btn primary">
          {playbookStatus === "saving" ? "Saving…" : playbookStatus === "saved" ? "Saved ✓" : "Save playbook"}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="display text-[15px]">Sequence templates</div>
        <button className="btn" onClick={addTemplate}>
          + Add sequence template
        </button>
      </div>

      {templates.map((t) => (
        <div key={t.id} className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <input
              value={t.name}
              onChange={(e) => updateTemplate(t.id, { name: e.target.value })}
              className="display flex-1 bg-transparent text-[14px] text-text outline-none"
            />
            <div className="flex gap-2">
              <button className="btn" onClick={() => saveTemplate(t)}>
                {templateStatus[t.id] === "saving" ? "Saving…" : templateStatus[t.id] === "saved" ? "Saved ✓" : "Save"}
              </button>
              <button className="btn ghost" onClick={() => deleteTemplate(t.id)}>
                Delete
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {t.steps.map((step, i) => (
              <div key={i} className="grid items-start gap-2 rounded-md border border-border bg-surface2 p-2.5" style={{ gridTemplateColumns: "90px 130px 1fr auto" }}>
                <label className="flex flex-col gap-1">
                  <span className="mono text-[9px] uppercase text-dim">Day</span>
                  <input
                    type="number"
                    value={step.day_offset}
                    onChange={(e) => updateStep(t.id, i, { day_offset: Number(e.target.value) })}
                    className="rounded border border-border-lt bg-surface px-2 py-1 text-[12px] text-text outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="mono text-[9px] uppercase text-dim">Type</span>
                  <select
                    value={step.type}
                    onChange={(e) => updateStep(t.id, i, { type: e.target.value as ActionType })}
                    className="rounded border border-border-lt bg-surface px-2 py-1 text-[12px] text-text outline-none"
                  >
                    {ACTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="mono text-[9px] uppercase text-dim">Instruction</span>
                  <textarea
                    value={step.instruction}
                    onChange={(e) => updateStep(t.id, i, { instruction: e.target.value })}
                    rows={2}
                    className="rounded border border-border-lt bg-surface px-2 py-1 text-[12px] text-text outline-none"
                  />
                </label>
                <button className="btn ghost mt-4 !p-1.5" onClick={() => removeStep(t.id, i)}>
                  ✕
                </button>
              </div>
            ))}
            <button className="btn w-full" onClick={() => addStep(t.id)}>
              + Add step
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
