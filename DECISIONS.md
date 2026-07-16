# Decisions

Choices made where the spec left something open, in build order.

## Phase 1

- **Design reference file**: the repo was empty at session start and
  `metryxos-prototype.html` didn't exist yet. It was provided directly by
  the user mid-session and committed to the repo root as the first commit.
  All Phase 1 UI is built to match it exactly (colors, spacing, component
  patterns, the slash-meter mechanic).
- **Framework versions**: scaffolded with the current `create-next-app`
  defaults — Next.js 16, React 19, Tailwind v4 — rather than pinning to
  Next 14. This satisfies "14+" and avoids building against soon-to-be-EOL
  tooling. Tailwind v4's CSS-first `@theme` config is also a natural fit
  for the prototype's CSS custom-property token system — tokens in
  `app/globals.css` are a near-direct port of the prototype's `:root`
  variables.
- **Invites table**: not in the spec's data model, but "manager invites
  reps by email" needs somewhere to hold a pending invite until the
  invited person's `auth.users` row exists (magic link requires them to
  actually sign in first). Added `invites(id, org_id, team_id, email,
  role, invited_by, created_at, accepted_at)` with RLS scoped to
  managers of the org. Invite acceptance runs server-side with the
  service-role client since the invitee has no `profiles` row (and so no
  `org_id`) for RLS to key off of yet.
- **Org bootstrap and invite acceptance run through API routes using the
  Supabase service-role key**, not client-side inserts under RLS. Both
  operations create a brand-new `profiles` row for a user who doesn't
  have one yet, which is exactly the case RLS can't safely allow from the
  client (no `org_id` to check against). The routes re-verify the caller
  is authenticated (and, for invite acceptance, that a matching pending
  invite exists) before writing.
- **Accounts/contacts write access**: spec says "reps can read team
  accounts but only write their own action_cards and outcomes," which
  reads as accounts/contacts being manager-owned data. Added one
  exception: the owner rep of an account can update that account's
  `status` and its contacts' `stage`/`last_touch_at`, since Phase 2's
  "stage control" on contact detail and Phase 3's "Done updates... sets
  last_touch_at, advances sequence step" both require a rep-initiated
  write. Reps still cannot create/delete accounts or contacts, or touch
  accounts they don't own.
- **Rep dashboard visibility**: managers can read all `action_cards` and
  `outcomes` for reps in their org (for the Phase 5 dashboard); reps can
  only read/write their own.
- **Demo org sizing**: seeded 3 reps per the spec's explicit instruction,
  not the 6 shown in the prototype's manager-view mock. To still exercise
  the dashboard's status variety (on track / slipping / inactive-style
  patterns), the 3 reps' seeded action-card history is deliberately
  uneven (Jake: consistent; Sam: a couple of skipped/missed days; Priya:
  consistent) rather than uniformly perfect.
- **Seed script runs outside the RLS-protected client path**: it uses
  `supabase.auth.admin.createUser` (service role) to create the four
  demo `auth.users`, since magic-link accounts can't be pre-provisioned
  through the public API. Re-running the script against an org that
  already exists aborts with a message rather than duplicating data.
- **No live Supabase/Anthropic project is available in the build
  environment** (no Docker daemon for local Supabase, no project
  credentials). Phase 1 acceptance (sign in as manager/rep, correct
  nav per role, empty pages render) is verified by code review, a full
  production build, and lint — not by an end-to-end run against a real
  auth flow. Connect a real Supabase project (see README) to verify
  live.
- **`scripts/get-login-link.ts`**: added during live verification with the
  user's own Supabase project, since the free tier's shared SMTP hit its
  rate limit almost immediately. It uses `admin.generateLink()` to produce
  a sign-in link without sending an email. This surfaced a real bug worth
  noting: `@supabase/ssr`'s browser client hard-codes `flowType: "pkce"`
  and its automatic URL-detection throws away any hash-fragment-style
  token (`#access_token=...`) instead of a `"?code="` — which is exactly
  the shape `admin.generateLink()` produces, since PKCE requires a
  code_challenge only a browser-initiated `signInWithOtp` call can supply.
  `app/auth/callback/page.tsx` now parses the callback URL explicitly
  (hash tokens via `setSession()`, `?code=` via `exchangeCodeForSession()`)
  instead of relying on that auto-detection, so both a real magic-link
  email and this dev-only script work.

