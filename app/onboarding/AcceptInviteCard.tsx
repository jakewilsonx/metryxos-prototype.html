"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteCard({ orgName, role }: { orgName: string; role: "manager" | "rep" }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    const res = await fetch("/api/onboarding/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Try again.");
      setStatus("error");
      return;
    }
    router.push(role === "manager" ? "/dashboard" : "/today");
    router.refresh();
  }

  return (
    <div className="card p-6">
      <div className="mb-4">
        <div className="display mb-1 text-[15px]">Join {orgName}</div>
        <p className="text-[13px] text-muted">
          You&apos;ve been invited as a <span className="text-text">{role}</span>. Confirm your name to finish joining.
        </p>
      </div>
      <form onSubmit={handleAccept} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="mono text-[10px] uppercase tracking-[0.13em] text-dim">Your name</span>
          <input
            required
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="rounded-[7px] border border-border bg-surface2 px-3 py-2.5 text-[13px] text-text outline-none focus:border-blue"
          />
        </label>
        {error && <div className="text-[12.5px] text-red">{error}</div>}
        <button type="submit" disabled={status === "saving"} className="btn primary">
          {status === "saving" ? "Joining…" : `Join ${orgName}`}
        </button>
      </form>
    </div>
  );
}
