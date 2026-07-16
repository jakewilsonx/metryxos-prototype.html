"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Handles both link shapes: the "?code=" PKCE link a real magic-link email
// produces (from the /login page's signInWithOtp call), and the "#access_
// token=" hash-fragment link supabase.auth.admin.generateLink() produces
// (used by scripts/get-login-link.ts for local testing without email).
// Only the browser can see a URL hash, so this has to run client-side —
// a server Route Handler never receives it. createClient() here triggers
// @supabase/ssr's automatic session detection for either shape, and also
// persists the result to cookies so the server picks it up too.
export default function AuthCallbackPage() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = "/";
      } else {
        setFailed(true);
      }
    });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="text-center">
        {failed ? (
          <>
            <div className="display mb-2 text-[15px] text-red">Sign-in link didn&apos;t work</div>
            <p className="text-[13px] text-muted">
              It may have expired or already been used.{" "}
              <a href="/login" className="text-blue underline">
                Try signing in again
              </a>
              .
            </p>
          </>
        ) : (
          <p className="text-[13px] text-muted">Signing you in…</p>
        )}
      </div>
    </div>
  );
}
