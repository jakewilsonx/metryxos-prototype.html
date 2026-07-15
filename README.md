# MetryxOS

Social selling platform for industrial and manufacturing sales teams. Manager
defines a playbook once; reps get playbook-consistent daily action cards; a
coach helps them work objections. No LinkedIn scraping or automation —
everything reps execute happens manually on LinkedIn. This app is a planning,
drafting, coaching, and tracking layer only.

Design reference: `metryxos-prototype.html` in the repo root — open it in a
browser to see the source-of-truth layout, spacing, and interaction feel.

## Stack

- Next.js (App Router, TypeScript)
- Supabase (Postgres, Auth via email magic link, Row Level Security)
- Tailwind CSS v4 (CSS-first `@theme`, tokens in `app/globals.css`)
- Anthropic API, called only from Next.js API routes (`ANTHROPIC_API_KEY` is server-only)

## Setup

1. **Create a Supabase project.** In the SQL editor, run the migrations in
   `supabase/migrations/` in order (`0001_init.sql`, `0002_invites.sql`,
   `0003_rls.sql`), or use the Supabase CLI:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

2. **Copy env vars:**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` from Project Settings -> API. Fill in
   `ANTHROPIC_API_KEY` once you reach Phase 3.

3. **In Supabase Auth settings**, add `http://localhost:3000/auth/callback`
   (and your deployed origin's equivalent) to the redirect allow-list, and
   disable "Confirm email" if you want magic-link sign-in to work
   immediately for seeded users (the seed script creates users with
   `email_confirm: true`, so this isn't required for the demo accounts).

4. **Install + seed:**

   ```bash
   npm install
   npm run seed
   ```

   This creates a demo org ("Metryx Demo Co.") with a manager, 3 reps, 8
   manufacturing accounts, contacts, a playbook, 3 sequence templates, a
   week of action cards, outcomes, and signals. Demo logins (magic link, no
   password):

   - Manager: `alex.moran@metryxdemo.co`
   - Rep: `jake.wilson@metryxdemo.co`
   - Rep: `sam.ortiz@metryxdemo.co`
   - Rep: `priya.nair@metryxdemo.co`

5. **Run the app:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), sign in with one of
   the demo emails, and click the magic link from your inbox (or the
   Supabase Auth logs if using a local/test SMTP setup).

First real (non-seeded) user to sign in bootstraps a new org and becomes its
manager; managers invite reps by email from the Team page.

See `DECISIONS.md` for choices made where the spec left something open.
