import { useRef, useState, type FormEvent } from "react";
import { AuthFrame } from "./AuthFrame";
import { AuthMessage } from "./AuthParts";
import { Button, ButtonLink, TextField } from "@/ui";
import { paths } from "@/app/paths";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authError, signInSchema } from "@/lib/auth/authFlow";

export default function ResetPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const lock = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const parsed = signInSchema.shape.email.safeParse(email);
    if (!parsed.success) { setError("Enter a valid email address."); return; }
    lock.current = true; setWorking(true); setError("");
    try { await auth.requestPasswordReset(parsed.data); setSent(true); }
    catch (reason) { setError(authError(reason).message); }
    finally { lock.current = false; setWorking(false); }
  }
  return <AuthFrame title="Reset your password" description="We’ll send a secure link to your email. Open it in this browser.">
    {error && <AuthMessage className="mb-5">{error}</AuthMessage>}
    {sent ? <div className="border-l-2 border-midnight pl-5"><p role="status" className="text-body text-midnight">If an account exists for that address, a password reset email is on its way. Check your spam folder too.</p></div>
      : <form onSubmit={(event) => void submit(event)} noValidate className="space-y-5">
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} disabled={working} onChange={(event) => setEmail(event.target.value)} />
        <Button type="submit" fullWidth loading={working} loadingLabel="Sending reset email" disabled={!auth.isConfigured || auth.status === "loading"}>Send reset link</Button>
      </form>}
    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1">
      {sent && <Button variant="quiet" className="min-h-11" onClick={() => setSent(false)}>Try again</Button>}
      <ButtonLink className="min-h-11" variant="quiet" to={paths.signIn()}>Back to sign in</ButtonLink>
    </div>
  </AuthFrame>;
}
