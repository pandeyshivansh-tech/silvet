import { useMemo } from "react";
import { RepositoryProvider } from "@/data";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SupabaseRepository } from "@/data/supabase/SupabaseRepository";
import { AppShell } from "./AppShell";

/** Repositories and local drafts are isolated by account, inside verified route guards. */
export default function AccountProduct() {
  const { user } = useAuth();
  const repository = useMemo(
    () => user?.emailVerified ? new SupabaseRepository(user.id) : null,
    [user?.id, user?.emailVerified],
  );
  if (!repository) return null;
  return <RepositoryProvider key={repository.userId} repository={repository}><AppShell /></RepositoryProvider>;
}
