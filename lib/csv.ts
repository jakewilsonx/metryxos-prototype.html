/** Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes, commas/newlines inside quotes. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n") {
      pushRow();
    } else if (char === "\r") {
      // skip, \n handles the row break
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

export interface AccountImportRow {
  account_name: string;
  industry: string;
  city: string;
  state: string;
  contact_name: string;
  title: string;
  linkedin_url: string;
  persona: string;
}

const EXPECTED_HEADERS = ["account_name", "industry", "city", "state", "contact_name", "title", "linkedin_url", "persona"];

export function parseAccountImportCSV(text: string): { rows: AccountImportRow[]; error?: string } {
  const table = parseCSV(text);
  if (table.length === 0) return { rows: [], error: "The file is empty." };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = EXPECTED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return { rows: [], error: `Missing column(s): ${missing.join(", ")}. Expected: ${EXPECTED_HEADERS.join(", ")}.` };
  }

  const idx = Object.fromEntries(EXPECTED_HEADERS.map((h) => [h, header.indexOf(h)]));
  const rows: AccountImportRow[] = table.slice(1).map((cells) => ({
    account_name: (cells[idx.account_name] ?? "").trim(),
    industry: (cells[idx.industry] ?? "").trim(),
    city: (cells[idx.city] ?? "").trim(),
    state: (cells[idx.state] ?? "").trim(),
    contact_name: (cells[idx.contact_name] ?? "").trim(),
    title: (cells[idx.title] ?? "").trim(),
    linkedin_url: (cells[idx.linkedin_url] ?? "").trim(),
    persona: (cells[idx.persona] ?? "").trim(),
  }));

  return { rows: rows.filter((r) => r.account_name) };
}
