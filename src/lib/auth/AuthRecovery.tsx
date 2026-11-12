import { useRef, useState } from "react";
import { Button } from "@/ui";
import { useAuth } from "./AuthProvider";
import { authError } from "./authFlow";
export function AuthRecovery({ message, onRetry }: { message: string; onRetry: () => unknown }) {
  const { signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const perform = async (operation: () => unknown) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try { await operation(); } catch (cause) { setError(authError(cause).message); }
    finally { locked.current = false; setBusy(false); }
  };
  return <div className="mx-auto max-w-lg space-y-5 px-5 py-16">
    <p role="alert">{error ?? message}</p>
    <div className="flex flex-wrap gap-3">
      <Button disabled={busy} onClick={() => { void perform(onRetry); }}>Try again</Button>
      <Button disabled={busy} variant="secondary" onClick={() => { void perform(signOut); }}>Sign out</Button>
    </div>
  </div>;
}
