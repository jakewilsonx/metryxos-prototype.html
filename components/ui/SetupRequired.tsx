export function SetupRequired() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="vmark">
            <i />
            <i />
            <i />
          </span>
          <span className="display text-[20px] leading-none">
            METRYX<span className="text-blue">OS</span>
          </span>
        </div>
        <div className="card p-6">
          <div className="display mb-2 text-[15px] text-amber">Supabase not configured</div>
          <p className="text-[13px] text-muted">
            Set <code className="mono text-text">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="mono text-text">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
            <code className="mono text-text">.env.local</code>, apply the migrations in{" "}
            <code className="mono text-text">supabase/migrations/</code>, then run{" "}
            <code className="mono text-text">npm run seed</code>. See{" "}
            <code className="mono text-text">README.md</code> for the full setup.
          </p>
        </div>
      </div>
    </div>
  );
}
