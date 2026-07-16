/**
 * Prints a one-time sign-in link for a given email without sending an
 * actual email (bypasses Supabase's SMTP rate limit — useful for local
 * dev/testing when you don't want to wait on real email delivery).
 * Run with: npx tsx scripts/get-login-link.ts <email>
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}
if (!email) {
  console.error("Usage: npx tsx scripts/get-login-link.ts <email>");
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: email!,
    options: { redirectTo: "http://localhost:3000/auth/callback" },
  });

  if (error || !data) {
    console.error(error?.message ?? "Failed to generate link");
    process.exit(1);
  }

  console.log("\nOpen this URL in your browser to sign in:\n");
  console.log(data.properties.action_link);
  console.log("");
}

main();
