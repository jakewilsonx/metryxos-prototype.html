/**
 * Seeds a demo org for local development / QA.
 * Run with: npm run seed
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 * (or the process environment) and the migrations in supabase/migrations
 * already applied.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORG_NAME = "Metryx Demo Co.";
const TEAM_NAME = "Industrial East Team";

async function ensureUser(email: string, fullName: string) {
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 200 });
  const found = existing?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) return found.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(`createUser(${email}) failed: ${error?.message}`);
  return data.user.id;
}

async function main() {
  const { data: existingOrg } = await admin.from("orgs").select("id").eq("name", ORG_NAME).maybeSingle();
  if (existingOrg) {
    console.error(`"${ORG_NAME}" already exists (id ${existingOrg.id}). Delete it first if you want to reseed.`);
    process.exit(1);
  }

  console.log("Creating org + team…");
  const { data: org, error: orgErr } = await admin.from("orgs").insert({ name: ORG_NAME }).select().single();
  if (orgErr || !org) throw new Error(orgErr?.message);

  const { data: team, error: teamErr } = await admin
    .from("teams")
    .insert({ org_id: org.id, name: TEAM_NAME })
    .select()
    .single();
  if (teamErr || !team) throw new Error(teamErr?.message);

  console.log("Creating users…");
  const managerAuthId = await ensureUser("alex.moran@metryxdemo.co", "Alex Moran");
  const jakeAuthId = await ensureUser("jake.wilson@metryxdemo.co", "Jake Wilson");
  const samAuthId = await ensureUser("sam.ortiz@metryxdemo.co", "Sam Ortiz");
  const priyaAuthId = await ensureUser("priya.nair@metryxdemo.co", "Priya Nair");

  const { error: profilesErr } = await admin.from("profiles").insert([
    { id: managerAuthId, org_id: org.id, team_id: team.id, full_name: "Alex Moran", role: "manager" },
    { id: jakeAuthId, org_id: org.id, team_id: team.id, full_name: "Jake Wilson", role: "rep" },
    { id: samAuthId, org_id: org.id, team_id: team.id, full_name: "Sam Ortiz", role: "rep" },
    { id: priyaAuthId, org_id: org.id, team_id: team.id, full_name: "Priya Nair", role: "rep" },
  ]);
  if (profilesErr) throw new Error(profilesErr.message);

  console.log("Creating playbook…");
  const { data: playbook, error: playbookErr } = await admin
    .from("playbooks")
    .insert({
      org_id: org.id,
      icp: {
        industries: ["Metal Stamping", "Injection Molding / Plastics", "Gear & Machine Shops", "Castings", "Extrusion"],
        company_size: "50-500 employees",
        personas: ["Plant Manager", "Maintenance Director", "VP of Operations", "Reliability Engineer", "Owner"],
      },
      pillars: [
        {
          title: "Reliability over reactive maintenance",
          value_prop: "Catch failures weeks before they cause unplanned downtime, without adding headcount.",
          proof_point: "A gear shop in Ohio cut reactive maintenance work 40% in two quarters before adding a single tech.",
        },
        {
          title: "Coverage gaps, not vendor replacement",
          value_prop: "Position around what an existing vendor misses instead of pitching a rip-and-replace.",
          proof_point: "Plants keeping their incumbent vibration vendor still saw a 30% drop in unplanned line stops after adding coverage on the gaps.",
        },
        {
          title: "Operator-level buy-in",
          value_prop: "Reliability programs stick when the operators running the machine believe in them, not just the plant manager.",
          proof_point: "A plastics ops team's operator-led scrap-rate initiative held for 18 months because floor techs owned the checklist.",
        },
      ],
      cadence_rules: {
        daily_actions_target: 7,
        min_days_between_touches: 2,
        max_touches_per_contact_per_week: 3,
      },
      tone_rules:
        "Plant-floor credible, no corporate fluff. Reference specific equipment, shifts, and failure modes. Never pitch in the first two touches — earn the comment before you ask for anything.",
    })
    .select()
    .single();
  if (playbookErr || !playbook) throw new Error(playbookErr?.message);

  console.log("Creating sequence templates…");
  const { data: templates, error: templatesErr } = await admin
    .from("sequence_templates")
    .insert([
      {
        org_id: org.id,
        name: "Cold Executive",
        steps: [
          { day_offset: 0, type: "engagement", instruction: "Comment on a recent post with a specific technical observation. No pitch." },
          { day_offset: 2, type: "engagement", instruction: "Engage again — like or comment on another post, article share, or company update." },
          { day_offset: 4, type: "outreach", instruction: "Send a personalized connection request referencing the engagement history." },
          { day_offset: 7, type: "follow_up", instruction: "If connected but no reply, send a value-first follow-up referencing a live signal." },
          { day_offset: 12, type: "follow_up", instruction: "Final follow-up — share a relevant proof point / case study, zero pressure, leave the door open." },
        ],
      },
      {
        org_id: org.id,
        name: "Warm Referral",
        steps: [
          { day_offset: 0, type: "outreach", instruction: "Send a connection request referencing the mutual contact who made the introduction." },
          { day_offset: 2, type: "outreach", instruction: "DM introducing yourself and the referral context, ask for 15 minutes." },
          { day_offset: 6, type: "follow_up", instruction: "Follow up once if no response, reference the shared connection again." },
        ],
      },
      {
        org_id: org.id,
        name: "Event Follow-up",
        steps: [
          { day_offset: 0, type: "engagement", instruction: "Comment on their event recap or photos post." },
          { day_offset: 1, type: "outreach", instruction: "Send a connection request referencing the conversation you had at the event." },
          { day_offset: 3, type: "outreach", instruction: "DM recapping what you discussed and share the resource you promised." },
          { day_offset: 8, type: "follow_up", instruction: "Follow up with a case study relevant to what they showed interest in." },
        ],
      },
    ])
    .select();
  if (templatesErr || !templates) throw new Error(templatesErr?.message);

  const coldExec = templates.find((t) => t.name === "Cold Executive")!;
  const warmReferral = templates.find((t) => t.name === "Warm Referral")!;
  const eventFollowUp = templates.find((t) => t.name === "Event Follow-up")!;

  console.log("Creating accounts + contacts…");
  const accountsSeed = [
    {
      name: "Keystone Stamping",
      industry: "Metal Stamping",
      city: "Fort Wayne",
      state: "IN",
      employee_count: 180,
      status: "engaging" as const,
      owner: jakeAuthId,
      contacts: [
        { full_name: "Dan Kowalski", title: "Maintenance Director", persona: "Maintenance Director" },
        { full_name: "Rick Alvarez", title: "Plant Manager", persona: "Plant Manager" },
        { full_name: "Denise Chu", title: "Reliability Engineer", persona: "Reliability Engineer" },
      ],
    },
    {
      name: "Vantage Plastics",
      industry: "Injection Molding / Plastics",
      city: "Elkhart",
      state: "IN",
      employee_count: 240,
      status: "in_conversation" as const,
      owner: jakeAuthId,
      contacts: [
        { full_name: "Maria Reyes", title: "VP of Operations", persona: "VP of Operations" },
        { full_name: "Beth Sorensen", title: "Plant Manager", persona: "Plant Manager" },
      ],
    },
    {
      name: "Harlan Gear & Machine",
      industry: "Gear & Machine Shops",
      city: "Auburn",
      state: "IN",
      employee_count: 95,
      status: "engaging" as const,
      owner: jakeAuthId,
      contacts: [
        { full_name: "Tom Brandt", title: "Plant Manager", persona: "Plant Manager" },
        { full_name: "Wendy Park", title: "Maintenance Director", persona: "Maintenance Director" },
      ],
    },
    {
      name: "Blue River Castings",
      industry: "Castings",
      city: "Findlay",
      state: "OH",
      employee_count: 310,
      status: "meeting_booked" as const,
      owner: samAuthId,
      contacts: [
        { full_name: "Frank Delgado", title: "VP of Operations", persona: "VP of Operations" },
        { full_name: "Nina Osei", title: "Reliability Engineer", persona: "Reliability Engineer" },
      ],
    },
    {
      name: "Midwest Extrusion",
      industry: "Extrusion",
      city: "Kalamazoo",
      state: "MI",
      employee_count: 150,
      status: "targeting" as const,
      owner: samAuthId,
      contacts: [
        { full_name: "Greg Palmer", title: "VP of Operations", persona: "VP of Operations" },
        { full_name: "Lou Mercer", title: "Maintenance Director", persona: "Maintenance Director" },
      ],
    },
    {
      name: "Buckeye Precision Machine",
      industry: "Gear & Machine Shops",
      city: "Canton",
      state: "OH",
      employee_count: 60,
      status: "targeting" as const,
      owner: priyaAuthId,
      contacts: [
        { full_name: "Hank Buckley", title: "Owner", persona: "Owner" },
        { full_name: "Sara Whitfield", title: "Plant Manager", persona: "Plant Manager" },
      ],
    },
    {
      name: "Great Lakes Stamping",
      industry: "Metal Stamping",
      city: "Grand Rapids",
      state: "MI",
      employee_count: 220,
      status: "opportunity" as const,
      owner: priyaAuthId,
      contacts: [
        { full_name: "Marcus Doyle", title: "Plant Manager", persona: "Plant Manager" },
        { full_name: "Ivy Chen", title: "Reliability Engineer", persona: "Reliability Engineer" },
      ],
    },
    {
      name: "Cardinal Plastics Group",
      industry: "Injection Molding / Plastics",
      city: "South Bend",
      state: "IN",
      employee_count: 130,
      status: "targeting" as const,
      owner: null,
      contacts: [{ full_name: "Pete Cardinal", title: "Owner", persona: "Owner" }],
    },
  ];

  const contactIds: Record<string, string> = {};
  const accountIds: Record<string, string> = {};

  for (const a of accountsSeed) {
    const { data: account, error: accErr } = await admin
      .from("accounts")
      .insert({
        org_id: org.id,
        name: a.name,
        industry: a.industry,
        city: a.city,
        state: a.state,
        employee_count: a.employee_count,
        status: a.status,
        owner_rep_id: a.owner,
      })
      .select()
      .single();
    if (accErr || !account) throw new Error(accErr?.message);
    accountIds[a.name] = account.id;

    for (const c of a.contacts) {
      const { data: contact, error: cErr } = await admin
        .from("contacts")
        .insert({
          account_id: account.id,
          full_name: c.full_name,
          title: c.title,
          persona: c.persona,
          stage: a.status,
        })
        .select()
        .single();
      if (cErr || !contact) throw new Error(cErr?.message);
      contactIds[c.full_name] = contact.id;
    }
  }

  console.log("Creating sequences…");
  const sequencesSeed = [
    { contact: "Dan Kowalski", template: coldExec, step: 1 },
    { contact: "Maria Reyes", template: coldExec, step: 3 },
    { contact: "Tom Brandt", template: coldExec, step: 5 },
    { contact: "Frank Delgado", template: warmReferral, step: 1 },
    { contact: "Greg Palmer", template: eventFollowUp, step: 2 },
  ];
  const sequenceIds: Record<string, string> = {};
  for (const s of sequencesSeed) {
    const { data: seq, error: seqErr } = await admin
      .from("sequences")
      .insert({
        contact_id: contactIds[s.contact],
        template_id: s.template.id,
        current_step: s.step,
        status: "active",
      })
      .select()
      .single();
    if (seqErr || !seq) throw new Error(seqErr?.message);
    sequenceIds[s.contact] = seq.id;
  }

  console.log("Creating action cards…");
  const today = new Date();
  const isoDaysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  type CardSeed = {
    rep: string;
    contact?: string;
    sequence?: string;
    type: "engagement" | "outreach" | "follow_up" | "content";
    daysAgo: number;
    angle: string;
    draft: string;
    status: "pending" | "done" | "skipped";
    skip_reason?: string;
  };

  const cards: CardSeed[] = [
    // ---- Jake Wilson — today's 4 cards (pending), matching the design reference ----
    {
      rep: jakeAuthId,
      contact: "Dan Kowalski",
      sequence: "Dan Kowalski",
      type: "engagement",
      daysAgo: 0,
      angle:
        "Dan posted yesterday about unplanned downtime on their 400-ton press line. Comment with a reliability take — don't pitch.",
      draft:
        "Been on both sides of a press line going down mid-run. The fix that stuck for us wasn't more PMs — it was catching bearing wear 3 weeks earlier. Curious if you're seeing it on the drive end or crank side?",
      status: "pending",
    },
    {
      rep: jakeAuthId,
      contact: "Maria Reyes",
      sequence: "Maria Reyes",
      type: "outreach",
      daysAgo: 0,
      angle:
        "You've engaged twice this week and she liked your comment Monday. Send the connection request now — reference the extrusion scrap thread.",
      draft:
        "Maria — enjoyed the back-and-forth on your scrap rate post. I work with plastics ops teams across Indiana and your take on operator buy-in was the realest thing I read this week. Would be glad to connect.",
      status: "pending",
    },
    {
      rep: jakeAuthId,
      contact: "Tom Brandt",
      sequence: "Tom Brandt",
      type: "follow_up",
      daysAgo: 0,
      angle:
        "Connected 6 days ago, no reply to your first DM. Signal on file: Harlan is hiring two maintenance techs. Send the value follow-up — share the case study, zero pressure.",
      draft:
        "Tom — no reply needed on the last note. Saw you're adding maintenance techs, and it reminded me of a gear shop in Ohio that cut their reactive work 40% before adding headcount. Wrote up how they did it — want the link?",
      status: "pending",
    },
    {
      rep: jakeAuthId,
      type: "content",
      daysAgo: 0,
      angle:
        "3 of your 15 active targets posted about labor shortages this week. Publish your take on training vs. hiring — it puts you in their feed without a DM.",
      draft:
        "Every plant I visit says the same thing: \"We can't find people.\" The best ones stopped looking and started building. Here's what that looks like on a real shop floor…",
      status: "pending",
    },
    // ---- Jake Wilson — history (on track, 6/7 days active) ----
    { rep: jakeAuthId, contact: "Rick Alvarez", type: "engagement", daysAgo: 1, angle: "Rick shared a plant tour video — comment on the changeover time he mentioned.", draft: "That changeover time is brutal to shave down without SMED discipline. What's your current changeover average on the transfer press?", status: "done" },
    { rep: jakeAuthId, contact: "Beth Sorensen", type: "outreach", daysAgo: 1, angle: "Beth accepted the connection request yesterday. Send the intro DM.", draft: "Beth — thanks for connecting. I work with plastics plant leaders on catching scrap drivers before they show up in the monthly numbers. Worth a 15-minute conversation sometime?", status: "done" },
    { rep: jakeAuthId, contact: "Wendy Park", type: "engagement", daysAgo: 2, angle: "Wendy posted about a new CMMS rollout. Comment with a specific implementation question.", draft: "Rollouts like this live or die on the shop floor buy-in, not the software. How are you handling technician adoption in the first 90 days?", status: "done" },
    { rep: jakeAuthId, contact: "Denise Chu", type: "follow_up", daysAgo: 3, angle: "No reply on last week's DM. Skip — she's out on leave per her profile update.", draft: "N/A", status: "skipped", skip_reason: "bad_fit" },
    { rep: jakeAuthId, type: "content", daysAgo: 4, angle: "Weekly post — reliability vs. reactive maintenance take, tied to pillar one.", draft: "Every plant tracks downtime. Almost none track the 3 weeks before the downtime, when the bearing was already talking to you.", status: "done" },
    { rep: jakeAuthId, contact: "Dan Kowalski", type: "engagement", daysAgo: 5, angle: "First touch — comment on Dan's post about press line reliability.", draft: "Solid breakdown. Curious what your current PM interval is on that line.", status: "done" },
    { rep: jakeAuthId, contact: "Maria Reyes", type: "engagement", daysAgo: 6, angle: "First touch — comment on Maria's scrap rate post.", draft: "Operator buy-in is the whole game here. What moved the needle for your team?", status: "done" },

    // ---- Sam Ortiz — history (slipping, missed a couple days) ----
    { rep: samAuthId, contact: "Frank Delgado", type: "outreach", daysAgo: 0, angle: "Frank booked a meeting last week off the expansion signal. Send prep note ahead of the call.", draft: "Frank — looking forward to Thursday. Sending a one-pager ahead of time on how plants going through capacity expansions usually sequence reliability coverage so it doesn't get lost in the ramp-up.", status: "pending" },
    { rep: samAuthId, contact: "Nina Osei", type: "engagement", daysAgo: 1, angle: "Nina commented on an industry post about castings porosity defects. Reply with a technical add.", draft: "Porosity root-causing gets so much easier once you can correlate pour temp logs with defect location. Are you capturing that today or still doing it by feel?", status: "done" },
    { rep: samAuthId, contact: "Greg Palmer", type: "engagement", daysAgo: 2, angle: "Greg just started as Ops VP — congratulate and open the door without pitching.", draft: "Congrats on the new role, Greg. Big shoes to grow into on the ops side of an extrusion line. Following your posts — good luck with the first 90 days.", status: "done" },
    { rep: samAuthId, contact: "Lou Mercer", type: "follow_up", daysAgo: 3, angle: "No time yesterday — pushed to today's queue instead.", draft: "N/A", status: "skipped", skip_reason: "no_time" },
    { rep: samAuthId, type: "content", daysAgo: 4, angle: "Weekly post on coverage gaps vs. vendor replacement, tied to pillar two.", draft: "You don't need to fire your vibration vendor. You need to know what they're not covering.", status: "done" },
    { rep: samAuthId, contact: "Frank Delgado", type: "outreach", daysAgo: 5, angle: "Send connection request referencing the $4M expansion signal.", draft: "Frank — saw the news on the line expansion, congrats. I work with plant ops leaders on reliability coverage through exactly this kind of ramp-up. Would be glad to connect.", status: "done" },
    { rep: samAuthId, contact: "Nina Osei", type: "engagement", daysAgo: 6, angle: "No activity logged — day missed.", draft: "N/A", status: "skipped", skip_reason: "no_time" },

    // ---- Priya Nair — history (on track) ----
    { rep: priyaAuthId, contact: "Marcus Doyle", type: "outreach", daysAgo: 0, angle: "Marcus opened an opportunity conversation last week. Send scheduling note for the plant walk.", draft: "Marcus — want to lock in that plant walk before month end? Happy to work around your production schedule.", status: "pending" },
    { rep: priyaAuthId, contact: "Ivy Chen", type: "engagement", daysAgo: 1, angle: "Ivy shared a reliability engineering conference recap. Comment with a specific session takeaway.", draft: "That session on vibration baselining was the one I'd have wanted to sit in on too. Anything from it you're planning to actually roll out on the floor?", status: "done" },
    { rep: priyaAuthId, contact: "Hank Buckley", type: "engagement", daysAgo: 2, angle: "Hank posted about hiring challenges on a small shop floor. Comment with the training-vs-hiring take.", draft: "Small shop hiring is brutal right now. The owners I talk to who are winning have stopped competing on wage alone and started building a real training path. Worth a conversation on what that could look like for Buckeye?", status: "done" },
    { rep: priyaAuthId, contact: "Sara Whitfield", type: "outreach", daysAgo: 3, angle: "Sara accepted connection request. Send intro DM.", draft: "Sara — thanks for connecting. I work with gear and machine shop leaders on reliability coverage that doesn't require adding headcount. Open to a short call sometime?", status: "done" },
    { rep: priyaAuthId, type: "content", daysAgo: 4, angle: "Weekly post — operator buy-in take, tied to pillar three.", draft: "The best reliability program is worthless if the second-shift operator doesn't believe in it. Here's how one plastics team got buy-in that actually lasted.", status: "done" },
    { rep: priyaAuthId, contact: "Marcus Doyle", type: "engagement", daysAgo: 5, angle: "First touch — comment on Marcus's post about scrap reduction.", draft: "That scrap reduction number is real progress. What changed operationally to get there?", status: "done" },
    { rep: priyaAuthId, contact: "Ivy Chen", type: "engagement", daysAgo: 6, angle: "First touch — comment on Ivy's reliability engineering post.", draft: "Good breakdown. Curious how you're baselining vibration data today.", status: "done" },
  ];

  for (const c of cards) {
    const scheduled_date = isoDaysAgo(c.daysAgo);
    const completed_at = c.status === "done" ? new Date(new Date(scheduled_date).getTime() + 3600_000).toISOString() : null;
    const { error } = await admin.from("action_cards").insert({
      rep_id: c.rep,
      contact_id: c.contact ? contactIds[c.contact] : null,
      sequence_id: c.sequence ? sequenceIds[c.sequence] ?? null : null,
      type: c.type,
      scheduled_date,
      angle: c.angle,
      draft: c.draft,
      status: c.status,
      skip_reason: c.skip_reason ?? null,
      completed_at,
    });
    if (error) throw new Error(error.message);

    if (c.status === "done" && c.contact) {
      await admin.from("contacts").update({ last_touch_at: completed_at }).eq("id", contactIds[c.contact]);
    }
  }

  console.log("Creating outcomes…");
  const outcomes = [
    { contact: "Maria Reyes", rep: jakeAuthId, type: "replied" as const, note: "Replied to the connection note, open to a call next week." },
    { contact: "Frank Delgado", rep: samAuthId, type: "meeting_booked" as const, meeting_date: isoDaysAgo(-5), est_value_usd: 45000, note: "Discovery call booked off the expansion signal." },
    { contact: "Frank Delgado", rep: samAuthId, type: "opportunity_created" as const, est_value_usd: 45000, note: "Reliability coverage assessment scoped for the new line." },
    { contact: "Marcus Doyle", rep: priyaAuthId, type: "meeting_booked" as const, meeting_date: isoDaysAgo(-3), est_value_usd: 28000, note: "Plant walk scheduled." },
    { contact: "Denise Chu", rep: jakeAuthId, type: "not_interested" as const, note: "On leave, revisit next quarter." },
  ];
  for (const o of outcomes) {
    const { error } = await admin.from("outcomes").insert({
      contact_id: contactIds[o.contact],
      rep_id: o.rep,
      type: o.type,
      meeting_date: "meeting_date" in o ? o.meeting_date : null,
      est_value_usd: "est_value_usd" in o ? o.est_value_usd : null,
      note: o.note,
    });
    if (error) throw new Error(error.message);
  }

  console.log("Creating signals…");
  const signals = [
    { account: "Harlan Gear & Machine", source: "manual" as const, summary: "Harlan Gear & Machine is hiring 2 maintenance techs.", logged_by: jakeAuthId },
    { account: "Blue River Castings", source: "news" as const, summary: "Blue River Castings announced a $4M line expansion.", logged_by: null },
    { account: "Midwest Extrusion", source: "manual" as const, summary: "Midwest Extrusion has a new Ops VP who started this month.", logged_by: samAuthId },
  ];
  for (const s of signals) {
    const { error } = await admin.from("signals").insert({
      account_id: accountIds[s.account],
      source: s.source,
      summary: s.summary,
      logged_by: s.logged_by,
    });
    if (error) throw new Error(error.message);
  }

  console.log("\nDone. Demo accounts (magic link, no password):");
  console.log("  Manager: alex.moran@metryxdemo.co");
  console.log("  Rep:     jake.wilson@metryxdemo.co");
  console.log("  Rep:     sam.ortiz@metryxdemo.co");
  console.log("  Rep:     priya.nair@metryxdemo.co");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
