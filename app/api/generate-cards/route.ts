import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCandidates, generateCardContent } from "@/lib/cardGeneration";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) {
    return NextResponse.json({ error: "No profile found" }, { status: 404 });
  }

  let repId = profile.id;
  if (profile.role === "manager") {
    const body = await request.json().catch(() => ({}));
    if (!body.repId) {
      return NextResponse.json({ error: "repId is required for managers" }, { status: 400 });
    }
    const { data: rep } = await supabase.from("profiles").select("*").eq("id", body.repId).eq("org_id", profile.org_id).single();
    if (!rep) {
      return NextResponse.json({ error: "Rep not found in your org" }, { status: 404 });
    }
    repId = rep.id;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: existingToday } = await supabase
    .from("action_cards")
    .select("id")
    .eq("rep_id", repId)
    .eq("scheduled_date", today);
  if (existingToday && existingToday.length > 0) {
    return NextResponse.json({ error: "Cards already generated for today" }, { status: 409 });
  }

  const { candidates, playbook } = await buildCandidates(supabase, repId, profile.org_id);

  if (candidates.length === 0) {
    return NextResponse.json({ cards: [], message: "No eligible touches right now — every assigned contact was touched recently, or no accounts are assigned yet." });
  }

  let generated;
  try {
    generated = await generateCardContent(candidates, playbook);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Card generation failed" }, { status: 502 });
  }

  const contentByIndex = new Map(generated.map((g) => [g.index, g]));
  const rows = candidates
    .map((c, index) => {
      const content = contentByIndex.get(index);
      if (!content) return null;
      return {
        rep_id: repId,
        contact_id: c.contact?.id ?? null,
        sequence_id: c.sequence?.id ?? null,
        type: c.type,
        scheduled_date: today,
        angle: content.angle,
        draft: content.draft,
        status: "pending" as const,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) {
    return NextResponse.json({ error: "The AI response didn't match any candidates. Try again." }, { status: 502 });
  }

  const { data: inserted, error: insertError } = await supabase.from("action_cards").insert(rows).select();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ cards: inserted });
}
