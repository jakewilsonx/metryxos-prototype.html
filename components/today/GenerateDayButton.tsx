"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateDayButton({ label = "Generate my day" }: { label?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleClick() {
    setStatus("loading");
    setError("");
    setMessage("");
    const res = await fetch("/api/generate-cards", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Couldn't generate your day. Try again.");
      setStatus("error");
      return;
    }
    if (body.message) {
      setMessage(body.message);
      setStatus("idle");
      return;
    }
    setStatus("idle");
    router.refresh();
  }

  return (
    <div>
      <button className="btn primary" onClick={handleClick} disabled={status === "loading"}>
        {status === "loading" ? "Generating…" : label}
      </button>
      {error && <div className="mt-2 text-[12.5px] text-red">{error}</div>}
      {message && <div className="mt-2 text-[12.5px] text-muted">{message}</div>}
    </div>
  );
}
