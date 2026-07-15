-- Row Level Security for MetryxOS
-- Bootstrap (org + first manager profile) and invite acceptance are done
-- server-side with the service role key, which bypasses RLS entirely —
-- so those tables intentionally have no INSERT policy for authenticated
-- users. Everything else below is enforced for the anon/authenticated
-- roles used by the browser + server components.

-- ============ HELPER FUNCTIONS ============
-- security definer so they can read profiles without recursive RLS checks
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'manager', false)
$$;

-- ============ ENABLE RLS ============
alter table orgs enable row level security;
alter table teams enable row level security;
alter table profiles enable row level security;
alter table invites enable row level security;
alter table accounts enable row level security;
alter table contacts enable row level security;
alter table playbooks enable row level security;
alter table sequence_templates enable row level security;
alter table sequences enable row level security;
alter table action_cards enable row level security;
alter table outcomes enable row level security;
alter table signals enable row level security;

-- ============ ORGS ============
create policy "org: read own" on orgs
  for select using (id = current_org_id());

-- ============ TEAMS ============
create policy "teams: read within org" on teams
  for select using (org_id = current_org_id());

create policy "teams: manager writes" on teams
  for all using (org_id = current_org_id() and is_manager())
  with check (org_id = current_org_id() and is_manager());

-- ============ PROFILES ============
create policy "profiles: read within org" on profiles
  for select using (org_id = current_org_id());

create policy "profiles: self or manager update" on profiles
  for update using (
    org_id = current_org_id() and (id = auth.uid() or is_manager())
  ) with check (
    org_id = current_org_id() and (id = auth.uid() or is_manager())
  );

-- ============ INVITES ============
create policy "invites: manager reads own org" on invites
  for select using (org_id = current_org_id() and is_manager());

create policy "invites: manager creates" on invites
  for insert with check (org_id = current_org_id() and is_manager());

create policy "invites: manager deletes" on invites
  for delete using (org_id = current_org_id() and is_manager());

-- ============ ACCOUNTS ============
create policy "accounts: read within org" on accounts
  for select using (org_id = current_org_id());

create policy "accounts: manager writes" on accounts
  for all using (org_id = current_org_id() and is_manager())
  with check (org_id = current_org_id() and is_manager());

-- reps may update accounts they own (e.g. status) even though they can't create/delete
create policy "accounts: owner rep updates status" on accounts
  for update using (org_id = current_org_id() and owner_rep_id = auth.uid())
  with check (org_id = current_org_id() and owner_rep_id = auth.uid());

-- ============ CONTACTS ============
create policy "contacts: read within org" on contacts
  for select using (
    exists (select 1 from accounts a where a.id = contacts.account_id and a.org_id = current_org_id())
  );

create policy "contacts: manager writes" on contacts
  for all using (
    exists (select 1 from accounts a where a.id = contacts.account_id and a.org_id = current_org_id() and is_manager())
  ) with check (
    exists (select 1 from accounts a where a.id = contacts.account_id and a.org_id = current_org_id() and is_manager())
  );

create policy "contacts: owner rep updates" on contacts
  for update using (
    exists (select 1 from accounts a where a.id = contacts.account_id and a.org_id = current_org_id() and a.owner_rep_id = auth.uid())
  ) with check (
    exists (select 1 from accounts a where a.id = contacts.account_id and a.org_id = current_org_id() and a.owner_rep_id = auth.uid())
  );

-- ============ PLAYBOOKS ============
create policy "playbooks: read within org" on playbooks
  for select using (org_id = current_org_id());

create policy "playbooks: manager writes" on playbooks
  for all using (org_id = current_org_id() and is_manager())
  with check (org_id = current_org_id() and is_manager());

-- ============ SEQUENCE TEMPLATES ============
create policy "sequence_templates: read within org" on sequence_templates
  for select using (org_id = current_org_id());

create policy "sequence_templates: manager writes" on sequence_templates
  for all using (org_id = current_org_id() and is_manager())
  with check (org_id = current_org_id() and is_manager());

-- ============ SEQUENCES ============
create policy "sequences: read within org" on sequences
  for select using (
    exists (
      select 1 from contacts c join accounts a on a.id = c.account_id
      where c.id = sequences.contact_id and a.org_id = current_org_id()
    )
  );

create policy "sequences: manager writes" on sequences
  for all using (
    exists (
      select 1 from contacts c join accounts a on a.id = c.account_id
      where c.id = sequences.contact_id and a.org_id = current_org_id() and is_manager()
    )
  ) with check (
    exists (
      select 1 from contacts c join accounts a on a.id = c.account_id
      where c.id = sequences.contact_id and a.org_id = current_org_id() and is_manager()
    )
  );

create policy "sequences: owner rep advances" on sequences
  for update using (
    exists (
      select 1 from contacts c join accounts a on a.id = c.account_id
      where c.id = sequences.contact_id and a.org_id = current_org_id() and a.owner_rep_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from contacts c join accounts a on a.id = c.account_id
      where c.id = sequences.contact_id and a.org_id = current_org_id() and a.owner_rep_id = auth.uid()
    )
  );

-- ============ ACTION CARDS ============
-- managers see the whole team's cards; reps only see (and write) their own
create policy "action_cards: manager reads all" on action_cards
  for select using (
    exists (select 1 from profiles p where p.id = action_cards.rep_id and p.org_id = current_org_id()) and is_manager()
  );

create policy "action_cards: rep reads own" on action_cards
  for select using (rep_id = auth.uid());

create policy "action_cards: rep writes own" on action_cards
  for insert with check (rep_id = auth.uid());

create policy "action_cards: rep updates own" on action_cards
  for update using (rep_id = auth.uid())
  with check (rep_id = auth.uid());

create policy "action_cards: manager manages team cards" on action_cards
  for all using (
    exists (select 1 from profiles p where p.id = action_cards.rep_id and p.org_id = current_org_id()) and is_manager()
  ) with check (
    exists (select 1 from profiles p where p.id = action_cards.rep_id and p.org_id = current_org_id()) and is_manager()
  );

-- ============ OUTCOMES ============
create policy "outcomes: manager reads all" on outcomes
  for select using (
    exists (select 1 from profiles p where p.id = outcomes.rep_id and p.org_id = current_org_id()) and is_manager()
  );

create policy "outcomes: rep reads own" on outcomes
  for select using (rep_id = auth.uid());

create policy "outcomes: rep writes own" on outcomes
  for insert with check (rep_id = auth.uid());

create policy "outcomes: rep updates own" on outcomes
  for update using (rep_id = auth.uid())
  with check (rep_id = auth.uid());

-- ============ SIGNALS ============
create policy "signals: read within org" on signals
  for select using (
    exists (select 1 from accounts a where a.id = signals.account_id and a.org_id = current_org_id())
  );

create policy "signals: org member logs" on signals
  for insert with check (
    exists (select 1 from accounts a where a.id = signals.account_id and a.org_id = current_org_id())
  );
