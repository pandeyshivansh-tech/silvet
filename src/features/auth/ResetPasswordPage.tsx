import { useRef, useState, type FormEvent } from "react";
import { AuthFrame } from "./AuthFrame";
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
  return <AuthFrame eyebrow="Account recovery" title="Reset your password" description="We’ll send a secure link to your email. Open it in this browser.">
    {sent ? <p role="status">If an account exists for that address, a password reset email is on its way. Check your spam folder too.</p>
      : <form onSubmit={(event) => void submit(event)} noValidate className="space-y-5">
        <TextField label="Email" type="email" autoComplete="email" requiredMark value={email} disabled={working} onChange={(event) => setEmail(event.target.value)} />
        <Button type="submit" loading={working} loadingLabel="Sending reset email" disabled={!auth.isConfigured || auth.status === "loading"}>Send reset link</Button>
      </form>}
    {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
    {sent && <Button variant="quiet" className="mt-4" onClick={() => setSent(false)}>Try again</Button>}
    <ButtonLink className="mt-5" variant="quiet" to={paths.signIn()}>Back to sign in</ButtonLink>
  </AuthFrame>;
}
