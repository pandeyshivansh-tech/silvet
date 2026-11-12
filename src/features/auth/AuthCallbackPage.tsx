import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authError, consumeNext, readNext } from "@/lib/auth/authFlow";
import { AuthFrame } from "./AuthFrame";
import { ButtonLink, Spinner } from "@/ui";
import { paths } from "@/app/paths";
export default function AuthCallbackPage() {
  // Capture before removing sensitive URL parameters. This survives Strict Mode effects.
  const [input] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { code: params.get("code"), failed: params.has("error") || params.has("error_code"), next: readNext() };
  });
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const started = useRef(false);
  useEffect(() => { window.history.replaceState(null, "", paths.authCallback()); }, []);
  useEffect(() => {
    if (started.current || auth.status === "loading" || !auth.isConfigured) return;
    started.current = true;
    consumeNext();
    if (input.failed || !input.code) { setError("This sign-in link is missing, expired or was cancelled. Please sign in or request another confirmation email."); return; }
    void auth.finishCallback(input.code).then(() => setDone(true)).catch((cause) => setError(authError(cause).message));
  }, [auth, input]);
  if (done && auth.status === "signed-in") return <Navigate to={input.next} replace />;
  const problem = error ?? auth.error;
  return <AuthFrame eyebrow="Account" title="Finishing your sign-in" description="Please keep this tab open while we check your confirmation.">
    {problem ? <div className="space-y-5"><p role="alert">{problem}</p><p className="text-body-sm text-graphite-deep">Email links need the browser where you started. You can also enter the email code on the signup screen.</p><ButtonLink to={paths.signIn()}>Back to sign in</ButtonLink><ButtonLink to={paths.signUp()} variant="secondary">Verify with an email code</ButtonLink></div> : <Spinner label="Checking your sign-in" />}
  </AuthFrame>;
}
