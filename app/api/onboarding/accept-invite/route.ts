import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { fullName } = await request.json();
  if (!fullName?.trim()) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
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

  const { data: invite } = await admin
    .from("invites")
    .select("*")
    .eq("email", user.email.toLowerCase())
    .is("accepted_at", null)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "No pending invite found for your email" }, { status: 404 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    org_id: invite.org_id,
    team_id: invite.team_id,
    full_name: fullName.trim(),
    role: invite.role,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await admin.from("invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
