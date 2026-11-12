/**
 * Auth state for the whole app.
 *
 * WS0 STATUS: interface only. Supabase Auth (email/password + Google) is wired in WS6 by
 * replacing the internals of AuthProvider — consumers (useAuth, RequireAuth) do not change.
 * Until then the app honestly reports "signed-out" and /app routes redirect to sign-in.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";

export type AuthStatus = "loading" | "signed-out" | "signed-in";

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** False until WS6 connects Supabase. Screens use this to explain, not to fake success. */
  isConfigured: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthState>(() => ({ status: "signed-out", user: null, isConfigured: false }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
