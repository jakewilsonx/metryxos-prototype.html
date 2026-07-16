"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { statusLabel } from "@/components/ui/StatusDot";
import type { PipelineStatus } from "@/lib/database.types";

const STATUSES: PipelineStatus[] = [
  "targeting",
  "engaging",
  "in_conversation",
  "meeting_booked",
  "opportunity",
  "closed",
  "parked",
];

export function StatusSelect({
  table,
  id,
  column,
  status,
}: {
  table: "accounts" | "contacts";
  id: string;
  column: "status" | "stage";
  status: PipelineStatus;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleChange(next: PipelineStatus) {
    setSaving(true);
    const supabase = createClient();
    await supabase.from(table).update({ [column]: next }).eq("id", id);
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      value={status}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value as PipelineStatus)}
      className="mono rounded-md border border-border-lt bg-surface2 px-2 py-1 text-[11.5px] font-bold text-text outline-none focus:border-blue"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {statusLabel(s)}
        </option>
      ))}
    </select>
  );
}
