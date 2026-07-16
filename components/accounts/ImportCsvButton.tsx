"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ImportResult = {
  accountsCreated: number;
  contactsCreated: number;
  rowsProcessed: number;
  errors: string[];
};

export function ImportCsvButton() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(file: File) {
    setStatus("loading");
    setError("");
    setResult(null);
    const csv = await file.text();
    const res = await fetch("/api/accounts/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Import failed");
      setStatus("error");
      return;
    }
    setResult(body);
    setStatus("idle");
    router.refresh();
  }

  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}>
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md p-6">
            <div className="mb-1 flex items-center justify-between">
              <div className="display text-[15px]">Import accounts + contacts</div>
              <button className="btn ghost !p-1.5" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <p className="mb-4 text-[12.5px] text-muted">
              CSV columns: <span className="mono text-text">account_name, industry, city, state, contact_name, title, linkedin_url, persona</span>.
              One row per contact — accounts with the same name are merged.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="mb-4 text-[12.5px]"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {status === "loading" && <div className="text-[12.5px] text-muted">Importing…</div>}
            {error && <div className="text-[12.5px] text-red">{error}</div>}

            {result && (
              <div className="rounded-md border border-border bg-surface2 p-3 text-[12.5px]">
                <div className="text-text">
                  {result.accountsCreated} account{result.accountsCreated === 1 ? "" : "s"} created,{" "}
                  {result.contactsCreated} contact{result.contactsCreated === 1 ? "" : "s"} created ({result.rowsProcessed} rows processed).
                </div>
                {result.errors.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 text-red">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button className="btn" onClick={() => setOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
