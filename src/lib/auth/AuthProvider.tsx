import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createAuthController, type AuthController, type AuthSnapshot } from "./authController";
export type { AuthStatus, AuthUser } from "./authController";
export type AuthState = AuthSnapshot & Pick<AuthController, "signIn" | "signUp" | "signOut" | "resend" | "verifyEmail" | "signInWithGoogle" | "finishCallback" | "retry" | "checkProviders">;

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => createAuthController());
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const queryClient = useQueryClient();
  const previousUser = useRef<string | null>(null);
  useEffect(() => controller.start(), [controller]);
  useEffect(() => {
    const previous = previousUser.current;
    const current = snapshot.user?.id ?? null;
    if (previous && previous !== current) {
      void queryClient.cancelQueries({ queryKey: ["profile", previous] });
      queryClient.removeQueries({ queryKey: ["profile", previous] });
    }
    previousUser.current = current;
  }, [snapshot.user?.id, queryClient]);
  const value = useMemo<AuthState>(() => ({ ...controller, ...snapshot }), [controller, snapshot]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
