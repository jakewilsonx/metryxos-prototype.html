import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseAccountImportCSV } from "@/lib/csv";

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
    return NextResponse.json({ error: "Only managers can import accounts" }, { status: 403 });
  }

  const { csv } = await request.json();
  if (typeof csv !== "string" || !csv.trim()) {
    return NextResponse.json({ error: "No CSV content received" }, { status: 400 });
  }

  const { rows, error: parseError } = parseAccountImportCSV(csv);
  if (parseError) {
    return NextResponse.json({ error: parseError }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows found (each row needs at least account_name)" }, { status: 400 });
  }

  const { data: existingAccounts } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("org_id", profile.org_id);

  const accountIdByName = new Map<string, string>();
  for (const a of existingAccounts ?? []) {
    accountIdByName.set(a.name.trim().toLowerCase(), a.id);
  }

  let accountsCreated = 0;
  let contactsCreated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const key = row.account_name.toLowerCase();
    let accountId = accountIdByName.get(key);

    if (!accountId) {
      const { data: account, error } = await supabase
        .from("accounts")
        .insert({
          org_id: profile.org_id,
          name: row.account_name,
          industry: row.industry || null,
          city: row.city || null,
          state: row.state || null,
          status: "targeting",
        })
        .select()
        .single();

      if (error || !account) {
        errors.push(`Couldn't create account "${row.account_name}": ${error?.message}`);
        continue;
      }
      accountId = account.id;
      accountIdByName.set(key, accountId);
      accountsCreated++;
    }

    if (row.contact_name) {
      const { error } = await supabase.from("contacts").insert({
        account_id: accountId,
        full_name: row.contact_name,
        title: row.title || null,
        persona: row.persona || null,
        linkedin_url: row.linkedin_url || null,
        stage: "targeting",
      });
      if (error) {
        errors.push(`Couldn't create contact "${row.contact_name}" for "${row.account_name}": ${error.message}`);
        continue;
      }
      contactsCreated++;
    }
  }

  return NextResponse.json({ accountsCreated, contactsCreated, rowsProcessed: rows.length, errors });
}
