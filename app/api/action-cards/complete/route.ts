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

  const { cardId } = await request.json();
  if (!cardId) {
    return NextResponse.json({ error: "cardId is required" }, { status: 400 });
  }

  const { data: card } = await supabase.from("action_cards").select("*").eq("id", cardId).single();
  if (!card || card.rep_id !== user.id) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }
  if (card.status !== "pending") {
    return NextResponse.json({ error: "Card already resolved" }, { status: 409 });
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("action_cards")
    .update({ status: "done", completed_at: now })
    .eq("id", cardId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (card.contact_id) {
    await supabase.from("contacts").update({ last_touch_at: now }).eq("id", card.contact_id);
  }

  if (card.sequence_id) {
    const { data: sequence } = await supabase.from("sequences").select("*").eq("id", card.sequence_id).single();
    if (sequence) {
      const { data: template } = await supabase
        .from("sequence_templates")
        .select("steps")
        .eq("id", sequence.template_id ?? "")
        .maybeSingle();
      const nextStep = sequence.current_step + 1;
      const isComplete = template ? nextStep >= template.steps.length : false;
      await supabase
        .from("sequences")
        .update({ current_step: nextStep, status: isComplete ? "completed" : "active" })
        .eq("id", card.sequence_id);
    }
  }

  return NextResponse.json({ ok: true });
}
