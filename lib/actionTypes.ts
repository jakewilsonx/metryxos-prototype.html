import type { ActionType } from "@/lib/database.types";

export const ACTION_LABEL: Record<ActionType, string> = {
  engagement: "Engagement",
  outreach: "Outreach",
  follow_up: "Follow-up",
  content: "Content",
};

export const ACTION_BADGE_CLASS: Record<ActionType, string> = {
  engagement: "badge eng",
  outreach: "badge out",
  follow_up: "badge fup",
  content: "badge con",
};

export const ACTION_BORDER_COLOR: Record<ActionType, string> = {
  engagement: "var(--blue)",
  outreach: "var(--green)",
  follow_up: "var(--amber)",
  content: "var(--purple)",
};

export const OUTCOME_LABEL = {
  replied: "Replied",
  meeting_booked: "Meeting booked",
  opportunity_created: "Opportunity created",
  not_interested: "Not interested",
} as const;
