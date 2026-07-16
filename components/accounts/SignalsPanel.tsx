"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Signal } from "@/lib/database.types";

function timeAgo(iso: string) {
  const ms = new Date().getTime() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export function SignalsPanel({
  accountId,
  signals,
  loggedByName,
}: {
  accountId: string;
  signals: Signal[];
  loggedByName: Record<string, string>;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("signals").insert({
      account_id: accountId,
      source: "manual",
      summary: text.trim(),
      logged_by: user?.id ?? null,
    });
    setText("");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="card p-4">
      <div className="display mb-2.5 text-[13px]">Signals</div>
      <div className="flex flex-col gap-2.5 text-[12.5px]">
        {signals.length === 0 && <div className="text-muted">No signals logged yet.</div>}
        {signals.map((s) => (
          <div key={s.id} className="flex gap-2">
            <span className={`dot mt-1.5 ${s.source === "news" ? "g" : "a"}`} />
            <div>
              <div>{s.summary}</div>
              <div className="text-[11px] text-dim">
                {s.source === "news" ? "News feed" : s.logged_by && loggedByName[s.logged_by] ? `Logged by ${loggedByName[s.logged_by]}` : "Logged manually"}
                {" · "}
                {timeAgo(s.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Announced a $2M line expansion"
          rows={2}
          className="rounded-md border border-border bg-surface2 px-2.5 py-2 text-[12.5px] text-text outline-none focus:border-blue"
        />
        <button type="submit" disabled={saving || !text.trim()} className="btn w-full">
          {saving ? "Logging…" : "+ Log a signal"}
        </button>
      </form>
    </div>
  );
}
