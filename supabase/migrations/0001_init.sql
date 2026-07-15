-- MetryxOS core schema
-- Phase 1: orgs, teams, profiles, accounts, contacts, playbooks,
-- sequence_templates, sequences, action_cards, outcomes, signals

create extension if not exists "pgcrypto";

-- ============ ENUMS ============
create type profile_role as enum ('manager', 'rep');

create type pipeline_status as enum (
  'targeting', 'engaging', 'in_conversation',
  'meeting_booked', 'opportunity', 'closed', 'parked'
);

create type action_type as enum ('engagement', 'outreach', 'follow_up', 'content');

create type sequence_status as enum ('active', 'paused', 'completed');

create type action_card_status as enum ('pending', 'done', 'skipped');

create type outcome_type as enum (
  'replied', 'meeting_booked', 'opportunity_created', 'not_interested'
);

create type signal_source as enum ('manual', 'news');

-- ============ TABLES ============
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  full_name text not null,
  role profile_role not null default 'rep',
  created_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  industry text,
  city text,
  state text,
  employee_count integer,
  status pipeline_status not null default 'targeting',
  owner_rep_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  full_name text not null,
  title text,
  persona text,
  linkedin_url text,
  stage pipeline_status not null default 'targeting',
  last_touch_at timestamptz,
  created_at timestamptz not null default now()
);

create table playbooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references orgs(id) on delete cascade,
  icp jsonb not null default '{}'::jsonb,
  pillars jsonb not null default '[]'::jsonb,
  cadence_rules jsonb not null default '{}'::jsonb,
  tone_rules text,
  updated_at timestamptz not null default now()
);

create table sequence_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table sequences (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  template_id uuid references sequence_templates(id) on delete set null,
  current_step integer not null default 0,
  status sequence_status not null default 'active',
  started_at timestamptz not null default now()
);

create table action_cards (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references profiles(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  sequence_id uuid references sequences(id) on delete set null,
  type action_type not null,
  scheduled_date date not null default current_date,
  angle text,
  draft text,
  status action_card_status not null default 'pending',
  skip_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table outcomes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  rep_id uuid not null references profiles(id) on delete cascade,
  type outcome_type not null,
  meeting_date date,
  est_value_usd numeric,
  note text,
  created_at timestamptz not null default now()
);

create table signals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  source signal_source not null default 'manual',
  summary text not null,
  logged_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============ INDEXES ============
create index idx_teams_org on teams(org_id);
create index idx_profiles_org on profiles(org_id);
create index idx_profiles_team on profiles(team_id);
create index idx_accounts_org on accounts(org_id);
create index idx_accounts_owner on accounts(owner_rep_id);
create index idx_contacts_account on contacts(account_id);
create index idx_sequence_templates_org on sequence_templates(org_id);
create index idx_sequences_contact on sequences(contact_id);
create index idx_action_cards_rep on action_cards(rep_id);
create index idx_action_cards_rep_date on action_cards(rep_id, scheduled_date);
create index idx_action_cards_contact on action_cards(contact_id);
create index idx_outcomes_contact on outcomes(contact_id);
create index idx_outcomes_rep on outcomes(rep_id);
create index idx_signals_account on signals(account_id);
