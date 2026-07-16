import type { PipelineStatus } from "@/lib/database.types";

const STATUS_LABEL: Record<PipelineStatus, string> = {
  targeting: "Targeting",
  engaging: "Engaging",
  in_conversation: "In conversation",
  meeting_booked: "Meeting booked",
  opportunity: "Opportunity",
  closed: "Closed",
  parked: "Parked",
};

const STATUS_COLOR: Record<PipelineStatus, string> = {
  targeting: "var(--dim)",
  engaging: "var(--blue)",
  in_conversation: "var(--purple)",
  meeting_booked: "var(--green)",
  opportunity: "var(--green)",
  closed: "var(--muted)",
  parked: "var(--amber)",
};

export function statusLabel(status: PipelineStatus) {
  return STATUS_LABEL[status];
}

export function StatusDot({ status }: { status: PipelineStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color }}>
      <span className="dot" style={{ background: color }} />
      {STATUS_LABEL[status]}
    </span>
  );
}
