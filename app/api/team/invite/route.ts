import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile || profile.role !== "manager") {
    return NextResponse.json({ error: "Only managers can invite" }, { status: 403 });
  }

  const { email, role, teamId } = await request.json();
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const { data: invite, error } = await supabase
    .from("invites")
    .insert({
      org_id: profile.org_id,
      team_id: teamId ?? null,
      email: email.trim().toLowerCase(),
      role: role === "manager" ? "manager" : "rep",
      invited_by: profile.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, invite });
}
