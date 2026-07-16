"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Handles both link shapes: the "?code=" PKCE link a real magic-link email
// produces (from the /login page's signInWithOtp call), and the "#access_
// token=" hash-fragment link supabase.auth.admin.generateLink() produces
// (used by scripts/get-login-link.ts for local testing without email).
//
// These can't both go through the library's automatic URL detection:
// @supabase/ssr's createBrowserClient hard-codes flowType "pkce", and its
// auto-detection throws ("Not a valid PKCE flow url") the moment it sees
// hash-fragment tokens instead of a "?code=" — so an admin-generated link
// gets silently discarded even though Supabase already approved it. Each
// shape is parsed and applied explicitly here instead of relying on that
// auto-detection.
export default function AuthCallbackPage() {
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const supabase = createClient();

      const hash = new URLSearchParams(window.location.hash.slice(1));
      const hashError = hash.get("error_description") || hash.get("error");
      if (hashError) {
        setFailed(hashError);
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setFailed(error.message);
          return;
        }
        window.location.href = "/";
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error || !data.session) {
          setFailed(error?.message ?? "Could not complete sign-in.");
          return;
        }
        window.location.href = "/";
        return;
      }

      setFailed("No sign-in token found in the URL.");
    }

    run();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="max-w-sm text-center">
        {failed ? (
          <>
            <div className="display mb-2 text-[15px] text-red">Sign-in link didn&apos;t work</div>
            <p className="text-[13px] text-muted">
              {failed}{" "}
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
