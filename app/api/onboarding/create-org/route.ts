import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { orgName, fullName } = await request.json();
  if (!orgName?.trim() || !fullName?.trim()) {
    return NextResponse.json({ error: "Org name and full name are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json({ error: "You already belong to an org" }, { status: 409 });
  }

  const { data: org, error: orgError } = await admin
    .from("orgs")
    .insert({ name: orgName.trim() })
    .select()
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? "Could not create org" }, { status: 500 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    org_id: org.id,
    full_name: fullName.trim(),
    role: "manager",
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Blank playbook so /playbook always has a row to edit, regardless of
  // whether this org came from the seed script or a real signup.
  await admin.from("playbooks").insert({
    org_id: org.id,
    icp: { industries: [], company_size: "", personas: [] },
    pillars: [],
    cadence_rules: { daily_actions_target: 5, min_days_between_touches: 2, max_touches_per_contact_per_week: 3 },
    tone_rules: "",
  });

  return NextResponse.json({ ok: true, orgId: org.id });
}