## Phase 2

- **Blank playbook created at org bootstrap**: `/api/onboarding/create-org`
  now inserts an empty `playbooks` row alongside the org/profile, so the
  Playbook page always has something to edit (rather than special-casing
  a "no playbook yet" state in the UI). The seed script already did this
  for the demo org; this makes it true for real signups too.
- **Account/contact writes go straight through the browser Supabase
  client** (not API routes) for simple field updates — status/stage
  changes, owner assignment, signal logging, playbook/sequence-template
  edits. RLS already enforces who can write what (see Phase 1 policies),
  so there's no server-side logic these need beyond what Postgres already
  checks. CSV import is the one exception: it needs multi-row
  account/contact matching-and-creation in one pass, which is easier to
  get right as a single server-side route than as sequential client-side
  calls.
- **CSV import account matching**: rows are grouped by `account_name`,
  case-insensitively, against both existing accounts in the org and
  other rows in the same file — so a CSV with multiple contacts under the
  same account name creates one account with several contacts, and
  re-importing a CSV that includes already-existing accounts adds
  contacts to those instead of duplicating the account.
- **Pipeline status coloring**: the prototype doesn't show a status badge
  for accounts/contacts (`pipeline_status` has 7 values; the prototype
  only shows action-type badges and rep on-track/slipping/inactive dots).
  Built a `StatusDot` component reusing the prototype's dot-plus-label
  pattern from the manager dashboard's rep table, with a reasonable color
  per status (targeting/closed dim, engaging blue, in_conversation
  purple, meeting_booked/opportunity green, parked amber).

## Phase 3

- **Candidate selection happens in code, not in the Claude prompt.**
  Which contacts are due for a touch today (cadence spacing, weekly
  touch cap, next sequence step) is computed server-side before ever
  calling Claude; Claude only writes the `angle`/`draft` copy for a
  fixed, pre-selected candidate list, keyed by array index rather than
  by contact_id. This keeps the daily-target and spacing rules exact
  (no reliance on the model counting correctly) and removes any chance
  of the model hallucinating a wrong contact/account pairing.
- **Contacts with no active sequence still get a card** (a generic
  "engage, don't pitch" engagement touch), so newly-imported contacts
  (Phase 2 CSV import) are immediately workable instead of sitting idle
  until a manager manually assigns a sequence — sequence assignment UI
  wasn't in scope for this phase.
- **One "weekly post" (content-type) slot** is added roughly every 6
  days per rep, referencing recent signals across all their accounts
  rather than one contact — matches the prototype's 4th card type.
- **"Generate my day" is a one-shot per calendar day**: the API route
  rejects (409) if the rep already has any cards for today, rather than
  supporting incremental top-ups. Simpler and matches the accept
  criteria ("rep clicks Generate my day, gets cards"); revisit if
  managers need to regenerate mid-day.
- **Sequence step display on Today's cards** (`Step X of Y`) is derived
  from the sequence's current `current_step` at render time rather than
  stored on the action_card row itself (not in the spec's schema) — for
  a done card this reads as `current_step` (already advanced by the
  complete action), for a pending one as `current_step + 1`. This is
  correct for the common case (one card per sequence per day) but could
  drift if a sequence is advanced by something other than that day's
  card.
- **`/api/action-cards/complete`** is a dedicated route (rather than a
  direct client-side Supabase update like the other Phase 2 write
  actions) because completing a card is three related writes — the
  card itself, the contact's `last_touch_at`, and the sequence's
  `current_step`/`status` — and doing that server-side in one place is
  more reliable than three sequential client calls.
