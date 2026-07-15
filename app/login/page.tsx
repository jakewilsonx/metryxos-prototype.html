import { isSupabaseConfigured } from "@/lib/env";
import { SetupRequired } from "@/components/ui/SetupRequired";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  if (!isSupabaseConfigured()) return <SetupRequired />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
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
        <LoginForm />
      </div>
    </div>
  );
}
