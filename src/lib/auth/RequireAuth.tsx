import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { paths } from "@/app/paths";
import { Spinner } from "@/ui";
import { useAuth } from "./AuthProvider";
import { AuthRecovery } from "./AuthRecovery";

/** Gate for /app routes. Data access is still enforced by Supabase RLS — this only handles navigation. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, error, retry, isConfigured } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-graphite">
        <Spinner size={20} label="Checking your session" />
      </div>
    );
  }
  if (error && isConfigured) {
    return <AuthRecovery message={error} onRetry={retry} />;
  }
  if (status === "signed-out") {
    return <Navigate to={paths.signIn(location.pathname + location.search)} replace />;
  }
  return <>{children}</>;
}
