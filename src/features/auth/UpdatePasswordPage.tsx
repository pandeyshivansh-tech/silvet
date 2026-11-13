import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authError, signUpSchema } from "@/lib/auth/authFlow";
import { AuthFrame } from "./AuthFrame";
import { AuthMessage, PasswordToggle } from "./AuthParts";
import { Button, ButtonLink, Spinner, TextField } from "@/ui";
import { paths } from "@/app/paths";

export default function UpdatePasswordPage() {
  const auth = useAuth();
  const [input] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { code: params.get("code"), failed: params.has("error") || params.has("error_code") };
  });
  const started = useRef(false);
  const lock = useRef(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { window.history.replaceState(window.history.state, "", paths.updatePassword()); }, []);
  useEffect(() => {
    if (started.current || auth.status === "loading") return;
    started.current = true;
    if (input.failed || !input.code) { setError("This reset link is missing or expired. Request a new link."); return; }
    void auth.finishRecovery(input.code).then(() => setReady(true)).catch((reason) => setError(authError(reason).message));
  }, [auth, input]);
  const validSession = ready && auth.status === "signed-in" && auth.user?.id === auth.recoveryUserId;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !validSession) return;
    const parsed = signUpSchema.shape.password.safeParse(password);
    if (!parsed.success) { setError("Use at least 8 characters."); return; }
    if (password !== confirm) { setError("The passwords don’t match."); return; }
    lock.current = true; setWorking(true); setError("");
    try { await auth.updatePassword(parsed.data); setPassword(""); setConfirm(""); setDone(true); }
    catch (reason) { setError(authError(reason).message); }
    finally { lock.current = false; setWorking(false); }
  }
  return <AuthFrame title={done ? "Password updated" : "Choose a new password"} description={done ? "Your new password has been saved." : "Use a strong password you haven’t used elsewhere."}>
    {error && <AuthMessage className="mb-5">{error}</AuthMessage>}
    {done ? <ButtonLink to={paths.profile()} fullWidth>Continue to your account</ButtonLink> : validSession ? <form noValidate onSubmit={(event) => void submit(event)} className="space-y-5">
      <TextField label="New password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} hint="At least 8 characters." disabled={working} value={password} onChange={(event) => setPassword(event.target.value)}
        trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((value) => !value)} />} />
      <TextField label="Confirm new password" type={showPassword ? "text" : "password"} autoComplete="new-password" disabled={working} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      <Button type="submit" fullWidth loading={working} loadingLabel="Updating password">Save new password</Button>
    </form> : ready ? <AuthMessage>Your reset session has expired or changed. Request a new link.</AuthMessage> : !error && <Spinner label="Checking reset link" />}
    {!done && <ButtonLink className="mt-5 min-h-11" variant="quiet" to={paths.resetPassword()}>Request a new reset link</ButtonLink>}
  </AuthFrame>;
}
