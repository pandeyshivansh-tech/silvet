import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useProfile } from "@/data/profiles/hooks";
import { Spinner } from "@/ui";
import { authError } from "./authFlow";
import { paths } from "@/app/paths";
import { AuthRecovery } from "./AuthRecovery";
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const location = useLocation();
  if (profile.isPending) return <div className="p-10"><Spinner label="Preparing your profile" /></div>;
  if (profile.isError) return <AuthRecovery message={authError(profile.error).message} onRetry={() => profile.refetch({ throwOnError: true })} />;
  if (!profile.data.onboardingCompletedAt) return <Navigate to={paths.onboarding(location.pathname + location.search)} replace />;
  return <>{children}</>;
}
