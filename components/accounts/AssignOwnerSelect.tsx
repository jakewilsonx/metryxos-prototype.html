"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AssignOwnerSelect({
  accountId,
  ownerRepId,
  reps,
}: {
  accountId: string;
  ownerRepId: string | null;
  reps: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(next: string) {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("accounts")
      .update({ owner_rep_id: next || null })
      .eq("id", accountId);
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      value={ownerRepId ?? ""}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-md border border-border-lt bg-surface2 px-2 py-1 text-[12px] text-text outline-none focus:border-blue"
    >
      <option value="">Unassigned</option>
      {reps.map((r) => (
        <option key={r.id} value={r.id}>
          {r.full_name}
        </option>
      ))}
    </select>
  );
}
