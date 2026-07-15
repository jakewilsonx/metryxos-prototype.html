import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Service-role client. Bypasses RLS — server-only, never import from a
// client component. Used for org bootstrap, invite acceptance, and the
// seed script, where the actor doesn't have a profiles row (and hence no
// org_id) yet for RLS to key off of.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
