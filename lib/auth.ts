import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Org } from "@/lib/database.types";

/**
 * Loads the signed-in user's profile + org for a Server Component.
 * Redirects to /login if unauthenticated, /onboarding if authenticated
 * but no profile row exists yet (new signup or unaccepted invite).
 */
export async function requireProfile(): Promise<{ profile: Profile; org: Org; email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  const { data: org } = await supabase
    .from("orgs")
    .select("*")
    .eq("id", profile.org_id)
    .single();

  return { profile, org: org!, email: user.email! };
}
