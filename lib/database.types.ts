export type ProfileRole = "manager" | "rep";

export type PipelineStatus =
  | "targeting"
  | "engaging"
  | "in_conversation"
  | "meeting_booked"
  | "opportunity"
  | "closed"
  | "parked";

export type ActionType = "engagement" | "outreach" | "follow_up" | "content";

export type SequenceStatus = "active" | "paused" | "completed";

export type ActionCardStatus = "pending" | "done" | "skipped";

export type OutcomeType =
  | "replied"
  | "meeting_booked"
  | "opportunity_created"
  | "not_interested";

export type SignalSource = "manual" | "news";

export interface PlaybookIcp {
  industries: string[];
  company_size: string;
  personas: string[];
}

export interface PlaybookPillar {
  title: string;
  value_prop: string;
  proof_point: string;
}

export interface CadenceRules {
  daily_actions_target: number;
  min_days_between_touches: number;
  max_touches_per_contact_per_week: number;
}

export interface SequenceStep {
  day_offset: number;
  type: ActionType;
  instruction: string;
}

// Note: these carry an index signature (rather than being plain closed
// interfaces) so they structurally satisfy postgrest-js's `GenericTable`
// constraint (`Row/Insert/Update extends Record<string, unknown>`) when
// used below in `Database`. TS only extends that leniency to object type
// literals, not named interfaces, by default.

export interface Org {
  id: string;
  name: string;
  created_at: string;
  [key: string]: unknown;
}

export interface Team {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
  [key: string]: unknown;
}

export interface Profile {
  id: string;
  org_id: string;
  team_id: string | null;
  full_name: string;
  role: ProfileRole;
  created_at: string;
  [key: string]: unknown;
}

export interface Account {
  id: string;
  org_id: string;
  name: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  employee_count: number | null;
  status: PipelineStatus;
  owner_rep_id: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface Contact {
  id: string;
  account_id: string;
  full_name: string;
  title: string | null;
  persona: string | null;
  linkedin_url: string | null;
  stage: PipelineStatus;
  last_touch_at: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface Playbook {
  id: string;
  org_id: string;
  icp: PlaybookIcp;
  pillars: PlaybookPillar[];
  cadence_rules: CadenceRules;
  tone_rules: string | null;
  updated_at: string;
  [key: string]: unknown;
}

export interface SequenceTemplate {
  id: string;
  org_id: string;
  name: string;
  steps: SequenceStep[];
  created_at: string;
  [key: string]: unknown;
}

export interface Sequence {
  id: string;
  contact_id: string;
  template_id: string | null;
  current_step: number;
  status: SequenceStatus;
  started_at: string;
  [key: string]: unknown;
}

export interface ActionCard {
  id: string;
  rep_id: string;
  contact_id: string | null;
  sequence_id: string | null;
  type: ActionType;
  scheduled_date: string;
  angle: string | null;
  draft: string | null;
  status: ActionCardStatus;
  skip_reason: string | null;
  completed_at: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface Outcome {
  id: string;
  contact_id: string;
  rep_id: string;
  type: OutcomeType;
  meeting_date: string | null;
  est_value_usd: number | null;
  note: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface Signal {
  id: string;
  account_id: string;
  source: SignalSource;
  summary: string;
  logged_by: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface Invite {
  id: string;
  org_id: string;
  team_id: string | null;
  email: string;
  role: ProfileRole;
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
  [key: string]: unknown;
}

type Rel = { Relationships: [] };

export interface Database {
  public: {
    Tables: {
      orgs: { Row: Org; Insert: Partial<Org> & { name: string }; Update: Partial<Org> } & Rel;
      teams: { Row: Team; Insert: Partial<Team> & { org_id: string; name: string }; Update: Partial<Team> } & Rel;
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; org_id: string; full_name: string }; Update: Partial<Profile> } & Rel;
      invites: { Row: Invite; Insert: Partial<Invite> & { org_id: string; email: string }; Update: Partial<Invite> } & Rel;
      accounts: { Row: Account; Insert: Partial<Account> & { org_id: string; name: string }; Update: Partial<Account> } & Rel;
      contacts: { Row: Contact; Insert: Partial<Contact> & { account_id: string; full_name: string }; Update: Partial<Contact> } & Rel;
      playbooks: { Row: Playbook; Insert: Partial<Playbook> & { org_id: string }; Update: Partial<Playbook> } & Rel;
      sequence_templates: { Row: SequenceTemplate; Insert: Partial<SequenceTemplate> & { org_id: string; name: string }; Update: Partial<SequenceTemplate> } & Rel;
      sequences: { Row: Sequence; Insert: Partial<Sequence> & { contact_id: string }; Update: Partial<Sequence> } & Rel;
      action_cards: { Row: ActionCard; Insert: Partial<ActionCard> & { rep_id: string; type: ActionType }; Update: Partial<ActionCard> } & Rel;
      outcomes: { Row: Outcome; Insert: Partial<Outcome> & { contact_id: string; rep_id: string; type: OutcomeType }; Update: Partial<Outcome> } & Rel;
      signals: { Row: Signal; Insert: Partial<Signal> & { account_id: string; summary: string }; Update: Partial<Signal> } & Rel;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      profile_role: ProfileRole;
      pipeline_status: PipelineStatus;
      action_type: ActionType;
      sequence_status: SequenceStatus;
      action_card_status: ActionCardStatus;
      outcome_type: OutcomeType;
      signal_source: SignalSource;
    };
    CompositeTypes: Record<string, never>;
  };
}
