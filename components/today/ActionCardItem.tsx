"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACTION_BADGE_CLASS, ACTION_BORDER_COLOR, ACTION_LABEL } from "@/lib/actionTypes";
import type { ActionCard } from "@/lib/database.types";

const EST_MINUTES: Record<string, string> = {
  engagement: "~3 min",
  outreach: "~2 min",
  follow_up: "~4 min",
  content: "~10 min",
};

const SKIP_REASONS: { value: string; label: string }[] = [
  { value: "no_time", label: "No time" },
  { value: "bad_fit", label: "Bad fit" },
  { value: "already_contacted", label: "Already contacted" },
  { value: "other", label: "Other" },
];

export function ActionCardItem({
  card,
  contactName,
  contactTitle,
  accountLine,
  stepLabel,
}: {
  card: ActionCard;
  contactName?: string;
  contactTitle?: string;
  accountLine?: string;
  stepLabel?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(card.status);
  const [skipReason, setSkipReason] = useState<string | null>(card.skip_reason);
  const [pickingReason, setPickingReason] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function markDone() {
    setBusy(true);
    const res = await fetch("/api/action-cards/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: card.id }),
    });
    setBusy(false);
    if (res.ok) {
      setStatus("done");
      router.refresh();
    }
  }

  async function skip(reason: string) {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("action_cards").update({ status: "skipped", skip_reason: reason }).eq("id", card.id);
    setBusy(false);
    setStatus("skipped");
    setSkipReason(reason);
    setPickingReason(false);
    router.refresh();
  }

  async function copyDraft() {
    if (!card.draft) return;
    await navigator.clipboard.writeText(card.draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="card p-4 transition-opacity md:p-4.5"
      style={{ opacity: status === "pending" ? 1 : 0.55, borderColor: status === "done" ? "var(--green)" : undefined }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={ACTION_BADGE_CLASS[card.type]}>{ACTION_LABEL[card.type]}</span>
          {stepLabel && <span className="mono text-[11px] text-dim">{stepLabel}</span>}
        </div>
        <span className="mono text-[11px] text-dim">{EST_MINUTES[card.type]}</span>
      </div>

      {contactName && (
        <div className="mt-3">
          <div className="font-bold">
            {contactName}
            {contactTitle && <span className="font-normal text-dim"> · {contactTitle}</span>}
          </div>
          {accountLine && <div className="text-[12.5px] text-muted">{accountLine}</div>}
        </div>
      )}

      {card.angle && (
        <div className="mt-3 text-[13.5px] text-muted">
          <strong className="text-text">The angle:</strong> {card.angle}
        </div>
      )}

      {card.draft && (
        <blockquote
          className="mt-2.5 rounded-md border border-border bg-surface2 px-3.5 py-2.5 text-[13px]"
          style={{ borderLeft: `3px solid ${ACTION_BORDER_COLOR[card.type]}` }}
        >
          {card.draft}
        </blockquote>
      )}

      {status === "pending" && !pickingReason && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn primary" disabled={busy} onClick={markDone}>
            Mark done
          </button>
          <button className="btn" onClick={copyDraft}>
            {copied ? "Copied ✓" : "Copy draft"}
          </button>
          <button className="btn ghost" disabled={busy} onClick={() => setPickingReason(true)}>
            Skip
          </button>
        </div>
      )}

      {status === "pending" && pickingReason && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted">Why skip?</span>
          {SKIP_REASONS.map((r) => (
            <button key={r.value} className="btn" disabled={busy} onClick={() => skip(r.value)}>
              {r.label}
            </button>
          ))}
          <button className="btn ghost" onClick={() => setPickingReason(false)}>
            Cancel
          </button>
        </div>
      )}

      {status === "done" && (
        <div className="mt-3 text-[13px] font-bold text-green">✓ Done — logged to sequence</div>
      )}
      {status === "skipped" && (
        <div className="mt-3 text-[13px] font-medium text-dim">
          Skipped{skipReason ? ` · ${SKIP_REASONS.find((r) => r.value === skipReason)?.label ?? skipReason}` : ""}
        </div>
      )}
    </div>
  );
}
