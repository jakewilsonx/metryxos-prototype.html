"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="card p-6">
      {status === "sent" ? (
        <div className="text-center">
          <div className="display mb-2 text-[15px]">Check your email</div>
          <p className="text-[13px] text-muted">
            We sent a sign-in link to <span className="text-text">{email}</span>. Click it to get in — no password needed.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <div className="display mb-1 text-[15px]">Sign in</div>
            <p className="text-[13px] text-muted">Enter your work email — we&apos;ll send a link, no password.</p>
          </div>
          <input
            type="email"
            required
            autoFocus
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-[7px] border border-border bg-surface2 px-3 py-2.5 text-[13px] text-text outline-none focus:border-blue"
          />
          {error && <div className="text-[12.5px] text-red">{error}</div>}
          <button type="submit" disabled={status === "sending"} className="btn primary">
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      )}
    </div>
  );
}
