-- Lightweight invite table to support "manager invites reps by email"
-- (not in the original data model spec; added because the auth/bootstrap
-- flow needs somewhere to hold a pending invite until the invited user
-- signs in for the first time and a profiles row can be created for
-- their auth.users id). See DECISIONS.md.

create table invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  email text not null,
  role profile_role not null default 'rep',
  invited_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index idx_invites_org_email_pending on invites (org_id, lower(email)) where accepted_at is null;
create index idx_invites_email on invites (lower(email));
